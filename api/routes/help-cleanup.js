// Daily clean-up of Help chats (Phase 4).
//   POST /api/help-cleanup     header x-cron-secret = CRON_SECRET (same secret as the event reminders)
// Deletes AI chats that were not used for 14 days. Chats waiting for an admin are kept.
// Schedule one call a day (a Render Cron Job or any free cron service).

module.exports = (app, ctx) => {
  const { supabase, cronSecretMatches, cronLimiter } = ctx

  app.post('/api/help-cleanup', cronLimiter, async (req, res) => {
    if (!cronSecretMatches(req.headers['x-cron-secret'])) return res.status(401).json({ error: 'Unauthorized' })
    try {
      const { data, error } = await supabase.rpc('purge_old_help_chats')
      if (error) throw error
      res.json({ success: true, deleted: typeof data === 'number' ? data : 0 })
    } catch (err) {
      console.error('Help cleanup error:', err)
      res.status(500).json({ error: 'Could not clean up the chats.' })
    }
  })
}
