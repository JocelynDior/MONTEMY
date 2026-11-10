// Help assistant (Phase 4).
//   GET    /api/help/chats                       my chats, newest first
//   POST   /api/help/chats                       start a chat { message? }  -> { chat, messages }
//   GET    /api/help/chats/:id                   one chat with its messages
//   POST   /api/help/chats/:id/messages          { body }  -> { messages: [new ones], chat }
//   POST   /api/help/chats/:id/escalate          hand the chat to an admin
//   DELETE /api/help/chats/:id                   delete my chat
//   GET    /api/help/admin/chats?status=         admin: chats (default: waiting_admin)
//   GET    /api/help/admin/chats/:id             admin: one chat with its messages
//   POST   /api/help/admin/chats/:id/reply       admin: { body }
//   POST   /api/help/admin/chats/:id/close       admin: close the chat
//
// The AI answers in the user's preferred language, reads the app guide on every message, and can use the tools in
// ai/tools.js (change avatar, change language, open a page, show options) plus escalate_to_admin (defined here).
// Everything the AI does acts on the signed-in user only: ids come from the verified session.

const MAX_BODY = 2000
const HISTORY = 20          // messages sent to the AI
const WAITING_TEXT = 'Please wait until admins get back to you, this may take a few business minutes to hours.'

const ESCALATE_TOOL = {
  name: 'escalate_to_admin',
  description: 'Send this chat to a human admin. Use it only when you cannot solve the problem with the app guide and tools, or when the user asks for a person.',
  parameters: { type: 'object', properties: { reason: { type: 'string', description: 'One short sentence for the admin.' } }, required: [] },
}

module.exports = (app, ctx) => {
  const { supabase, rateLimit, verifyToken, adminOrFail, isUuid, notifyMany, notifyUser, afterReply, ai } = ctx
  const { provider, knowledge, tools } = ai

  const readLimiter = rateLimit({ windowMs: 60 * 1000, max: 120, keyGenerator: (r) => r.user.id, message: { error: 'Too many requests. Wait a moment and try again.' } })
  const sendLimiter = rateLimit({ windowMs: 60 * 1000, max: 15, keyGenerator: (r) => r.user.id, message: { error: 'You are sending messages too fast. Wait a moment and try again.' } })

  const shapeChat = (c) => ({ id: c.id, title: c.title, status: c.status, createdAt: c.created_at, updatedAt: c.updated_at })
  const shapeMsg = (m) => ({ id: m.id, sender: m.sender, body: m.body, options: m.options || null, createdAt: m.created_at })

  async function me(req) {
    const { data, error } = await supabase.from('users').select('id, name, role, org_id, preferred_language').eq('id', req.user.id).maybeSingle()
    if (error) throw error
    return data
  }

  async function ownChat(req, res) {
    if (!isUuid(req.params.id)) { res.status(404).json({ error: 'Chat not found.' }); return null }
    const { data, error } = await supabase.from('help_chats').select('*').eq('id', req.params.id).eq('user_id', req.user.id).maybeSingle()
    if (error) throw error
    if (!data) { res.status(404).json({ error: 'Chat not found.' }); return null }
    return data
  }

  async function messagesOf(chatId) {
    const { data, error } = await supabase.from('help_messages').select('*').eq('chat_id', chatId).order('created_at', { ascending: true }).limit(500)
    if (error) throw error
    return data || []
  }

  async function addMessage(chatId, sender, body, options) {
    const { data, error } = await supabase.from('help_messages')
      .insert({ chat_id: chatId, sender, body: String(body).slice(0, 4000), options: options && options.length ? options : null })
      .select('*').single()
    if (error) throw error
    return data
  }

  const touch = (chatId, patch = {}) => supabase.from('help_chats').update({ updated_at: new Date().toISOString(), ...patch }).eq('id', chatId)

  async function adminIds() {
    const { data } = await supabase.from('users').select('id').eq('role', 'admin').or('is_suspended.is.null,is_suspended.eq.false')
    return (data || []).map(r => r.id)
  }

  async function handToAdmin(chat, user, reason) {
    await touch(chat.id, { status: 'waiting_admin' })
    const text = reason ? `${user.name || 'A user'} needs help: ${reason}` : `${user.name || 'A user'} needs help in the Help chat.`
    afterReply('Help escalation', async () => notifyMany(await adminIds(), text, 'warning', '/admin/help-inbox'))
  }

  function systemPrompt(user, org) {
    const pages = (knowledge.PAGES_BY_ROLE[user.role] || knowledge.PAGES_BY_ROLE.student).join(', ')
    return [
      'You are the Help assistant inside the Montemy app. Be short, warm and clear. Plain text only, no markdown, no emoji.',
      `Always answer in ${knowledge.languageName(user.preferred_language || 'en')}.`,
      `The user is a ${user.role}${user.name ? ` called ${user.name}` : ''}${org ? ` at a ${org.type === 'tutor' ? 'Firm' : 'School'} named ${org.name}` : ''}.`,
      'First try to help from the app guide below. Point the person to the right page with the open_page tool (never invent pages).',
      'Pages you may use for this user: ' + pages + '.',
      'If they still do not understand, offer to do it for them when you can (change picture: call show_options kind avatar, then set_avatar after they choose; change language: set_language).',
      'Use show_options kind choices to ask a quick question with 2 to 5 answers.',
      'If you cannot solve it, or they ask for a person, call escalate_to_admin. Never promise things the app guide does not say. Never ask for passwords.',
      '',
      'APP GUIDE',
      knowledge.APP_GUIDE,
    ].join('\n')
  }

  // Runs the AI for a chat and saves its answer. Returns the saved AI message(s) and whether the chat was escalated.
  async function aiReply(chat, user) {
    const { data: org } = user.org_id ? await supabase.from('organizations').select('name, type').eq('id', user.org_id).maybeSingle() : { data: null }
    const rows = (await messagesOf(chat.id)).slice(-HISTORY)
    const history = rows.map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.body }))
    const system = systemPrompt(user, org)
    const declarations = [...tools.TOOL_DECLARATIONS, ESCALATE_TOOL]

    let first
    try {
      first = await provider.chat({ system, messages: history, tools: declarations, maxOutputTokens: 700, temperature: 0.4 })
    } catch (err) {
      console.error('Help AI error:', err.message)
      return { escalate: true, reason: 'The assistant was not available.', message: await addMessage(chat.id, 'ai', WAITING_TEXT) }
    }

    const ui = []
    const notes = []
    let escalate = null
    for (const call of first.toolCalls.slice(0, 3)) {
      if (call.name === 'escalate_to_admin') { escalate = String(call.args?.reason || '').slice(0, 200) || 'The assistant could not solve it.'; continue }
      const out = await tools.runTool(call.name, call.args, { supabase, userId: user.id, role: user.role })
      notes.push(`${call.name}: ${out.result}`)
      if (out.ui) ui.push(out.ui)
    }

    let text = first.text
    if (notes.length && !escalate) {
      // Let the AI word the final answer once it knows what the tools did
      try {
        const second = await provider.chat({
          system, maxOutputTokens: 500, temperature: 0.4,
          messages: [...history, { role: 'assistant', content: first.text || '(working on it)' },
            { role: 'user', content: `[App results] ${notes.join(' | ')}\nNow write your short reply to the user. Do not mention this note.` }],
        })
        if (second.text) text = second.text
      } catch { /* keep the first text */ }
    }

    if (escalate) {
      const body = [text, WAITING_TEXT].filter(Boolean).join('\n\n')
      return { escalate: true, reason: escalate, message: await addMessage(chat.id, 'ai', body) }
    }
    if (!text) text = notes.length ? notes[0].split(': ').slice(1).join(': ') : '...'
    return { escalate: false, message: await addMessage(chat.id, 'ai', text, ui) }
  }

  // A short title written by the AI after the first message
  async function makeTitle(chat, firstText, user) {
    try {
      const r = await provider.chat({
        system: `Write a title of at most 5 words for a help chat, in ${knowledge.languageName(user.preferred_language || 'en')}. Reply with the title only: no quotes, no full stop.`,
        messages: [{ role: 'user', content: firstText.slice(0, 500) }], maxOutputTokens: 30, temperature: 0.3,
      })
      const title = r.text.replace(/["\n.]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60)
      if (title) { await supabase.from('help_chats').update({ title }).eq('id', chat.id); return title }
    } catch { /* keep the default title */ }
    const fallback = firstText.trim().slice(0, 40)
    await supabase.from('help_chats').update({ title: fallback || 'New chat' }).eq('id', chat.id)
    return fallback || 'New chat'
  }

  async function handleUserMessage(chat, user, body) {
    const userMsg = await addMessage(chat.id, 'user', body)
    const isFirst = chat.title === 'New chat' && (await messagesOf(chat.id)).length === 1
    const out = []
    out.push(userMsg)

    if (chat.status === 'waiting_admin') {
      await touch(chat.id)
      return { messages: out.map(shapeMsg), chat: { ...shapeChat(chat), updatedAt: new Date().toISOString() } }
    }

    const [reply, title] = await Promise.all([aiReply(chat, user), isFirst ? makeTitle(chat, body, user) : Promise.resolve(null)])
    out.push(reply.message)
    if (reply.escalate) await handToAdmin(chat, user, reply.reason)
    else await touch(chat.id, chat.status === 'answered' ? { status: 'ai' } : {})
    const status = reply.escalate ? 'waiting_admin' : (chat.status === 'answered' ? 'ai' : chat.status)
    return { messages: out.map(shapeMsg), chat: { ...shapeChat(chat), title: title || chat.title, status, updatedAt: new Date().toISOString() } }
  }

  const cleanBody = (v) => (typeof v === 'string' ? v.trim().slice(0, MAX_BODY) : '')

  app.get('/api/help/chats', verifyToken, readLimiter, async (req, res) => {
    try {
      const { data, error } = await supabase.from('help_chats').select('*').eq('user_id', req.user.id).order('updated_at', { ascending: false }).limit(100)
      if (error) throw error
      res.json({ chats: (data || []).map(shapeChat) })
    } catch (err) {
      console.error('Help list error:', err)
      res.status(500).json({ error: 'Could not load your chats.' })
    }
  })

  app.post('/api/help/chats', verifyToken, sendLimiter, async (req, res) => {
    try {
      const user = await me(req)
      if (!user) return res.status(404).json({ error: 'Account not found.' })
      const { data: chat, error } = await supabase.from('help_chats').insert({ user_id: user.id }).select('*').single()
      if (error) throw error
      const body = cleanBody(req.body?.message)
      if (!body) return res.status(201).json({ chat: shapeChat(chat), messages: [] })
      res.status(201).json(await handleUserMessage(chat, user, body))
    } catch (err) {
      console.error('Help create error:', err)
      res.status(500).json({ error: 'Could not start the chat.' })
    }
  })

  app.get('/api/help/chats/:id', verifyToken, readLimiter, async (req, res) => {
    try {
      const chat = await ownChat(req, res); if (!chat) return
      res.json({ chat: shapeChat(chat), messages: (await messagesOf(chat.id)).map(shapeMsg) })
    } catch (err) {
      console.error('Help load error:', err)
      res.status(500).json({ error: 'Could not load this chat.' })
    }
  })

  app.post('/api/help/chats/:id/messages', verifyToken, sendLimiter, async (req, res) => {
    try {
      const chat = await ownChat(req, res); if (!chat) return
      if (chat.status === 'closed') return res.status(400).json({ error: 'This chat is closed. Start a new one.' })
      const body = cleanBody(req.body?.body)
      if (!body) return res.status(400).json({ error: 'Write a message first.' })
      const user = await me(req)
      res.json(await handleUserMessage(chat, user, body))
    } catch (err) {
      console.error('Help send error:', err)
      res.status(500).json({ error: 'Could not send your message.' })
    }
  })

  app.post('/api/help/chats/:id/escalate', verifyToken, sendLimiter, async (req, res) => {
    try {
      const chat = await ownChat(req, res); if (!chat) return
      const user = await me(req)
      if (chat.status === 'waiting_admin') return res.json({ messages: [], chat: shapeChat(chat) })
      const msg = await addMessage(chat.id, 'ai', WAITING_TEXT)
      await handToAdmin(chat, user, '')
      res.json({ messages: [shapeMsg(msg)], chat: { ...shapeChat(chat), status: 'waiting_admin' } })
    } catch (err) {
      console.error('Help escalate error:', err)
      res.status(500).json({ error: 'Could not send this to an admin.' })
    }
  })

  app.delete('/api/help/chats/:id', verifyToken, sendLimiter, async (req, res) => {
    try {
      const chat = await ownChat(req, res); if (!chat) return
      const { error } = await supabase.from('help_chats').delete().eq('id', chat.id)
      if (error) throw error
      res.json({ success: true })
    } catch (err) {
      console.error('Help delete error:', err)
      res.status(500).json({ error: 'Could not delete this chat.' })
    }
  })

  // ----- Admin -----
  app.get('/api/help/admin/chats', verifyToken, readLimiter, async (req, res) => {
    try {
      const admin = await adminOrFail(req, res); if (!admin) return
      const status = ['ai', 'waiting_admin', 'answered', 'closed'].includes(req.query.status) ? req.query.status : 'waiting_admin'
      const { data, error } = await supabase.from('help_chats').select('*').eq('status', status).order('updated_at', { ascending: true }).limit(100)
      if (error) throw error
      const ids = [...new Set((data || []).map(c => c.user_id))]
      const { data: users } = ids.length ? await supabase.from('users').select('id, name, role').in('id', ids) : { data: [] }
      const byId = Object.fromEntries((users || []).map(u => [u.id, u]))
      res.json({ chats: (data || []).map(c => ({ ...shapeChat(c), user: byId[c.user_id] ? { id: c.user_id, name: byId[c.user_id].name || '', role: byId[c.user_id].role } : null })) })
    } catch (err) {
      console.error('Help admin list error:', err)
      res.status(500).json({ error: 'Could not load the chats.' })
    }
  })

  app.get('/api/help/admin/chats/:id', verifyToken, readLimiter, async (req, res) => {
    try {
      const admin = await adminOrFail(req, res); if (!admin) return
      if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Chat not found.' })
      const { data: chat, error } = await supabase.from('help_chats').select('*').eq('id', req.params.id).maybeSingle()
      if (error) throw error
      if (!chat) return res.status(404).json({ error: 'Chat not found.' })
      res.json({ chat: shapeChat(chat), messages: (await messagesOf(chat.id)).map(shapeMsg) })
    } catch (err) {
      console.error('Help admin load error:', err)
      res.status(500).json({ error: 'Could not load this chat.' })
    }
  })

  app.post('/api/help/admin/chats/:id/reply', verifyToken, sendLimiter, async (req, res) => {
    try {
      const admin = await adminOrFail(req, res); if (!admin) return
      if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Chat not found.' })
      const body = cleanBody(req.body?.body)
      if (!body) return res.status(400).json({ error: 'Write a reply first.' })
      const { data: chat, error } = await supabase.from('help_chats').select('*').eq('id', req.params.id).maybeSingle()
      if (error) throw error
      if (!chat) return res.status(404).json({ error: 'Chat not found.' })
      const msg = await addMessage(chat.id, 'admin', body)
      await touch(chat.id, { status: 'answered' })
      afterReply('Help reply', () => notifyUser(chat.user_id, 'An admin replied to your Help chat.', 'info', '/help?chat=' + chat.id))
      res.status(201).json({ message: shapeMsg(msg) })
    } catch (err) {
      console.error('Help admin reply error:', err)
      res.status(500).json({ error: 'Could not send the reply.' })
    }
  })

  app.post('/api/help/admin/chats/:id/close', verifyToken, sendLimiter, async (req, res) => {
    try {
      const admin = await adminOrFail(req, res); if (!admin) return
      if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Chat not found.' })
      const { error } = await supabase.from('help_chats').update({ status: 'closed', updated_at: new Date().toISOString() }).eq('id', req.params.id)
      if (error) throw error
      res.json({ success: true })
    } catch (err) {
      console.error('Help admin close error:', err)
      res.status(500).json({ error: 'Could not close the chat.' })
    }
  })
}
