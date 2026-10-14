import { apiFetch } from '../../api/apiClient'
import { supabase } from '../../supabase/client'
import { MAX_BYTES, mimeFor } from '../resources/resourceUtils'

// Two steps: ask the API for an upload token, then send the file straight to Storage.
// `uploadUrlPath` is the API route that hands out the token. Returns { path, name, size, mime }.
export async function uploadAssignmentFile(uploadUrlPath, file) {
  const mimeType = mimeFor(file)
  if (!mimeType) throw new Error('That file type is not allowed. Use a PDF, Word, PowerPoint or image file.')
  if (file.size === 0) throw new Error('That file is empty.')
  if (file.size > MAX_BYTES) throw new Error('That file is too big. The limit is 10MB.')

  const { path, token } = await apiFetch(uploadUrlPath, { method: 'POST', body: { mimeType, size: file.size } })
  const { error } = await supabase.storage.from('assignment-files').uploadToSignedUrl(path, token, file, { contentType: mimeType })
  if (error) throw new Error('The file could not be uploaded. Check your connection and try again.')
  return { path, name: file.name, size: file.size, mime: mimeType }
}

// Asks for a fresh one-hour link and opens it in a new tab
export async function openAssignmentFile(linkPath) {
  const sep = linkPath.includes('?') ? '&' : '?'
  const { url } = await apiFetch(`${linkPath}${sep}download=1`)
  const a = document.createElement('a')
  a.href = url
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}
