import React from 'react'
import { useT } from '../../i18n'
import { useAuth } from '../../context/AuthContext'
import { useBranding } from '../../context/BrandingContext'
import { ROLE_ROUTES } from '../../supabase/authHelpers'
import StudentPage from '../../components/student/StudentPage'
import { muted, panel, panelTitle } from '../../components/parent/parentUi'

const VERSION = '1.2'

export default function MoreInfo() {
  const t = useT()
  const { role } = useAuth()
  const { appName } = useBranding()
  return (
    <StudentPage title={t('shell.moreInfo')} icon="info" backPath={ROLE_ROUTES[role] || '/'} maxWidth={760}>
      <section style={{ ...panel, marginBottom: 'var(--sp-4)' }}>
        <h3 style={panelTitle}>{t('legal.aboutTitle', { app: appName })}</h3>
        <p style={{ lineHeight: 1.7 }}>{t('legal.aboutText')}</p>
      </section>
      <section style={{ ...panel, marginBottom: 'var(--sp-4)' }}>
        <h3 style={panelTitle}>{t('legal.versionTitle')}</h3>
        <p style={muted}>{t('legal.versionText', { version: VERSION })}</p>
      </section>
      <section style={panel}>
        <h3 style={panelTitle}>{t('legal.contactTitle')}</h3>
        <p style={{ lineHeight: 1.7 }}>{t('legal.contactText')}</p>
      </section>
    </StudentPage>
  )
}
