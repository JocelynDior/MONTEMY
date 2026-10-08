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
  const metadata = { name, role, org_id: orgId }
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

// Everything the student dashboard + academics pages need, in one call
app.get('/api/student/overview', verifyToken, studentLimiter, async (req, res) => {
  try {
    const ctx = await loadStudent(req.user)
    if (!ctx) return res.status(403).json({ error: 'Students only' })
    const { user, student } = ctx
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
    res.json({
      profile: { name: user.name, grade: student?.grade ?? null, subjects, classId: student?.class_id ?? null, letter: cls?.name ?? null },
      org: orgRes.data || null,
      isVerified: !!user.is_verified,
      classInfo,
      homework,
      graded,
      average,
      events: eventsRes.data || [],
      needsSetup: !student?.grade || subjects.length === 0 || !student?.class_id,
    })
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

// { classId: [{ id, name, email }] } built from students.class_id
async function studentsByClass(classIds) {
  const result = Object.fromEntries(classIds.map(id => [id, []]))
  if (!classIds.length) return result

  const { data: rows } = await supabase.from('students').select('user_id, class_id').in('class_id', classIds)
  const userIds = (rows || []).map(r => r.user_id).filter(Boolean)
  const people = {}
  if (userIds.length) {
    const { data: users } = await supabase.from('users').select('id, name, email').in('id', userIds)
    for (const u of users || []) people[u.id] = u
  }
  for (const r of rows || []) {
    const u = people[r.user_id]
    if (u) result[r.class_id].push({ id: u.id, name: u.name || u.email, email: u.email })
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

app.listen(PORT, () => {
  console.log(`Montemy API running on port ${PORT}`)
})
