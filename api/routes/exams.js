// Exams (Phase 5). Teachers and principals create exams and enter marks; students read their own.
//
//   GET    /api/exams?classId=          student: the exams of their class (and school-wide ones) with their own result
//                                       teacher: exams of the classes they teach (plus school-wide ones, read only)
//                                       principal: every exam in the school
//     -> { role, canWrite, classes: [{ id, name }], exams: [{
//            id, subject, title, date, startTime, durationMinutes, venue, totalMarks, classId, className,
//            canEdit, resultCount, result: { mark, comment } | null }] }
//        result is filled for students only. classes lists what a teacher or principal may pick when creating.
//   POST   /api/exams                   { classId, subject, title, date, startTime?, durationMinutes?, venue?, totalMarks? }
//   PUT    /api/exams/:id               the same fields
//   DELETE /api/exams/:id
//   GET    /api/exams/:id/results       -> { exam, students: [{ studentId, name, mark, comment }] }
//   PUT    /api/exams/:id/results       { results: [{ studentId, mark, comment }] }   an empty mark clears it
//
// The Teacher page (ExamManager, Phase 6) uses the teacher endpoints. The parent endpoints are in parent-views.js.
// Nothing here accepts another person's id except a student id that is checked against the exam's class list.

module.exports = (app, ctx) => {
  const { supabase, rateLimit, verifyToken, isUuid, fetchIn, fetchAllRows, notifyMany, afterReply } = ctx

  const limiter = rateLimit({
    windowMs: 60 * 1000, max: 90, keyGenerator: (req) => req.user.id,
    message: { error: 'Too many requests. Wait a moment and try again.' },
  })

  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
  const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/
  const EXAM_COLUMNS = 'id, org_id, class_id, subject, title, exam_date, start_time, duration_minutes, venue, total_marks, created_by'

  const classLabel = (c) => `${c.grade ?? ''}${c.name ?? ''}`
  const hhmm = (t) => (t ? String(t).slice(0, 5) : null)
  const validDate = (s) => {
    if (typeof s !== 'string' || !DATE_RE.test(s)) return false
    const d = new Date(`${s}T00:00:00Z`)
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
  }

  // The signed-in student, teacher or principal. Sends the error and returns null otherwise.
  async function examUser(req, res, roles) {
    const { data: user, error } = await supabase.from('users')
      .select('id, name, role, org_id, is_verified, is_suspended').eq('id', req.user.id).maybeSingle()
    if (error) { res.status(500).json({ error: 'Could not load your account.' }); return null }
    if (!user || user.is_suspended) { res.status(403).json({ error: 'Account not available.' }); return null }
    if (!roles.includes(user.role)) { res.status(403).json({ error: 'Exams are not available for your account type.' }); return null }
    if (!user.org_id) { res.status(400).json({ error: 'Your account is not linked to a school yet.' }); return null }
    return user
  }

  async function teacherClassIds(userId) {
    const { data } = await supabase.from('teacher_classes').select('class_id').eq('teacher_id', userId)
    return (data || []).map(l => l.class_id)
  }

  async function classMapFor(orgId) {
    const { data } = await supabase.from('classes').select('id, name, grade').eq('org_id', orgId)
    return Object.fromEntries((data || []).map(c => [c.id, c]))
  }

  // May this user change this exam (and its marks)?
  async function canChange(user, exam) {
    if (!user.is_verified) return false
    if (exam.org_id !== user.org_id) return false
    if (user.role === 'principal') return true
    if (user.role === 'teacher' && exam.class_id) return (await teacherClassIds(user.id)).includes(exam.class_id)
    return false
  }

  // Validates the body of a create or update. Returns { error } or { value }.
  function cleanExam(b) {
    const text = (v, max) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max + 1) : '')
    const subject = text(b.subject, 60)
    const title = text(b.title, 120)
    if (!subject) return { error: 'Enter the subject.' }
    if (subject.length > 60) return { error: 'The subject is too long (max 60 characters).' }
    if (!title) return { error: 'Enter a title for the exam.' }
    if (title.length > 120) return { error: 'The title is too long (max 120 characters).' }
    if (!validDate(b.date)) return { error: 'Choose the exam date.' }
    let startTime = null
    if (b.startTime) {
      if (!TIME_RE.test(String(b.startTime))) return { error: 'The start time is not valid.' }
      startTime = String(b.startTime)
    }
    let duration = null
    if (b.durationMinutes !== undefined && b.durationMinutes !== null && b.durationMinutes !== '') {
      duration = Number(b.durationMinutes)
      if (!Number.isInteger(duration) || duration < 1 || duration > 720) return { error: 'The duration must be between 1 and 720 minutes.' }
    }
    let totalMarks = null
    if (b.totalMarks !== undefined && b.totalMarks !== null && b.totalMarks !== '') {
      totalMarks = Number(b.totalMarks)
      if (!Number.isInteger(totalMarks) || totalMarks < 1 || totalMarks > 1000) return { error: 'The total marks must be between 1 and 1000.' }
    }
    const venue = text(b.venue, 80)
    if (venue.length > 80) return { error: 'The venue is too long (max 80 characters).' }
    return {
      value: {
        subject, title, exam_date: b.date, start_time: startTime, duration_minutes: duration,
        venue: venue || null, total_marks: totalMarks,
      },
    }
  }

  // Works out the class an exam is saved for. Teachers must teach it; principals may leave it empty (whole school).
  async function resolveClass(user, classId) {
    if (classId === undefined || classId === null || classId === '') {
      if (user.role === 'principal') return { classId: null }
      return { status: 400, error: 'Choose a class.' }
    }
    if (!isUuid(classId)) return { status: 400, error: 'Choose a class.' }
    const { data: cls } = await supabase.from('classes').select('id, org_id').eq('id', classId).maybeSingle()
    if (!cls || cls.org_id !== user.org_id) return { status: 404, error: 'Class not found.' }
    if (user.role === 'teacher' && !(await teacherClassIds(user.id)).includes(classId)) {
      return { status: 403, error: 'You can only set exams for classes you teach.' }
    }
    return { classId }
  }

  function shapeExam(e, classMap, extra = {}) {
    return {
      id: e.id,
      subject: e.subject,
      title: e.title,
      date: e.exam_date,
      startTime: hhmm(e.start_time),
      durationMinutes: e.duration_minutes ?? null,
      venue: e.venue || '',
      totalMarks: e.total_marks ?? null,
      classId: e.class_id || null,
      className: e.class_id && classMap[e.class_id] ? classLabel(classMap[e.class_id]) : '',
      ...extra,
    }
  }

  const byDate = (a, b) => String(a.exam_date).localeCompare(String(b.exam_date)) || String(a.start_time || '').localeCompare(String(b.start_time || ''))

  // ---------- list ----------
  app.get('/api/exams', verifyToken, limiter, async (req, res) => {
    try {
      const user = await examUser(req, res, ['student', 'teacher', 'principal'])
      if (!user) return
      const classMap = await classMapFor(user.org_id)
      const wantClass = isUuid(req.query.classId) ? req.query.classId : null

      let myClassIds = []
      let q = supabase.from('exams').select(EXAM_COLUMNS).eq('org_id', user.org_id)

      if (user.role === 'student') {
        const { data: st } = await supabase.from('students').select('class_id').eq('user_id', user.id).maybeSingle()
        const classId = st?.class_id || null
        q = classId ? q.or(`class_id.eq.${classId},class_id.is.null`) : q.is('class_id', null)
      } else if (user.role === 'teacher') {
        myClassIds = await teacherClassIds(user.id)
        q = myClassIds.length ? q.or(`class_id.in.(${myClassIds.join(',')}),class_id.is.null`) : q.is('class_id', null)
      }
      if (wantClass && user.role !== 'student') q = q.eq('class_id', wantClass)

      const { data: rows, error } = await q.order('exam_date').order('start_time').limit(500)
      if (error) throw error
      const exams = (rows || []).sort(byDate)

      let resultByExam = {}
      let counts = {}
      if (exams.length) {
        if (user.role === 'student') {
          const mine = await fetchIn('exam_results', 'exam_id, student_id, mark, comment', 'exam_id', exams.map(e => e.id), ['exam_id', 'student_id'])
          for (const r of mine) {
            if (r.student_id === user.id && r.mark !== null && r.mark !== undefined) resultByExam[r.exam_id] = { mark: Number(r.mark), comment: r.comment || '' }
          }
        } else {
          const all = await fetchIn('exam_results', 'exam_id, student_id, mark', 'exam_id', exams.map(e => e.id), ['exam_id', 'student_id'])
          for (const r of all) if (r.mark !== null && r.mark !== undefined) counts[r.exam_id] = (counts[r.exam_id] || 0) + 1
        }
      }

      const canWrite = user.is_verified && user.role !== 'student'
      const editable = async (e) => (user.role === 'principal' ? canWrite : user.role === 'teacher' ? canWrite && !!e.class_id && myClassIds.includes(e.class_id) : false)
      const out = []
      for (const e of exams) {
        out.push(shapeExam(e, classMap, {
          canEdit: await editable(e),
          resultCount: counts[e.id] || 0,
          result: user.role === 'student' ? (resultByExam[e.id] || null) : null,
        }))
      }

      let classes = []
      if (user.role === 'principal') classes = Object.values(classMap)
      else if (user.role === 'teacher') classes = myClassIds.map(id => classMap[id]).filter(Boolean)
      classes = classes
        .sort((a, b) => (Number(a.grade) || 0) - (Number(b.grade) || 0) || String(a.name).localeCompare(String(b.name)))
        .map(c => ({ id: c.id, name: classLabel(c) }))

      res.json({ role: user.role, canWrite, classes, exams: out })
    } catch (err) {
      console.error('Exams list error:', err)
      res.status(500).json({ error: 'Could not load the exams. Please try again.' })
    }
  })

  // ---------- create ----------
  app.post('/api/exams', verifyToken, limiter, async (req, res) => {
    try {
      const user = await examUser(req, res, ['teacher', 'principal'])
      if (!user) return
      if (!user.is_verified) return res.status(403).json({ error: 'Your account needs to be verified by an admin before you can do this.' })
      const body = req.body || {}
      const cleaned = cleanExam(body)
      if (cleaned.error) return res.status(400).json({ error: cleaned.error })
      const cls = await resolveClass(user, body.classId)
      if (cls.error) return res.status(cls.status).json({ error: cls.error })

      const { data, error } = await supabase.from('exams')
        .insert({ org_id: user.org_id, class_id: cls.classId, created_by: user.id, ...cleaned.value })
        .select(EXAM_COLUMNS).single()
      if (error) throw error

      // Tell the class that an exam was set
      afterReply('Exam', async () => {
        let ids = []
        if (data.class_id) {
          const rows = await fetchAllRows(() => supabase.from('students').select('user_id').eq('class_id', data.class_id).order('user_id'))
          ids = rows.map(r => r.user_id)
        } else {
          const rows = await fetchAllRows(() => supabase.from('users').select('id').eq('org_id', user.org_id).eq('role', 'student').order('id'))
          ids = rows.map(r => r.id)
        }
        await notifyMany(ids, `New exam: ${data.subject}, ${data.title}, on ${data.exam_date}.`, 'info', '/student/exams', 'academic')
      })

      const classMap = await classMapFor(user.org_id)
      res.status(201).json({ exam: shapeExam(data, classMap, { canEdit: true, resultCount: 0, result: null }) })
    } catch (err) {
      console.error('Exam create error:', err)
      res.status(500).json({ error: 'Could not save the exam. Please try again.' })
    }
  })

  async function loadExam(req, res, user) {
    if (!isUuid(req.params.id)) { res.status(404).json({ error: 'Exam not found.' }); return null }
    const { data: exam, error } = await supabase.from('exams').select(EXAM_COLUMNS).eq('id', req.params.id).maybeSingle()
    if (error) throw error
    if (!exam || exam.org_id !== user.org_id) { res.status(404).json({ error: 'Exam not found.' }); return null }
    return exam
  }

  // ---------- update ----------
  app.put('/api/exams/:id', verifyToken, limiter, async (req, res) => {
    try {
      const user = await examUser(req, res, ['teacher', 'principal'])
      if (!user) return
      const exam = await loadExam(req, res, user)
      if (!exam) return
      if (!(await canChange(user, exam))) return res.status(403).json({ error: 'You cannot change this exam.' })

      const body = req.body || {}
      const cleaned = cleanExam(body)
      if (cleaned.error) return res.status(400).json({ error: cleaned.error })
      const cls = await resolveClass(user, body.classId === undefined ? exam.class_id : body.classId)
      if (cls.error) return res.status(cls.status).json({ error: cls.error })

      const { data, error } = await supabase.from('exams')
        .update({ class_id: cls.classId, ...cleaned.value }).eq('id', exam.id).select(EXAM_COLUMNS).single()
      if (error) throw error
      const classMap = await classMapFor(user.org_id)
      res.json({ exam: shapeExam(data, classMap, { canEdit: true }) })
    } catch (err) {
      console.error('Exam update error:', err)
      res.status(500).json({ error: 'Could not save the exam. Please try again.' })
    }
  })

  // ---------- delete ----------
  app.delete('/api/exams/:id', verifyToken, limiter, async (req, res) => {
    try {
      const user = await examUser(req, res, ['teacher', 'principal'])
      if (!user) return
      const exam = await loadExam(req, res, user)
      if (!exam) return
      if (!(await canChange(user, exam))) return res.status(403).json({ error: 'You cannot delete this exam.' })
      const { error } = await supabase.from('exams').delete().eq('id', exam.id)
      if (error) throw error
      res.json({ success: true })
    } catch (err) {
      console.error('Exam delete error:', err)
      res.status(500).json({ error: 'Could not delete the exam. Please try again.' })
    }
  })

  // The students an exam is for: its class, or the whole school when it has none
  async function rosterFor(exam) {
    const ids = exam.class_id
      ? (await fetchAllRows(() => supabase.from('students').select('user_id').eq('class_id', exam.class_id).order('user_id'))).map(r => r.user_id)
      : (await fetchAllRows(() => supabase.from('users').select('id').eq('org_id', exam.org_id).eq('role', 'student').order('id'))).map(r => r.id)
    if (!ids.length) return []
    const people = await fetchIn('users', 'id, name, username', 'id', ids, ['id'])
    return people
      .map(u => ({ id: u.id, name: u.name || u.username || 'Unknown' }))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)))
  }

  // ---------- results: read ----------
  app.get('/api/exams/:id/results', verifyToken, limiter, async (req, res) => {
    try {
      const user = await examUser(req, res, ['teacher', 'principal'])
      if (!user) return
      const exam = await loadExam(req, res, user)
      if (!exam) return
      if (user.role === 'teacher' && !(exam.class_id && (await teacherClassIds(user.id)).includes(exam.class_id))) {
        return res.status(403).json({ error: 'You can only see results of classes you teach.' })
      }
      const roster = await rosterFor(exam)
      const rows = await fetchIn('exam_results', 'exam_id, student_id, mark, comment', 'exam_id', [exam.id], ['exam_id', 'student_id'])
      const byStudent = Object.fromEntries(rows.map(r => [r.student_id, r]))
      const classMap = await classMapFor(user.org_id)
      res.json({
        exam: shapeExam(exam, classMap, { canEdit: await canChange(user, exam) }),
        students: roster.map(s => ({
          studentId: s.id,
          name: s.name,
          mark: byStudent[s.id]?.mark === null || byStudent[s.id]?.mark === undefined ? null : Number(byStudent[s.id].mark),
          comment: byStudent[s.id]?.comment || '',
        })),
      })
    } catch (err) {
      console.error('Exam results error:', err)
      res.status(500).json({ error: 'Could not load the marks. Please try again.' })
    }
  })

  // ---------- results: save ----------
  app.put('/api/exams/:id/results', verifyToken, limiter, async (req, res) => {
    try {
      const user = await examUser(req, res, ['teacher', 'principal'])
      if (!user) return
      const exam = await loadExam(req, res, user)
      if (!exam) return
      if (!(await canChange(user, exam))) return res.status(403).json({ error: 'You cannot enter marks for this exam.' })

      const list = Array.isArray(req.body?.results) ? req.body.results : null
      if (!list || list.length === 0) return res.status(400).json({ error: 'There are no marks to save.' })
      if (list.length > 500) return res.status(400).json({ error: 'Too many marks in one save.' })

      const roster = new Set((await rosterFor(exam)).map(s => s.id))
      const max = exam.total_marks || 1000
      const upserts = []
      const clears = []
      const seen = new Set()
      for (const item of list) {
        const studentId = item?.studentId
        if (!isUuid(studentId) || !roster.has(studentId)) return res.status(400).json({ error: 'One of the students is not in this exam.' })
        if (seen.has(studentId)) continue
        seen.add(studentId)
        const comment = typeof item.comment === 'string' ? item.comment.trim().slice(0, 301) : ''
        if (comment.length > 300) return res.status(400).json({ error: 'A comment is too long (max 300 characters).' })
        const blank = item.mark === null || item.mark === undefined || String(item.mark).trim() === ''
        let mark = null
        if (!blank) {
          mark = Number(item.mark)
          if (!Number.isFinite(mark) || mark < 0 || mark > max) return res.status(400).json({ error: `Marks must be between 0 and ${max}.` })
          mark = Math.round(mark * 100) / 100
        }
        if (mark === null && !comment) clears.push(studentId)
        else upserts.push({ exam_id: exam.id, student_id: studentId, mark, comment: comment || null })
      }

      const before = await fetchIn('exam_results', 'exam_id, student_id, mark', 'exam_id', [exam.id], ['exam_id', 'student_id'])
      const oldMarks = Object.fromEntries(before.map(r => [r.student_id, r.mark === null ? null : Number(r.mark)]))

      if (upserts.length) {
        const { error } = await supabase.from('exam_results').upsert(upserts, { onConflict: 'exam_id,student_id' })
        if (error) throw error
      }
      for (let i = 0; i < clears.length; i += 100) {
        const { error } = await supabase.from('exam_results').delete().eq('exam_id', exam.id).in('student_id', clears.slice(i, i + 100))
        if (error) throw error
      }

      // Tell students (and their linked parents) about marks that are new or changed
      const changed = upserts.filter(u => u.mark !== null && u.mark !== oldMarks[u.student_id]).map(u => u.student_id)
      if (changed.length) {
        afterReply('Exam marks', async () => {
          await notifyMany(changed, `Your mark for ${exam.subject}, ${exam.title}, is available.`, 'success', '/student/exams', 'academic')
          const parentUsers = await fetchAllRows(() => supabase.from('users').select('id').eq('org_id', exam.org_id).eq('role', 'parent').order('id'))
          const links = await fetchIn('parents', 'user_id, child_ids', 'user_id', parentUsers.map(p => p.id), ['user_id'])
          const wanted = new Set(changed)
          const parentIds = links.filter(l => Array.isArray(l.child_ids) && l.child_ids.some(id => wanted.has(id))).map(l => l.user_id)
          await notifyMany(parentIds, `A new exam mark for ${exam.subject}, ${exam.title}, is available.`, 'info', '/parent/exams', 'academic')
        })
      }

      res.json({ success: true, saved: upserts.length, cleared: clears.length })
    } catch (err) {
      console.error('Exam marks save error:', err)
      res.status(500).json({ error: 'Could not save the marks. Please try again.' })
    }
  })
}
