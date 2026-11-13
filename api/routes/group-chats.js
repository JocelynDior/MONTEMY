/**
 * api/routes/group-chats.js
 * Phase 7 – Group chat endpoints.
 *
 * Staff chat  – visible to: staff members, principal, teachers (kind = 'staff')
 * Parents chat – visible to: parents, principal, teachers          (kind = 'parents')
 *
 * Membership is decided from the user's role and organisation.
 */

import express from 'express'
import { createClient } from '@supabase/supabase-js'

const router = express.Router()

function db() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

const STAFF_ROLES   = ['staff', 'principal', 'teacher']
const PARENTS_ROLES = ['parent', 'principal', 'teacher']

function allowedKinds(role) {
  const kinds = []
  if (STAFF_ROLES.includes(role))   kinds.push('staff')
  if (PARENTS_ROLES.includes(role)) kinds.push('parents')
  return kinds
}

async function getOrgId(supabase, userId) {
  const { data } = await supabase.from('users').select('org_id').eq('id', userId).single()
  return data?.org_id ?? null
}

async function ensureChat(supabase, orgId, kind) {
  // Get or create the group_chats row
  let { data } = await supabase
    .from('group_chats').select('id').eq('org_id', orgId).eq('kind', kind).maybeSingle()
  if (!data) {
    const ins = await supabase.from('group_chats').insert({ org_id: orgId, kind }).select('id').single()
    data = ins.data
  }
  return data?.id ?? null
}

// ── GET /api/group-chats/:kind – last 50 messages ────────────────────────────
router.get('/:kind', async (req, res) => {
  const { kind } = req.params
  if (!['staff','parents'].includes(kind)) return res.status(400).json({ error: 'Invalid kind' })
  const allowed = allowedKinds(req.user.role)
  if (!allowed.includes(kind)) return res.status(403).json({ error: 'Forbidden' })

  const supabase = db()
  const orgId = await getOrgId(supabase, req.user.id)
  if (!orgId) return res.status(404).json({ error: 'No organisation linked' })

  const chatId = await ensureChat(supabase, orgId, kind)
  if (!chatId) return res.status(500).json({ error: 'Could not create chat' })

  const { data, error } = await supabase
    .from('group_messages')
    .select('id, body, created_at, sender_id, users!sender_id(name, avatar_key)')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return res.status(500).json({ error: error.message })

  // Return in ascending order for display
  const messages = (data ?? []).reverse().map(m => ({
    id: m.id,
    body: m.body,
    createdAt: m.created_at,
    senderId: m.sender_id,
    senderName: m.users?.name ?? 'Unknown',
    senderAvatar: m.users?.avatar_key ?? null,
  }))

  res.json({ chatId, messages })
})

// ── POST /api/group-chats/:kind – send a message ─────────────────────────────
router.post('/:kind', async (req, res) => {
  const { kind } = req.params
  if (!['staff','parents'].includes(kind)) return res.status(400).json({ error: 'Invalid kind' })
  const allowed = allowedKinds(req.user.role)
  if (!allowed.includes(kind)) return res.status(403).json({ error: 'Forbidden' })

  const { body } = req.body
  if (!body || body.trim().length === 0) return res.status(400).json({ error: 'body required' })
  if (body.length > 2000) return res.status(400).json({ error: 'body too long' })

  const supabase = db()
  const orgId = await getOrgId(supabase, req.user.id)
  if (!orgId) return res.status(404).json({ error: 'No organisation linked' })

  const chatId = await ensureChat(supabase, orgId, kind)
  if (!chatId) return res.status(500).json({ error: 'Could not create chat' })

  const { data, error } = await supabase.from('group_messages').insert({
    chat_id: chatId,
    sender_id: req.user.id,
    body: body.trim(),
  }).select('id, body, created_at').single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
})

export default router
