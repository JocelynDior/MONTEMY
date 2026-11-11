// Read-only views of a linked child for a parent (Phase 5). Every route checks that the child is in the
// parent's own child list (parents.child_ids), so changing the id in the address returns 403.
//
//   GET /api/parent/children/:childId/homework
//     -> { child: { id, name }, classInfo: { id, name } | null,
//          homework: [{ id, title, description, dueDate, status, grade, feedback, isLate, subject }] }
//   GET /api/parent/children/:childId/exams
//     -> { child, exams: [{ id, subject, title, date, startTime, durationMinutes, venue, totalMarks, classId, className }] }
//   GET /api/parent/children/:childId/results
//     -> { child, average, results: [{ examId, subject, title, date, mark, totalMarks, percent, comment }] }
//   GET /api/parent/children/:childId/timetable?weekStart=YYYY-MM-DD
//     -> { child, weekStart, periods, className, slots, terms, events }
//
// The child's overview (marks and averages from homework) is the existing /api/parent/children/:childId/overview.

module.exports = (app, ctx) => {
  const { supabase, rateLimit, verifyToken, isUuid, fetchIn } = ctx

  const limiter = rateLimit({
    windowMs: 60 * 1000, max: 90, keyGenerator: (req) => req.user.id,
    message: { error: 'Too many requests. Wait a moment and try again.' },
  })

  const classLabel = (c) => `${c.grade ?? ''}${c.name ?? ''}`
  const hhmm = (t) => (t ? String(t).slice(0, 5) : null)
  const hasGrade = (s) => s && s.grade !== null && s.grade !== undefined && !Number.isNaN(Number(s.grade))
  const titleCase = (str) => {
    const t = String(str || '').trim()
    return t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : ''
  }

  // The same bell times the timetable page uses until a school saves its own
  const DEFAULT_PERIODS = [
    { period: 1, label: 'Period 1', start: '08:00', end: '08:45', isBreak: false },
    { period: 2, label: 'Period 2', start: '08:45', end: '09:30', isBreak: false },
    { period: 3, label: 'Period 3', start: '09:30', end: '10:15', isBreak: false },
    { period: 4, label: 'Break', start: '10:15', end: '10:45', isBreak: true },
    { period: 5, label: 'Period 5', start: '10:45', end: '11:30', isBreak: false },
    { period: 6, label: 'Period 6', start: '11:30', end: '12:15', isBreak: false },
    { period: 7, label: 'Period 7', start: '12:15', end: '13:00', isBreak: false },
    { period: 8, label: 'Period 8', start: '13:00', end: '13:45', isBreak: false },
  ]

  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
  function parseDate(s) {
    if (typeof s !== 'string' || !DATE_RE.test(s)) return null
    const d = new Date(`${s}T00:00:00Z`)
    return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s ? null : d
  }
  const iso = (d) => d.toISOString().slice(0, 10)
  const addDays = (d, n) => new Date(d.getTime() + n * 86400000)
  const mondayOf = (d) => addDays(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())), -((d.getUTCDay() + 6) % 7))

  // Checks the caller is a parent and the child is linked to them. Sends the error and returns null otherwise.
  async function linkedChild(req, res) {
    const { data: parent, error } = await supabase.from('users')
      .select('id, role, org_id, is_suspended').eq('id', req.user.id).maybeSingle()
    if (error) { res.status(500).json({ error: 'Could not load your account.' }); return null }
    if (!parent || parent.role !== 'parent' || parent.is_suspended) { res.status(403).json({ error: 'Parents only' }); return null }

    const childId = req.params.childId
    const { data: row } = await supabase.from('parents').select('child_ids').eq('user_id', parent.id).maybeSingle()
    const childIds = Array.isArray(row?.child_ids) ? row.child_ids : []
    if (!isUuid(childId) || !childIds.includes(childId)) {
      res.status(403).json({ error: 'That child is not linked to your account.' })
      return null
    }

    const { data: child } = await supabase.from('users').select('id, name, role, org_id').eq('id', childId).maybeSingle()
    if (!child || child.role !== 'student') { res.status(404).json({ error: 'Child not found.' }); return null }
    const { data: student } = await supabase.from('students').select('class_id, grade').eq('user_id', childId).maybeSingle()

    let cls = null
    if (student?.class_id) {
      const { data } = await supabase.from('classes').select('id, name, grade').eq('id', student.class_id).maybeSingle()
      cls = data || null
    }
    return { child, classRow: cls, studentRow: student || null }
  }

  const childOut = (child) => ({ id: child.id, name: child.name || '' })
  const classOut = (cls) => (cls ? { id: cls.id, name: classLabel(cls) } : null)
  const fail = (res, label, message) => (err) => {
    console.error(`${label}:`, err)
    res.status(500).json({ error: message })
  }

  // ---------- homework ----------
  app.get('/api/parent/children/:childId/homework', verifyToken, limiter, async (req, res) => {
    try {
      const found = await linkedChild(req, res)
      if (!found) return
      const { child, classRow } = found

      let assignments = []
      if (classRow) {
        const { data, error } = await supabase.from('assignments')
          .select('id, class_id, title, description, due_date, subject').eq('class_id', classRow.id).order('due_date', { ascending: true })
        if (error) throw error
        assignments = data || []
      }

      const { data: subRows, error: subErr } = await supabase.from('submissions')
        .select('id, assignment_id, grade, feedback, status, is_late, submitted_at').eq('student_id', child.id)
      if (subErr) throw subErr
      const latest = {}
      for (const sub of subRows || []) {
        const prev = latest[sub.assignment_id]
        if (!prev || new Date(sub.submitted_at) > new Date(prev.submitted_at)) latest[sub.assignment_id] = sub
      }

      const nowMs = Date.now()
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
          isLate: !!sub?.is_late,
          subject: a.subject || 'General',
        }
      })
      res.json({ child: childOut(child), classInfo: classOut(classRow), homework })
    } catch (err) {
      fail(res, 'Parent homework error', 'Could not load your child\'s homework. Please try again.')(err)
    }
  })

  // ---------- exams (dates, times, venues) ----------
  app.get('/api/parent/children/:childId/exams', verifyToken, limiter, async (req, res) => {
    try {
      const found = await linkedChild(req, res)
      if (!found) return
      const { child, classRow } = found
      if (!child.org_id) return res.json({ child: childOut(child), exams: [] })

      let q = supabase.from('exams')
        .select('id, class_id, subject, title, exam_date, start_time, duration_minutes, venue, total_marks').eq('org_id', child.org_id)
      q = classRow ? q.or(`class_id.eq.${classRow.id},class_id.is.null`) : q.is('class_id', null)
      const { data, error } = await q.order('exam_date').order('start_time').limit(500)
      if (error) throw error

      res.json({
        child: childOut(child),
        exams: (data || []).map(e => ({
          id: e.id,
          subject: e.subject,
          title: e.title,
          date: e.exam_date,
          startTime: hhmm(e.start_time),
          durationMinutes: e.duration_minutes ?? null,
          venue: e.venue || '',
          totalMarks: e.total_marks ?? null,
          classId: e.class_id || null,
          className: e.class_id && classRow && e.class_id === classRow.id ? classLabel(classRow) : '',
        })),
      })
    } catch (err) {
      fail(res, 'Parent exams error', 'Could not load your child\'s exams. Please try again.')(err)
    }
  })

  // ---------- exam results ----------
  app.get('/api/parent/children/:childId/results', verifyToken, limiter, async (req, res) => {
    try {
      const found = await linkedChild(req, res)
      if (!found) return
      const { child } = found

      const { data: rows, error } = await supabase.from('exam_results')
        .select('exam_id, mark, comment').eq('student_id', child.id)
      if (error) throw error
      const withMarks = (rows || []).filter(r => r.mark !== null && r.mark !== undefined)
      const exams = await fetchIn('exams', 'id, org_id, subject, title, exam_date, total_marks', 'id', withMarks.map(r => r.exam_id), ['id'])
      const byId = Object.fromEntries(exams.filter(e => e.org_id === child.org_id).map(e => [e.id, e]))

      const results = withMarks
        .filter(r => byId[r.exam_id])
        .map(r => {
          const e = byId[r.exam_id]
          const mark = Number(r.mark)
          const percent = e.total_marks ? Math.round((mark / e.total_marks) * 1000) / 10 : null
          return { examId: e.id, subject: e.subject, title: e.title, date: e.exam_date, mark, totalMarks: e.total_marks ?? null, percent, comment: r.comment || '' }
        })
        .sort((a, b) => String(a.date).localeCompare(String(b.date)))

      const pcts = results.filter(r => r.percent !== null).map(r => r.percent)
      const average = pcts.length ? Math.round((pcts.reduce((t, v) => t + v, 0) / pcts.length) * 10) / 10 : null
      res.json({ child: childOut(child), average, results })
    } catch (err) {
      fail(res, 'Parent results error', 'Could not load your child\'s results. Please try again.')(err)
    }
  })

  // ---------- timetable (one week of the child's class) ----------
  app.get('/api/parent/children/:childId/timetable', verifyToken, limiter, async (req, res) => {
    try {
      const found = await linkedChild(req, res)
      if (!found) return
      const { child, classRow } = found
      const orgId = child.org_id

      const start = mondayOf(parseDate(req.query.weekStart) || new Date())
      const end = addDays(start, 6)
      const from = iso(start)
      const to = iso(end)

      let periods = DEFAULT_PERIODS
      let slots = []
      let terms = []
      let events = []

      if (orgId) {
        const { data: pr, error: prErr } = await supabase.from('timetable_periods')
          .select('period, label, start_time, end_time, is_break').eq('org_id', orgId).order('period')
        if (prErr) throw prErr
        if (pr && pr.length) {
          periods = pr.map(p => ({ period: p.period, label: p.label || `Period ${p.period}`, start: hhmm(p.start_time), end: hhmm(p.end_time), isBreak: !!p.is_break }))
        }

        if (classRow) {
          const { data, error } = await supabase.from('timetable_slots')
            .select('id, class_id, day_of_week, period, subject, teacher_id, room')
            .eq('org_id', orgId).eq('class_id', classRow.id).order('day_of_week').order('period')
          if (error) throw error
          slots = data || []
        }

        const [termsRes, eventsRes] = await Promise.all([
          supabase.from('school_terms').select('id, title, kind, start_date, end_date')
            .eq('org_id', orgId).lte('start_date', to).gte('end_date', from).order('start_date'),
          supabase.from('events').select('id, title, date, location, type')
            .or(`org_id.eq.${orgId},is_platform.eq.true`)
            .gte('date', addDays(start, -1).toISOString()).lt('date', addDays(end, 2).toISOString()).order('date'),
        ])
        if (termsRes.error) throw termsRes.error
        if (eventsRes.error) throw eventsRes.error
        terms = (termsRes.data || []).map(t => ({ id: t.id, title: t.title, kind: t.kind, startDate: t.start_date, endDate: t.end_date }))
        events = eventsRes.data || []
      }

      const teacherIds = [...new Set(slots.map(s => s.teacher_id).filter(Boolean))]
      const teachers = teacherIds.length ? await fetchIn('users', 'id, name', 'id', teacherIds, ['id']) : []
      const teacherName = Object.fromEntries(teachers.map(t => [t.id, t.name || '']))

      res.json({
        child: childOut(child),
        weekStart: from,
        className: classRow ? classLabel(classRow) : '',
        periods,
        slots: slots.map(s => ({
          id: s.id, day: s.day_of_week, period: s.period, subject: s.subject,
          teacherName: s.teacher_id ? (teacherName[s.teacher_id] || '') : '', room: s.room || '',
        })),
        terms,
        events,
      })
    } catch (err) {
      fail(res, 'Parent timetable error', 'Could not load your child\'s timetable. Please try again.')(err)
    }
  })
}
