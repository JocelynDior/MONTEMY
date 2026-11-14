import { useT } from '../../i18n/index.js'
import React, { useState } from 'react'
import { useApiData } from '../../hooks/useApiData'
import { ErrorBox, ghostBtn, muted, panel, smallBtn } from '../../components/parent/parentUi'
import { glassInput } from '../../styles/glass'
import SkeletonList from '../../components/shared/Skeleton'
import Icon from '../../components/icons/Icon'
import MembersPanel from '../../components/admin/school/MembersPanel'
import SlideshowManager from '../../components/admin/school/SlideshowManager'
import MessageMembers from '../../components/admin/school/MessageMembers'
import InvoicePanel from '../../components/admin/school/InvoicePanel'
import LinkRequests from '../../components/admin/LinkRequests'
import StudentPage from '../../components/shared/StudentPage'

const SECTIONS = ['members', 'slideshow', 'message', 'invoice', 'parentLinks']

export default function SchoolManagement() {
  const t = useT()
  const [selectedOrg, setSelectedOrg] = useState(null)
  const [section, setSection] = useState('members')
  const [search, setSearch] = useState('')

  const { data, loading, error, reload } = useApiData('/api/orgs?limit=200')
  const orgs = (data?.orgs || []).filter(o =>
    !search.trim() || o.name?.toLowerCase().includes(search.trim().toLowerCase())
  )

  if (!selectedOrg) {
    return (
      <StudentPage title={t('school.title')}>
        <div style={{ display: 'grid', gap: '1rem' }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t('school.pickSchool')} style={{ ...glassInput, fontSize: '0.95rem' }} />
          {error && <ErrorBox message={error} onRetry={reload} />}
          {loading && !data && <SkeletonList />}
          {data && orgs.length === 0 && (
            <div style={{ ...panel, ...muted, textAlign: 'center', padding: '2rem' }}>{t('school.noOrgs')}</div>
          )}
          <div style={{ display: 'grid', gap: '0.6rem' }}>
            {orgs.map(org => (
              <button key={org.id} onClick={() => setSelectedOrg(org)}
                style={{ ...panel, textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', width: '100%' }}>
                <Icon name={org.type === 'tutor' ? 'firm' : 'school'} size={22} style={{ opacity: 0.7, flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 600 }}>{org.name}</div>
                  <div style={{ ...muted, fontSize: '0.82rem' }}>{org.type === 'tutor' ? t('school.firm') : t('school.school')}</div>
                </div>
                <Icon name="chevron" size={14} style={{ marginLeft: 'auto', opacity: 0.5, transform: 'rotate(180deg)' }} />
              </button>
            ))}
          </div>
        </div>
      </StudentPage>
    )
  }

  return (
    <StudentPage
      title={selectedOrg.name}
      headerLeft={
        <button onClick={() => setSelectedOrg(null)} style={{ ...ghostBtn, padding: '0.3rem 0.7rem', fontSize: '0.85rem' }}>
          <Icon name="chevron" size={13} style={{ marginRight: '0.3rem', transform: 'rotate(90deg)' }} />
          {t('school.title')}
        </button>
      }
    >
      {/* Section tabs */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {SECTIONS.map(s => (
          <button key={s} onClick={() => setSection(s)}
            style={{
              ...ghostBtn,
              fontSize: '0.85rem',
              padding: '0.35rem 0.85rem',
              background: section === s ? 'var(--color-primary)' : 'transparent',
              color: section === s ? '#fff' : 'inherit',
              opacity: section === s ? 1 : 0.7,
            }}>
            {t(`school.sections.${s}`)}
          </button>
        ))}
      </div>

      {section === 'members'    && <MembersPanel     orgId={selectedOrg.id} orgType={selectedOrg.type} />}
      {section === 'slideshow'  && <SlideshowManager orgId={selectedOrg.id} />}
      {section === 'message'    && <MessageMembers   orgId={selectedOrg.id} />}
      {section === 'invoice'    && <InvoicePanel     orgId={selectedOrg.id} />}
      {section === 'parentLinks'&& <LinkRequests     orgId={selectedOrg.id} />}
    </StudentPage>
  )
}
