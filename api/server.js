require('dotenv').config()
const express = require('express')
const cors = require('cors')
const rateLimit = require('express-rate-limit')
const crypto = require('crypto')
const { createClient } = require('@supabase/supabase-js')
const { GoogleGenAI } = require('@google/genai')

const app = express()
const PORT = process.env.PORT || 3001

// Render sits behind a proxy; needed for correct rate-limit IPs
app.set('trust proxy', 1)

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
// Model name lives in an env var so a future Google retirement is a dashboard change, not a code change
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

app.use(express.json())
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://montemy.vercel.app',
    /\.vercel\.app$/,
  ],
  credentials: true,
}))

// Keyed by user id (verifyToken runs first), so one student can't burn the quota for a whole school behind one IP
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.user.id,
  message: { error: 'You are sending messages too quickly. Wait a moment and try again.' },
})

const adminRegisterLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts. Try again later.' },
})

const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts. Try again later.' },
})

// Constant-time comparison so the admin key can't be guessed via timing
function keyMatches(provided) {
  const expected = process.env.ADMIN_KEY
  if (!expected || typeof provided !== 'string') return false
  const a = crypto.createHash('sha256').update(provided).digest()
  const b = crypto.createHash('sha256').update(expected).digest()
  return crypto.timingSafeEqual(a, b)
}

async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' })
  }
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  req.user = user
  next()
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/ping', (req, res) => {
  res.json({ pong: true })
})

// Only lets admin accounts through (use after verifyToken)
async function requireAdmin(req, res, next) {
  const { data: caller } = await supabase
    .from('users')
    .select('role')
    .eq('id', req.user.id)
    .maybeSingle()
  if (!caller || caller.role !== 'admin') {
    return res.status(403).json({ error: 'Admins only' })
  }
  next()
}

const ROLE_TABLES = ['students', 'teachers', 'parents', 'principals', 'tutors', 'school_members']

// Users waiting for admin approval, with their organisation name
app.get('/api/admin/pending-users', verifyToken, requireAdmin, async (req, res) => {
  const { data: users, error } = await supabase
    .from('users')
    .select('id, name, email, role, org_id, email_verified, created_at')
    .eq('is_verified', false)
    .neq('role', 'admin')
    .order('created_at', { ascending: true })
  if (error) return res.status(500).json({ error: error.message })

  const orgIds = [...new Set(users.map(u => u.org_id).filter(Boolean))]
  const orgNames = {}
  if (orgIds.length) {
    const { data: orgs } = await supabase.from('organizations').select('id, name').in('id', orgIds)
    ;(orgs || []).forEach(o => { orgNames[o.id] = o.name })
  }
  res.json({ users: users.map(u => ({ ...u, org_name: orgNames[u.org_id] || null })) })
})

// Headline numbers for the admin overview
app.get('/api/admin/stats', verifyToken, requireAdmin, async (req, res) => {
  const [total, pending, orgs] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('is_verified', false).neq('role', 'admin'),
    supabase.from('organizations').select('id', { count: 'exact', head: true }),
  ])
  res.json({
    totalUsers: total.count || 0,
    pendingUsers: pending.count || 0,
    organizations: orgs.count || 0,
  })
})

// Approve or reject a pending user
app.post('/api/admin/verify-user', verifyToken, requireAdmin, async (req, res) => {
  const { userId, action } = req.body || {}
  if (!userId || !['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'userId and a valid action are required' })
  }

  const { data: target } = await supabase
    .from('users').select('id, role').eq('id', userId).maybeSingle()
  if (!target) return res.status(404).json({ error: 'User not found' })

  if (action === 'approve') {
    const { error } = await supabase.from('users').update({ is_verified: true }).eq('id', userId)
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ success: true, message: 'User approved' })
  }

  // reject
  if (target.role === 'admin' || target.id === req.user.id) {
    return res.status(403).json({ error: 'Admin accounts cannot be rejected.' })
  }
  // Remove role rows first so foreign keys can't block the delete
  for (const table of ROLE_TABLES) {
    await supabase.from(table).delete().eq('user_id', userId)
  }
  const { error: authErr } = await supabase.auth.admin.deleteUser(userId)
  if (authErr) {
    console.error('Reject failed:', authErr)
    return res.status(500).json({ error: 'Could not delete user: ' + authErr.message })
  }
  await supabase.from('users').delete().eq('id', userId) // no-op if it already cascaded
  res.json({ success: true, message: 'User rejected and deleted' })
})

app.post('/api/admin/validate-key', adminLoginLimiter, (req, res) => {
  const { adminKey } = req.body || {}
  if (keyMatches(adminKey)) {
    return res.json({ valid: true })
  }
  res.status(403).json({ valid: false, error: 'Invalid admin key' })
})

// Admin login check: the caller is already signed in with Supabase.
// Confirms they are an admin in the users table AND know the admin key.
app.post('/api/admin/login-check', adminLoginLimiter, verifyToken, async (req, res) => {
  const { adminKey } = req.body || {}

  const { data: caller } = await supabase
    .from('users')
    .select('role')
    .eq('id', req.user.id)
    .maybeSingle()
  if (!caller || caller.role !== 'admin') {
    return res.status(403).json({ error: 'This account is not an admin account.' })
  }
  if (!keyMatches(adminKey)) {
    return res.status(403).json({ error: 'Invalid admin key.' })
  }
  res.json({ success: true })
})

app.post('/api/admin/register', adminRegisterLimiter, async (req, res) => {
  const { name, email, password, adminKey } = req.body || {}

  if (!process.env.ADMIN_KEY || adminKey !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: 'Invalid admin key.' })
  }
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required.' })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' })
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error) {
    const taken = /already|registered/i.test(error.message)
    return res.status(taken ? 409 : 400).json({
      error: taken ? 'An account with this email already exists.' : error.message,
    })
  }

  const { error: profileErr } = await supabase.from('users').insert({
    id: data.user.id,
    email,
    name,
    role: 'admin',
    is_verified: true,
    email_verified: true,
  })
  if (profileErr) {
    console.error('Admin profile insert failed:', profileErr)
    await supabase.auth.admin.deleteUser(data.user.id)
    return res.status(500).json({ error: 'Could not create admin profile.' })
  }

  res.json({ success: true })
})

const ROLE_LIST = ['student', 'teacher', 'parent', 'principal', 'tutor', 'schoolmember']
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many attempts. Try again later.' },
})

// "Verify later" signup: account is created with the email pre-approved so the
// user can log in now. users.email_verified stays false until they verify.
app.post('/api/auth/register-later', registerLimiter, async (req, res) => {
  const { name, email, password, role, orgId } = req.body || {}

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required.' })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' })
  }
  if (!ROLE_LIST.includes(role)) {
    return res.status(400).json({ error: 'Invalid account type.' })
  }
  if (!orgId) {
    return res.status(400).json({ error: 'Please select a school or tutor organisation.' })
  }

  const { data: org } = await supabase
    .from('organizations').select('id').eq('id', orgId).maybeSingle()
  if (!org) {
    return res.status(400).json({ error: 'Organisation not found.' })
  }

  // The database trigger creates the users + role rows from this metadata
  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role, org_id: orgId },
  })
  if (error) {
    const taken = /already|registered/i.test(error.message)
    return res.status(taken ? 409 : 400).json({
      error: taken ? 'An account with this email already exists. Try logging in instead.' : 'Could not create account.',
    })
  }

  res.json({ success: true })
})

// Student's own grade + subjects, read server-side so the client can never spoof them
async function getStudentContext(userId) {
  const { data: user } = await supabase
    .from('users').select('role, name').eq('id', userId).maybeSingle()
  if (!user || user.role !== 'student') return null
  const { data: student } = await supabase
    .from('students').select('grade, subjects').eq('user_id', userId).maybeSingle()
  return {
    name: user.name || null,
    grade: student?.grade ?? null,
    subjects: Array.isArray(student?.subjects) ? student.subjects : [],
  }
}

// Used by the AI Tutor page header
app.get('/api/student/context', verifyToken, async (req, res) => {
  try {
    const ctx = await getStudentContext(req.user.id)
    if (!ctx) return res.status(403).json({ error: 'Students only' })
    res.json(ctx)
  } catch (err) {
    console.error('Student context error:', err)
    res.status(500).json({ error: 'Could not load your profile' })
  }
})

const MAX_MESSAGE_CHARS = 2000
const MAX_HISTORY_MESSAGES = 20

function buildSystemPrompt({ name, grade, subjects }) {
  return `You are a friendly, patient school tutor on the Montemy education platform.
${name ? `The student's first name is ${String(name).split(' ')[0]}. ` : ''}They are in grade ${grade ?? 'unknown'}.
Their subjects are: ${subjects.length ? subjects.join(', ') : 'general school subjects'}.

How you teach:
- Never hand over finished homework answers. Guide the student with hints, questions and worked examples of similar problems, and let them take the final step.
- If the student is stuck, break the problem into small steps and check their understanding as you go.
- Keep explanations clear, encouraging and suited to their grade level. Keep replies short unless a longer explanation is truly needed.
- Stay on school learning. If asked about something unrelated, gently steer back to their studies.
- If a student seems upset or unsafe, be kind and encourage them to talk to a parent, teacher or another trusted adult.
- Write in plain text. Do not use markdown symbols such as ** or #. Short paragraphs and simple numbered steps are fine.`
}

// Streams the tutor's reply back as plain text chunks
app.post('/api/ai-tutor', verifyToken, aiLimiter, async (req, res) => {
  const { message, history } = req.body || {}
  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Message is required' })
  }
  if (message.length > MAX_MESSAGE_CHARS) {
    return res.status(400).json({ error: `Message is too long (max ${MAX_MESSAGE_CHARS} characters)` })
  }

  try {
    const ctx = await getStudentContext(req.user.id)
    if (!ctx) return res.status(403).json({ error: 'The AI Tutor is for student accounts only' })

    // Clean the client-supplied history: valid roles/strings only, most recent N, must start with a user turn
    let past = (Array.isArray(history) ? history : [])
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .slice(-MAX_HISTORY_MESSAGES)
      .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content.slice(0, 4000) }] }))
    while (past.length && past[0].role !== 'user') past.shift()

    const stream = await ai.models.generateContentStream({
      model: GEMINI_MODEL,
      contents: [...past, { role: 'user', parts: [{ text: message.trim() }] }],
      config: {
        systemInstruction: buildSystemPrompt(ctx),
        maxOutputTokens: 1024,
        temperature: 0.7,
      },
    })

    let aborted = false
    res.on('close', () => { aborted = true })

    let wrote = false
    try {
      for await (const chunk of stream) {
        if (aborted) break
        const text = chunk.text
        if (text) {
          if (!wrote) {
            res.setHeader('Content-Type', 'text/plain; charset=utf-8')
            res.setHeader('Cache-Control', 'no-cache')
            res.setHeader('X-Accel-Buffering', 'no')
            wrote = true
          }
          res.write(text)
        }
      }
    } catch (streamErr) {
      console.error('Gemini stream error:', streamErr)
      if (!wrote) return res.status(500).json({ error: 'The AI tutor is unavailable right now. Please try again.' })
      res.write('\n\n(The reply was interrupted. Please try again.)')
    }

    if (!wrote && !aborted) {
      // Nothing came back, usually a safety block
      return res.status(502).json({ error: "I couldn't answer that one. Try rephrasing your question." })
    }
    res.end()
  } catch (err) {
    console.error('Gemini error:', err)
    if (!res.headersSent) res.status(500).json({ error: 'The AI tutor is unavailable right now. Please try again.' })
    else res.end()
  }
})

app.listen(PORT, () => {
  console.log(`Montemy API running on port ${PORT}`)
})
