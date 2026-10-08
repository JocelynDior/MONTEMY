import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '../api/apiClient'

// Loads everything the student pages need from the Render API in one call
export function useStudentOverview() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    try {
      setData(await apiFetch('/api/student/overview'))
    } catch (err) {
      setError(err.message || 'Could not load your data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { data, loading, error, reload: load }
}
