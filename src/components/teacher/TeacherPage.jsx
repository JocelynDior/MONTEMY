import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useBranding } from '../../context/BrandingContext'
import { useT } from '../../i18n'
import Background from '../../components/shared/Background'
import Icon, { hasIcon } from '../../components/shared/Icon'
import { glassNav, glassBtn } from '../../styles/glass'

// Page frame for teacher sub-pages: background, branded navbar, title.
// icon: an Icon name (for example "calendar"). Old emoji strings are ignored, so pages can move over one at a time.
// maxWidth: a number is read as pixels and converted to rem; a string such as '60rem' is used as it is.
export default function TeacherPage({ title, icon, children, maxWidth = 960 }) {
  const navigate = useNavigate()
  const t = useT()
  const { appName, logoUrl } = useBranding()

  return (
    <div style={{ minHeight: 'var(--app-height)', position: 'relative', color: 'var(--fg)' }}>
      <Background />

      <nav style={glassNav}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0, fontFamily: 'var(--font-brand)', fontSize: 'var(--fs-2xl)', lineHeight: 1.1 }}>
          {logoUrl && <img src={logoUrl} alt="" style={{ height: '1.8rem' }} />}
          <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{appName}</span>
        </span>
        <button onClick={() => navigate('/teacher/dashboard')}
          style={{ ...glassBtn, width: 'auto', padding: '0.5rem 1.1rem', margin: 0, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <Icon name="back" />
          {t('common.back')}
        </button>
      </nav>

      <div style={{
        maxWidth: typeof maxWidth === 'number' ? `${maxWidth / 16}rem` : maxWidth, margin: '0 auto', minWidth: 0,
        padding: 'var(--sp-5) calc(var(--page-gutter) + var(--safe-right)) calc(var(--sp-6) + var(--bottom-bar-h) + var(--safe-bottom)) calc(var(--page-gutter) + var(--safe-left))',
      }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: 'var(--fs-2xl)', marginBottom: 'var(--sp-4)', minWidth: 0 }}>
          {hasIcon(icon) && <Icon name={icon} size="1.1em" />}
          <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{title}</span>
        </h2>
        {children}
      </div>
    </div>
  )
}
