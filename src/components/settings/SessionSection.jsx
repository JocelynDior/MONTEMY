import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useT } from '../../i18n'
import { muted, panel, panelTitle } from '../parent/parentUi'
import { ChoiceList, SavedNote } from './AppearanceSection'

// Stay logged in (the sign-in is kept on this device) or log in every time (it ends when the tab or app closes).
export default function SessionSection() {
  const t = useT()
  const { stayLoggedIn, setStayLoggedIn } = useAuth()
  const [saved, setSaved] = useState(false)

  const choose = (stay) => { setStayLoggedIn(stay); setSaved(true) }

  return (
    <section id="session" style={{ ...panel, marginBottom: 'var(--sp-4)' }}>
      <h3 style={panelTitle}>{t('settings.session')}</h3>
      <p style={{ ...muted, marginBottom: '0.8rem' }}>{t('settings.sessionText')}</p>
      <ChoiceList label={t('settings.session')} value={stayLoggedIn} onChange={choose} options={[
        { value: true, label: t('settings.stayLoggedIn'), hint: t('settings.stayLoggedInHint') },
        { value: false, label: t('settings.loginEveryTime'), hint: t('settings.loginEveryTimeHint') },
      ]} />
      <SavedNote text={saved ? t('settings.saved') : ''} />
    </section>
  )
}
