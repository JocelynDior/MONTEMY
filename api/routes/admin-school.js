/**
 * api/routes/admin-school.js
 * Phase 8 – School Management endpoints.
 *
 * Routes:
 *   GET    /api/admin/school/:orgId/members
 *   POST   /api/admin/school/:orgId/members/:userId/action  { action: verify|block|unblock|delete }
 *   POST   /api/admin/school/:orgId/message                 { role?, body, type? }
 */

module.exports = (app, { supabase, verifyToken, adminOrFail, isUuid }) => {
  async function writeAudit(adminId, action, targetUserId, orgId, details) {
    await supabase.from('admin_audit_log').insert({
      admin_id: adminId,
      action,
      target_user_id: targetUserId ?? null,
      org_id: orgId ?? null,
      details: details ?? null,
    })
  }

  // ── GET /api/admin/school/:orgId/members ─────────────────────────────────────
  app.get('/api/admin/school/:orgId/members', verifyToken, adminOrFail, async (req, res) => {
    const { orgId } = req.params
    if (!isUuid(orgId)) return res.status(400).json({ error: 'Invalid orgId' })

    const { search = '', role = '' } = req.query
    let q = supabase
      .from('users')
      .select('id, name, email, role, is_verified, is_suspended, created_at')
      .eq('org_id', orgId)
      .order('name', { ascending: true })
      .limit(500)

    if (role) q = q.eq('role', role)
    if (search.trim()) {
      const term = `%${search.trim()}%`
      q = q.or(`name.ilike.${term},email.ilike.${term}`)
    }

    const { data, error } = await q
    if (error) return res.status(500).json({ error: error.message })

    res.json({
      members: (data || []).map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        isVerified: u.is_verified,
        isBlocked: u.is_suspended,
        joinedAt: u.created_at,
      })),
    })
  })

  // ── POST /api/admin/school/:orgId/members/:userId/action ─────────────────────
  app.post('/api/admin/school/:orgId/members/:userId/action', verifyToken, adminOrFail, async (req, res) => {
    const { orgId, userId } = req.params
    if (!isUuid(orgId) || !isUuid(userId)) return res.status(400).json({ error: 'Invalid id' })

    const { action } = req.body
    if (!['verify', 'block', 'unblock', 'delete'].includes(action)) {
      return res.status(400).json({ error: 'action must be verify, block, unblock or delete' })
    }

    const { data: target } = await supabase
      .from('users').select('id, name, email, org_id').eq('id', userId).maybeSingle()
    if (!target || target.org_id !== orgId) {
      return res.status(404).json({ error: 'Member not found in this organisation' })
    }

    if (action === 'delete') {
      await writeAudit(req.user.id, 'delete_member', userId, orgId, { name: target.name, email: target.email })
      const { error } = await supabase.from('users').delete().eq('id', userId)
      if (error) return res.status(500).json({ error: error.message })
      return res.json({ ok: true })
    }

    if (action === 'block') {
      await writeAudit(req.user.id, 'block_member', userId, orgId, { name: target.name })
      const { error } = await supabase.from('users').update({ is_suspended: true }).eq('id', userId)
      if (error) return res.status(500).json({ error: error.message })
      return res.json({ ok: true })
    }

    if (action === 'unblock') {
      const { error } = await supabase.from('users').update({ is_suspended: false }).eq('id', userId)
      if (error) return res.status(500).json({ error: error.message })
      return res.json({ ok: true })
    }

    // verify
    const { error } = await supabase.from('users').update({ is_verified: true }).eq('id', userId)
    if (error) return res.status(500).json({ error: error.message })
    res.json({ ok: true })
  })

  // ── POST /api/admin/school/:orgId/message ─────────────────────────────────────
  app.post('/api/admin/school/:orgId/message', verifyToken, adminOrFail, async (req, res) => {
    const { orgId } = req.params
    if (!isUuid(orgId)) return res.status(400).json({ error: 'Invalid orgId' })

    const { role, body, type = 'info' } = req.body
    if (!body || !body.trim()) return res.status(400).json({ error: 'body is required' })
    if (body.length > 300) return res.status(400).json({ error: 'body too long (max 300)' })
    if (!['info', 'success', 'warning'].includes(type)) return res.status(400).json({ error: 'Invalid type' })

    let q = supabase.from('users').select('id').eq('org_id', orgId).eq('is_verified', true).eq('is_suspended', false)
    if (role) q = q.eq('role', role)
    const { data: targets, error: qErr } = await q
    if (qErr) return res.status(500).json({ error: qErr.message })

    if (!targets || targets.length === 0) return res.json({ sent: 0 })

    const rows = targets.map(u => ({
      user_id: u.id,
      type,
      content: body.trim(),
      read: false,
    }))

    const { error } = await supabase.from('notifications').insert(rows)
    if (error) return res.status(500).json({ error: error.message })

    res.json({ sent: targets.length })
  })
}
