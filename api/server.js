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
  if (user.banned_until && new Date(user.banned_until) > new Date()) {
    return res.status(403).json({ error: 'This account has been suspended.' })
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

  // Admins don't pick a username; give them a generated one so the column is never empty
  const adminUsername = (name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '').slice(0, 14) || 'admin')
    + '.' + data.user.id.replace(/-/g, '').slice(0, 4)

  const { error: profileErr } = await supabase.from('users').insert({
    id: data.user.id,
    email,
    name,
    username: adminUsername,
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

// ---------- Student helpers (Phase 9) ----------
const GRADES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']

function cleanGrade(g) {
  const t = String(g ?? '').trim()
  return GRADES.includes(t) ? t : null
}

// Class letters a school can use. Together with the grade they make a pair such as 8C.
const CLASS_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

function cleanLetter(l) {
  const t = String(l ?? '').trim().toUpperCase()
  return CLASS_LETTERS.includes(t) ? t : null
}

// A "class" row is one grade + letter in one school (e.g. 8C). Created the first time someone picks it.
async function getOrCreateClass(orgId, grade, letter) {
  const find = () => supabase.from('classes').select('id, name, grade, org_id')
    .eq('org_id', orgId).eq('grade', grade).eq('name', letter).maybeSingle()
  let { data } = await find()
  if (data) return data
  const { error } = await supabase.from('classes').insert({ org_id: orgId, grade, name: letter })
  if (error && error.code !== '23505') throw error
  ;({ data } = await find())
  return data
}

const classLabel = (c) => `${c.grade ?? ''}${c.name ?? ''}`
const shapeClass = (c) => ({ id: c.id, name: classLabel(c), grade: String(c.grade ?? ''), letter: c.name })
const sortClasses = (list) => [...list].sort((a, b) =>
  (Number(a.grade) || 0) - (Number(b.grade) || 0) || String(a.letter).localeCompare(String(b.letter)))

// { classId: 'Trevor, Sam' } built from teacher_classes
async function teacherNamesByClass(classIds) {
  const out = {}
  if (!classIds.length) return out
  const { data: links } = await supabase.from('teacher_classes').select('teacher_id, class_id').in('class_id', classIds)
  const ids = [...new Set((links || []).map(l => l.teacher_id))]
  if (!ids.length) return out
  const { data: users } = await supabase.from('users').select('id, name').in('id', ids)
  const byId = Object.fromEntries((users || []).map(u => [u.id, u.name]))
  for (const l of links || []) {
    if (!byId[l.teacher_id]) continue
    out[l.class_id] = out[l.class_id] ? `${out[l.class_id]}, ${byId[l.teacher_id]}` : byId[l.teacher_id]
  }
  return out
}

function cleanSubjects(input) {
  if (!Array.isArray(input)) return []
  const seen = new Set()
  const out = []
  for (const item of input) {
    if (typeof item !== 'string') continue
    const t = item.trim().replace(/\s+/g, ' ').slice(0, 60)
    if (!t || seen.has(t.toLowerCase())) continue
    seen.add(t.toLowerCase())
    out.push(t)
    if (out.length >= 20) break
  }
  return out
}

const ROLE_LIST = ['student', 'teacher', 'parent', 'principal', 'tutor', 'schoolmember']
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many attempts. Try again later.' },
})

// ---------- Usernames ----------
// Usernames are what other users see; emails are visible to admins only.
// 3-20 characters: lowercase letters, digits, "_" and "."
const USERNAME_RE = /^[a-z0-9._]{3,20}$/
const cleanUsername = (u) => String(u ?? '').trim().toLowerCase()

async function usernameTaken(username) {
  const { data } = await supabase.from('users').select('id').ilike('username', username).limit(1)
  return !!(data && data.length)
}

// Public: lets the Register page show "available / taken" while typing
const usernameLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  message: { error: 'Too many checks. Wait a moment and try again.' },
})
app.get('/api/auth/username-available', usernameLimiter, async (req, res) => {
  const u = cleanUsername(req.query.u)
  if (!USERNAME_RE.test(u)) {
    return res.json({ available: false, reason: 'Use 3-20 letters, numbers, "." or "_".' })
  }
  try {
    const taken = await usernameTaken(u)
    res.json({ available: !taken, reason: taken ? 'That username is taken.' : null })
  } catch (err) {
    console.error('Username check failed:', err)
    res.status(500).json({ error: 'Could not check that username.' })
  }
})

// "Verify later" signup: account is created with the email pre-approved so the
// user can log in now. users.email_verified stays false until they verify.
app.post('/api/auth/register-later', registerLimiter, async (req, res) => {
  const { name, email, password, role, orgId } = req.body || {}
  const username = cleanUsername(req.body?.username)

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required.' })
  }
  if (!USERNAME_RE.test(username)) {
    return res.status(400).json({ error: 'Choose a username of 3-20 letters, numbers, "." or "_".' })
  }
  if (await usernameTaken(username)) {
    return res.status(409).json({ error: 'That username is taken. Please choose another.' })
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
  const metadata = { name, role, org_id: orgId, username }
  if (role === 'student') {
    const g = cleanGrade(req.body.grade)
    const subs = cleanSubjects(req.body.subjects)
    if (g) metadata.grade = g
    if (subs.length) metadata.subjects = subs
  }
  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
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
async function getStudentContext(authUser) {
  const ctx = await loadStudent(authUser)
  if (!ctx) return null
  return {
    name: ctx.user.name || null,
    grade: ctx.student?.grade ?? null,
    subjects: Array.isArray(ctx.student?.subjects) ? ctx.student.subjects : [],
  }
}

// Used by the AI Tutor page header
app.get('/api/student/context', verifyToken, async (req, res) => {
  try {
    const ctx = await getStudentContext(req.user)
    if (!ctx) return res.status(403).json({ error: 'Students only' })
    res.json(ctx)
  } catch (err) {
    console.error('Student context error:', err)
    res.status(500).json({ error: 'Could not load your profile' })
  }
})

// ---------- Student dashboard routes (Phase 9) ----------
// These read with the service role so they work whatever the RLS state is (policies arrive in Phase 29).
// Every route is tied to the signed-in student's own id; nothing here accepts another student's id.
const studentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: (req) => req.user.id,
  message: { error: 'Too many requests. Wait a moment and try again.' },
})

async function saveStudentRow(userId, row, patch) {
  if (row) {
    const { data, error } = await supabase.from('students').update(patch).eq('id', row.id).select('*').single()
    if (error) throw error
    return data
  }
  const { data, error } = await supabase.from('students').insert({ user_id: userId, ...patch }).select('*').single()
  if (error) throw error
  return data
}

// Loads the student's user + students rows. If grade/subjects are still empty and were given at
// signup (stored in auth metadata), copies them across once.
async function loadStudent(authUser) {
  const { data: user } = await supabase
    .from('users').select('id, name, role, org_id, is_verified').eq('id', authUser.id).maybeSingle()
  if (!user || user.role !== 'student') return null

  let { data: student } = await supabase.from('students').select('*').eq('user_id', authUser.id).maybeSingle()

  const meta = authUser.user_metadata || {}
  const metaGrade = cleanGrade(meta.grade)
  const metaSubjects = cleanSubjects(meta.subjects)
  const patch = {}
  if (!student?.grade && metaGrade) patch.grade = metaGrade
  if ((!student?.subjects || student.subjects.length === 0) && metaSubjects.length) patch.subjects = metaSubjects
  if (Object.keys(patch).length) student = await saveStudentRow(authUser.id, student, patch)

  return { user, student }
}

function titleCase(str) {
  const t = String(str || '').trim()
  return t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : ''
}

// Builds the overview for one student. Shared by the student's own dashboard and the read-only
// parent view, so both always show the same numbers.
async function buildStudentOverview(user, student) {
  const nowIso = new Date().toISOString()

  const [orgRes, classRes, eventsRes] = await Promise.all([
    user.org_id
      ? supabase.from('organizations').select('id, name').eq('id', user.org_id).maybeSingle()
      : Promise.resolve({ data: null }),
    student?.class_id
      ? supabase.from('classes').select('id, name, grade').eq('id', student.class_id).maybeSingle()
      : Promise.resolve({ data: null }),
    user.org_id
      ? supabase.from('events').select('id, title, description, date, location, type')
          .eq('org_id', user.org_id).gte('date', nowIso).order('date', { ascending: true }).limit(10)
      : Promise.resolve({ data: [] }),
  ])

  const cls = classRes.data
  let classInfo = null
  let assignments = []
  if (cls) {
    const names = await teacherNamesByClass([cls.id])
    classInfo = { ...shapeClass(cls), teacherName: names[cls.id] || null }
    const { data } = await supabase
      .from('assignments').select('id, class_id, title, description, due_date')
      .eq('class_id', cls.id).order('due_date', { ascending: true })
    assignments = data || []
  }

  // submissions.student_id references users.id
  const { data: subRows } = await supabase
    .from('submissions').select('id, assignment_id, grade, feedback, status, submitted_at')
    .eq('student_id', user.id)

  // Keep only the latest submission per assignment
  const latest = {}
  for (const sub of subRows || []) {
    const prev = latest[sub.assignment_id]
    if (!prev || new Date(sub.submitted_at) > new Date(prev.submitted_at)) latest[sub.assignment_id] = sub
  }

  // Titles for graded work, including assignments from a class the student has since left
  const known = Object.fromEntries(assignments.map(a => [a.id, a]))
  const extraIds = Object.keys(latest).filter(id => !known[id])
  if (extraIds.length) {
    const { data: extra } = await supabase.from('assignments').select('id, title, due_date').in('id', extraIds)
    for (const a of extra || []) known[a.id] = a
  }

  const nowMs = Date.now()
  const hasGrade = (sub) => sub && sub.grade !== null && sub.grade !== undefined && !Number.isNaN(Number(sub.grade))

  const homework = assignments.map(a => {
    const sub = latest[a.id]
    const dueMs = a.due_date ? new Date(a.due_date).getTime() : null
    let status = 'Not submitted'
    if (hasGrade(sub)) status = 'Graded'
    else if (sub) status = titleCase(sub.status) || 'Submitted'
    else if (dueMs && dueMs < nowMs) status = 'Overdue'
    return {
      id: a.id,
      title: a.title,
      description: a.description || '',
      dueDate: a.due_date,
      status,
      grade: hasGrade(sub) ? Number(sub.grade) : null,
      feedback: sub?.feedback || null,
    }
  })

  const graded = Object.values(latest)
    .filter(hasGrade)
    .map(sub => ({
      assignmentId: sub.assignment_id,
      title: known[sub.assignment_id]?.title || 'Assignment',
      grade: Number(sub.grade),
      feedback: sub.feedback || null,
      date: sub.submitted_at,
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date))

  const average = graded.length
    ? Math.round((graded.reduce((t, g) => t + g.grade, 0) / graded.length) * 10) / 10
    : null

  const subjects = Array.isArray(student?.subjects) ? student.subjects : []
  return {
    profile: { name: user.name, grade: student?.grade ?? null, subjects, classId: student?.class_id ?? null, letter: cls?.name ?? null },
    org: orgRes.data || null,
    isVerified: !!user.is_verified,
    classInfo,
    homework,
    graded,
    average,
    events: eventsRes.data || [],
    needsSetup: !student?.grade || subjects.length === 0 || !student?.class_id,
  }
}

app.get('/api/student/overview', verifyToken, studentLimiter, async (req, res) => {
  try {
    const ctx = await loadStudent(req.user)
    if (!ctx) return res.status(403).json({ error: 'Students only' })
    res.json(await buildStudentOverview(ctx.user, ctx.student))
  } catch (err) {
    console.error('Student overview error:', err)
    res.status(500).json({ error: 'Could not load your dashboard. Please try again.' })
  }
})

// Student updates their own grade, subjects and class
app.put('/api/student/profile', verifyToken, studentLimiter, async (req, res) => {
  try {
    const ctx = await loadStudent(req.user)
    if (!ctx) return res.status(403).json({ error: 'Students only' })

    const { grade, subjects, letter } = req.body || {}
    const patch = {}

    if (grade !== undefined) {
      const g = cleanGrade(grade)
      if (!g) return res.status(400).json({ error: 'Please choose a grade from 1 to 12.' })
      patch.grade = g
    }
    if (subjects !== undefined) patch.subjects = cleanSubjects(subjects)

    const finalGrade = patch.grade ?? ctx.student?.grade
    if (letter !== undefined) {
      if (letter === null || letter === '') {
        patch.class_id = null
      } else {
        const l = cleanLetter(letter)
        if (!l) return res.status(400).json({ error: 'Please choose a class letter from A to F.' })
        if (!finalGrade) return res.status(400).json({ error: 'Choose your grade first.' })
        if (!ctx.user.org_id) return res.status(400).json({ error: 'Your account is not linked to a school yet.' })
        const c = await getOrCreateClass(ctx.user.org_id, finalGrade, l)
        if (!c) throw new Error('Could not create class')
        patch.class_id = c.id
      }
    } else if (patch.grade && ctx.student?.class_id) {
      // Grade changed without a new class letter: drop the old class if it is for a different grade
      const { data: old } = await supabase.from('classes').select('grade').eq('id', ctx.student.class_id).maybeSingle()
      if (old && String(old.grade) !== patch.grade) patch.class_id = null
    }
    if (!Object.keys(patch).length) return res.status(400).json({ error: 'Nothing to update.' })

    await saveStudentRow(req.user.id, ctx.student, patch)
    res.json({ success: true })
  } catch (err) {
    console.error('Student profile update error:', err)
    res.status(500).json({ error: 'Could not save your changes. Please try again.' })
  }
})

// Study materials uploaded for the student's school (uploads arrive in Phase 17)
app.get('/api/student/resources', verifyToken, studentLimiter, async (req, res) => {
  try {
    const ctx = await loadStudent(req.user)
    if (!ctx) return res.status(403).json({ error: 'Students only' })
    if (!ctx.user.org_id) return res.json({ resources: [] })

    const { data, error } = await supabase
      .from('resources').select('id, title, file_url, subject, grade').eq('org_id', ctx.user.org_id).order('title')
    if (error) throw error
    res.json({ resources: data || [] })
  } catch (err) {
    console.error('Student resources error:', err)
    res.status(500).json({ error: 'Could not load resources.' })
  }
})

// ---------- Teacher routes (Phase 10) ----------
// A teacher's classes are the grade+letter pairs they added (rows in teacher_classes).
// Every route below checks that the class/assignment belongs to the signed-in teacher.
const teacherLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  keyGenerator: (req) => req.user.id,
  message: { error: 'Too many requests. Wait a moment and try again.' },
})

async function loadTeacher(authUser) {
  const { data: user } = await supabase
    .from('users').select('id, name, role, org_id, is_verified').eq('id', authUser.id).maybeSingle()
  if (!user || user.role !== 'teacher') return null
  return user
}

// Unverified accounts can look around but not change anything
function requireVerified(user, res) {
  if (user.is_verified) return true
  res.status(403).json({ error: 'Your account needs to be verified by an admin before you can do this.' })
  return false
}

// A teacher's classes are the grade+letter pairs they have added (teacher_classes links)
async function getTeacherClasses(userId) {
  const { data: links } = await supabase.from('teacher_classes').select('class_id').eq('teacher_id', userId)
  const ids = (links || []).map(l => l.class_id)
  if (!ids.length) return []
  const { data } = await supabase.from('classes').select('id, name, grade').in('id', ids)
  return sortClasses((data || []).map(shapeClass))
}

async function teacherTeaches(userId, classId) {
  if (!classId) return false
  const { data } = await supabase.from('teacher_classes').select('class_id')
    .eq('teacher_id', userId).eq('class_id', classId).maybeSingle()
  return !!data
}

// { classId: [{ id, name, username }] } built from students.class_id (no emails: only admins see those)
async function studentsByClass(classIds) {
  const result = Object.fromEntries(classIds.map(id => [id, []]))
  if (!classIds.length) return result

  const { data: rows } = await supabase.from('students').select('user_id, class_id').in('class_id', classIds)
  const userIds = (rows || []).map(r => r.user_id).filter(Boolean)
  const people = {}
  if (userIds.length) {
    const { data: users } = await supabase.from('users').select('id, name, username').in('id', userIds)
    for (const u of users || []) people[u.id] = u
  }
  for (const r of rows || []) {
    const u = people[r.user_id]
    if (u) result[r.class_id].push({ id: u.id, name: u.name || u.username || 'Unknown', username: u.username || '' })
  }
  for (const id of classIds) result[id].sort((a, b) => String(a.name).localeCompare(String(b.name)))
  return result
}

// The assignment plus its class, only if this teacher created it and still teaches that class
async function getOwnedAssignment(userId, assignmentId) {
  const { data: assignment } = await supabase
    .from('assignments').select('id, class_id, title, description, due_date, created_by').eq('id', assignmentId).maybeSingle()
  if (!assignment || assignment.created_by !== userId) return null
  if (!(await teacherTeaches(userId, assignment.class_id))) return null
  const { data: cls } = await supabase.from('classes').select('id, name, grade').eq('id', assignment.class_id).maybeSingle()
  if (!cls) return null
  return { assignment, cls: { id: cls.id, name: classLabel(cls) } }
}

const hasNumericGrade = (s) => s && s.grade !== null && s.grade !== undefined && !Number.isNaN(Number(s.grade))

// { assignmentId: { submitted, graded } }, counting only students currently in that class
async function submissionStats(assignments, roster) {
  const stats = Object.fromEntries(assignments.map(a => [a.id, { submitted: 0, graded: 0 }]))
  if (!assignments.length) return stats
  const { data: subs } = await supabase
    .from('submissions').select('assignment_id, student_id, grade').in('assignment_id', assignments.map(a => a.id))
  const classOf = Object.fromEntries(assignments.map(a => [a.id, a.class_id]))
  for (const sub of subs || []) {
    const inClass = (roster[classOf[sub.assignment_id]] || []).some(st => st.id === sub.student_id)
    if (!inClass) continue
    stats[sub.assignment_id].submitted += 1
    if (hasNumericGrade(sub)) stats[sub.assignment_id].graded += 1
  }
  return stats
}

function cleanAssignmentInput(body) {
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  if (!title) return { error: 'Please give the assignment a title.' }
  if (title.length > 150) return { error: 'The title is too long (max 150 characters).' }
  const description = typeof body.description === 'string' ? body.description.trim() : ''
  if (description.length > 5000) return { error: 'The description is too long (max 5000 characters).' }
  let dueDate = null
  if (body.dueDate) {
    const d = new Date(body.dueDate)
    if (Number.isNaN(d.getTime())) return { error: 'That due date is not valid.' }
    dueDate = d.toISOString()
  }
  return { title, description, dueDate }
}

// Dashboard summary
app.get('/api/teacher/overview', verifyToken, teacherLimiter, async (req, res) => {
  try {
    const user = await loadTeacher(req.user)
    if (!user) return res.status(403).json({ error: 'Teachers only' })

    const classes = await getTeacherClasses(user.id)
    const classIds = classes.map(c => c.id)
    const roster = await studentsByClass(classIds)

    let assignments = []
    if (classIds.length) {
      const { data } = await supabase
        .from('assignments').select('id, class_id, title, due_date').in('class_id', classIds)
        .eq('created_by', user.id).order('due_date', { ascending: true })
      assignments = data || []
    }
    const stats = await submissionStats(assignments, roster)
    const className = Object.fromEntries(classes.map(c => [c.id, c.name]))

    const now = Date.now()
    const upcoming = assignments
      .filter(a => a.due_date && new Date(a.due_date).getTime() >= now)
      .slice(0, 5)
      .map(a => ({
        id: a.id, title: a.title, className: className[a.class_id], dueDate: a.due_date,
        studentCount: roster[a.class_id].length, ...stats[a.id],
      }))

    const toGrade = assignments.reduce((t, a) => t + Math.max(0, stats[a.id].submitted - stats[a.id].graded), 0)

    res.json({
      name: user.name,
      isVerified: !!user.is_verified,
      classes: classes.map(c => ({ ...c, studentCount: roster[c.id].length })),
      totals: {
        classes: classes.length,
        students: classIds.reduce((t, id) => t + roster[id].length, 0),
        toGrade,
      },
      upcoming,
    })
  } catch (err) {
    console.error('Teacher overview error:', err)
    res.status(500).json({ error: 'Could not load your dashboard. Please try again.' })
  }
})

// Classes with their enrolled students
app.get('/api/teacher/classes', verifyToken, teacherLimiter, async (req, res) => {
  try {
    const user = await loadTeacher(req.user)
    if (!user) return res.status(403).json({ error: 'Teachers only' })
    const classes = await getTeacherClasses(user.id)
    const roster = await studentsByClass(classes.map(c => c.id))
    res.json({ classes: classes.map(c => ({ ...c, students: roster[c.id] })) })
  } catch (err) {
    console.error('Teacher classes error:', err)
    res.status(500).json({ error: 'Could not load your classes.' })
  }
})

// Teacher adds a grade + letter pair (e.g. 8C). The pair is created if nobody has used it yet.
app.post('/api/teacher/classes', verifyToken, teacherLimiter, async (req, res) => {
  try {
    const user = await loadTeacher(req.user)
    if (!user) return res.status(403).json({ error: 'Teachers only' })
    if (!requireVerified(user, res)) return
    if (!user.org_id) return res.status(400).json({ error: 'Your account is not linked to a school yet.' })

    const grade = cleanGrade(req.body?.grade)
    const letter = cleanLetter(req.body?.letter)
    if (!grade) return res.status(400).json({ error: 'Please choose a grade from 1 to 12.' })
    if (!letter) return res.status(400).json({ error: 'Please choose a class letter from A to F.' })

    const cls = await getOrCreateClass(user.org_id, grade, letter)
    if (!cls) throw new Error('Could not create class')
    const { error } = await supabase.from('teacher_classes')
      .upsert({ teacher_id: user.id, class_id: cls.id }, { onConflict: 'teacher_id,class_id' })
    if (error) throw error
    res.json({ success: true, id: cls.id })
  } catch (err) {
    console.error('Add class error:', err)
    res.status(500).json({ error: 'Could not add the class. Please try again.' })
  }
})

// Removes the class from this teacher's list only. Students and assignments are left untouched.
app.delete('/api/teacher/classes/:id', verifyToken, teacherLimiter, async (req, res) => {
  try {
    const user = await loadTeacher(req.user)
    if (!user) return res.status(403).json({ error: 'Teachers only' })
    const { error } = await supabase.from('teacher_classes')
      .delete().eq('teacher_id', user.id).eq('class_id', req.params.id)
    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    console.error('Remove class error:', err)
    res.status(500).json({ error: 'Could not remove the class. Please try again.' })
  }
})

// All assignments across the teacher's classes
app.get('/api/teacher/assignments', verifyToken, teacherLimiter, async (req, res) => {
  try {
    const user = await loadTeacher(req.user)
    if (!user) return res.status(403).json({ error: 'Teachers only' })

    const classes = await getTeacherClasses(user.id)
    const classIds = classes.map(c => c.id)
    if (!classIds.length) return res.json({ assignments: [] })

    const roster = await studentsByClass(classIds)
    const { data } = await supabase
      .from('assignments').select('id, class_id, title, description, due_date').in('class_id', classIds)
      .eq('created_by', user.id)
    const assignments = data || []
    const stats = await submissionStats(assignments, roster)
    const className = Object.fromEntries(classes.map(c => [c.id, c.name]))

    const list = assignments.map(a => ({
      id: a.id, classId: a.class_id, className: className[a.class_id],
      title: a.title, description: a.description || '', dueDate: a.due_date,
      studentCount: roster[a.class_id].length, ...stats[a.id],
    })).sort((a, b) => {
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return new Date(b.dueDate) - new Date(a.dueDate)
    })
    res.json({ assignments: list })
  } catch (err) {
    console.error('Teacher assignments error:', err)
    res.status(500).json({ error: 'Could not load assignments.' })
  }
})

app.post('/api/teacher/assignments', verifyToken, teacherLimiter, async (req, res) => {
  try {
    const user = await loadTeacher(req.user)
    if (!user) return res.status(403).json({ error: 'Teachers only' })
    if (!requireVerified(user, res)) return

    const input = cleanAssignmentInput(req.body || {})
    if (input.error) return res.status(400).json({ error: input.error })

    const cls = { id: req.body.classId }
    if (!(await teacherTeaches(user.id, cls.id))) {
      return res.status(400).json({ error: 'Please choose one of your own classes.' })
    }

    const { data, error } = await supabase.from('assignments').insert({
      class_id: cls.id, title: input.title, description: input.description,
      due_date: input.dueDate, created_by: user.id,
    }).select('id').single()
    if (error) throw error
    res.json({ success: true, id: data.id })
  } catch (err) {
    console.error('Create assignment error:', err)
    res.status(500).json({ error: 'Could not create the assignment. Please try again.' })
  }
})

app.put('/api/teacher/assignments/:id', verifyToken, teacherLimiter, async (req, res) => {
  try {
    const user = await loadTeacher(req.user)
    if (!user) return res.status(403).json({ error: 'Teachers only' })
    if (!requireVerified(user, res)) return

    const owned = await getOwnedAssignment(user.id, req.params.id)
    if (!owned) return res.status(404).json({ error: 'Assignment not found.' })

    const input = cleanAssignmentInput(req.body || {})
    if (input.error) return res.status(400).json({ error: input.error })

    const { error } = await supabase.from('assignments')
      .update({ title: input.title, description: input.description, due_date: input.dueDate })
      .eq('id', owned.assignment.id)
    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    console.error('Update assignment error:', err)
    res.status(500).json({ error: 'Could not save your changes. Please try again.' })
  }
})

// Assignments that already have submissions can't be deleted (protects students' work and grades)
app.delete('/api/teacher/assignments/:id', verifyToken, teacherLimiter, async (req, res) => {
  try {
    const user = await loadTeacher(req.user)
    if (!user) return res.status(403).json({ error: 'Teachers only' })
    if (!requireVerified(user, res)) return

    const owned = await getOwnedAssignment(user.id, req.params.id)
    if (!owned) return res.status(404).json({ error: 'Assignment not found.' })

    const { data: subs } = await supabase.from('submissions').select('id').eq('assignment_id', owned.assignment.id).limit(1)
    if ((subs || []).length) {
      return res.status(409).json({ error: 'This assignment already has student submissions, so it can\'t be deleted.' })
    }

    const { error } = await supabase.from('assignments').delete().eq('id', owned.assignment.id)
    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    console.error('Delete assignment error:', err)
    res.status(500).json({ error: 'Could not delete the assignment. Please try again.' })
  }
})

// Every student in the class, with their submission (if any) for this assignment
app.get('/api/teacher/assignments/:id/submissions', verifyToken, teacherLimiter, async (req, res) => {
  try {
    const user = await loadTeacher(req.user)
    if (!user) return res.status(403).json({ error: 'Teachers only' })

    const owned = await getOwnedAssignment(user.id, req.params.id)
    if (!owned) return res.status(404).json({ error: 'Assignment not found.' })

    const roster = (await studentsByClass([owned.cls.id]))[owned.cls.id]
    const { data: subs } = await supabase
      .from('submissions').select('id, student_id, content, file_url, grade, feedback, status, submitted_at')
      .eq('assignment_id', owned.assignment.id)
    const byStudent = Object.fromEntries((subs || []).map(s => [s.student_id, s]))

    res.json({
      assignment: {
        id: owned.assignment.id, title: owned.assignment.title,
        description: owned.assignment.description || '', dueDate: owned.assignment.due_date,
        className: owned.cls.name,
      },
      rows: roster.map(student => {
        const sub = byStudent[student.id]
        return {
          student,
          submission: sub ? {
            id: sub.id, content: sub.content || '', fileUrl: sub.file_url || null,
            grade: hasNumericGrade(sub) ? Number(sub.grade) : null,
            feedback: sub.feedback || '', status: sub.status || 'submitted', submittedAt: sub.submitted_at,
          } : null,
        }
      }),
    })
  } catch (err) {
    console.error('Teacher submissions error:', err)
    res.status(500).json({ error: 'Could not load submissions.' })
  }
})

// Grade a student's work. If they have no submission yet (e.g. paper homework) one is created.
app.put('/api/teacher/assignments/:id/grade', verifyToken, teacherLimiter, async (req, res) => {
  try {
    const user = await loadTeacher(req.user)
    if (!user) return res.status(403).json({ error: 'Teachers only' })
    if (!requireVerified(user, res)) return

    const owned = await getOwnedAssignment(user.id, req.params.id)
    if (!owned) return res.status(404).json({ error: 'Assignment not found.' })

    const { studentId, grade, feedback } = req.body || {}
    const roster = (await studentsByClass([owned.cls.id]))[owned.cls.id]
    if (!roster.some(s => s.id === studentId)) {
      return res.status(400).json({ error: 'That student is not in this class.' })
    }

    const g = typeof grade === 'string' && grade.trim() === '' ? NaN : Number(grade)
    if (!Number.isFinite(g) || g < 0 || g > 100) {
      return res.status(400).json({ error: 'Enter a grade between 0 and 100.' })
    }
    const note = typeof feedback === 'string' ? feedback.trim().slice(0, 2000) : ''

    const { data: existing } = await supabase
      .from('submissions').select('id').eq('assignment_id', owned.assignment.id).eq('student_id', studentId).maybeSingle()

    const write = (extra) => existing
      ? supabase.from('submissions').update({ grade: g, feedback: note || null, ...extra }).eq('id', existing.id)
      : supabase.from('submissions').insert({
          assignment_id: owned.assignment.id, student_id: studentId, grade: g, feedback: note || null,
          submitted_at: new Date().toISOString(), ...extra,
        })

    let { error } = await write({ status: 'graded' })
    // If the status column only allows certain values, save the grade without it
    if (error && error.code === '23514') ({ error } = await write({}))
    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    console.error('Grade error:', err)
    res.status(500).json({ error: 'Could not save the grade. Please try again.' })
  }
})

// Per-student grade overview for one class
app.get('/api/teacher/progress', verifyToken, teacherLimiter, async (req, res) => {
  try {
    const user = await loadTeacher(req.user)
    if (!user) return res.status(403).json({ error: 'Teachers only' })

    if (!(await teacherTeaches(user.id, req.query.classId))) return res.status(404).json({ error: 'Class not found.' })
    const { data: clsRow } = await supabase.from('classes').select('id, name, grade').eq('id', req.query.classId).maybeSingle()
    if (!clsRow) return res.status(404).json({ error: 'Class not found.' })
    const cls = { id: clsRow.id, name: classLabel(clsRow) }

    const roster = (await studentsByClass([cls.id]))[cls.id]
    const { data: assignments } = await supabase.from('assignments').select('id').eq('class_id', cls.id).eq('created_by', user.id)
    const assignmentIds = (assignments || []).map(a => a.id)

    let subs = []
    if (assignmentIds.length) {
      const { data } = await supabase
        .from('submissions').select('assignment_id, student_id, grade').in('assignment_id', assignmentIds)
      subs = data || []
    }

    const students = roster.map(st => {
      const mine = subs.filter(s => s.student_id === st.id)
      const grades = mine.filter(hasNumericGrade).map(s => Number(s.grade))
      return {
        id: st.id, name: st.name,
        submitted: mine.length, graded: grades.length,
        average: grades.length ? Math.round((grades.reduce((t, x) => t + x, 0) / grades.length) * 10) / 10 : null,
      }
    })
    const averages = students.map(s => s.average).filter(a => a !== null)
    res.json({
      class: { id: cls.id, name: cls.name },
      assignmentCount: assignmentIds.length,
      classAverage: averages.length ? Math.round((averages.reduce((t, x) => t + x, 0) / averages.length) * 10) / 10 : null,
      students,
    })
  } catch (err) {
    console.error('Teacher progress error:', err)
    res.status(500).json({ error: 'Could not load progress.' })
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
    const ctx = await getStudentContext(req.user)
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

// ---------- Parent–child links (Phase 11) ----------
// A parent asks to be linked to a student. Either the student or an admin can accept or reject;
// whoever decides first settles it. parents.child_ids (student USER ids) is the single source of
// truth for what a parent may see, and every parent route checks it.
const parentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: (req) => req.user.id,
  message: { error: 'Too many requests. Wait a moment and try again.' },
})

const linkRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user.id,
  message: { error: 'Too many link requests. Please try again later.' },
})

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isUuid = (v) => typeof v === 'string' && UUID_RE.test(v)

async function loadUserWithRole(authUser, role) {
  const { data: user } = await supabase
    .from('users').select('id, name, role, org_id, is_verified').eq('id', authUser.id).maybeSingle()
  if (!user || user.role !== role) return null
  return user
}

async function getLinkedChildIds(parentId) {
  const { data } = await supabase.from('parents').select('child_ids').eq('user_id', parentId).maybeSingle()
  return Array.isArray(data?.child_ids) ? data.child_ids : []
}

async function addChildLink(parentId, studentId) {
  const { data: row, error } = await supabase.from('parents').select('id, child_ids').eq('user_id', parentId).maybeSingle()
  if (error) throw error
  if (!row) {
    const { error: insErr } = await supabase.from('parents').insert({ user_id: parentId, child_ids: [studentId] })
    if (insErr) throw insErr
    return
  }
  const ids = Array.isArray(row.child_ids) ? row.child_ids : []
  if (ids.includes(studentId)) return
  const { error: upErr } = await supabase.from('parents').update({ child_ids: [...ids, studentId] }).eq('id', row.id)
  if (upErr) throw upErr
}

async function removeChildLink(parentId, studentId) {
  const { data: row, error } = await supabase.from('parents').select('id, child_ids').eq('user_id', parentId).maybeSingle()
  if (error) throw error
  if (!row) return
  const ids = Array.isArray(row.child_ids) ? row.child_ids : []
  if (!ids.includes(studentId)) return
  const { error: upErr } = await supabase.from('parents').update({ child_ids: ids.filter(id => id !== studentId) }).eq('id', row.id)
  if (upErr) throw upErr
}

// Notifications are a nice-to-have; a failure here never breaks the request
async function notifyUser(userId, content, type = 'info') {
  const { error } = await supabase.from('notifications').insert({ user_id: userId, type, content })
  if (error) console.error('Notification insert failed:', error.message)
}

// { userId: { id, name, username, email } }. email is for admin-only routes; everything else must not return it.
async function usersById(ids) {
  const unique = [...new Set(ids.filter(Boolean))]
  if (!unique.length) return {}
  const { data } = await supabase.from('users').select('id, name, username, email').in('id', unique)
  return Object.fromEntries((data || []).map(u => [u.id, u]))
}

// { studentUserId: { grade, classLabel } }
async function studentBasics(userIds) {
  const unique = [...new Set(userIds.filter(Boolean))]
  if (!unique.length) return {}
  const { data: rows } = await supabase.from('students').select('user_id, grade, class_id').in('user_id', unique)
  const classIds = [...new Set((rows || []).map(r => r.class_id).filter(Boolean))]
  const classes = {}
  if (classIds.length) {
    const { data } = await supabase.from('classes').select('id, name, grade').in('id', classIds)
    for (const c of data || []) classes[c.id] = classLabel(c)
  }
  return Object.fromEntries((rows || []).map(r => [r.user_id, { grade: r.grade ?? null, classLabel: classes[r.class_id] || null }]))
}

// Never falls back to the email address: emails are visible to admins only
const displayName = (u) => (u && (u.name || u.username)) || 'Unknown'

// Accept or reject a pending request. The conditional update means the first decision wins,
// even if the student and an admin click at the same moment.
async function decideLinkRequest(requestId, action, actor, { onlyStudentId } = {}) {
  const { data: row } = await supabase.from('parent_child_requests').select('*').eq('id', requestId).maybeSingle()
  if (!row || (onlyStudentId && row.student_id !== onlyStudentId)) return { code: 404, error: 'Request not found.' }
  if (row.status !== 'pending') return { code: 409, error: 'This request has already been dealt with.' }

  const status = action === 'accept' ? 'accepted' : 'rejected'
  const { data: claimed, error } = await supabase.from('parent_child_requests')
    .update({ status, decided_by: actor.id, decided_by_role: actor.role, decided_at: new Date().toISOString() })
    .eq('id', requestId).eq('status', 'pending').select('id')
  if (error) throw error
  if (!claimed || !claimed.length) return { code: 409, error: 'This request has already been dealt with.' }

  if (status === 'accepted') {
    try {
      await addChildLink(row.parent_id, row.student_id)
    } catch (err) {
      // Put the request back so it can be tried again
      await supabase.from('parent_child_requests')
        .update({ status: 'pending', decided_by: null, decided_by_role: null, decided_at: null }).eq('id', requestId)
      throw err
    }
  }

  const people = await usersById([row.student_id])
  const childName = displayName(people[row.student_id])
  await notifyUser(
    row.parent_id,
    status === 'accepted'
      ? `Your request to link ${childName} was accepted. You can now see their progress.`
      : `Your request to link ${childName} was declined.`,
    status === 'accepted' ? 'success' : 'warning'
  )
  return { ok: true, status }
}

// Ends an accepted link. Access is revoked first; the request row is kept as a record.
async function removeLink(row, actor) {
  await removeChildLink(row.parent_id, row.student_id)
  const { error } = await supabase.from('parent_child_requests')
    .update({ status: 'removed', decided_by: actor.id, decided_by_role: actor.role, decided_at: new Date().toISOString() })
    .eq('id', row.id)
  if (error) throw error
}

const cleanAction = (v) => (v === 'accept' || v === 'reject' ? v : null)

// ----- Parent -----

// Linked children + requests that are still pending or were declined
app.get('/api/parent/children', verifyToken, parentLimiter, async (req, res) => {
  try {
    const user = await loadUserWithRole(req.user, 'parent')
    if (!user) return res.status(403).json({ error: 'Parents only' })

    const childIds = await getLinkedChildIds(user.id)
    const { data: reqs } = await supabase.from('parent_child_requests')
      .select('id, student_id, status, created_at, decided_at')
      .eq('parent_id', user.id).in('status', ['pending', 'rejected'])
      .order('created_at', { ascending: false })

    const allIds = [...childIds, ...(reqs || []).map(r => r.student_id)]
    const [people, basics] = await Promise.all([usersById(allIds), studentBasics(allIds)])

    const children = childIds.filter(id => people[id]).map(id => ({
      id,
      name: displayName(people[id]),
      grade: basics[id]?.grade ?? null,
      className: basics[id]?.classLabel ?? null,
    })).sort((a, b) => a.name.localeCompare(b.name))

    const requests = (reqs || []).filter(r => people[r.student_id]).map(r => ({
      id: r.id,
      studentId: r.student_id,
      studentName: displayName(people[r.student_id]),
      grade: basics[r.student_id]?.grade ?? null,
      status: r.status,
      createdAt: r.created_at,
      decidedAt: r.decided_at,
    }))

    res.json({ children, requests, isVerified: !!user.is_verified })
  } catch (err) {
    console.error('Parent children error:', err)
    res.status(500).json({ error: 'Could not load your children. Please try again.' })
  }
})

// Find students at the parent's own school by name. Only name and grade are returned.
app.get('/api/parent/students/search', verifyToken, parentLimiter, async (req, res) => {
  try {
    const user = await loadUserWithRole(req.user, 'parent')
    if (!user) return res.status(403).json({ error: 'Parents only' })
    if (!requireVerified(user, res)) return
    if (!user.org_id) return res.status(400).json({ error: 'Your account is not linked to a school yet.' })

    const q = String(req.query.q || '').trim().slice(0, 60)
    if (q.length < 2) return res.json({ students: [] })
    const escaped = q.replace(/[\\%_]/g, (m) => `\\${m}`)

    const { data: found, error } = await supabase.from('users')
      .select('id, name').eq('org_id', user.org_id).eq('role', 'student')
      .ilike('name', `%${escaped}%`).order('name').limit(10)
    if (error) throw error

    const ids = (found || []).map(u => u.id)
    const [basics, childIds, reqRes] = await Promise.all([
      studentBasics(ids),
      getLinkedChildIds(user.id),
      ids.length
        ? supabase.from('parent_child_requests').select('student_id, status').eq('parent_id', user.id).in('student_id', ids)
        : Promise.resolve({ data: [] }),
    ])
    const reqStatus = Object.fromEntries((reqRes.data || []).map(r => [r.student_id, r.status]))

    res.json({
      students: (found || []).map(u => ({
        id: u.id,
        name: u.name,
        grade: basics[u.id]?.grade ?? null,
        status: childIds.includes(u.id) ? 'linked'
          : (reqStatus[u.id] === 'pending' || reqStatus[u.id] === 'rejected') ? reqStatus[u.id] : null,
      })),
    })
  } catch (err) {
    console.error('Parent search error:', err)
    res.status(500).json({ error: 'Search failed. Please try again.' })
  }
})

// Ask to be linked to a student
app.post('/api/parent/link-requests', verifyToken, parentLimiter, linkRequestLimiter, async (req, res) => {
  try {
    const user = await loadUserWithRole(req.user, 'parent')
    if (!user) return res.status(403).json({ error: 'Parents only' })
    if (!requireVerified(user, res)) return

    const studentId = req.body?.studentId
    if (!isUuid(studentId)) return res.status(400).json({ error: 'Please choose a student.' })

    const { data: student } = await supabase.from('users')
      .select('id, name, role, org_id').eq('id', studentId).maybeSingle()
    if (!student || student.role !== 'student' || !user.org_id || student.org_id !== user.org_id) {
      return res.status(404).json({ error: 'We could not find that student at your school.' })
    }

    const { data: existing } = await supabase.from('parent_child_requests')
      .select('id, status').eq('parent_id', user.id).eq('student_id', studentId).maybeSingle()

    if (existing) {
      if (existing.status === 'pending') return res.status(409).json({ error: 'You already have a request waiting for this student.' })
      if (existing.status === 'accepted') return res.status(409).json({ error: 'You are already linked to this student.' })
      if (existing.status === 'rejected') {
        return res.status(403).json({ error: 'This request was declined. Please contact your school admin if you think this is a mistake.' })
      }
      // 'removed' → reopen the same row
      const { error } = await supabase.from('parent_child_requests')
        .update({ status: 'pending', org_id: user.org_id, decided_by: null, decided_by_role: null, decided_at: null, created_at: new Date().toISOString() })
        .eq('id', existing.id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('parent_child_requests')
        .insert({ parent_id: user.id, student_id: studentId, org_id: user.org_id })
      if (error) {
        if (error.code === '23505') return res.status(409).json({ error: 'You already have a request for this student.' })
        throw error
      }
    }

    await notifyUser(studentId, `${user.name || 'A parent'} asked to be linked to your account as your parent. Open your dashboard to accept or decline.`)
    res.json({ success: true })
  } catch (err) {
    console.error('Link request error:', err)
    res.status(500).json({ error: 'Could not send the request. Please try again.' })
  }
})

// Cancel one of my own requests that is still waiting
app.delete('/api/parent/link-requests/:id', verifyToken, parentLimiter, async (req, res) => {
  try {
    const user = await loadUserWithRole(req.user, 'parent')
    if (!user) return res.status(403).json({ error: 'Parents only' })
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Request not found.' })

    const { data, error } = await supabase.from('parent_child_requests')
      .delete().eq('id', req.params.id).eq('parent_id', user.id).eq('status', 'pending').select('id')
    if (error) throw error
    if (!data || !data.length) return res.status(404).json({ error: 'That request is no longer waiting.' })
    res.json({ success: true })
  } catch (err) {
    console.error('Cancel link request error:', err)
    res.status(500).json({ error: 'Could not cancel the request. Please try again.' })
  }
})

// Read-only view of one linked child. The child must be in this parent's child_ids.
app.get('/api/parent/children/:childId/overview', verifyToken, parentLimiter, async (req, res) => {
  try {
    const user = await loadUserWithRole(req.user, 'parent')
    if (!user) return res.status(403).json({ error: 'Parents only' })

    const childId = req.params.childId
    const childIds = await getLinkedChildIds(user.id)
    if (!isUuid(childId) || !childIds.includes(childId)) {
      return res.status(403).json({ error: 'That child is not linked to your account.' })
    }

    const { data: childUser } = await supabase.from('users')
      .select('id, name, role, org_id, is_verified').eq('id', childId).maybeSingle()
    if (!childUser || childUser.role !== 'student') return res.status(404).json({ error: 'Child not found.' })
    const { data: studentRow } = await supabase.from('students').select('*').eq('user_id', childId).maybeSingle()

    const overview = await buildStudentOverview(childUser, studentRow)
    res.json({ child: { id: childUser.id, name: childUser.name }, ...overview })
  } catch (err) {
    console.error('Parent child overview error:', err)
    res.status(500).json({ error: 'Could not load your child\'s progress. Please try again.' })
  }
})

// ----- Student -----

app.get('/api/student/link-requests', verifyToken, studentLimiter, async (req, res) => {
  try {
    const user = await loadUserWithRole(req.user, 'student')
    if (!user) return res.status(403).json({ error: 'Students only' })

    const { data: rows } = await supabase.from('parent_child_requests')
      .select('id, parent_id, status, created_at')
      .eq('student_id', user.id).in('status', ['pending', 'accepted'])
      .order('created_at', { ascending: false })
    const people = await usersById((rows || []).map(r => r.parent_id))

    res.json({
      pending: (rows || []).filter(r => r.status === 'pending' && people[r.parent_id])
        .map(r => ({ id: r.id, parentName: displayName(people[r.parent_id]), createdAt: r.created_at })),
      parents: (rows || []).filter(r => r.status === 'accepted' && people[r.parent_id])
        .map(r => ({ requestId: r.id, parentId: r.parent_id, parentName: displayName(people[r.parent_id]) })),
    })
  } catch (err) {
    console.error('Student link requests error:', err)
    res.status(500).json({ error: 'Could not load link requests.' })
  }
})

app.post('/api/student/link-requests/:id/decision', verifyToken, studentLimiter, async (req, res) => {
  try {
    const user = await loadUserWithRole(req.user, 'student')
    if (!user) return res.status(403).json({ error: 'Students only' })
    if (!requireVerified(user, res)) return
    const action = cleanAction(req.body?.action)
    if (!action) return res.status(400).json({ error: 'Choose accept or reject.' })
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Request not found.' })

    const result = await decideLinkRequest(req.params.id, action, { id: user.id, role: 'student' }, { onlyStudentId: user.id })
    if (result.error) return res.status(result.code).json({ error: result.error })
    res.json({ success: true, status: result.status })
  } catch (err) {
    console.error('Student decision error:', err)
    res.status(500).json({ error: 'Could not save your answer. Please try again.' })
  }
})

// Student removes a linked parent
app.delete('/api/student/parents/:parentId', verifyToken, studentLimiter, async (req, res) => {
  try {
    const user = await loadUserWithRole(req.user, 'student')
    if (!user) return res.status(403).json({ error: 'Students only' })
    if (!requireVerified(user, res)) return
    if (!isUuid(req.params.parentId)) return res.status(404).json({ error: 'Link not found.' })

    const { data: row } = await supabase.from('parent_child_requests').select('*')
      .eq('parent_id', req.params.parentId).eq('student_id', user.id).eq('status', 'accepted').maybeSingle()
    if (!row) return res.status(404).json({ error: 'That link no longer exists.' })

    await removeLink(row, { id: user.id, role: 'student' })
    res.json({ success: true })
  } catch (err) {
    console.error('Student unlink error:', err)
    res.status(500).json({ error: 'Could not remove the link. Please try again.' })
  }
})

// ----- Admin -----

app.get('/api/admin/link-requests', verifyToken, requireAdmin, async (req, res) => {
  try {
    const allowed = ['pending', 'accepted', 'rejected', 'removed']
    const status = allowed.includes(req.query.status) ? req.query.status : 'pending'

    const { data: rows, error } = await supabase.from('parent_child_requests')
      .select('id, parent_id, student_id, org_id, status, created_at, decided_at, decided_by_role')
      .eq('status', status).order('created_at', { ascending: false }).limit(200)
    if (error) throw error

    const people = await usersById((rows || []).flatMap(r => [r.parent_id, r.student_id]))
    const orgIds = [...new Set((rows || []).map(r => r.org_id).filter(Boolean))]
    const orgs = {}
    if (orgIds.length) {
      const { data } = await supabase.from('organizations').select('id, name').in('id', orgIds)
      for (const o of data || []) orgs[o.id] = o.name
    }

    res.json({
      requests: (rows || []).map(r => ({
        id: r.id,
        status: r.status,
        parentName: displayName(people[r.parent_id]),
        parentEmail: people[r.parent_id]?.email || '',
        studentName: displayName(people[r.student_id]),
        studentEmail: people[r.student_id]?.email || '',
        orgName: orgs[r.org_id] || null,
        createdAt: r.created_at,
        decidedAt: r.decided_at,
        decidedByRole: r.decided_by_role,
      })),
    })
  } catch (err) {
    console.error('Admin link requests error:', err)
    res.status(500).json({ error: 'Could not load link requests.' })
  }
})

app.post('/api/admin/link-requests/:id/decision', verifyToken, requireAdmin, async (req, res) => {
  try {
    const action = cleanAction(req.body?.action)
    if (!action) return res.status(400).json({ error: 'Choose accept or reject.' })
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Request not found.' })

    const result = await decideLinkRequest(req.params.id, action, { id: req.user.id, role: 'admin' })
    if (result.error) return res.status(result.code).json({ error: result.error })
    res.json({ success: true, status: result.status })
  } catch (err) {
    console.error('Admin decision error:', err)
    res.status(500).json({ error: 'Could not save the decision. Please try again.' })
  }
})

app.post('/api/admin/link-requests/:id/remove', verifyToken, requireAdmin, async (req, res) => {
  try {
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Request not found.' })
    const { data: row } = await supabase.from('parent_child_requests').select('*')
      .eq('id', req.params.id).eq('status', 'accepted').maybeSingle()
    if (!row) return res.status(404).json({ error: 'That link no longer exists.' })

    await removeLink(row, { id: req.user.id, role: 'admin' })
    res.json({ success: true })
  } catch (err) {
    console.error('Admin unlink error:', err)
    res.status(500).json({ error: 'Could not remove the link. Please try again.' })
  }
})

// ---------- Principal routes (Phase 12) ----------
// Every route is tied to the signed-in principal's own school (users.org_id). Nothing here accepts
// an org id from the browser, so a principal can never read or change another school's data.
const principalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: (req) => req.user.id,
  message: { error: 'Too many requests. Wait a moment and try again.' },
})

const DEFAULT_RISK_THRESHOLD = 50
const EVENT_TYPES = ['General', 'Academic', 'Sports', 'Meeting', 'Holiday', 'Other']
const PAGE_SIZE = 1000

async function principalOrFail(req, res) {
  const user = await loadUserWithRole(req.user, 'principal')
  if (!user) { res.status(403).json({ error: 'Principals only' }); return null }
  if (!user.org_id) { res.status(400).json({ error: 'Your account is not linked to a school yet.' }); return null }
  return user
}

// Supabase returns at most 1000 rows per request, so large schools need paging
async function fetchAllRows(build) {
  const out = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await build().range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    out.push(...(data || []))
    if (!data || data.length < PAGE_SIZE) break
  }
  return out
}

// `.in()` with hundreds of ids makes the request URL too long, so ids go in batches of 100.
// orderCols must identify rows uniquely so paging is stable.
async function fetchIn(table, select, column, values, orderCols = ['id']) {
  const unique = [...new Set((values || []).filter(Boolean))]
  const out = []
  for (let i = 0; i < unique.length; i += 100) {
    const chunk = unique.slice(i, i + 100)
    const rows = await fetchAllRows(() => {
      let q = supabase.from(table).select(select).in(column, chunk)
      for (const col of orderCols) q = q.order(col)
      return q
    })
    out.push(...rows)
  }
  return out
}

async function countOrgUsers(orgId, role) {
  const { count, error } = await supabase.from('users')
    .select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('role', role)
  if (error) throw error
  return count || 0
}

const round1 = (n) => Math.round(n * 10) / 10

// School-wide numbers. Grades are assumed to be out of 100. A grade only counts while the student
// is still in the class the assignment belongs to (same rule as the teacher pages).
async function computeSchoolStats(orgId, threshold) {
  const classRows = await fetchAllRows(() =>
    supabase.from('classes').select('id, name, grade').eq('org_id', orgId).order('id'))
  const classIds = classRows.map(c => c.id)

  const [studentRows, assignments] = await Promise.all([
    fetchIn('students', 'user_id, class_id', 'class_id', classIds),
    fetchIn('assignments', 'id, class_id', 'class_id', classIds),
  ])
  const subs = await fetchIn('submissions', 'assignment_id, student_id, grade', 'assignment_id', assignments.map(a => a.id))

  const studentClass = Object.fromEntries(studentRows.map(r => [r.user_id, r.class_id]))
  const assignmentClass = Object.fromEntries(assignments.map(a => [a.id, a.class_id]))

  const perClass = Object.fromEntries(classRows.map(c => [c.id, { students: 0, assignments: 0, graded: 0, sum: 0 }]))
  for (const r of studentRows) if (perClass[r.class_id]) perClass[r.class_id].students += 1
  for (const a of assignments) if (perClass[a.class_id]) perClass[a.class_id].assignments += 1

  const perStudent = {}
  let totalSum = 0
  let totalGraded = 0
  for (const sub of subs) {
    const classId = assignmentClass[sub.assignment_id]
    if (!classId || studentClass[sub.student_id] !== classId) continue
    if (!hasNumericGrade(sub)) continue
    const g = Number(sub.grade)
    perClass[classId].graded += 1
    perClass[classId].sum += g
    const st = (perStudent[sub.student_id] ||= { classId, sum: 0, count: 0 })
    st.sum += g
    st.count += 1
    totalSum += g
    totalGraded += 1
  }

  const atRiskRaw = Object.entries(perStudent)
    .map(([studentId, st]) => ({ studentId, classId: st.classId, average: round1(st.sum / st.count), gradedCount: st.count }))
    .filter(s => s.average < threshold)
    .sort((a, b) => a.average - b.average)

  const atRiskByClass = {}
  for (const s of atRiskRaw) atRiskByClass[s.classId] = (atRiskByClass[s.classId] || 0) + 1

  const classes = sortClasses(classRows.map(c => {
    const p = perClass[c.id]
    return {
      ...shapeClass(c),
      students: p.students,
      assignments: p.assignments,
      graded: p.graded,
      average: p.graded ? round1(p.sum / p.graded) : null,
      atRisk: atRiskByClass[c.id] || 0,
    }
  }))

  // Group by grade (assignments carry no subject yet, so grade level is the breakdown available)
  const byGradeMap = {}
  for (const c of classes) {
    const key = c.grade || '—'
    const g = (byGradeMap[key] ||= { grade: key, students: 0, graded: 0, sum: 0 })
    g.students += c.students
    g.graded += c.graded
    g.sum += (c.average ?? 0) * c.graded
  }
  const grades = Object.values(byGradeMap)
    .map(g => ({ grade: g.grade, students: g.students, graded: g.graded, average: g.graded ? round1(g.sum / g.graded) : null }))
    .sort((a, b) => (Number(a.grade) || 0) - (Number(b.grade) || 0))

  const shown = atRiskRaw.slice(0, 100)
  const people = await usersById(shown.map(s => s.studentId))
  const classLabelById = Object.fromEntries(classes.map(c => [c.id, c.name]))
  const atRisk = shown.map(s => ({
    studentId: s.studentId,
    name: displayName(people[s.studentId]),
    className: classLabelById[s.classId] || '',
    average: s.average,
    gradedCount: s.gradedCount,
  }))

  return {
    average: totalGraded ? round1(totalSum / totalGraded) : null,
    gradedCount: totalGraded,
    classes,
    grades,
    atRisk,
    atRiskTotal: atRiskRaw.length,
  }
}

async function orgCounts(orgId) {
  const [students, teachers, parents, classRes] = await Promise.all([
    countOrgUsers(orgId, 'student'),
    countOrgUsers(orgId, 'teacher'),
    countOrgUsers(orgId, 'parent'),
    supabase.from('classes').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
  ])
  if (classRes.error) throw classRes.error
  return { students, teachers, parents, classes: classRes.count || 0 }
}

app.get('/api/principal/overview', verifyToken, principalLimiter, async (req, res) => {
  try {
    const user = await principalOrFail(req, res)
    if (!user) return
    const nowIso = new Date().toISOString()

    const [orgRes, counts, stats, eventsRes] = await Promise.all([
      supabase.from('organizations').select('id, name').eq('id', user.org_id).maybeSingle(),
      orgCounts(user.org_id),
      computeSchoolStats(user.org_id, DEFAULT_RISK_THRESHOLD),
      supabase.from('events').select('id, title, date, location, type')
        .eq('org_id', user.org_id).gte('date', nowIso).order('date', { ascending: true }).limit(5),
    ])

    res.json({
      org: orgRes.data || null,
      isVerified: !!user.is_verified,
      counts,
      average: stats.average,
      gradedCount: stats.gradedCount,
      atRiskCount: stats.atRiskTotal,
      riskThreshold: DEFAULT_RISK_THRESHOLD,
      events: eventsRes.data || [],
    })
  } catch (err) {
    console.error('Principal overview error:', err)
    res.status(500).json({ error: 'Could not load the school overview. Please try again.' })
  }
})

app.get('/api/principal/stats', verifyToken, principalLimiter, async (req, res) => {
  try {
    const user = await principalOrFail(req, res)
    if (!user) return

    let threshold = Number(req.query.threshold)
    if (!Number.isFinite(threshold)) threshold = DEFAULT_RISK_THRESHOLD
    threshold = Math.min(100, Math.max(1, Math.round(threshold)))

    const [counts, stats] = await Promise.all([orgCounts(user.org_id), computeSchoolStats(user.org_id, threshold)])
    res.json({ threshold, counts, ...stats })
  } catch (err) {
    console.error('Principal stats error:', err)
    res.status(500).json({ error: 'Could not load the school statistics. Please try again.' })
  }
})

// Teachers with their class loads, plus other school staff
app.get('/api/principal/staff', verifyToken, principalLimiter, async (req, res) => {
  try {
    const user = await principalOrFail(req, res)
    if (!user) return

    const [teacherUsers, memberUsers, classRows] = await Promise.all([
      fetchAllRows(() => supabase.from('users').select('id, name, username, is_verified')
        .eq('org_id', user.org_id).eq('role', 'teacher').order('name').order('id')),
      fetchAllRows(() => supabase.from('users').select('id, name, username, is_verified')
        .eq('org_id', user.org_id).eq('role', 'schoolmember').order('name').order('id')),
      fetchAllRows(() => supabase.from('classes').select('id, name, grade').eq('org_id', user.org_id).order('id')),
    ])

    const classById = Object.fromEntries(classRows.map(c => [c.id, c]))
    const [links, studentRows, memberRows] = await Promise.all([
      fetchIn('teacher_classes', 'teacher_id, class_id', 'teacher_id', teacherUsers.map(t => t.id), ['teacher_id', 'class_id']),
      fetchIn('students', 'class_id', 'class_id', classRows.map(c => c.id)),
      fetchIn('school_members', 'user_id, department', 'user_id', memberUsers.map(m => m.id), ['user_id']),
    ])

    const studentsInClass = {}
    for (const r of studentRows) studentsInClass[r.class_id] = (studentsInClass[r.class_id] || 0) + 1

    const classesOf = {}
    for (const l of links) {
      const c = classById[l.class_id]
      if (c) (classesOf[l.teacher_id] ||= []).push(c)   // ignore links to classes at other schools
    }

    const teachers = teacherUsers.map(t => {
      const list = sortClasses((classesOf[t.id] || []).map(shapeClass))
      return {
        id: t.id,
        name: displayName(t),
        username: t.username || '',
        isVerified: !!t.is_verified,
        classes: list.map(c => c.name),
        classCount: list.length,
        studentCount: list.reduce((n, c) => n + (studentsInClass[c.id] || 0), 0),
      }
    })

    const departments = Object.fromEntries(memberRows.map(r => [r.user_id, r.department]))
    const members = memberUsers.map(m => ({
      id: m.id,
      name: displayName(m),
      username: m.username || '',
      isVerified: !!m.is_verified,
      department: departments[m.id] || null,
    }))

    res.json({ teachers, members })
  } catch (err) {
    console.error('Principal staff error:', err)
    res.status(500).json({ error: 'Could not load the staff list. Please try again.' })
  }
})

// ----- Principal events -----

function cleanEventInput(body) {
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  if (!title) return { error: 'Please give the event a title.' }
  if (title.length > 150) return { error: 'The title is too long (max 150 characters).' }
  const description = typeof body.description === 'string' ? body.description.trim() : ''
  if (description.length > 2000) return { error: 'The description is too long (max 2000 characters).' }
  const location = typeof body.location === 'string' ? body.location.trim() : ''
  if (location.length > 150) return { error: 'The location is too long (max 150 characters).' }
  const type = EVENT_TYPES.includes(body.type) ? body.type : 'General'
  if (!body.date) return { error: 'Please choose a date and time.' }
  const d = new Date(body.date)
  if (Number.isNaN(d.getTime())) return { error: 'That date is not valid.' }
  return { title, description: description || null, location: location || null, type, date: d.toISOString() }
}

app.get('/api/principal/events', verifyToken, principalLimiter, async (req, res) => {
  try {
    const user = await principalOrFail(req, res)
    if (!user) return
    const { data, error } = await supabase.from('events')
      .select('id, title, description, date, location, type, created_by')
      .eq('org_id', user.org_id).order('date', { ascending: false }).limit(300)
    if (error) throw error
    res.json({ events: data || [], types: EVENT_TYPES })
  } catch (err) {
    console.error('Principal events error:', err)
    res.status(500).json({ error: 'Could not load events. Please try again.' })
  }
})

app.post('/api/principal/events', verifyToken, principalLimiter, async (req, res) => {
  try {
    const user = await principalOrFail(req, res)
    if (!user) return
    if (!requireVerified(user, res)) return
    const input = cleanEventInput(req.body || {})
    if (input.error) return res.status(400).json({ error: input.error })

    const { data, error } = await supabase.from('events')
      .insert({ ...input, org_id: user.org_id, created_by: user.id }).select('id').single()
    if (error) throw error
    res.json({ success: true, id: data.id })
  } catch (err) {
    console.error('Create event error:', err)
    res.status(500).json({ error: 'Could not save the event. Please try again.' })
  }
})

app.put('/api/principal/events/:id', verifyToken, principalLimiter, async (req, res) => {
  try {
    const user = await principalOrFail(req, res)
    if (!user) return
    if (!requireVerified(user, res)) return
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Event not found.' })
    const input = cleanEventInput(req.body || {})
    if (input.error) return res.status(400).json({ error: input.error })

    // org_id in the filter means another school's event can never be edited
    const { data, error } = await supabase.from('events')
      .update(input).eq('id', req.params.id).eq('org_id', user.org_id).select('id')
    if (error) throw error
    if (!data || !data.length) return res.status(404).json({ error: 'Event not found.' })
    res.json({ success: true })
  } catch (err) {
    console.error('Update event error:', err)
    res.status(500).json({ error: 'Could not save your changes. Please try again.' })
  }
})

app.delete('/api/principal/events/:id', verifyToken, principalLimiter, async (req, res) => {
  try {
    const user = await principalOrFail(req, res)
    if (!user) return
    if (!requireVerified(user, res)) return
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Event not found.' })

    const { data, error } = await supabase.from('events')
      .delete().eq('id', req.params.id).eq('org_id', user.org_id).select('id')
    if (error) throw error
    if (!data || !data.length) return res.status(404).json({ error: 'Event not found.' })
    res.json({ success: true })
  } catch (err) {
    console.error('Delete event error:', err)
    res.status(500).json({ error: 'Could not delete the event. Please try again.' })
  }
})

// ---------- Tutor routes (Phase 13) ----------
// A tutor works with students from their own organisation. Students are added to the tutor
// (tutor_students) and sessions can only be booked for students on that list. Parents only ever
// see sessions of children in their own child_ids, and only notes the tutor chose to share.
const tutorLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: (req) => req.user.id,
  message: { error: 'Too many requests. Wait a moment and try again.' },
})

const SESSION_STATUSES = ['scheduled', 'completed', 'cancelled']

async function tutorOrFail(req, res) {
  const user = await loadUserWithRole(req.user, 'tutor')
  if (!user) { res.status(403).json({ error: 'Tutors only' }); return null }
  if (!user.org_id) { res.status(400).json({ error: 'Your account is not linked to an organisation yet.' }); return null }
  return user
}

const SESSION_COLUMNS = 'id, tutor_id, student_id, starts_at, duration_minutes, subject, notes, share_notes_with_parents, status'

function shapeSession(r, people) {
  return {
    id: r.id,
    studentId: r.student_id,
    studentName: displayName(people[r.student_id]),
    startsAt: r.starts_at,
    durationMinutes: r.duration_minutes,
    subject: r.subject || null,
    notes: r.notes || null,
    shareNotesWithParents: !!r.share_notes_with_parents,
    status: r.status,
  }
}

// Validates the fields a tutor can set on a session. With partial=true only provided fields are checked.
function cleanSessionInput(body, { partial = false } = {}) {
  const out = {}
  if (!partial || body.startsAt !== undefined) {
    const d = new Date(body.startsAt)
    if (!body.startsAt || Number.isNaN(d.getTime())) return { error: 'Please choose a valid date and time.' }
    out.starts_at = d.toISOString()
  }
  if (!partial || body.durationMinutes !== undefined) {
    const n = body.durationMinutes === undefined ? 60 : Math.round(Number(body.durationMinutes))
    if (!Number.isFinite(n) || n < 5 || n > 480) return { error: 'Duration must be between 5 and 480 minutes.' }
    out.duration_minutes = n
  }
  if (body.subject !== undefined) {
    const s = typeof body.subject === 'string' ? body.subject.trim() : ''
    if (s.length > 100) return { error: 'The subject is too long (max 100 characters).' }
    out.subject = s || null
  }
  if (body.notes !== undefined) {
    const n = typeof body.notes === 'string' ? body.notes.trim() : ''
    if (n.length > 2000) return { error: 'The notes are too long (max 2000 characters).' }
    out.notes = n || null
  }
  if (body.shareNotesWithParents !== undefined) out.share_notes_with_parents = body.shareNotesWithParents === true
  if (body.status !== undefined) {
    if (!SESSION_STATUSES.includes(body.status)) return { error: 'That status is not valid.' }
    out.status = body.status
  }
  return { value: out }
}

app.get('/api/tutor/overview', verifyToken, tutorLimiter, async (req, res) => {
  try {
    const user = await tutorOrFail(req, res)
    if (!user) return
    const nowIso = new Date().toISOString()

    const [orgRes, studentsRes, upcomingRes, upcomingCountRes, completedRes] = await Promise.all([
      supabase.from('organizations').select('id, name').eq('id', user.org_id).maybeSingle(),
      supabase.from('tutor_students').select('id', { count: 'exact', head: true }).eq('tutor_id', user.id),
      supabase.from('tutor_sessions').select(SESSION_COLUMNS).eq('tutor_id', user.id)
        .eq('status', 'scheduled').gte('starts_at', nowIso).order('starts_at', { ascending: true }).limit(5),
      supabase.from('tutor_sessions').select('id', { count: 'exact', head: true }).eq('tutor_id', user.id)
        .eq('status', 'scheduled').gte('starts_at', nowIso),
      supabase.from('tutor_sessions').select('id', { count: 'exact', head: true }).eq('tutor_id', user.id).eq('status', 'completed'),
    ])
    for (const r of [studentsRes, upcomingRes, upcomingCountRes, completedRes]) if (r.error) throw r.error

    const rows = upcomingRes.data || []
    const people = await usersById(rows.map(r => r.student_id))

    res.json({
      org: orgRes.data || null,
      isVerified: !!user.is_verified,
      studentCount: studentsRes.count || 0,
      upcomingCount: upcomingCountRes.count || 0,
      completedCount: completedRes.count || 0,
      upcoming: rows.map(r => shapeSession(r, people)),
    })
  } catch (err) {
    console.error('Tutor overview error:', err)
    res.status(500).json({ error: 'Could not load your overview. Please try again.' })
  }
})

app.get('/api/tutor/students', verifyToken, tutorLimiter, async (req, res) => {
  try {
    const user = await tutorOrFail(req, res)
    if (!user) return

    const links = await fetchAllRows(() =>
      supabase.from('tutor_students').select('student_id, created_at').eq('tutor_id', user.id).order('id'))
    const ids = links.map(l => l.student_id)
    const [people, basics, sessions] = await Promise.all([
      usersById(ids),
      studentBasics(ids),
      fetchAllRows(() => supabase.from('tutor_sessions').select('student_id, starts_at, status').eq('tutor_id', user.id).order('id')),
    ])

    const now = Date.now()
    const stats = {}
    for (const s of sessions) {
      const st = (stats[s.student_id] ||= { total: 0, completed: 0, next: null, last: null })
      st.total += 1
      const t = new Date(s.starts_at).getTime()
      if (s.status === 'completed') {
        st.completed += 1
        if (!st.last || t > new Date(st.last).getTime()) st.last = s.starts_at
      }
      if (s.status === 'scheduled' && t >= now && (!st.next || t < new Date(st.next).getTime())) st.next = s.starts_at
    }

    const students = links.filter(l => people[l.student_id]).map(l => ({
      id: l.student_id,
      name: displayName(people[l.student_id]),
      grade: basics[l.student_id]?.grade ?? null,
      sessionCount: stats[l.student_id]?.total || 0,
      completedCount: stats[l.student_id]?.completed || 0,
      nextSession: stats[l.student_id]?.next || null,
      lastSession: stats[l.student_id]?.last || null,
    })).sort((a, b) => a.name.localeCompare(b.name))

    res.json({ students })
  } catch (err) {
    console.error('Tutor students error:', err)
    res.status(500).json({ error: 'Could not load your students. Please try again.' })
  }
})

// Find students in the tutor's own organisation by name. Only name and grade are returned.
app.get('/api/tutor/students/search', verifyToken, tutorLimiter, async (req, res) => {
  try {
    const user = await tutorOrFail(req, res)
    if (!user) return
    if (!requireVerified(user, res)) return

    const q = String(req.query.q || '').trim().slice(0, 60)
    if (q.length < 2) return res.json({ students: [] })
    const escaped = q.replace(/[\\%_]/g, (m) => `\\${m}`)

    const { data: found, error } = await supabase.from('users')
      .select('id, name').eq('org_id', user.org_id).eq('role', 'student')
      .ilike('name', `%${escaped}%`).order('name').limit(10)
    if (error) throw error

    const ids = (found || []).map(u => u.id)
    const [basics, linkRes] = await Promise.all([
      studentBasics(ids),
      ids.length
        ? supabase.from('tutor_students').select('student_id').eq('tutor_id', user.id).in('student_id', ids)
        : Promise.resolve({ data: [] }),
    ])
    const added = new Set((linkRes.data || []).map(r => r.student_id))

    res.json({
      students: (found || []).map(u => ({ id: u.id, name: u.name, grade: basics[u.id]?.grade ?? null, added: added.has(u.id) })),
    })
  } catch (err) {
    console.error('Tutor search error:', err)
    res.status(500).json({ error: 'Search failed. Please try again.' })
  }
})

app.post('/api/tutor/students', verifyToken, tutorLimiter, async (req, res) => {
  try {
    const user = await tutorOrFail(req, res)
    if (!user) return
    if (!requireVerified(user, res)) return

    const studentId = req.body?.studentId
    if (!isUuid(studentId)) return res.status(400).json({ error: 'Please choose a student.' })

    const { data: student } = await supabase.from('users')
      .select('id, role, org_id').eq('id', studentId).maybeSingle()
    if (!student || student.role !== 'student' || student.org_id !== user.org_id) {
      return res.status(404).json({ error: 'We could not find that student in your organisation.' })
    }

    const { error } = await supabase.from('tutor_students')
      .insert({ tutor_id: user.id, student_id: studentId, org_id: user.org_id })
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'This student is already on your list.' })
      throw error
    }
    res.json({ success: true })
  } catch (err) {
    console.error('Add tutor student error:', err)
    res.status(500).json({ error: 'Could not add the student. Please try again.' })
  }
})

// Removing a student keeps the session history; it only stops new sessions being booked
app.delete('/api/tutor/students/:studentId', verifyToken, tutorLimiter, async (req, res) => {
  try {
    const user = await tutorOrFail(req, res)
    if (!user) return
    if (!isUuid(req.params.studentId)) return res.status(404).json({ error: 'Student not found.' })

    const { data, error } = await supabase.from('tutor_students')
      .delete().eq('tutor_id', user.id).eq('student_id', req.params.studentId).select('id')
    if (error) throw error
    if (!data || !data.length) return res.status(404).json({ error: 'That student is not on your list.' })
    res.json({ success: true })
  } catch (err) {
    console.error('Remove tutor student error:', err)
    res.status(500).json({ error: 'Could not remove the student. Please try again.' })
  }
})

app.get('/api/tutor/sessions', verifyToken, tutorLimiter, async (req, res) => {
  try {
    const user = await tutorOrFail(req, res)
    if (!user) return

    let q = supabase.from('tutor_sessions').select(SESSION_COLUMNS).eq('tutor_id', user.id)
    if (req.query.studentId !== undefined) {
      if (!isUuid(req.query.studentId)) return res.status(400).json({ error: 'That student is not valid.' })
      q = q.eq('student_id', req.query.studentId)
    }
    const { data, error } = await q.order('starts_at', { ascending: false }).limit(500)
    if (error) throw error

    const people = await usersById((data || []).map(r => r.student_id))
    res.json({ sessions: (data || []).map(r => shapeSession(r, people)) })
  } catch (err) {
    console.error('Tutor sessions error:', err)
    res.status(500).json({ error: 'Could not load sessions. Please try again.' })
  }
})

app.post('/api/tutor/sessions', verifyToken, tutorLimiter, async (req, res) => {
  try {
    const user = await tutorOrFail(req, res)
    if (!user) return
    if (!requireVerified(user, res)) return
    const body = req.body || {}

    if (!isUuid(body.studentId)) return res.status(400).json({ error: 'Please choose a student.' })
    const { data: link } = await supabase.from('tutor_students').select('id')
      .eq('tutor_id', user.id).eq('student_id', body.studentId).maybeSingle()
    if (!link) return res.status(403).json({ error: 'Add this student to your list before booking a session.' })

    const input = cleanSessionInput(body)
    if (input.error) return res.status(400).json({ error: input.error })
    if (input.value.status === 'completed') input.value.status = 'scheduled'

    const { data, error } = await supabase.from('tutor_sessions')
      .insert({ ...input.value, tutor_id: user.id, student_id: body.studentId, org_id: user.org_id }).select('id').single()
    if (error) throw error

    await notifyUser(body.studentId, `${user.name || 'Your tutor'} scheduled a tutoring session with you. Check your dashboard for the time.`)
    res.json({ success: true, id: data.id })
  } catch (err) {
    console.error('Create session error:', err)
    res.status(500).json({ error: 'Could not save the session. Please try again.' })
  }
})

app.put('/api/tutor/sessions/:id', verifyToken, tutorLimiter, async (req, res) => {
  try {
    const user = await tutorOrFail(req, res)
    if (!user) return
    if (!requireVerified(user, res)) return
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Session not found.' })

    const input = cleanSessionInput(req.body || {}, { partial: true })
    if (input.error) return res.status(400).json({ error: input.error })
    if (!Object.keys(input.value).length) return res.status(400).json({ error: 'Nothing to change.' })

    // tutor_id in the filter means a tutor can only change their own sessions
    const { data, error } = await supabase.from('tutor_sessions')
      .update({ ...input.value, updated_at: new Date().toISOString() })
      .eq('id', req.params.id).eq('tutor_id', user.id).select('id')
    if (error) throw error
    if (!data || !data.length) return res.status(404).json({ error: 'Session not found.' })
    res.json({ success: true })
  } catch (err) {
    console.error('Update session error:', err)
    res.status(500).json({ error: 'Could not save your changes. Please try again.' })
  }
})

app.delete('/api/tutor/sessions/:id', verifyToken, tutorLimiter, async (req, res) => {
  try {
    const user = await tutorOrFail(req, res)
    if (!user) return
    if (!requireVerified(user, res)) return
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Session not found.' })

    const { data, error } = await supabase.from('tutor_sessions')
      .delete().eq('id', req.params.id).eq('tutor_id', user.id).select('id')
    if (error) throw error
    if (!data || !data.length) return res.status(404).json({ error: 'Session not found.' })
    res.json({ success: true })
  } catch (err) {
    console.error('Delete session error:', err)
    res.status(500).json({ error: 'Could not delete the session. Please try again.' })
  }
})

// ----- Student: next tutoring sessions (no notes) -----

app.get('/api/student/tutor-sessions', verifyToken, studentLimiter, async (req, res) => {
  try {
    const user = await loadUserWithRole(req.user, 'student')
    if (!user) return res.status(403).json({ error: 'Students only' })

    const { data, error } = await supabase.from('tutor_sessions')
      .select('id, tutor_id, starts_at, duration_minutes, subject')
      .eq('student_id', user.id).eq('status', 'scheduled').gte('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true }).limit(3)
    if (error) throw error

    const tutors = await usersById((data || []).map(r => r.tutor_id))
    res.json({
      sessions: (data || []).map(r => ({
        id: r.id,
        tutorName: displayName(tutors[r.tutor_id]),
        startsAt: r.starts_at,
        durationMinutes: r.duration_minutes,
        subject: r.subject || null,
      })),
    })
  } catch (err) {
    console.error('Student tutor sessions error:', err)
    res.status(500).json({ error: 'Could not load tutoring sessions.' })
  }
})

// ----- Parent: a linked child's tutoring sessions (notes only when the tutor shared them) -----

app.get('/api/parent/children/:childId/tutor-sessions', verifyToken, parentLimiter, async (req, res) => {
  try {
    const user = await loadUserWithRole(req.user, 'parent')
    if (!user) return res.status(403).json({ error: 'Parents only' })

    const childId = req.params.childId
    const childIds = await getLinkedChildIds(user.id)
    if (!isUuid(childId) || !childIds.includes(childId)) {
      return res.status(403).json({ error: 'That child is not linked to your account.' })
    }

    const { data, error } = await supabase.from('tutor_sessions')
      .select('id, tutor_id, starts_at, duration_minutes, subject, notes, share_notes_with_parents, status')
      .eq('student_id', childId).neq('status', 'cancelled')
      .order('starts_at', { ascending: false }).limit(100)
    if (error) throw error

    const tutors = await usersById((data || []).map(r => r.tutor_id))
    res.json({
      sessions: (data || []).map(r => ({
        id: r.id,
        tutorName: displayName(tutors[r.tutor_id]),
        startsAt: r.starts_at,
        durationMinutes: r.duration_minutes,
        subject: r.subject || null,
        status: r.status,
        notes: r.share_notes_with_parents ? (r.notes || null) : null,
      })),
    })
  } catch (err) {
    console.error('Parent tutor sessions error:', err)
    res.status(500).json({ error: 'Could not load tutoring sessions. Please try again.' })
  }
})

// ---------- Admin: platform management (Phase 14) ----------
// Everything here sits behind verifyToken + requireAdmin and uses the service role key, so none of
// it can be reached from the browser without an admin login.
const ADMIN_USER_ROLES = ['student', 'teacher', 'parent', 'principal', 'tutor', 'schoolmember', 'admin']
const USERS_PAGE_SIZE = 50
const EXPORT_MAX_ROWS = 10000
const SUSPEND_FOR = '876000h'   // about 100 years: effectively "until an admin lifts it"
const ORG_TYPES = ['school', 'tutor']
const USER_LIST_COLUMNS = 'id, email, name, role, org_id, is_verified, is_suspended, created_at'

const escapeLike = (s) => s.replace(/[\\%_]/g, (m) => `\\${m}`)

// Applies the list filters (role, organisation, verified, suspended, search) to a users query
function applyUserFilters(q, query) {
  if (ADMIN_USER_ROLES.includes(query.role)) q = q.eq('role', query.role)
  if (isUuid(query.orgId)) q = q.eq('org_id', query.orgId)
  if (query.verified === 'true') q = q.eq('is_verified', true)
  if (query.verified === 'false') q = q.eq('is_verified', false)
  if (query.suspended === 'true') q = q.eq('is_suspended', true)
  const term = String(query.search || '').trim().slice(0, 80)
  if (term) q = term.includes('@') ? q.ilike('email', `%${escapeLike(term)}%`) : q.ilike('name', `%${escapeLike(term)}%`)
  return q
}

async function orgNamesById(ids) {
  const unique = [...new Set(ids.filter(Boolean))]
  if (!unique.length) return {}
  const rows = await fetchIn('organizations', 'id, name', 'id', unique)
  return Object.fromEntries(rows.map(o => [o.id, o.name]))
}

// Spreadsheet programs run cells that start with = + - @ as formulas, so those get a leading '
function csvCell(value) {
  let s = value === null || value === undefined ? '' : String(value)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

app.get('/api/admin/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const from = (page - 1) * USERS_PAGE_SIZE
    const { data, error, count } = await applyUserFilters(
      supabase.from('users').select(USER_LIST_COLUMNS, { count: 'exact' }), req.query)
      .order('created_at', { ascending: false }).order('id').range(from, from + USERS_PAGE_SIZE - 1)
    if (error) throw error

    const orgs = await orgNamesById((data || []).map(u => u.org_id))
    res.json({
      users: (data || []).map(u => ({
        id: u.id,
        name: u.name || '',
        email: u.email || '',
        role: u.role,
        orgId: u.org_id,
        orgName: orgs[u.org_id] || null,
        isVerified: !!u.is_verified,
        isSuspended: !!u.is_suspended,
        createdAt: u.created_at,
      })),
      total: count || 0,
      page,
      pages: Math.max(1, Math.ceil((count || 0) / USERS_PAGE_SIZE)),
    })
  } catch (err) {
    console.error('Admin users error:', err)
    res.status(500).json({ error: 'Could not load users. Please try again.' })
  }
})

// CSV of the users matching the current filters (built here so the browser never needs the full list)
app.get('/api/admin/users/export', verifyToken, requireAdmin, async (req, res) => {
  try {
    const rows = []
    let truncated = false
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await applyUserFilters(supabase.from('users').select(USER_LIST_COLUMNS), req.query)
        .order('created_at', { ascending: false }).order('id').range(from, from + PAGE_SIZE - 1)
      if (error) throw error
      rows.push(...(data || []))
      if (!data || data.length < PAGE_SIZE) break
      if (rows.length >= EXPORT_MAX_ROWS) { truncated = true; break }
    }

    const orgs = await orgNamesById(rows.map(u => u.org_id))
    const header = ['Name', 'Email', 'Role', 'Organisation', 'Verified', 'Suspended', 'Signed up']
    const lines = [header.map(csvCell).join(',')]
    for (const u of rows) {
      lines.push([
        u.name, u.email, u.role, orgs[u.org_id] || '',
        u.is_verified ? 'Yes' : 'No', u.is_suspended ? 'Yes' : 'No',
        u.created_at ? new Date(u.created_at).toISOString().slice(0, 10) : '',
      ].map(csvCell).join(','))
    }
    res.json({ csv: lines.join('\r\n'), count: rows.length, truncated })
  } catch (err) {
    console.error('Admin export error:', err)
    res.status(500).json({ error: 'Could not export users. Please try again.' })
  }
})

// Verify, suspend or unsuspend one user. Suspending blocks sign-in through Supabase Auth itself.
app.post('/api/admin/users/:id/action', verifyToken, requireAdmin, async (req, res) => {
  try {
    const action = req.body?.action
    if (!['verify', 'suspend', 'unsuspend'].includes(action)) return res.status(400).json({ error: 'Choose verify, suspend or unsuspend.' })
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'User not found.' })

    const { data: target } = await supabase.from('users')
      .select('id, role, is_verified, is_suspended').eq('id', req.params.id).maybeSingle()
    if (!target) return res.status(404).json({ error: 'User not found.' })

    if (action === 'verify') {
      const { error } = await supabase.from('users').update({ is_verified: true }).eq('id', target.id)
      if (error) throw error
      if (!target.is_verified) await notifyUser(target.id, 'Your account has been verified. You now have full access.', 'success')
      return res.json({ success: true })
    }

    if (target.id === req.user.id || target.role === 'admin') {
      return res.status(403).json({ error: 'Admin accounts cannot be suspended.' })
    }

    // Auth first: if it fails, the flag in the list never claims something that isn't true
    const { error: authErr } = await supabase.auth.admin.updateUserById(target.id, {
      ban_duration: action === 'suspend' ? SUSPEND_FOR : 'none',
    })
    if (authErr) {
      console.error('Suspend auth error:', authErr)
      return res.status(500).json({ error: 'Could not update the account: ' + authErr.message })
    }
    const { error } = await supabase.from('users').update({
      is_suspended: action === 'suspend',
      suspended_at: action === 'suspend' ? new Date().toISOString() : null,
    }).eq('id', target.id)
    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    console.error('Admin user action error:', err)
    res.status(500).json({ error: 'Could not update the user. Please try again.' })
  }
})

// Permanently deletes a user and everything tied to their account
app.delete('/api/admin/users/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'User not found.' })
    const { data: target } = await supabase.from('users').select('id, role').eq('id', req.params.id).maybeSingle()
    if (!target) return res.status(404).json({ error: 'User not found.' })
    if (target.id === req.user.id || target.role === 'admin') {
      return res.status(403).json({ error: 'Admin accounts cannot be deleted.' })
    }

    for (const table of ROLE_TABLES) {
      await supabase.from(table).delete().eq('user_id', target.id)
    }
    const { error: authErr } = await supabase.auth.admin.deleteUser(target.id)
    if (authErr) {
      console.error('Admin delete failed:', authErr)
      return res.status(500).json({ error: 'Could not delete the user: ' + authErr.message })
    }
    await supabase.from('users').delete().eq('id', target.id) // no-op if it already cascaded
    res.json({ success: true })
  } catch (err) {
    console.error('Admin delete user error:', err)
    res.status(500).json({ error: 'Could not delete the user. Please try again.' })
  }
})

// Verify everyone still waiting in one organisation
app.post('/api/admin/orgs/:orgId/verify-all', verifyToken, requireAdmin, async (req, res) => {
  try {
    if (!isUuid(req.params.orgId)) return res.status(404).json({ error: 'Organisation not found.' })
    const { data, error } = await supabase.from('users').update({ is_verified: true })
      .eq('org_id', req.params.orgId).eq('is_verified', false).neq('role', 'admin').select('id')
    if (error) throw error
    res.json({ success: true, count: (data || []).length })
  } catch (err) {
    console.error('Verify all error:', err)
    res.status(500).json({ error: 'Could not verify the users. Please try again.' })
  }
})

// ----- Organisations -----

app.get('/api/admin/orgs', verifyToken, requireAdmin, async (req, res) => {
  try {
    const orgs = await fetchAllRows(() => supabase.from('organizations')
      .select('id, name, type, address, contact_email, country, is_active, created_at').order('name').order('id'))

    // Member counts for up to 100 organisations (one cheap count query each)
    const counted = orgs.slice(0, 100)
    const counts = await Promise.all(counted.map(o =>
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('org_id', o.id)))

    res.json({
      orgs: orgs.map((o, i) => ({
        id: o.id,
        name: o.name,
        type: o.type,
        address: o.address || null,
        contactEmail: o.contact_email || null,
        country: o.country || null,
        isActive: o.is_active !== false,
        createdAt: o.created_at,
        memberCount: i < counted.length ? (counts[i].count || 0) : null,
      })),
    })
  } catch (err) {
    console.error('Admin orgs error:', err)
    res.status(500).json({ error: 'Could not load organisations. Please try again.' })
  }
})

app.post('/api/admin/orgs', verifyToken, requireAdmin, async (req, res) => {
  try {
    const b = req.body || {}
    const name = typeof b.name === 'string' ? b.name.trim() : ''
    if (name.length < 2 || name.length > 120) return res.status(400).json({ error: 'The name must be 2 to 120 characters.' })
    if (!ORG_TYPES.includes(b.type)) return res.status(400).json({ error: 'Choose school or tutor organisation.' })
    const address = typeof b.address === 'string' ? b.address.trim() : ''
    if (address.length > 200) return res.status(400).json({ error: 'The address is too long (max 200 characters).' })
    const country = typeof b.country === 'string' ? b.country.trim() : ''
    if (country.length > 60) return res.status(400).json({ error: 'The country is too long (max 60 characters).' })
    const contactEmail = typeof b.contactEmail === 'string' ? b.contactEmail.trim() : ''
    if (contactEmail && (contactEmail.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail))) {
      return res.status(400).json({ error: 'That contact email does not look right.' })
    }

    const { data: dup } = await supabase.from('organizations').select('id').ilike('name', escapeLike(name)).limit(1)
    if (dup && dup.length) return res.status(409).json({ error: 'An organisation with that name already exists.' })

    const { data, error } = await supabase.from('organizations').insert({
      name, type: b.type, address: address || null, country: country || null,
      contact_email: contactEmail || null, is_active: true,
    }).select('id').single()
    if (error) throw error
    res.json({ success: true, id: data.id })
  } catch (err) {
    console.error('Create org error:', err)
    res.status(500).json({ error: 'Could not create the organisation. Please try again.' })
  }
})

// ----- Classes -----

app.get('/api/admin/teachers', verifyToken, requireAdmin, async (req, res) => {
  try {
    if (!isUuid(req.query.orgId)) return res.status(400).json({ error: 'Choose an organisation first.' })
    const { data, error } = await supabase.from('users').select('id, name, email')
      .eq('org_id', req.query.orgId).eq('role', 'teacher').order('name').limit(500)
    if (error) throw error
    res.json({ teachers: (data || []).map(t => ({ id: t.id, name: displayName(t) })) })
  } catch (err) {
    console.error('Admin teachers error:', err)
    res.status(500).json({ error: 'Could not load teachers.' })
  }
})

app.get('/api/admin/classes', verifyToken, requireAdmin, async (req, res) => {
  try {
    const orgId = isUuid(req.query.orgId) ? req.query.orgId : null
    const classRows = await fetchAllRows(() => {
      let q = supabase.from('classes').select('id, name, grade, org_id')
      if (orgId) q = q.eq('org_id', orgId)
      return q.order('id')
    })
    const classIds = classRows.map(c => c.id)

    const [orgs, links, studentRows] = await Promise.all([
      orgNamesById(classRows.map(c => c.org_id)),
      fetchIn('teacher_classes', 'teacher_id, class_id', 'class_id', classIds, ['teacher_id', 'class_id']),
      fetchIn('students', 'class_id', 'class_id', classIds),
    ])
    const people = await usersById(links.map(l => l.teacher_id))

    const studentCount = {}
    for (const r of studentRows) studentCount[r.class_id] = (studentCount[r.class_id] || 0) + 1
    const teachersOf = {}
    for (const l of links) if (people[l.teacher_id]) (teachersOf[l.class_id] ||= []).push({ id: l.teacher_id, name: displayName(people[l.teacher_id]) })

    const list = classRows.map(c => ({
      ...shapeClass(c),
      orgId: c.org_id,
      orgName: orgs[c.org_id] || null,
      students: studentCount[c.id] || 0,
      teachers: teachersOf[c.id] || [],
    }))
    list.sort((a, b) => String(a.orgName || '').localeCompare(String(b.orgName || '')) ||
      (Number(a.grade) || 0) - (Number(b.grade) || 0) || String(a.letter).localeCompare(String(b.letter)))
    res.json({ classes: list })
  } catch (err) {
    console.error('Admin classes error:', err)
    res.status(500).json({ error: 'Could not load classes. Please try again.' })
  }
})

// A teacher can only be attached to a class in their own organisation
async function teacherForOrg(teacherId, orgId) {
  if (!isUuid(teacherId)) return null
  const { data } = await supabase.from('users').select('id, role, org_id').eq('id', teacherId).maybeSingle()
  return data && data.role === 'teacher' && data.org_id === orgId ? data : null
}

app.post('/api/admin/classes', verifyToken, requireAdmin, async (req, res) => {
  try {
    const b = req.body || {}
    if (!isUuid(b.orgId)) return res.status(400).json({ error: 'Please choose an organisation.' })
    const grade = cleanGrade(b.grade)
    const letter = cleanLetter(b.letter)
    if (!grade) return res.status(400).json({ error: 'Please choose a grade from 1 to 12.' })
    if (!letter) return res.status(400).json({ error: 'Please choose a class letter from A to F.' })

    const { data: org } = await supabase.from('organizations').select('id').eq('id', b.orgId).maybeSingle()
    if (!org) return res.status(404).json({ error: 'Organisation not found.' })

    let teacher = null
    if (b.teacherId) {
      teacher = await teacherForOrg(b.teacherId, b.orgId)
      if (!teacher) return res.status(400).json({ error: 'That teacher does not belong to this organisation.' })
    }

    const { data: existing } = await supabase.from('classes').select('id')
      .eq('org_id', b.orgId).eq('grade', grade).eq('name', letter).maybeSingle()
    if (existing) return res.status(409).json({ error: `Class ${grade}${letter} already exists in this organisation.` })

    const { data, error } = await supabase.from('classes')
      .insert({ org_id: b.orgId, grade, name: letter }).select('id').single()
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: `Class ${grade}${letter} already exists in this organisation.` })
      throw error
    }
    if (teacher) {
      const { error: linkErr } = await supabase.from('teacher_classes').insert({ teacher_id: teacher.id, class_id: data.id })
      if (linkErr) throw linkErr
    }
    res.json({ success: true, id: data.id })
  } catch (err) {
    console.error('Admin create class error:', err)
    res.status(500).json({ error: 'Could not create the class. Please try again.' })
  }
})

app.put('/api/admin/classes/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Class not found.' })
    const grade = cleanGrade(req.body?.grade)
    const letter = cleanLetter(req.body?.letter)
    if (!grade) return res.status(400).json({ error: 'Please choose a grade from 1 to 12.' })
    if (!letter) return res.status(400).json({ error: 'Please choose a class letter from A to F.' })

    const { data: cls } = await supabase.from('classes').select('id, org_id').eq('id', req.params.id).maybeSingle()
    if (!cls) return res.status(404).json({ error: 'Class not found.' })

    const { data: clash } = await supabase.from('classes').select('id')
      .eq('org_id', cls.org_id).eq('grade', grade).eq('name', letter).neq('id', cls.id).maybeSingle()
    if (clash) return res.status(409).json({ error: `Class ${grade}${letter} already exists in this organisation.` })

    const { error } = await supabase.from('classes').update({ grade, name: letter }).eq('id', cls.id)
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: `Class ${grade}${letter} already exists in this organisation.` })
      throw error
    }
    res.json({ success: true })
  } catch (err) {
    console.error('Admin update class error:', err)
    res.status(500).json({ error: 'Could not save the class. Please try again.' })
  }
})

app.delete('/api/admin/classes/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Class not found.' })
    const { data: cls } = await supabase.from('classes').select('id').eq('id', req.params.id).maybeSingle()
    if (!cls) return res.status(404).json({ error: 'Class not found.' })

    // Students stay on the platform; they just no longer belong to this class
    const { error: stuErr } = await supabase.from('students').update({ class_id: null }).eq('class_id', cls.id)
    if (stuErr) throw stuErr
    const { error } = await supabase.from('classes').delete().eq('id', cls.id)
    if (error) {
      if (error.code === '23503') return res.status(409).json({ error: 'This class still has linked records (such as assignments) that block deleting it.' })
      throw error
    }
    res.json({ success: true })
  } catch (err) {
    console.error('Admin delete class error:', err)
    res.status(500).json({ error: 'Could not delete the class. Please try again.' })
  }
})

app.post('/api/admin/classes/:id/teachers', verifyToken, requireAdmin, async (req, res) => {
  try {
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Class not found.' })
    const { data: cls } = await supabase.from('classes').select('id, org_id').eq('id', req.params.id).maybeSingle()
    if (!cls) return res.status(404).json({ error: 'Class not found.' })
    const teacher = await teacherForOrg(req.body?.teacherId, cls.org_id)
    if (!teacher) return res.status(400).json({ error: 'That teacher does not belong to this class\'s organisation.' })

    const { error } = await supabase.from('teacher_classes')
      .upsert({ teacher_id: teacher.id, class_id: cls.id }, { onConflict: 'teacher_id,class_id' })
    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    console.error('Admin add class teacher error:', err)
    res.status(500).json({ error: 'Could not add the teacher. Please try again.' })
  }
})

app.delete('/api/admin/classes/:id/teachers/:teacherId', verifyToken, requireAdmin, async (req, res) => {
  try {
    if (!isUuid(req.params.id) || !isUuid(req.params.teacherId)) return res.status(404).json({ error: 'Not found.' })
    const { error } = await supabase.from('teacher_classes')
      .delete().eq('class_id', req.params.id).eq('teacher_id', req.params.teacherId)
    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    console.error('Admin remove class teacher error:', err)
    res.status(500).json({ error: 'Could not remove the teacher. Please try again.' })
  }
})

// ----- Platform statistics -----

app.get('/api/admin/platform-stats', verifyToken, requireAdmin, async (req, res) => {
  try {
    const count = (q) => q.then(r => { if (r.error) throw r.error; return r.count || 0 })
    const users = () => supabase.from('users').select('id', { count: 'exact', head: true })

    const days = 30
    const since = new Date()
    since.setUTCHours(0, 0, 0, 0)
    since.setUTCDate(since.getUTCDate() - (days - 1))

    const [total, pending, suspended, orgsTotal, orgsActive, byRoleCounts, recent] = await Promise.all([
      count(users()),
      count(users().eq('is_verified', false).neq('role', 'admin')),
      count(users().eq('is_suspended', true)),
      count(supabase.from('organizations').select('id', { count: 'exact', head: true })),
      count(supabase.from('organizations').select('id', { count: 'exact', head: true }).eq('is_active', true)),
      Promise.all(ADMIN_USER_ROLES.map(role => count(users().eq('role', role)))),
      fetchAllRows(() => supabase.from('users').select('id, created_at').gte('created_at', since.toISOString()).order('id')),
    ])

    const perDay = {}
    for (const u of recent) {
      const key = new Date(u.created_at).toISOString().slice(0, 10)
      perDay[key] = (perDay[key] || 0) + 1
    }
    const signups = []
    for (let i = 0; i < days; i++) {
      const d = new Date(since)
      d.setUTCDate(since.getUTCDate() + i)
      const key = d.toISOString().slice(0, 10)
      signups.push({ date: key, count: perDay[key] || 0 })
    }

    res.json({
      totals: { users: total, pending, suspended, organizations: orgsTotal, activeOrganizations: orgsActive },
      byRole: Object.fromEntries(ADMIN_USER_ROLES.map((r, i) => [r, byRoleCounts[i]])),
      signups,
      signupsTotal: recent.length,
    })
  } catch (err) {
    console.error('Platform stats error:', err)
    res.status(500).json({ error: 'Could not load platform statistics. Please try again.' })
  }
})

// ---------- Messaging (Phase 15) ----------
// WhatsApp-style 1:1 chat. Anyone can message anyone in their own organisation. Admins can message
// anyone, and anyone can reply to an admin who has messaged them. Users see names + usernames only;
// emails are returned to admins only. All writes go through here (the browser only reads, via Realtime).
const messagesLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  keyGenerator: (req) => req.user.id,
  message: { error: 'Too many requests. Wait a moment and try again.' },
})
const sendMessageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  keyGenerator: (req) => req.user.id,
  message: { error: 'You are sending messages too quickly. Wait a moment and try again.' },
})

const MAX_MESSAGE_LENGTH = 4000 // UUID_RE is declared earlier in this file

// The signed-in user's row, or null (and a response already sent) if they can't use messaging
async function messagingUser(req, res) {
  const { data: me, error } = await supabase.from('users')
    .select('id, name, username, role, org_id, is_verified, is_suspended').eq('id', req.user.id).maybeSingle()
  if (error) { res.status(500).json({ error: 'Could not load your account.' }); return null }
  if (!me) { res.status(403).json({ error: 'Account not found.' }); return null }
  if (me.is_suspended) { res.status(403).json({ error: 'This account has been suspended.' }); return null }
  return me
}

const shapeChatUser = (u, viewer) => ({
  id: u.id,
  name: u.name || u.username || 'Unknown',
  username: u.username || '',
  role: u.role,
  ...(viewer.role === 'admin' ? { email: u.email || '' } : {}),
})

async function canMessage(me, other) {
  if (!other || other.is_suspended || other.id === me.id) return false
  if (me.role === 'admin') return true
  if (other.role === 'admin') {
    // Only a reply: the admin must have written to this user first
    const { data } = await supabase.from('messages').select('id')
      .eq('sender_id', other.id).eq('receiver_id', me.id).limit(1)
    return !!(data && data.length)
  }
  return !!me.org_id && me.org_id === other.org_id
}

// People the user can start a chat with: same organisation (admins: everyone). ?q= searches, ?role= filters
app.get('/api/messages/contacts', verifyToken, messagesLimiter, async (req, res) => {
  try {
    const me = await messagingUser(req, res)
    if (!me) return
    if (me.role !== 'admin' && !me.org_id) return res.json({ contacts: [] })

    const isAdmin = me.role === 'admin'
    let q = supabase.from('users')
      .select(`id, name, username, role, org_id, is_suspended${isAdmin ? ', email' : ''}`)
      .neq('id', me.id).neq('role', 'admin').eq('is_suspended', false)
    if (!isAdmin) q = q.eq('org_id', me.org_id)

    const role = String(req.query.role || '')
    if (ROLE_LIST.includes(role)) q = q.eq('role', role)

    const term = String(req.query.q || '').trim().slice(0, 40).replace(/^@/, '')
    if (term) {
      const t = escapeLike(term).replace(/[,()]/g, ' ')
      q = q.or(`name.ilike.%${t}%,username.ilike.%${t}%${isAdmin ? `,email.ilike.%${t}%` : ''}`)
    }

    const { data, error } = await q.order('name').order('id').limit(50)
    if (error) throw error
    res.json({ contacts: (data || []).map(u => shapeChatUser(u, me)) })
  } catch (err) {
    console.error('Contacts failed:', err)
    res.status(500).json({ error: 'Could not load contacts.' })
  }
})

async function unreadTotal(userId) {
  const { count } = await supabase.from('messages').select('id', { count: 'exact', head: true })
    .eq('receiver_id', userId).eq('read', false)
  return count || 0
}

// Number shown on the navbar badge
app.get('/api/messages/unread-count', verifyToken, messagesLimiter, async (req, res) => {
  try {
    res.json({ unread: await unreadTotal(req.user.id) })
  } catch (err) {
    console.error('Unread count failed:', err)
    res.status(500).json({ error: 'Could not load unread count.' })
  }
})

// One row per conversation: the other person, the latest message and the unread count
app.get('/api/messages/inbox', verifyToken, messagesLimiter, async (req, res) => {
  try {
    const me = await messagingUser(req, res)
    if (!me) return

    const { data: rows, error } = await supabase.from('messages')
      .select('id, sender_id, receiver_id, content, read, created_at')
      .or(`sender_id.eq.${me.id},receiver_id.eq.${me.id}`)
      .order('created_at', { ascending: false }).limit(500)
    if (error) throw error

    const convos = new Map()
    for (const m of rows || []) {
      const otherId = m.sender_id === me.id ? m.receiver_id : m.sender_id
      if (!otherId) continue
      if (!convos.has(otherId)) {
        convos.set(otherId, {
          lastMessage: { content: m.content, createdAt: m.created_at, fromMe: m.sender_id === me.id },
          unread: 0,
        })
      }
      if (m.receiver_id === me.id && !m.read) convos.get(otherId).unread += 1
    }

    const ids = [...convos.keys()]
    const others = {}
    if (ids.length) {
      const { data: users } = await supabase.from('users')
        .select('id, name, username, role, email').in('id', ids)
      for (const u of users || []) others[u.id] = u
    }

    const conversations = ids.filter(id => others[id]).map(id => ({
      user: shapeChatUser(others[id], me),
      ...convos.get(id),
    }))
    res.json({ conversations, totalUnread: await unreadTotal(me.id) })
  } catch (err) {
    console.error('Inbox failed:', err)
    res.status(500).json({ error: 'Could not load your messages.' })
  }
})

// A conversation with one person (newest 100). Opening it marks their messages to you as read.
app.get('/api/messages/thread/:userId', verifyToken, messagesLimiter, async (req, res) => {
  try {
    const me = await messagingUser(req, res)
    if (!me) return
    const otherId = req.params.userId
    if (!UUID_RE.test(otherId)) return res.status(400).json({ error: 'Invalid user.' })

    const { data: other } = await supabase.from('users')
      .select('id, name, username, role, org_id, is_suspended, email').eq('id', otherId).maybeSingle()
    if (!other) return res.status(404).json({ error: 'User not found.' })

    const { data: rows, error } = await supabase.from('messages')
      .select('id, sender_id, receiver_id, content, read, created_at')
      .or(`and(sender_id.eq.${me.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${me.id})`)
      .order('created_at', { ascending: false }).limit(100)
    if (error) throw error

    await supabase.from('messages').update({ read: true })
      .eq('sender_id', otherId).eq('receiver_id', me.id).eq('read', false)

    const messages = (rows || []).reverse().map(m => ({
      id: m.id,
      fromMe: m.sender_id === me.id,
      content: m.content,
      read: !!m.read || m.receiver_id === me.id,
      createdAt: m.created_at,
    }))
    res.json({
      user: shapeChatUser(other, me),
      messages,
      canSend: (me.is_verified || me.role === 'admin') && await canMessage(me, other),
    })
  } catch (err) {
    console.error('Thread failed:', err)
    res.status(500).json({ error: 'Could not load this conversation.' })
  }
})

// Mark everything from one person as read (used when a live message arrives in an open chat)
app.post('/api/messages/read/:userId', verifyToken, messagesLimiter, async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.userId)) return res.status(400).json({ error: 'Invalid user.' })
    await supabase.from('messages').update({ read: true })
      .eq('sender_id', req.params.userId).eq('receiver_id', req.user.id).eq('read', false)
    res.json({ success: true })
  } catch (err) {
    console.error('Mark read failed:', err)
    res.status(500).json({ error: 'Could not update messages.' })
  }
})

app.post('/api/messages', verifyToken, sendMessageLimiter, async (req, res) => {
  try {
    const me = await messagingUser(req, res)
    if (!me) return
    if (!me.is_verified && me.role !== 'admin') {
      return res.status(403).json({ error: 'You can send messages once an admin has verified your account.' })
    }

    const { to } = req.body || {}
    const content = typeof req.body?.content === 'string' ? req.body.content.trim() : ''
    if (!UUID_RE.test(String(to))) return res.status(400).json({ error: 'Choose who to message.' })
    if (!content) return res.status(400).json({ error: 'Type a message first.' })
    if (content.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ error: `Message is too long (max ${MAX_MESSAGE_LENGTH} characters).` })
    }

    const { data: other } = await supabase.from('users')
      .select('id, role, org_id, is_suspended').eq('id', to).maybeSingle()
    if (!other) return res.status(404).json({ error: 'User not found.' })
    if (!(await canMessage(me, other))) {
      return res.status(403).json({ error: 'You can only message people in your own school or organisation.' })
    }

    const { data: msg, error } = await supabase.from('messages')
      .insert({ sender_id: me.id, receiver_id: to, content })
      .select('id, content, created_at').single()
    if (error) throw error

    res.json({ message: { id: msg.id, fromMe: true, content: msg.content, read: false, createdAt: msg.created_at } })
  } catch (err) {
    console.error('Send message failed:', err)
    res.status(500).json({ error: 'Could not send your message.' })
  }
})

app.listen(PORT, () => {
  console.log(`Montemy API running on port ${PORT}`)
})
