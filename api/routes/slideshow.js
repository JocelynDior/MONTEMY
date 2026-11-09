// School slideshow (Phase 3).
//   GET    /api/slideshow            the slides of the signed-in user's organisation (an admin adds ?orgId=)
//   POST   /api/slideshow            admin: add a slide { orgId, image (base64 or data URL), caption? }
//   PUT    /api/slideshow/order      admin: reorder { orgId, ids: [slide ids, first to last] }
//   DELETE /api/slideshow/:id        admin: remove a slide
//
// Images are uploaded from here to ImgBB, so IMGBB_API_KEY stays on Render. Only the URL that ImgBB returns is
// saved in Supabase (table org_slides, see sql/phase-03-slideshow.sql). The 8 MB body limit for this route is set in server.js.

const MAX_SLIDES = 10                       // per organisation
const MAX_IMAGE_BYTES = 5 * 1024 * 1024     // after decoding
const MAX_CAPTION = 120
const DATA_URL = /^data:image\/(png|jpe?g|webp|gif);base64,/i
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/

module.exports = (app, ctx) => {
  const { supabase, rateLimit, verifyToken, adminOrFail, isUuid } = ctx

  const readLimiter = rateLimit({
    windowMs: 60 * 1000, max: 120, keyGenerator: (req) => req.user.id,
    message: { error: 'Too many requests. Wait a moment and try again.' },
  })
  const writeLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, max: 40, keyGenerator: (req) => req.user.id,
    message: { error: 'Too many slideshow changes. Wait a few minutes and try again.' },
  })

  const shape = (s) => ({ id: s.id, imageUrl: s.image_url, caption: s.caption || '', sortOrder: s.sort_order })

  async function slidesOf(orgId) {
    const { data, error } = await supabase.from('org_slides')
      .select('id, image_url, caption, sort_order')
      .eq('org_id', orgId).order('sort_order', { ascending: true }).order('created_at', { ascending: true })
    if (error) throw error
    return (data || []).map(shape)
  }

  // Sends the image to ImgBB and returns its public URL
  async function uploadToImgBB(base64, name) {
    const key = process.env.IMGBB_API_KEY
    if (!key) {
      const err = new Error('Image uploads are not set up yet. Add IMGBB_API_KEY on the server.')
      err.status = 503
      throw err
    }
    const form = new FormData()
    form.append('key', key)
    form.append('image', base64)
    if (name) form.append('name', name)
    const res = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: form, signal: AbortSignal.timeout(25000) })
    const json = await res.json().catch(() => ({}))
    const url = json?.data?.display_url || json?.data?.url
    if (!res.ok || !json?.success || typeof url !== 'string' || !url.startsWith('https://')) {
      console.error('ImgBB upload failed:', res.status, json?.error?.message || '')
      const err = new Error('The image could not be uploaded. Try again, or use a smaller image.')
      err.status = 502
      throw err
    }
    return url
  }

  // Signed-in users: their own organisation's slides. Admins: the organisation named in ?orgId=.
  app.get('/api/slideshow', verifyToken, readLimiter, async (req, res) => {
    try {
      const { data: me, error } = await supabase.from('users').select('role, org_id').eq('id', req.user.id).maybeSingle()
      if (error) throw error
      if (!me) return res.status(404).json({ error: 'Account not found.' })

      let orgId = me.org_id
      if (me.role === 'admin' && req.query.orgId !== undefined) {
        if (!isUuid(String(req.query.orgId))) return res.status(400).json({ error: 'Choose a school or firm.' })
        orgId = String(req.query.orgId)
      }
      if (!orgId) return res.json({ slides: [] })
      res.json({ slides: await slidesOf(orgId) })
    } catch (err) {
      console.error('Slideshow list error:', err)
      res.status(500).json({ error: 'Could not load the slideshow.' })
    }
  })

  app.post('/api/slideshow', verifyToken, writeLimiter, async (req, res) => {
    try {
      const admin = await adminOrFail(req, res)
      if (!admin) return

      const { orgId, image } = req.body || {}
      if (!isUuid(String(orgId))) return res.status(400).json({ error: 'Choose a school or firm.' })
      if (typeof image !== 'string' || !image) return res.status(400).json({ error: 'Choose an image.' })

      // Accepts a full data URL or the bare base64 text
      const base64 = image.replace(DATA_URL, '').replace(/\s+/g, '')
      if (!BASE64.test(base64) || (image.startsWith('data:') && !DATA_URL.test(image))) {
        return res.status(400).json({ error: 'Use a PNG, JPG, WebP or GIF image.' })
      }
      const bytes = Math.floor((base64.length * 3) / 4)
      if (bytes > MAX_IMAGE_BYTES) return res.status(400).json({ error: 'That image is too big. The limit is 5 MB.' })

      const caption = typeof req.body.caption === 'string' ? req.body.caption.trim().slice(0, MAX_CAPTION) : ''

      const { data: org, error: orgErr } = await supabase.from('organizations').select('id').eq('id', orgId).maybeSingle()
      if (orgErr) throw orgErr
      if (!org) return res.status(404).json({ error: 'School or firm not found.' })

      const { data: existing, error: listErr } = await supabase.from('org_slides').select('sort_order').eq('org_id', orgId)
      if (listErr) throw listErr
      if ((existing || []).length >= MAX_SLIDES) {
        return res.status(400).json({ error: `A slideshow can have up to ${MAX_SLIDES} images. Remove one first.` })
      }
      const nextOrder = (existing || []).reduce((m, s) => Math.max(m, s.sort_order || 0), -1) + 1

      const imageUrl = await uploadToImgBB(base64, `slide-${orgId.slice(0, 8)}`)

      const { data: row, error: insErr } = await supabase.from('org_slides')
        .insert({ org_id: orgId, image_url: imageUrl, caption: caption || null, sort_order: nextOrder, created_by: admin.id })
        .select('id, image_url, caption, sort_order').single()
      if (insErr) throw insErr
      res.status(201).json({ slide: shape(row) })
    } catch (err) {
      if (err.status) return res.status(err.status).json({ error: err.message })
      console.error('Slideshow add error:', err)
      res.status(500).json({ error: 'Could not add the image.' })
    }
  })

  app.put('/api/slideshow/order', verifyToken, writeLimiter, async (req, res) => {
    try {
      const admin = await adminOrFail(req, res)
      if (!admin) return

      const { orgId, ids } = req.body || {}
      if (!isUuid(String(orgId))) return res.status(400).json({ error: 'Choose a school or firm.' })
      if (!Array.isArray(ids) || ids.length > MAX_SLIDES || !ids.every(i => isUuid(String(i))) || new Set(ids).size !== ids.length) {
        return res.status(400).json({ error: 'That order is not valid.' })
      }

      const current = await slidesOf(orgId)
      const known = new Set(current.map(s => s.id))
      if (ids.length !== current.length || !ids.every(i => known.has(i))) {
        return res.status(400).json({ error: 'The slideshow changed. Reload the page and try again.' })
      }

      await Promise.all(ids.map(async (id, index) => {
        const { error } = await supabase.from('org_slides').update({ sort_order: index }).eq('id', id).eq('org_id', orgId)
        if (error) throw error
      }))
      res.json({ slides: await slidesOf(orgId) })
    } catch (err) {
      console.error('Slideshow reorder error:', err)
      res.status(500).json({ error: 'Could not save the new order.' })
    }
  })

  app.delete('/api/slideshow/:id', verifyToken, writeLimiter, async (req, res) => {
    try {
      const admin = await adminOrFail(req, res)
      if (!admin) return
      if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Image not found.' })

      const { data, error } = await supabase.from('org_slides').delete().eq('id', req.params.id).select('id')
      if (error) throw error
      if (!data || data.length === 0) return res.status(404).json({ error: 'Image not found.' })
      res.json({ success: true })
    } catch (err) {
      console.error('Slideshow remove error:', err)
      res.status(500).json({ error: 'Could not remove the image.' })
    }
  })
}
