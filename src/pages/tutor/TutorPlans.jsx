import React, { useState } from 'react'
import StudentPage from '../../components/student/StudentPage'
import Icon from '../../components/shared/Icon'
import SkeletonList from '../../components/shared/Skeleton'
import { ErrorBox, ghostBtn, muted, panel, smallBtn } from '../../components/parent/parentUi'
import { useApiData } from '../../hooks/useApiData'
import { apiFetch } from '../../api/apiClient'
import { useT } from '../../i18n'
import { useOrgTerms } from '../../hooks/useOrgTerms'
import { glassBtn, glassCard, glassInput } from '../../styles/glass'
import { fmtDate } from '../../components/student/studentUtils'

const STATUSES = ['active', 'completed', 'paused']

function GoalList({ goals, onChange, t }) {
  function toggle(i) {
    const next = goals.map((g, idx) => idx === i ? { ...g, done: !g.done } : g)
    onChange(next)
  }
  function setText(i, text) {
    const next = goals.map((g, idx) => idx === i ? { ...g, text } : g)
    onChange(next)
  }
  function add() {
    if (goals.length >= 30) return
    onChange([...goals, { text: '', done: false }])
  }
  function remove(i) {
    onChange(goals.filter((_, idx) => idx !== i))
  }
  return (
    <div>
      {goals.map((g, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-2)' }}>
          <input
            type="checkbox"
            checked={g.done}
            onChange={() => toggle(i)}
            aria-label={t('tutor.goalDone')}
          />
          <input
            value={g.text}
            onChange={(e) => setText(i, e.target.value)}
            maxLength={200}
            style={{ ...glassInput, flex: 1 }}
            placeholder={t('tutor.goalPlaceholder')}
          />
          <button style={ghostBtn} onClick={() => remove(i)} aria-label={t('common.delete')}>
            <Icon name="trash" size={14} />
          </button>
        </div>
      ))}
      {goals.length < 30 && (
        <button style={{ ...ghostBtn, fontSize: 'var(--fs-sm)', display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-1)' }} onClick={add}>
          <Icon name="plus" size={12} /> {t('tutor.addGoal')}
        </button>
      )}
    </div>
  )
}

function PlanForm({ students, initial, onSave, onCancel, t }) {
  const [form, setForm] = useState({
    studentId: initial?.studentId || '',
    title: initial?.title || '',
    goals: initial?.goals || [],
    status: initial?.status || 'active',
    startDate: initial?.startDate || '',
    dueDate: initial?.dueDate || '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    if (!form.studentId) return setErr(t('tutor.errPlanStudent'))
    if (!form.title.trim()) return setErr(t('tutor.errPlanTitle'))
    setSaving(true); setErr(null)
    try {
      const body = { ...form, goals: form.goals.filter((g) => g.text.trim()) }
      const res = initial?.id
        ? await apiFetch(`/api/tutor/plans/${initial.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        : await apiFetch('/api/tutor/plans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error(await res.text())
      onSave()
    } catch (ex) {
      setErr(ex.message || t('common.somethingWentWrong'))
    } finally {
      setSaving(false)
    }
  }

  const lbl = { display: 'block', fontSize: 'var(--fs-sm)', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--fg-muted)' }
  const inp = { ...glassInput, width: '100%', boxSizing: 'border-box', marginBottom: 'var(--sp-2)' }

  return (
    <form onSubmit={submit} style={{ ...glassCard, padding: 'var(--sp-4)', marginBottom: 'var(--sp-4)' }}>
      {err && <ErrorBox message={err} />}
      {!initial && (
        <label style={lbl}>{t('tutor.student')}
          <select value={form.studentId} onChange={set('studentId')} style={inp} required>
            <option value="">{t('tutor.chooseStudent')}</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
      )}
      <label style={lbl}>{t('tutor.planTitle')}
        <input value={form.title} onChange={set('title')} maxLength={150} style={inp} placeholder={t('tutor.planTitleExample')} required />
      </label>
      <label style={lbl}>{t('tutor.status')}
        <select value={form.status} onChange={set('status')} style={inp}>
          {STATUSES.map((s) => <option key={s} value={s}>{t(`tutor.planStatus_${s}`)}</option>)}
        </select>
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(10rem, 1fr))', gap: 'var(--sp-3)', marginBottom: 'var(--sp-2)' }}>
        <label style={lbl}>{t('tutor.startDate')}
          <input type="date" value={form.startDate} onChange={set('startDate')} style={{ ...glassInput, width: '100%', boxSizing: 'border-box' }} />
        </label>
        <label style={lbl}>{t('tutor.dueDate')}
          <input type="date" value={form.dueDate} onChange={set('dueDate')} style={{ ...glassInput, width: '100%', boxSizing: 'border-box' }} />
        </label>
      </div>
      <div style={{ marginBottom: 'var(--sp-3)' }}>
        <div style={{ ...lbl, marginBottom: 'var(--sp-2)' }}>{t('tutor.goals')}</div>
        <GoalList goals={form.goals} onChange={(goals) => setForm((f) => ({ ...f, goals }))} t={t} />
      </div>
      <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
        <button type="submit" disabled={saving} style={glassBtn}>{saving ? t('settings.saving') : t('common.save')}</button>
        <button type="button" onClick={onCancel} style={ghostBtn}>{t('common.cancel')}</button>
      </div>
    </form>
  )
}

function PlanCard({ plan, onEdit, onDelete, t }) {
  const [confirmDel, setConfirmDel] = useState(false)
  const done = plan.goals?.filter((g) => g.done).length ?? 0
  const total = plan.goals?.length ?? 0

  return (
    <div style={{ ...panel, marginBottom: 'var(--sp-3)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-2)', flexWrap: 'wrap', minWidth: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, overflowWrap: 'break-word' }}>{plan.title}</div>
          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--fg-muted)', marginTop: '0.2rem' }}>
            {plan.studentName}
            {plan.dueDate && <span> · {fmtDate(plan.dueDate)}</span>}
            <span style={{ marginInlineStart: 'var(--sp-2)' }}>{t(`tutor.planStatus_${plan.status}`)}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--sp-1)', flexShrink: 0 }}>
          <button style={ghostBtn} onClick={() => onEdit(plan)} aria-label={t('common.edit')}><Icon name="pencil" size={14} /></button>
          {confirmDel ? (
            <>
              <button style={smallBtn} onClick={() => onDelete(plan.id)} aria-label={t('common.confirm')}><Icon name="check" size={14} /></button>
              <button style={ghostBtn} onClick={() => setConfirmDel(false)} aria-label={t('common.cancel')}><Icon name="close" size={14} /></button>
            </>
          ) : (
            <button style={ghostBtn} onClick={() => setConfirmDel(true)} aria-label={t('common.delete')}><Icon name="trash" size={14} /></button>
          )}
        </div>
      </div>

      {total > 0 && (
        <div style={{ marginTop: 'var(--sp-3)' }}>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--fg-muted)', marginBottom: 'var(--sp-1)' }}>
            {t('tutor.goalsProgress', { done, total })}
          </div>
          <div style={{ background: 'var(--border)', borderRadius: 'var(--radius-pill)', height: '6px', overflow: 'hidden' }}>
            <div style={{ background: 'var(--fg)', height: '100%', width: total ? `${Math.round((done / total) * 100)}%` : '0%', borderRadius: 'var(--radius-pill)' }} />
          </div>
          <div style={{ marginTop: 'var(--sp-2)' }}>
            {plan.goals.map((g, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-2)', fontSize: 'var(--fs-sm)', padding: 'var(--sp-1) 0' }}>
                <Icon name={g.done ? 'check' : 'close'} size={12} />
                <span style={{ flex: 1, minWidth: 0, overflowWrap: 'break-word', color: g.done ? 'var(--fg-muted)' : 'var(--fg)', textDecoration: g.done ? 'line-through' : 'none' }}>{g.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function TutorPlans() {
  const t = useT('tutor')
  const { pick } = useOrgTerms()
  const { data, loading, error, reload } = useApiData('/api/tutor/plans')
  const studentsReq = useApiData('/api/tutor/students')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(null)

  async function deletePlan(id) {
    try {
      const res = await apiFetch(`/api/tutor/plans/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await res.text())
      reload()
    } catch { reload() }
  }

  const plans = data?.plans || []
  const students = studentsReq.data?.students || []

  return (
    <StudentPage title={t('shell.f_learning_plans')} backPath="/tutor/dashboard">
      {(loading || studentsReq.loading) && <SkeletonList />}
      {(error || studentsReq.error) && <ErrorBox message={error || studentsReq.error} onRetry={reload} />}

      {!creating && !editing && (
        <button
          style={{ ...glassBtn, marginBottom: 'var(--sp-4)', display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-1)' }}
          onClick={() => setCreating(true)}
        >
          <Icon name="plus" size={14} /> {t('tutor.newPlan')}
        </button>
      )}

      {(creating || editing) && (
        <PlanForm
          students={students}
          initial={editing}
          onSave={() => { setCreating(false); setEditing(null); reload() }}
          onCancel={() => { setCreating(false); setEditing(null) }}
          t={t}
        />
      )}

      {plans.length === 0 && !creating && (
        <p style={muted}>{pick(t('tutor.noPlansYetFirm'), t('tutor.noPlansYet'))}</p>
      )}

      {plans.map((plan) => (
        <PlanCard
          key={plan.id}
          plan={plan}
          onEdit={(p) => { setEditing(p); setCreating(false) }}
          onDelete={deletePlan}
          t={t}
        />
      ))}
    </StudentPage>
  )
}
