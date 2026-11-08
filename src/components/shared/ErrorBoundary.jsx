import React from 'react'
import { glassBtn, glassCard } from '../../styles/glass'
import { useT } from '../../i18n'
import Icon from './Icon'

// Catches errors while rendering so one broken section never blanks the whole app.
//  - <ErrorBoundary resetKey={path}>  full-page fallback; clears itself when resetKey changes
//  - <ErrorBoundary section>          small inline fallback for one part of a page
// A failed lazy-loaded page (usually because a new version was deployed) offers a reload instead.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) { return { error } }

  componentDidCatch(error, info) {
    console.error('Render error:', error, info?.componentStack)
  }

  componentDidUpdate(prev) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    const stale = /dynamically imported module|Loading chunk|Importing a module script failed|error loading dynamically/i.test(String(error?.message || error))
    const retry = () => (stale ? window.location.reload() : this.setState({ error: null }))
    return <ErrorView stale={stale} section={!!this.props.section} onRetry={retry} />
  }
}

// A function component, so the words can follow the user's language
function ErrorView({ stale, section, onRetry }) {
  const t = useT()
  const title = stale ? t('common.newVersionTitle') : t('common.somethingWentWrong')
  const text = stale ? t('common.newVersionText') : t('common.sectionError')
  const btn = { ...glassBtn, width: 'auto', margin: 0 }
  const ghost = { ...btn, background: 'transparent', color: 'var(--fg)', border: '1px solid var(--border-strong)' }

  if (section) {
    return (
      <div role="alert" style={{ ...glassCard, padding: 'var(--sp-4)', borderColor: 'var(--border-strong)', margin: '1rem 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, marginBottom: '0.3rem' }}>
          <Icon name="warning" /> <span style={{ minWidth: 0 }}>{title}</span>
        </div>
        <p style={{ color: 'var(--fg-muted)', fontSize: 'var(--fs-sm)', marginBottom: '0.8rem' }}>{text}</p>
        <button onClick={onRetry} style={btn}>{stale ? t('common.reload') : t('common.tryAgain')}</button>
      </div>
    )
  }
  return (
    <div role="alert" style={{ minHeight: 'var(--app-height)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--page-gutter)', color: 'var(--fg)', background: 'var(--bg)' }}>
      <div style={{ ...glassCard, padding: 'var(--sp-6)', width: '100%', maxWidth: '26rem', textAlign: 'center' }}>
        <div style={{ marginBottom: '0.75rem' }}><Icon name="warning" size="2.5rem" strokeWidth={1.5} /></div>
        <h2 style={{ fontSize: 'var(--fs-xl)', marginBottom: '0.5rem' }}>{title}</h2>
        <p style={{ color: 'var(--fg-muted)', marginBottom: '1.2rem' }}>{text}</p>
        <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={onRetry} style={btn}>{stale ? t('common.reload') : t('common.tryAgain')}</button>
          {!stale && <button onClick={() => { window.location.href = '/' }} style={ghost}>{t('common.goHome')}</button>}
        </div>
      </div>
    </div>
  )
}
