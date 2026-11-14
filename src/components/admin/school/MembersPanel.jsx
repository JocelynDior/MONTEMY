import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { apiFetch } from '../../../api/apiClient'
import { useApiData } from '../../../hooks/useApiData'
import { Chip, ErrorBox, ghostBtn, muted, panel, smallBtn } from '../../parent/parentUi'
import { glassInput } from '../../../styles/glass'
import SkeletonList from '../../shared/Skeleton'
import Icon from '../../icons/Icon'

const dangerBtn = { ...smallBtn, background: 'rgba(255,80,80,0.85)', color: 'white', boxShadow: 'none' }
const opt = { color: '#000' }

const ROLES = ['student', 'teacher', 'parent', 'principal', 'tutor', 'staff', 'admin']

export default function MembersPanel({ orgId, orgType }) {
  const { t } = useTranslation('admin')
  const [roleFilter, setRoleFilter] = useState('')
  const [search, setSearch] = useState('')
  const [confirm, setConfirm] = useState(null) // { id, action }
  const [busyId, setBusyId] = useState(null)
  const [notice, setNotice] = useState('')
  const [actionError, setActionError] = useState('')

  const qs = new URLSearchParams()
  if (roleFilter) qs.set('role', roleFilter)
  if (search.trim()) qs.set('search', search.trim())
  const { data, loading, error, reload } = useApiData(`/api/admin/school/${orgId}/members?${qs.toString()}`)

  const run = async (userId, action) => {
    setBusyId(userId); setActionError(''); setNotice('')
    try {
      await apiFetch(`/api/admin/school/${orgId}/members/${userId}/action`, { method: 'POST', body: { action } })
      setConfirm(null)
      setNotice(action === 'delete' ? t('school.members.delete') : action === 'block' ? t('school.members.block') : action === 'unblock' ? t('school.members.unblock') : t('school.members.verify'))
      reload()
    } catch (err) {
      setActionError(err.message)
    }
    setBusyId(null)
  }

  const members = data?.members || []
  const orgWord = orgType === 'tutor' ? t('school.sections.members') : t('school.sections.members')

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('school.members.searchPlaceholder')}
          style={{ ...glassInput, flex: '1 1 180px', padding: '0.6rem 0.9rem', fontSize: '0.9rem' }} aria-label={t('school.members.searchPlaceholder')} />
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ ...glassInput, width: 'auto', minWidth: '130px' }} aria-label={t('school.members.allRoles')}>
          <option value="" style={opt}>{t('school.members.allRoles')}</option>
          {ROLES.map(r => <option key={r} value={r} style={opt}>{r === 'staff' ? 'Staff Member' : r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
        </select>
      </div>

      {notice && <p role="status" style={{ color: '#7CFC9A', fontSize: '0.9rem', marginBottom: '0.9rem' }}>{notice}</p>}
      {actionError && <p role="alert" style={{ color: '#ffb3b3', fontSize: '0.9rem', marginBottom: '0.9rem' }}>{actionError}</p>}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <SkeletonList />}

      {data && members.length === 0 && (
        <div style={{ ...panel, ...muted, textAlign: 'center', padding: '2rem' }}>{t('school.members.noMembers')}</div>
      )}

      <div style={{ maxHeight: '55dvh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {members.map(m => (
          <div key={m.id} style={{ ...panel, display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ fontWeight: 600 }}>{m.name || '(no name)'}</div>
              <div style={{ ...muted, fontSize: '0.82rem' }}>{m.email}</div>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
                <Chip color="#8fd3ff">{m.role === 'staff' ? 'Staff Member' : m.role}</Chip>
                {m.isBlocked && <Chip color="#ff8f8f">{t('school.members.blocked')}</Chip>}
                {!m.isVerified && !m.isBlocked && <Chip color="#ffd166">{t('school.members.pending')}</Chip>}
                {m.isVerified && !m.isBlocked && <Chip color="#7CFC9A">{t('school.members.verified')}</Chip>}
              </div>
            </div>

            {confirm?.id === m.id ? (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.85rem', color: '#ffaaaa' }}>
                  {confirm.action === 'delete' ? t('school.members.confirmDelete', { name: m.name })
                    : confirm.action === 'block' ? t('school.members.confirmBlock', { name: m.name })
                    : t('school.members.confirmUnblock', { name: m.name })}
                </span>
                <button disabled={busyId === m.id} onClick={() => run(m.id, confirm.action)} style={dangerBtn}>
                  {busyId === m.id ? '…' : confirm.action === 'delete' ? t('school.members.yesDelete')
                    : confirm.action === 'block' ? t('school.members.yesBlock')
                    : t('school.members.yesUnblock')}
                </button>
                <button onClick={() => setConfirm(null)} style={ghostBtn}>
                  <Icon name="close" size={14} /> Cancel
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {!m.isVerified && !m.isBlocked && (
                  <button disabled={busyId === m.id} onClick={() => run(m.id, 'verify')} style={smallBtn}>
                    {t('school.members.verify')}
                  </button>
                )}
                {m.isBlocked
                  ? <button disabled={busyId === m.id} onClick={() => setConfirm({ id: m.id, action: 'unblock' })} style={ghostBtn}>{t('school.members.unblock')}</button>
                  : <button disabled={busyId === m.id} onClick={() => setConfirm({ id: m.id, action: 'block' })} style={{ ...ghostBtn, color: '#ff8a8a', border: '1px solid rgba(255,80,80,0.5)' }}>{t('school.members.block')}</button>}
                <button onClick={() => setConfirm({ id: m.id, action: 'delete' })} style={{ ...ghostBtn, color: '#ff8a8a', border: '1px solid rgba(255,80,80,0.5)' }}>{t('school.members.delete')}</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
