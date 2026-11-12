// Learning plans and progress reports (Phase 6).
//
// Tutor (their own students only, the student must be on their list in tutor_students):
//   GET    /api/tutor/plans?studentId=        -> { plans: [{ id, studentId, studentName, title, goals: [{ text, done }],
//                                                  status, startDate, dueDate, createdAt, updatedAt }] }
//   POST   /api/tutor/plans                   { studentId, title, goals, status?, startDate?, dueDate? }
//   PUT    /api/tutor/plans/:id               the same fields (studentId cannot change)
//   DELETE /api/tutor/plans/:id
//   GET    /api/tutor/reports?studentId=      -> { reports: [{ id, studentId, studentName, periodLabel, summary, rating, createdAt }] }
//   POST   /api/tutor/reports                 { studentId, periodLabel, summary, rating? }
//   PUT    /api/tutor/reports/:id             periodLabel, summary, rating
//   DELETE /api/tutor/reports/:id
// Student (read only, their own):
//   GET    /api/student/learning-plans        -> { plans: [... with tutorName] }
//   GET    /api/student/progress-reports      -> { reports: [... with tutorName] }
//
// Only a tutor can write, only for a student on their own list, and only a verified tutor can write.
// A tutor can only change rows they created. A student only ever gets their own rows.

module.exports = (app, ctx) => {
  const { supabase, rateLimit, verifyToken, isUuid, notifyMany, afterReply } = ctx

  const limiter = rateLimit({
    windowMs: 60 * 1000, max: 90, keyGenerator: (req) => req.user.id,
    message: { error: 'Too many requests. Wait a moment and try again.' },
  })

  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
  const STATUSES = ['active', 'paused', 'completed']
  const MAX_GOALS = 30

  const validDate = (s) => {
    if (typeof s !== 'string' || !DATE_RE.test(s)) return false
    const d = new Date(`${s}T00:00:00Z`)
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
  }
  const clean = (v, max) => (typeof v === 'string' ? v.trim().replace(/[ \t]+/g, ' ').slice(0, max + 1) : '')

  async function loadUser(req, res, role) {
    const { data: user, error } = await supabase.from('users')
      .select('id, name, role, org_id, is_verified, is_suspended').eq('id', req.user.id).maybeSingle()
    if (error) { res.status(500).json({ error: 'Could not load your account.' }); return null }
    if (!user || user.is_suspended) { res.status(403).json({ error: 'Account not available.' }); return null }
    if (user.role !== role) { res.status(403).json({ error: role === 'tutor' ? 'Tutors only.' : 'Students only.' }); return null }
    if (!user.org_id) { res.status(400).json({ error: 'Your account is not linked to an organisation yet.' }); return null }
    return user
  }

  const tutorOnly = (req, res) => loadUser(req, res, 'tutor')

  async function needVerified(user, res) {
    if (user.is_verified) return true
    res.status(403).json({ error: 'Your account must be verified before you can do this.' })
    return false
  }

  // Is this student on the tutor's own list?
  async function onMyList(tutorId, studentId) {
    const { data } = await supabase.from('tutor_students').select('student_id')
      .eq('tutor_id', tutorId).eq('student_id', studentId).maybeSingle()
    return !!data
  }

  async function namesFor(ids) {
    const list = [...new Set(ids.filter(Boolean))]
    if (!list.length) return {}
    const { data } = await supabase.from('users').select('id, name').in('id', list)
    return Object.fromEntries((data || []).map(u => [u.id, u.name || '']))
  }

  function cleanGoals(goals) {
    if (goals === undefined) return { value: undefined }
    if (!Array.isArray(goals)) return { error: 'The goals are not valid.' }
    if (goals.length > MAX_GOALS) return { error: `A plan can have at most ${MAX_GOALS} goals.` }
    const out = []
    for (const g of goals) {
      const text = clean(typeof g === 'string' ? g : g?.text, 200)
      if (!text) continue
      if (text.length > 200) return { error: 'A goal is too long (max 200 characters).' }
      out.push({ text, done: typeof g === 'object' && g?.done === true })
    }
    return { value: out }
  }

  function cleanPlan(b, partial) {
    const out = {}
    if (!partial || b.title !== undefined) {
      const title = clean(b.title, 120)
      if (!title) return { error: 'Enter a title for the plan.' }
      if (title.length > 120) return { error: 'The title is too long (max 120 characters).' }
      out.title = title
    }
    const g = cleanGoals(b.goals)
    if (g.error) return g
    if (g.value !== undefined) out.goals = g.value
    if (b.status !== undefined) {
      if (!STATUSES.includes(b.status)) return { error: 'That status is not valid.' }
      out.status = b.status
    }
    for (const [key, col] of [['startDate', 'start_date'], ['dueDate', 'due_date']]) {
      if (b[key] === undefined) continue
      if (b[key] === null || b[key] === '') out[col] = null
      else if (validDate(b[key])) out[col] = b[key]
      else return { error: 'Choose a valid date.' }
    }
    if (out.start_date && out.due_date && out.due_date < out.start_date) return { error: 'The due date cannot be before the start date.' }
    return { value: out }
  }

  function cleanReport(b, partial) {
    const out = {}
    if (!partial || b.periodLabel !== undefined) {
      const label = clean(b.periodLabel, 60)
      if (!label) return { error: 'Enter the period, for example "Term 2" or "March".' }
      if (label.length > 60) return { error: 'The period is too long (max 60 characters).' }
      out.period_label = label
    }
    if (!partial || b.summary !== undefined) {
      const summary = typeof b.summary === 'string' ? b.summary.trim().slice(0, 4001) : ''
      if (!summary) return { error: 'Write a short summary.' }
      if (summary.length > 4000) return { error: 'The summary is too long (max 4000 characters).' }
      out.summary = summary
    }
    if (b.rating !== undefined) {
      if (b.rating === null || b.rating === '') out.rating = null
      else {
        const n = Number(b.rating)
        if (!Number.isInteger(n) || n < 1 || n > 5) return { error: 'The rating must be from 1 to 5.' }
        out.rating = n
      }
    }
    return { value: out }
  }

  const shapePlan = (r, names, who = 'student') => ({
    id: r.id,
    studentId: r.student_id,
    studentName: names[r.student_id] || '',
    tutorName: names[r.tutor_id] || '',
    title: r.title,
    goals: Array.isArray(r.goals) ? r.goals : [],
    status: r.status,
    startDate: r.start_date,
    dueDate: r.due_date,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  })
  const shapeReport = (r, names) => ({
    id: r.id,
    studentId: r.student_id,
    studentName: names[r.student_id] || '',
    tutorName: names[r.tutor_id] || '',
    periodLabel: r.period_label,
    summary: r.summary,
    rating: r.rating,
    createdAt: r.created_at,
  })

  // ---------- plans (tutor) ----------
  app.get('/api/tutor/plans', verifyToken, limiter, async (req, res) => {
    try {
      const user = await tutorOnly(req, res); if (!user) return
      let q = supabase.from('learning_plans').select('*').eq('tutor_id', user.id).order('created_at', { ascending: false }).limit(500)
      if (req.query.studentId) {
        if (!isUuid(req.query.studentId)) return res.status(400).json({ error: 'That student is not valid.' })
        q = q.eq('student_id', req.query.studentId)
      }
      const { data, error } = await q
      if (error) throw error
      const names = await namesFor((data || []).flatMap(r => [r.student_id, r.tutor_id]))
      res.json({ plans: (data || []).map(r => shapePlan(r, names)) })
    } catch (err) {
      console.error('Plans list error:', err)
      res.status(500).json({ error: 'Could not load the learning plans. Please try again.' })
    }
  })

  app.post('/api/tutor/plans', verifyToken, limiter, async (req, res) => {
    try {
      const user = await tutorOnly(req, res); if (!user) return
      if (!(await needVerified(user, res))) return
      const b = req.body || {}
      if (!isUuid(b.studentId) || !(await onMyList(user.id, b.studentId))) return res.status(403).json({ error: 'You can only write plans for your own students.' })
      const c = cleanPlan(b, false)
      if (c.error) return res.status(400).json({ error: c.error })
      const { data, error } = await supabase.from('learning_plans')
        .insert({ ...c.value, org_id: user.org_id, tutor_id: user.id, student_id: b.studentId }).select('*').single()
      if (error) throw error
      afterReply('Learning plan', () => notifyMany([b.studentId], `Your tutor wrote a learning plan: "${c.value.title}".`, 'info', '/student/academics', 'academic'))
      const names = await namesFor([data.student_id, data.tutor_id])
      res.status(201).json({ plan: shapePlan(data, names) })
    } catch (err) {
      console.error('Plan create error:', err)
      res.status(500).json({ error: 'Could not save the plan. Please try again.' })
    }
  })

  app.put('/api/tutor/plans/:id', verifyToken, limiter, async (req, res) => {
    try {
      const user = await tutorOnly(req, res); if (!user) return
      if (!(await needVerified(user, res))) return
      if (!isUuid(req.params.id)) return res.status(400).json({ error: 'That plan is not valid.' })
      const c = cleanPlan(req.body || {}, true)
      if (c.error) return res.status(400).json({ error: c.error })
      const { data, error } = await supabase.from('learning_plans')
        .update({ ...c.value, updated_at: new Date().toISOString() })
        .eq('id', req.params.id).eq('tutor_id', user.id).select('*').maybeSingle()
      if (error) throw error
      if (!data) return res.status(404).json({ error: 'Plan not found.' })
      const names = await namesFor([data.student_id, data.tutor_id])
      res.json({ plan: shapePlan(data, names) })
    } catch (err) {
      console.error('Plan update error:', err)
      res.status(500).json({ error: 'Could not save the plan. Please try again.' })
    }
  })

  app.delete('/api/tutor/plans/:id', verifyToken, limiter, async (req, res) => {
    try {
      const user = await tutorOnly(req, res); if (!user) return
      if (!isUuid(req.params.id)) return res.status(400).json({ error: 'That plan is not valid.' })
      const { error } = await supabase.from('learning_plans').delete().eq('id', req.params.id).eq('tutor_id', user.id)
      if (error) throw error
      res.json({ ok: true })
    } catch (err) {
      console.error('Plan delete error:', err)
      res.status(500).json({ error: 'Could not delete the plan. Please try again.' })
    }
  })

  // ---------- reports (tutor) ----------
  app.get('/api/tutor/reports', verifyToken, limiter, async (req, res) => {
    try {
      const user = await tutorOnly(req, res); if (!user) return
      let q = supabase.from('progress_reports').select('*').eq('tutor_id', user.id).order('created_at', { ascending: false }).limit(500)
      if (req.query.studentId) {
        if (!isUuid(req.query.studentId)) return res.status(400).json({ error: 'That student is not valid.' })
        q = q.eq('student_id', req.query.studentId)
      }
      const { data, error } = await q
      if (error) throw error
      const names = await namesFor((data || []).flatMap(r => [r.student_id, r.tutor_id]))
      res.json({ reports: (data || []).map(r => shapeReport(r, names)) })
    } catch (err) {
      console.error('Reports list error:', err)
      res.status(500).json({ error: 'Could not load the reports. Please try again.' })
    }
  })

  app.post('/api/tutor/reports', verifyToken, limiter, async (req, res) => {
    try {
      const user = await tutorOnly(req, res); if (!user) return
      if (!(await needVerified(user, res))) return
      const b = req.body || {}
      if (!isUuid(b.studentId) || !(await onMyList(user.id, b.studentId))) return res.status(403).json({ error: 'You can only write reports for your own students.' })
      const c = cleanReport(b, false)
      if (c.error) return res.status(400).json({ error: c.error })
      const { data, error } = await supabase.from('progress_reports')
        .insert({ ...c.value, org_id: user.org_id, tutor_id: user.id, student_id: b.studentId }).select('*').single()
      if (error) throw error
      afterReply('Progress report', () => notifyMany([b.studentId], `Your tutor wrote a progress report for ${c.value.period_label}.`, 'info', '/student/academics', 'academic'))
      const names = await namesFor([data.student_id, data.tutor_id])
      res.status(201).json({ report: shapeReport(data, names) })
    } catch (err) {
      console.error('Report create error:', err)
      res.status(500).json({ error: 'Could not save the report. Please try again.' })
    }
  })

  app.put('/api/tutor/reports/:id', verifyToken, limiter, async (req, res) => {
    try {
      const user = await tutorOnly(req, res); if (!user) return
      if (!(await needVerified(user, res))) return
      if (!isUuid(req.params.id)) return res.status(400).json({ error: 'That report is not valid.' })
      const c = cleanReport(req.body || {}, true)
      if (c.error) return res.status(400).json({ error: c.error })
      const { data, error } = await supabase.from('progress_reports').update(c.value)
        .eq('id', req.params.id).eq('tutor_id', user.id).select('*').maybeSingle()
      if (error) throw error
      if (!data) return res.status(404).json({ error: 'Report not found.' })
      const names = await namesFor([data.student_id, data.tutor_id])
      res.json({ report: shapeReport(data, names) })
    } catch (err) {
      console.error('Report update error:', err)
      res.status(500).json({ error: 'Could not save the report. Please try again.' })
    }
  })

  app.delete('/api/tutor/reports/:id', verifyToken, limiter, async (req, res) => {
    try {
      const user = await tutorOnly(req, res); if (!user) return
      if (!isUuid(req.params.id)) return res.status(400).json({ error: 'That report is not valid.' })
      const { error } = await supabase.from('progress_reports').delete().eq('id', req.params.id).eq('tutor_id', user.id)
      if (error) throw error
      res.json({ ok: true })
    } catch (err) {
      console.error('Report delete error:', err)
      res.status(500).json({ error: 'Could not delete the report. Please try again.' })
    }
  })

  // ---------- read only for the student ----------
  app.get('/api/student/learning-plans', verifyToken, limiter, async (req, res) => {
    try {
      const user = await loadUser(req, res, 'student'); if (!user) return
      const { data, error } = await supabase.from('learning_plans').select('*').eq('student_id', user.id)
        .order('created_at', { ascending: false }).limit(200)
      if (error) throw error
      const names = await namesFor((data || []).flatMap(r => [r.student_id, r.tutor_id]))
      res.json({ plans: (data || []).map(r => shapePlan(r, names)) })
    } catch (err) {
      console.error('Student plans error:', err)
      res.status(500).json({ error: 'Could not load your learning plans. Please try again.' })
    }
  })

  app.get('/api/student/progress-reports', verifyToken, limiter, async (req, res) => {
    try {
      const user = await loadUser(req, res, 'student'); if (!user) return
      const { data, error } = await supabase.from('progress_reports').select('*').eq('student_id', user.id)
        .order('created_at', { ascending: false }).limit(200)
      if (error) throw error
      const names = await namesFor((data || []).flatMap(r => [r.student_id, r.tutor_id]))
      res.json({ reports: (data || []).map(r => shapeReport(r, names)) })
    } catch (err) {
      console.error('Student reports error:', err)
      res.status(500).json({ error: 'Could not load your reports. Please try again.' })
    }
  })
}
