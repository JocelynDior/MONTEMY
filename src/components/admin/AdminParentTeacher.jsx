import React, { useState } from 'react'
import { useApiData } from '../../hooks/useApiData'
import { ErrorBox, ghostBtn, muted, panel } from '../parent/parentUi'
import { glassInput, C } from '../../styles/glass'

const when = (iso) => new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

function Thread({ convo, onBack }) {
  const { data, loading, error, reload } = useApiData(`/api/admin/pt-thread?parent=${convo.parent.id}&teacher=${convo.teacher.id}`)
  return (
    <div style={panel}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.9rem' }}>
        <div>
          <strong style={{ color: C.turquoise }}>{convo.parent.name} (parent) ↔ {convo.teacher.name} (teacher)</strong>
          {convo.orgName && <div style={{ ...muted, fontSize: '0.8rem' }}>{convo.orgName}</div>}
        </div>
        <button onClick={onBack} style={ghostBtn}>Back to list</button>
      </div>
      <p style={{ ...muted, fontSize: '0.8rem', marginBottom: '0.9rem' }}>Read-only. Opening this does not mark anything as read.</p>
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <p style={muted}>Loading...</p>}
      {data && (data.messages.length === 0 ? <p style={muted}>No messages.</p> : data.messages.map(m => (
        <div key={m.id} style={{ marginBottom: '0.6rem', alignSelf: m.fromParent ? 'flex-start' : 'flex-end' }}>
          <div style={{ ...muted, fontSize: '0.75rem' }}>{m.fromParent ? convo.parent.name : convo.teacher.name} · {when(m.createdAt)}</div>
          <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', padding: '0.5rem 0.8rem', borderRadius: '10px', background: m.fromParent ? 'rgba(255,255,255,0.12)' : 'rgba(var(--color-primary-rgb),0.25)' }}>{m.content}</div>
        </div>
      )))}
    </div>
  )
}

// Admin tab: every parent-teacher conversation (the flagged ones), newest first, read-only
export default function AdminParentTeacher() {
  const { data, loading, error, reload } = useApiData('/api/admin/pt-conversations')
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(null)

  if (open) return <Thread convo={open} onBack={() => setOpen(null)} />

  const term = search.trim().toLowerCase()
  const list = (data?.conversations || []).filter(c =>
    !term || [c.parent.name, c.teacher.name, c.orgName].some(v => (v || '').toLowerCase().includes(term)))

  return (
    <div>
      <p style={{ ...muted, marginBottom: '0.9rem' }}>Parent–teacher conversations across all schools (latest 1000 messages). Read-only.</p>
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by parent, teacher or school" aria-label="Search conversations"
        style={{ ...glassInput, padding: '0.6rem 0.9rem', fontSize: '0.9rem', marginBottom: '1rem' }} />
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <p style={muted}>Loading...</p>}
      {data && list.length === 0 && <div style={{ ...panel, ...muted, textAlign: 'center' }}>No parent–teacher conversations{term ? ' match that search' : ' yet'}.</div>}
      {list.map(c => (
        <button key={c.parent.id + c.teacher.id} onClick={() => setOpen(c)}
          style={{ ...panel, display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer', color: 'white', fontFamily: 'inherit', marginBottom: '0.7rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.6rem', flexWrap: 'wrap' }}>
            <strong>{c.parent.name} ↔ {c.teacher.name}</strong>
            <span style={{ ...muted, fontSize: '0.8rem' }}>{when(c.lastAt)} · {c.count} {c.count === 1 ? 'message' : 'messages'}</span>
          </div>
          {c.orgName && <div style={{ ...muted, fontSize: '0.8rem' }}>{c.orgName}</div>}
          <div style={{ ...muted, fontSize: '0.85rem', marginTop: '0.3rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.lastMessage}</div>
        </button>
      ))}
    </div>
  )
}
