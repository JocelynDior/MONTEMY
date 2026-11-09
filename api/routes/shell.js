// One call that fills the app frame after sign-in (Phase 3):
//   GET /api/shell  ->  {
//     org: { id, name, type, logoUrl } | null,    null for an admin, who belongs to no organisation
//     slides: [{ id, imageUrl, caption, sortOrder }],
//     unreadMessages, unreadNotifications
//   }
// type is 'school' or 'tutor' (a tutor firm); the app shows School or Firm wording from it.

module.exports = (app, ctx) => {
  const { supabase, rateLimit, verifyToken } = ctx

  const shellLimiter = rateLimit({
    windowMs: 60 * 1000, max: 60, keyGenerator: (req) => req.user.id,
    message: { error: 'Too many requests. Wait a moment and try again.' },
  })

  app.get('/api/shell', verifyToken, shellLimiter, async (req, res) => {
    try {
      const userId = req.user.id
      const { data: me, error: meErr } = await supabase.from('users').select('org_id').eq('id', userId).maybeSingle()
      if (meErr) throw meErr
      if (!me) return res.status(404).json({ error: 'Account not found.' })

      const [org, slides, messages, notifications] = await Promise.all([
        me.org_id
          ? supabase.from('organizations').select('id, name, type, logo_url').eq('id', me.org_id).maybeSingle()
          : Promise.resolve({ data: null }),
        me.org_id
          ? supabase.from('org_slides').select('id, image_url, caption, sort_order').eq('org_id', me.org_id)
              .order('sort_order', { ascending: true }).order('created_at', { ascending: true })
          : Promise.resolve({ data: [] }),
        supabase.from('messages').select('id', { count: 'exact', head: true }).eq('receiver_id', userId).eq('read', false),
        supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('read', false),
      ])
      for (const r of [org, slides]) if (r.error) throw r.error

      res.json({
        org: org.data
          ? { id: org.data.id, name: org.data.name || '', type: org.data.type || 'school', logoUrl: org.data.logo_url || '' }
          : null,
        slides: (slides.data || []).map(s => ({ id: s.id, imageUrl: s.image_url, caption: s.caption || '', sortOrder: s.sort_order })),
        unreadMessages: messages.count || 0,
        unreadNotifications: notifications.count || 0,
      })
    } catch (err) {
      console.error('Shell load error:', err)
      res.status(500).json({ error: 'Could not load your school details.' })
    }
  })
}
