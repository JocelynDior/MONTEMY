import { useCallback, useEffect, useRef, useState } from 'react'
import { apiFetch } from '../api/apiClient'

// Loads GET `path` from the Render API. Pass null to skip loading (e.g. nothing selected yet).
// Ignores responses that arrive after the path has changed.
export function useApiData(path) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(!!path)
  const [error, setError] = useState('')
  const latest = useRef(0)

  const load = useCallback(async () => {
    const id = ++latest.current
    if (!path) { setData(null); setLoading(false); return }
    setError('')
    try {
      const result = await apiFetch(path)
      if (id === latest.current) setData(result)
    } catch (err) {
      if (id === latest.current) setError(err.message || 'Could not load this page.')
    } finally {
      if (id === latest.current) setLoading(false)
    }
  }, [path])

  useEffect(() => {
    setLoading(!!path)
    load()
  }, [load, path])

  return { data, loading, error, reload: load }
}
