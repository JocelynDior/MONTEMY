import { useState } from 'react'
import { useApiData } from './useApiData'

const KEY = 'montemy_parent_child'

// Loads the parent's linked children and pending/declined requests, and remembers which child
// is selected (shared by the dashboard and the My Child page).
export function useParentChildren() {
  const { data, loading, error, reload } = useApiData('/api/parent/children')
  const [pick, setPick] = useState(() => {
    try { return localStorage.getItem(KEY) } catch { return null }
  })

  const children = data?.children || []
  const selectedId = children.some(c => c.id === pick) ? pick : (children[0]?.id || null)

  const select = (id) => {
    setPick(id)
    try { localStorage.setItem(KEY, id) } catch { /* storage unavailable: selection just won't persist */ }
  }

  return { data, children, requests: data?.requests || [], selectedId, select, loading, error, reload }
}
