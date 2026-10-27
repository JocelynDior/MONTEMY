import React from 'react'
import { glassBtn, glassCard, C } from '../../styles/glass'

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
    const title = stale ? 'A new version is available' : 'Something went wrong'
    const text = stale ? 'Reload the page to get the latest version.' : 'This part of the page could not be shown. You can try again.'
    const btn = { ...glassBtn, width: 'auto', padding: '0.5rem 1.2rem', margin: 0 }

    if (this.props.section) {
      return (
        <div role="alert" style={{ ...glassCard, padding: '1.1rem', borderColor: 'rgba(255,80,80,0.4)', margin: '1rem 0' }}>
          <div style={{ fontWeight: 700, color: '#ffb3b3', marginBottom: '0.3rem' }}>{title}</div>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '0.8rem' }}>{text}</p>
          <button onClick={retry} style={btn}>{stale ? 'Reload' : 'Try again'}</button>
        </div>
      )
    }
    return (
      <div role="alert" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', color: 'white',
        background: 'linear-gradient(135deg, var(--color-bg) 0%, var(--color-bg-2) 100%)' }}>
        <div style={{ ...glassCard, padding: '2rem', maxWidth: '26rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>⚠️</div>
          <h2 style={{ color: C.turquoise, marginBottom: '0.5rem' }}>{title}</h2>
          <p style={{ color: 'rgba(255,255,255,0.75)', marginBottom: '1.2rem' }}>{text}</p>
          <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={retry} style={btn}>{stale ? 'Reload' : 'Try again'}</button>
            {!stale && <button onClick={() => { window.location.href = '/' }} style={{ ...btn, background: 'transparent', color: 'white', boxShadow: 'none', border: '1px solid rgba(255,255,255,0.3)' }}>Go home</button>}
          </div>
        </div>
      </div>
    )
  }
}
