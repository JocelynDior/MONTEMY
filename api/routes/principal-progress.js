/**
 * api/routes/principal-progress.js
 * Phase 7 – Student progress list for the principal's own organisation.
 *
 * GET /api/principal/progress?search=&class=&risk=
 *   search – filter by student name (case-insensitive)
 *   class  – filter by class name
 *   risk   – 'at-risk' | 'on-track' | '' (all)
 */

import express from 'express'
import { createClient } from '@supabase/supabase-js'

const router = express.Router()

function db() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

const RISK_THRESHOLD = 50 // percent

router.get('/', async (req, res) => {
  if (req.user.role !== 'principal') return res.status(403).json({ error: 'Forbidden' })

  const supabase = db()
  const { data: principal } = await supabase.from('users').select('org_id').eq('id', req.user.id).single()
  const orgId = principal?.org_id
  if (!orgId) return res.status(404).json({ error: 'No organisation linked' })

  const { search = '', class: classFilter = '', risk = '' } = req.query

  // Fetch all students in org with their latest grades
  let query = supabase
    .from('users')
    .select(`
      id, name, avatar_key,
      class_members!inner(
        classes!inner(id, name)
      ),
      assignment_submissions(grade, max_grade)
    `)
    .eq('org_id', orgId)
    .eq('role', 'student')
    .order('name')

  if (search) query = query.ilike('name', `%${search}%`)

  const { data: students, error } = await query
  if (error) return res.status(500).json({ error: error.message })

  const list = (students ?? []).map(s => {
    const className = s.class_members?.[0]?.classes?.name ?? null
    const classId   = s.class_members?.[0]?.classes?.id   ?? null
    const subs      = (s.assignment_submissions ?? []).filter(sub => sub.grade !== null && sub.max_grade > 0)
    const avg       = subs.length === 0
      ? null
      : Math.round(subs.reduce((acc, sub) => acc + (sub.grade / sub.max_grade) * 100, 0) / subs.length)
    const atRisk    = avg !== null && avg < RISK_THRESHOLD

    return { id: s.id, name: s.name, avatarKey: s.avatar_key, className, classId, avg, graded: subs.length, atRisk }
  })

  // Apply filters
  const filtered = list.filter(s => {
    if (classFilter && s.className !== classFilter) return false
    if (risk === 'at-risk' && !s.atRisk) return false
    if (risk === 'on-track' && s.atRisk) return false
    return true
  })

  // Collect distinct class names for the filter chip list
  const classes = [...new Set(list.map(s => s.className).filter(Boolean))].sort()

  res.json({ students: filtered, classes, threshold: RISK_THRESHOLD })
})

export default router
