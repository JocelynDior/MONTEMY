import { apiFetch } from '../../api/apiClient'
import { supabase } from '../../supabase/client'

export const MAX_BYTES = 10 * 1024 * 1024
export const ACCEPT = '.pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.webp'

const EXT_MIME = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
}
const ALLOWED = new Set(Object.values(EXT_MIME))

// Browsers sometimes report an empty type for Word/PowerPoint files, so fall back to the extension
export function mimeFor(file) {
  if (file.type && ALLOWED.has(file.type)) return file.type
  const ext = String(file.name || '').split('.').pop().toLowerCase()
  return EXT_MIME[ext] || null
}

export function fmtSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// 'pdf' and 'image' can be previewed in the page; everything else is download only
export function kindOf(mime) {
  if (mime === 'application/pdf') return 'pdf'
  if (typeof mime === 'string' && mime.startsWith('image/')) return 'image'
  return 'other'
}

export function iconFor(mime) {
  const kind = kindOf(mime)
  if (kind === 'pdf') return '📕'
  if (kind === 'image') return '🖼️'
  if (typeof mime === 'string' && mime.includes('presentation') || mime === 'application/vnd.ms-powerpoint') return '📊'
  return '📄'
}

// Three steps: ask the API for an upload token, send the file straight to Storage, then save the details
export async function uploadResource({ file, title, subject, grade, isPastPaper, orgId }) {
  const mimeType = mimeFor(file)
  if (!mimeType) throw new Error('That file type is not allowed. Use a PDF, Word, PowerPoint or image file.')
  if (file.size > MAX_BYTES) throw new Error('That file is too big. The limit is 10MB.')
  if (file.size === 0) throw new Error('That file is empty.')

  const { path, token } = await apiFetch('/api/resources/upload-url', {
    method: 'POST', body: { mimeType, size: file.size, orgId },
  })

  const { error } = await supabase.storage.from('resources').uploadToSignedUrl(path, token, file, { contentType: mimeType })
  if (error) throw new Error('The file could not be uploaded. Check your connection and try again.')

  await apiFetch('/api/resources', {
    method: 'POST',
    body: { path, title, subject, grade: grade || null, isPastPaper: !!isPastPaper, fileName: file.name, orgId },
  })
}

// Asks for a fresh signed link and lets the browser save the file
export async function downloadResource(id) {
  const { url } = await apiFetch(`/api/resources/${id}/link?download=1`)
  const a = document.createElement('a')
  a.href = url
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

// Fetches the file and returns a local blob: URL. Previewing from a blob avoids the browser
// refusing to show a file served from the storage domain inside our page.
export async function fetchPreviewUrl(id) {
  const { url, mimeType } = await apiFetch(`/api/resources/${id}/link`)
  const res = await fetch(url)
  if (!res.ok) throw new Error('Could not load the preview.')
  const blob = await res.blob()
  return URL.createObjectURL(new Blob([blob], { type: mimeType || blob.type }))
}
