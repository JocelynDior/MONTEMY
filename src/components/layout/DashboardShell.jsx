import React, { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useOrgTerms } from '../../hooks/useOrgTerms'
import { useT } from '../../i18n'
import { PAGE_ICONS, featureLabelKey, featuresFor, isLocked } from '../../config/roleFeatures'
import Background from '../shared/Background'
import ErrorBoundary from '../shared/ErrorBoundary'
import { SkeletonCards } from '../shared/Skeleton'
import TopBar from './TopBar'
import Slideshow from './Slideshow'
import FeatureGrid from './FeatureGrid'
import BottomBar from './BottomBar'
import SideDrawer from './SideDrawer'

// The frame every role's home screen shares: top bar, school slideshow, home circles and the fixed bottom bar.
// The circles come from config/roleFeatures.js by the signed-in user's role, so a dashboard page only supplies its
// live summary panels as children, which show under the circles.
// The old props role and cards are accepted and ignored, so pages that still pass them keep working.
export default function DashboardShell({ children }) {
  const navigate = useNavigate()
  const t = useT()
  const { role, loading, isVerified } = useAuth()
  const { isFirm } = useOrgTerms()
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = useCallback(() => setMenuOpen(false), [])

  const items = featuresFor(role).circles.map((entry) => {
    const locked = isLocked(entry, role, isVerified)
    return {
      key: entry.page + entry.route,
      icon: PAGE_ICONS[entry.label || entry.page] || PAGE_ICONS[entry.page],
      label: t(featureLabelKey(entry, isFirm)),
      locked,
      // Locked circles open the verification page
      onOpen: () => navigate(locked ? '/pending-verification' : entry.route),
    }
  })

  return (
    <div style={{ minHeight: 'var(--app-height)', position: 'relative', color: 'var(--fg)' }}>
      <Background />
      <TopBar onMenu={() => setMenuOpen(true)} menuOpen={menuOpen} />
      <Slideshow />

      <main style={{
        maxWidth: '70rem', margin: '0 auto', minWidth: 0,
        padding: `var(--sp-4) calc(var(--page-gutter) + var(--safe-right)) calc(var(--sp-6) + var(--bottom-bar-h) + var(--safe-bottom)) calc(var(--page-gutter) + var(--safe-left))`,
      }}>
        {loading ? (
          <SkeletonCards />
        ) : (
          <>
            <ErrorBoundary section>
              <div style={{ maxWidth: '40rem', margin: '0 auto' }}>
                <FeatureGrid items={items} />
              </div>
            </ErrorBoundary>
            <div style={{ marginTop: 'var(--sp-5)' }}>
              <ErrorBoundary section>{children}</ErrorBoundary>
            </div>
          </>
        )}
      </main>

      <BottomBar />
      <SideDrawer open={menuOpen} onClose={closeMenu} />
    </div>
  )
}
