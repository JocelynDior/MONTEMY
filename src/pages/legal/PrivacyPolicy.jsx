import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useT } from '../../i18n'
import { useAuth } from '../../context/AuthContext'
import { ROLE_ROUTES } from '../../supabase/authHelpers'
import StudentPage from '../../components/student/StudentPage'
import { muted, panel } from '../../components/parent/parentUi'

// Shared by Privacy Policy and Terms: a list of numbered sections, each with a heading and text.
// The wording is a DRAFT (see the notice shown at the top) and must be reviewed by a lawyer before launch.
export function LegalPage({ titleKey, icon, prefix, count }) {
  const t = useT()
  const { role } = useAuth()
  const home = ROLE_ROUTES[role] || '/'
  return (
    <StudentPage title={t(titleKey)} icon={icon} backPath={home} maxWidth={760}>
      <p style={{ ...muted, marginBottom: 'var(--sp-3)' }}>{t('legal.updated')}</p>
      <p role="note" style={{ ...panel, borderColor: 'var(--border-strong)', marginBottom: 'var(--sp-4)', fontSize: 'var(--fs-sm)' }}>{t('legal.draftNotice')}</p>
      <p style={{ lineHeight: 1.7, marginBottom: 'var(--sp-4)' }}>{t(`${prefix}_intro`)}</p>
      {Array.from({ length: count }, (_, i) => i + 1).map(n => (
        <section key={n} style={{ marginBottom: 'var(--sp-4)' }}>
          <h3 style={{ fontSize: 'var(--fs-lg)', marginBottom: '0.4rem', overflowWrap: 'anywhere' }}>{n}. {t(`${prefix}_h${n}`)}</h3>
          <p style={{ lineHeight: 1.7, color: 'var(--fg-muted)', overflowWrap: 'anywhere' }}>{t(`${prefix}_t${n}`)}</p>
        </section>
      ))}
    </StudentPage>
  )
}

export default function PrivacyPolicy() {
  return <LegalPage titleKey="shell.privacyPolicy" icon="privacy" prefix="legal.privacy" count={9} />
}
