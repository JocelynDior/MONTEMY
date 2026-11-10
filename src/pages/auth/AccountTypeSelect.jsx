import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT } from '../../i18n'
import { glassBtn } from '../../styles/glass'
import { AuthPage, Card, linkStyle } from './authUi'

// The six account types. The icon is a FeatureIcon-free plain letter circle, so there are no emoji.
const TYPES = ['student', 'tutor', 'parent', 'teacher', 'principal', 'staff']

export default function AccountTypeSelect() {
  const navigate = useNavigate()
  const t = useT()
  const [selected, setSelected] = useState(null)

  return (
    <AuthPage backTo="/" maxWidth="56rem">
      <div style={{ textAlign: 'center', marginBottom: 'var(--sp-5)' }}>
        <h1 style={{ fontSize: 'var(--fs-3xl)', marginBottom: '0.4rem' }}>{t('auth.createAccount')}</h1>
        <p style={{ color: 'var(--fg-muted)' }}>{t('auth.chooseType')}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 15rem), 1fr))', gap: 'var(--sp-4)', marginBottom: 'var(--sp-5)' }}>
        {TYPES.map((id) => {
          const open = selected === id
          return (
            <Card key={id} style={{ padding: 0, borderColor: open ? 'var(--fg)' : 'var(--border)', borderWidth: open ? 2 : 1 }}>
              <button type="button" onClick={() => setSelected(open ? null : id)} aria-expanded={open}
                style={{ width: '100%', background: 'none', border: 'none', color: 'var(--fg)', cursor: 'pointer', padding: 'var(--sp-4)', textAlign: 'center', fontFamily: 'inherit' }}>
                <span aria-hidden style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '3.25rem', height: '3.25rem', borderRadius: '50%', background: 'var(--fg)', color: 'var(--bg)', fontWeight: 800, fontSize: '1.4rem', marginBottom: '0.6rem' }}>
                  {t(`shell.role_${id}`).charAt(0).toUpperCase()}
                </span>
                <span style={{ display: 'block', fontSize: 'var(--fs-lg)', fontWeight: 700 }}>{t(`shell.role_${id}`)}</span>
              </button>
              {open && (
                <div style={{ padding: '0 var(--sp-4) var(--sp-4)' }}>
                  <div style={{ height: 1, background: 'var(--border)', marginBottom: 'var(--sp-3)' }} />
                  <p style={{ color: 'var(--fg-muted)', fontSize: 'var(--fs-sm)', lineHeight: 1.65, marginBottom: 'var(--sp-4)' }}>{t(`auth.desc_${id}`)}</p>
                  <button type="button" onClick={() => navigate(`/register/${id}`)} style={glassBtn}>{t('auth.createAccount')}</button>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      <p style={{ textAlign: 'center', color: 'var(--fg-muted)', fontSize: 'var(--fs-sm)' }}>
        {t('auth.haveAccount')}{' '}<button type="button" style={linkStyle} onClick={() => navigate('/login')}>{t('auth.loginHere')}</button>
      </p>
    </AuthPage>
  )
}
