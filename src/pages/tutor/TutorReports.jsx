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

const MAX_RATING = 5

function RatingInput({ value, onChange, t }) {
  return (
    <div style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'center', marginBottom: 'var(--sp-2)' }}>
      <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--fg-muted)', marginInlineEnd: 'var(--sp-1)' }}>{t('tutor.rating')}</span>
      {Array.from({ length: MAX_RATING }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={t('tutor.ratingN', { n })}
          style={{
            width: '2rem',
            height: '2rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            background: n <= (value || 0) ? 'var(--fg)' : 'var(--surface)',
            color: n <= (value || 0) ? 'var(--on-fg)' : 'var(--fg-muted)',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: 'var(--fs-sm)',
            flexShrink: 0,
          }}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

function ReportForm({ students, initial, onSave, onCancel, t }) {
  const [form, setForm] = useState({
    studentId: initial?.studentId || '',
    periodLabel: initial?.periodLabel || '',
    summary: initial?.summary || '',
    rating: initial?.rating || null,
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    if (!form.studentId) return setErr(t('tutor.errReportStudent'))
    if (!form.periodLabel.trim()) return setErr(t('tutor.errReportPeriod'))
    if (!form.summary.trim()) return setErr(t('tutor.errReportSummary'))
    setSaving(true); setErr(null)
    try {
      const res = initial?.id
        ? await apiFetch(`/api/tutor/reports/${initial.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
        : await apiFetch('/api/tutor/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
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
      <label style={lbl}>{t('tutor.periodLabel')}
        <input value={form.periodLabel} onChange={set('periodLabel')} maxLength={80} style={inp} placeholder={t('tutor.periodLabelExample')} required />
      </label>
      <label style={lbl}>{t('tutor.reportSummary')}
        <textarea
          value={form.summary}
          onChange={set('summary')}
          maxLength={4000}
          rows={6}
          style={{ ...inp, resize: 'vertical', fontFamily: 'inherit' }}
          placeholder={t('tutor.reportSummaryPlaceholder')}
          required
        />
      </label>
      <RatingInput value={form.rating} onChange={(n) => setForm((f) => ({ ...f, rating: n }))} t={t} />
      <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-3)' }}>
        <button type="submit" disabled={saving} style={glassBtn}>{saving ? t('settings.saving') : t('common.save')}</button>
        <button type="button" onClick={onCancel} style={ghostBtn}>{t('common.cancel')}</button>
      </div>
    </form>
  )
}

function ReportCard({ report, onEdit, onDelete, t }) {
  const [confirmDel, setConfirmDel] = useState(false)

  return (
    <div style={{ ...panel, marginBottom: 'var(--sp-3)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-2)', flexWrap: 'wrap', minWidth: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, overflowWrap: 'break-word' }}>{report.studentName}</div>
          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--fg-muted)', marginTop: '0.2rem' }}>
            {report.periodLabel}
            {report.rating && <span style={{ marginInlineStart: 'var(--sp-2)' }}>{t('tutor.ratingValue', { n: report.rating })}/{MAX_RATING}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--sp-1)', flexShrink: 0 }}>
          <button style={ghostBtn} onClick={() => onEdit(report)} aria-label={t('common.edit')}><Icon name="pencil" size={14} /></button>
          {confirmDel ? (
            <>
              <button style={smallBtn} onClick={() => onDelete(report.id)} aria-label={t('common.confirm')}><Icon name="check" size={14} /></button>
              <button style={ghostBtn} onClick={() => setConfirmDel(false)} aria-label={t('common.cancel')}><Icon name="close" size={14} /></button>
            </>
          ) : (
            <button style={ghostBtn} onClick={() => setConfirmDel(true)} aria-label={t('common.delete')}><Icon name="trash" size={14} /></button>
          )}
        </div>
      </div>
      <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--fg)', marginTop: 'var(--sp-2)', overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }}>{report.summary}</p>
      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--fg-subtle)', marginTop: 'var(--sp-1)' }}>{fmtDate(report.createdAt)}</div>
    </div>
  )
}

export default function TutorReports() {
  const t = useT('tutor')
  const { pick } = useOrgTerms()
  const { data, loading, error, reload } = useApiData('/api/tutor/reports')
  const studentsReq = useApiData('/api/tutor/students')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(null)

  async function deleteReport(id) {
    try {
      const res = await apiFetch(`/api/tutor/reports/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await res.text())
      reload()
    } catch { reload() }
  }

  const reports = data?.reports || []
  const students = studentsReq.data?.students || []

  return (
    <StudentPage title={t('shell.f_progress_reports')} backPath="/tutor/dashboard">
      {(loading || studentsReq.loading) && <SkeletonList />}
      {(error || studentsReq.error) && <ErrorBox message={error || studentsReq.error} onRetry={reload} />}

      {!creating && !editing && (
        <button
          style={{ ...glassBtn, marginBottom: 'var(--sp-4)', display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-1)' }}
          onClick={() => setCreating(true)}
        >
          <Icon name="plus" size={14} /> {t('tutor.newReport')}
        </button>
      )}

      {(creating || editing) && (
        <ReportForm
          students={students}
          initial={editing}
          onSave={() => { setCreating(false); setEditing(null); reload() }}
          onCancel={() => { setCreating(false); setEditing(null) }}
          t={t}
        />
      )}

      {reports.length === 0 && !creating && (
        <p style={muted}>{pick(t('tutor.noReportsYetFirm'), t('tutor.noReportsYet'))}</p>
      )}

      {reports.map((report) => (
        <ReportCard
          key={report.id}
          report={report}
          onEdit={(r) => { setEditing(r); setCreating(false) }}
          onDelete={deleteReport}
          t={t}
        />
      ))}
    </StudentPage>
  )
}
