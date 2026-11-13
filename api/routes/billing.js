/**
 * api/routes/billing.js
 * Phase 7 – Billing endpoints.
 *
 * Principal: see balance and invoices, save and remove a card.
 * Admin: create a once-off or recurring invoice and cancel billing.
 *
 * All routes require a valid JWT (req.user set by the auth middleware in server.js).
 */

import express from 'express'
import { createClient } from '@supabase/supabase-js'
import { tokeniseCard } from '../billing/provider.js'

const router = express.Router()

function db() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

// ── helpers ──────────────────────────────────────────────────────────────────

function isPrincipal(user) { return user.role === 'principal' }
function isAdmin(user)     { return user.role === 'admin' }

async function getOrgId(supabase, userId) {
  const { data } = await supabase
    .from('users').select('org_id').eq('id', userId).single()
  return data?.org_id ?? null
}

// ── GET /api/billing – balance + invoices + saved cards ───────────────────────
router.get('/', async (req, res) => {
  if (!isPrincipal(req.user) && !isAdmin(req.user)) return res.status(403).json({ error: 'Forbidden' })
  const supabase = db()
  const orgId = await getOrgId(supabase, req.user.id)
  if (!orgId) return res.status(404).json({ error: 'No organisation linked' })

  const [billingRes, invoicesRes, cardsRes] = await Promise.all([
    supabase.from('org_billing').select('*').eq('org_id', orgId).maybeSingle(),
    supabase.from('invoices').select('id,number,description,amount_cents,currency,kind,status,due_date,issued_at,paid_at').eq('org_id', orgId).order('issued_at', { ascending: false }).limit(50),
    supabase.from('payment_methods').select('id,brand,last4,exp_month,exp_year,holder_name,is_default,created_at').eq('org_id', orgId).order('created_at', { ascending: false }),
  ])

  res.json({
    billing: billingRes.data ?? null,
    invoices: invoicesRes.data ?? [],
    cards: cardsRes.data ?? [],
  })
})

// ── POST /api/billing/card – save a card (brand, last4, expMonth, expYear, holderName) ──
router.post('/card', async (req, res) => {
  if (!isPrincipal(req.user) && !isAdmin(req.user)) return res.status(403).json({ error: 'Forbidden' })
  const { brand, last4, expMonth, expYear, holderName } = req.body
  if (!brand || !last4 || !expMonth || !expYear) return res.status(400).json({ error: 'Missing card fields' })
  if (!/^[0-9]{4}$/.test(last4)) return res.status(400).json({ error: 'last4 must be 4 digits' })

  const supabase = db()
  const orgId = await getOrgId(supabase, req.user.id)
  if (!orgId) return res.status(404).json({ error: 'No organisation linked' })

  const { provider, providerToken } = await tokeniseCard({ brand, last4, expMonth, expYear, holderName })

  // Count existing cards; if none, make this one the default
  const { count } = await supabase.from('payment_methods').select('id', { count: 'exact', head: true }).eq('org_id', orgId)
  const isDefault = (count ?? 0) === 0

  const { data, error } = await supabase.from('payment_methods').insert({
    org_id: orgId,
    added_by: req.user.id,
    brand,
    last4,
    exp_month: expMonth,
    exp_year: expYear,
    holder_name: holderName ?? null,
    provider,
    provider_token: providerToken,
    is_default: isDefault,
  }).select('id,brand,last4,exp_month,exp_year,holder_name,is_default,created_at').single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
})

// ── DELETE /api/billing/card/:id – remove a saved card ───────────────────────
router.delete('/card/:id', async (req, res) => {
  if (!isPrincipal(req.user) && !isAdmin(req.user)) return res.status(403).json({ error: 'Forbidden' })
  const supabase = db()
  const orgId = await getOrgId(supabase, req.user.id)
  if (!orgId) return res.status(404).json({ error: 'No organisation linked' })

  const { error } = await supabase.from('payment_methods')
    .delete().eq('id', req.params.id).eq('org_id', orgId)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
})

// ── POST /api/billing/invoice – admin creates an invoice ─────────────────────
router.post('/invoice', async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ error: 'Forbidden' })
  const { orgId, description, amountCents, currency = 'ZAR', kind = 'once_off', dueDate } = req.body
  if (!orgId || !amountCents || amountCents <= 0) return res.status(400).json({ error: 'orgId and amountCents required' })
  if (!['once_off','recurring'].includes(kind)) return res.status(400).json({ error: 'Invalid kind' })

  const supabase = db()
  // Generate a simple sequential invoice number per org
  const { count } = await supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('org_id', orgId)
  const number = `INV-${String((count ?? 0) + 1).padStart(4, '0')}`

  const { data, error } = await supabase.from('invoices').insert({
    org_id: orgId,
    number,
    description: description ?? null,
    amount_cents: amountCents,
    currency,
    kind,
    status: 'open',
    due_date: dueDate ?? null,
    issued_by: req.user.id,
  }).select().single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
})

// ── POST /api/billing/cancel – admin cancels billing for an org ───────────────
router.post('/cancel', async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ error: 'Forbidden' })
  const { orgId } = req.body
  if (!orgId) return res.status(400).json({ error: 'orgId required' })
  const supabase = db()
  const { error } = await supabase.from('org_billing')
    .upsert({ org_id: orgId, billing_active: false, recurring: false, updated_at: new Date().toISOString() }, { onConflict: 'org_id' })
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
})

export default router
