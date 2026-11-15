/**
 * api/routes/calendar.js
 * Phase 9 – School/Firm Calendar.
 *
 * Two kinds of row, both scoped by (org_id, is_platform) the same way the Events system is:
 *   calendar_settings  the months that have been "opened" on the calendar. A month with no
 *                       settings row never shows, even if an entry exists dated inside it.
 *   calendar_entries   the dated items inside an opened month (Holiday, Exam, Term Start,
 *                       Term End, Sports Day, Parents' Evening, Other).
 *
 * Routes:
 *   GET    /api/calendar/months                    everyone — which months are open
 *   GET    /api/calendar/entries?year=&month=       everyone — that month's items, with the
 *                                                     org's/platform's School Events merged in
 *   POST   /api/admin/calendar/months               admin — open a platform-wide month
 *   DELETE /api/admin/calendar/months/:id            admin
 *   POST   /api/admin/calendar/entries               admin — add a platform-wide entry
 *   PUT    /api/admin/calendar/entries/:id            admin
 *   DELETE /api/admin/calendar/entries/:id            admin
 *   POST   /api/principal/calendar/months            principal — open a month for their school
 *   DELETE /api/principal/calendar/months/:id         principal
 *   POST   /api/principal/calendar/entries            principal — add an entry for their school
 *   PUT    /api/principal/calendar/entries/:id         principal
 *   DELETE /api/principal/calendar/entries/:id         principal
 *
 * Only an admin or a principal can ever reach the write routes — enforced here, not just by the
 * client, since the client hides the controls but the server is what a bad request has to get past.
 */

const ENTRY_TYPES = ['holiday', 'exam', 'term_start', 'term_end', 'sports_day', 'parents_evening', 'other']
const EVENT_FIELDS = 'id, org_id, title, date, type, is_platform'

module.exports = (app, { supabase, verifyToken, adminOrFail, principalOrFail, isUuid, rateLimit }) => {
  const calendarLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 90,
    keyGenerator: (req) => req.user.id,
    message: { error: 'Too many requests. Wait a moment and try again.' },
  })

  async function calendarUser(req, res) {
    const { data: user } = await supabase.from('users')
      .select('id, role, org_id').eq('id', req.user.id).maybeSingle()
    if (!user) { res.status(403).json({ error: 'Account not found.' }); return null }
    return user
  }

  function cleanMonthInput(body) {
    const year = Number(body?.year)
    const month = Number(body?.month)
    if (!Number.isInteger(year) || year < 2000 || year > 2100) return { error: 'Choose a valid year.' }
    if (!Number.isInteger(month) || month < 1 || month > 12) return { error: 'Choose a valid month.' }
    return { value: { year, month } }
  }

  function cleanEntryInput(body) {
    const date = String(body?.date || '')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(new Date(date).getTime())) return { error: 'Choose a valid date.' }
    const type = ENTRY_TYPES.includes(body?.type) ? body.type : 'other'
    const title = String(body?.title || '').trim()
    if (!title) return { error: 'Give this a title.' }
    if (title.length > 150) return { error: 'Keep the title under 150 characters.' }
    return { value: { date, type, title } }
  }

  // ---------- Read: everyone ----------

  app.get('/api/calendar/months', verifyToken, calendarLimiter, async (req, res) => {
    try {
      const user = await calendarUser(req, res)
      if (!user) return
      const isAdmin = user.role === 'admin'
      const isPrincipal = user.role === 'principal'

      let q = supabase.from('calendar_settings').select('id, org_id, is_platform, year, month').order('year', { ascending: false }).order('month', { ascending: false })
      q = user.org_id ? q.or(`is_platform.eq.true,org_id.eq.${user.org_id}`) : q.eq('is_platform', true)
      const { data, error } = await q
      if (error) throw error

      res.json({
        months: (data || []).map(m => ({ id: m.id, year: m.year, month: m.month, isPlatform: !!m.is_platform })),
        role: user.role,
        canManage: isAdmin || (isPrincipal && !!user.org_id),
        managePath: isAdmin ? '/api/admin/calendar' : (isPrincipal ? '/api/principal/calendar' : null),
      })
    } catch (err) {
      console.error('Calendar months error:', err)
      res.status(500).json({ error: 'Could not load the calendar. Please try again.' })
    }
  })

  app.get('/api/calendar/entries', verifyToken, calendarLimiter, async (req, res) => {
    try {
      const user = await calendarUser(req, res)
      if (!user) return
      const isAdmin = user.role === 'admin'
      const isPrincipal = user.role === 'principal'
      const canManage = isAdmin || (isPrincipal && !!user.org_id)

      const month = cleanMonthInput(req.query)
      if (month.error) return res.status(400).json({ error: month.error })
      const { year, month: m } = month.value
      const from = `${year}-${String(m).padStart(2, '0')}-01`
      const to = m === 12 ? `${year + 1}-01-01` : `${year}-${String(m + 1).padStart(2, '0')}-01`

      // Platform-wide months are always open to look at; a school's own month only shows once the
      // school has opened it, so there is one calendar to check (not two) when org_id is missing.
      let settingsQ = supabase.from('calendar_settings').select('id').eq('year', year).eq('month', m)
      settingsQ = user.org_id ? settingsQ.or(`is_platform.eq.true,org_id.eq.${user.org_id}`) : settingsQ.eq('is_platform', true)
      const { data: settingsRows } = await settingsQ
      const isOpen = !!(settingsRows && settingsRows.length)
      if (!isOpen) return res.json({ isOpen: false, entries: [] })

      let entriesQ = supabase.from('calendar_entries').select('id, org_id, is_platform, date, type, title').gte('date', from).lt('date', to)
      entriesQ = user.org_id ? entriesQ.or(`is_platform.eq.true,org_id.eq.${user.org_id}`) : entriesQ.eq('is_platform', true)
      let eventsQ = supabase.from('events').select(EVENT_FIELDS).gte('date', from).lt('date', to)
      eventsQ = user.org_id ? eventsQ.or(`is_platform.eq.true,org_id.eq.${user.org_id}`) : eventsQ.eq('is_platform', true)

      const [{ data: entries, error: eErr }, { data: events, error: evErr }] = await Promise.all([entriesQ, eventsQ])
      if (eErr) throw eErr
      if (evErr) throw evErr

      const merged = [
        ...(entries || []).map(e => ({
          id: e.id, source: 'calendar', date: e.date, type: e.type, title: e.title,
          isPlatform: !!e.is_platform,
          canEdit: canManage && (isAdmin ? !!e.is_platform : (!e.is_platform && e.org_id === user.org_id)),
        })),
        ...(events || []).map(e => ({
          id: e.id, source: 'event', date: String(e.date).slice(0, 10), type: e.type || 'general', title: e.title,
          isPlatform: !!e.is_platform,
          canEdit: false, // events are managed from the Events page, not the Calendar
        })),
      ].sort((a, b) => a.date.localeCompare(b.date))

      res.json({ isOpen: true, entries: merged })
    } catch (err) {
      console.error('Calendar entries error:', err)
      res.status(500).json({ error: 'Could not load the calendar. Please try again.' })
    }
  })

  // ---------- Write: shared logic for admin (platform) and principal (own org) ----------

  function registerManage(prefix, { loadUser, isPlatform }) {
    app.post(`${prefix}/months`, verifyToken, calendarLimiter, async (req, res) => {
      try {
        const user = await loadUser(req, res)
        if (!user) return
        const input = cleanMonthInput(req.body || {})
        if (input.error) return res.status(400).json({ error: input.error })
        const row = isPlatform
          ? { is_platform: true, org_id: null, ...input.value, created_by: user.id }
          : { is_platform: false, org_id: user.org_id, ...input.value, created_by: user.id }

        const { data, error } = await supabase.from('calendar_settings').insert(row).select('id').single()
        if (error) {
          if (error.code === '23505') return res.status(409).json({ error: 'That month is already on the calendar.' })
          throw error
        }
        res.json({ success: true, id: data.id })
      } catch (err) {
        console.error('Open calendar month error:', err)
        res.status(500).json({ error: 'Could not add that month. Please try again.' })
      }
    })

    app.delete(`${prefix}/months/:id`, verifyToken, calendarLimiter, async (req, res) => {
      try {
        const user = await loadUser(req, res)
        if (!user) return
        if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Not found.' })
        let q = supabase.from('calendar_settings').select('id, year, month').eq('id', req.params.id).eq('is_platform', isPlatform)
        if (!isPlatform) q = q.eq('org_id', user.org_id)
        const { data: found } = await q.maybeSingle()
        if (!found) return res.status(404).json({ error: 'Not found.' })

        const { error: delErr } = await supabase.from('calendar_settings').delete().eq('id', found.id)
        if (delErr) throw delErr

        // Dropping a month also drops whatever was pinned inside it, so the chip bar and the
        // entries underneath never disagree about which months exist.
        const from = `${found.year}-${String(found.month).padStart(2, '0')}-01`
        const to = found.month === 12 ? `${found.year + 1}-01-01` : `${found.year}-${String(found.month + 1).padStart(2, '0')}-01`
        let delEntries = supabase.from('calendar_entries').delete().eq('is_platform', isPlatform).gte('date', from).lt('date', to)
        if (!isPlatform) delEntries = delEntries.eq('org_id', user.org_id)
        const { error: delEntriesErr } = await delEntries
        if (delEntriesErr) throw delEntriesErr

        res.json({ success: true })
      } catch (err) {
        console.error('Remove calendar month error:', err)
        res.status(500).json({ error: 'Could not remove that month. Please try again.' })
      }
    })

    app.post(`${prefix}/entries`, verifyToken, calendarLimiter, async (req, res) => {
      try {
        const user = await loadUser(req, res)
        if (!user) return
        const input = cleanEntryInput(req.body || {})
        if (input.error) return res.status(400).json({ error: input.error })
        const row = isPlatform
          ? { is_platform: true, org_id: null, ...input.value, created_by: user.id }
          : { is_platform: false, org_id: user.org_id, ...input.value, created_by: user.id }

        const { data, error } = await supabase.from('calendar_entries').insert(row).select('id').single()
        if (error) throw error
        res.json({ success: true, id: data.id })
      } catch (err) {
        console.error('Create calendar entry error:', err)
        res.status(500).json({ error: 'Could not save that entry. Please try again.' })
      }
    })

    app.put(`${prefix}/entries/:id`, verifyToken, calendarLimiter, async (req, res) => {
      try {
        const user = await loadUser(req, res)
        if (!user) return
        if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Not found.' })
        const input = cleanEntryInput(req.body || {})
        if (input.error) return res.status(400).json({ error: input.error })
        let q = supabase.from('calendar_entries').update(input.value).eq('id', req.params.id).eq('is_platform', isPlatform)
        if (!isPlatform) q = q.eq('org_id', user.org_id)
        const { data, error } = await q.select('id')
        if (error) throw error
        if (!data || !data.length) return res.status(404).json({ error: 'Not found.' })
        res.json({ success: true })
      } catch (err) {
        console.error('Update calendar entry error:', err)
        res.status(500).json({ error: 'Could not save your changes. Please try again.' })
      }
    })

    app.delete(`${prefix}/entries/:id`, verifyToken, calendarLimiter, async (req, res) => {
      try {
        const user = await loadUser(req, res)
        if (!user) return
        if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Not found.' })
        let q = supabase.from('calendar_entries').delete().eq('id', req.params.id).eq('is_platform', isPlatform)
        if (!isPlatform) q = q.eq('org_id', user.org_id)
        const { data, error } = await q.select('id')
        if (error) throw error
        if (!data || !data.length) return res.status(404).json({ error: 'Not found.' })
        res.json({ success: true })
      } catch (err) {
        console.error('Delete calendar entry error:', err)
        res.status(500).json({ error: 'Could not remove that entry. Please try again.' })
      }
    })
  }

  registerManage('/api/admin/calendar', { loadUser: adminOrFail, isPlatform: true })
  // principalOrFail already checks the account has a linked school before returning it
  registerManage('/api/principal/calendar', { loadUser: principalOrFail, isPlatform: false })
}
