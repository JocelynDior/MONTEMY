import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../../supabase/client'

const ADMIN_USER_ID = 'montemy_admin_user_id'
const ADMIN_NAME = 'Admin Support'

export default function AdminChat() {
  const navigate = useNavigate()
  const [allUsers, setAllUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [unreadCounts, setUnreadCounts] = useState({})
  const [previewImage, setPreviewImage] = useState(null)
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef(null)
  const unsubRef = useRef(null)

  const s = { navy: '#001F3F', turquoise: '#40E0D0', darkNavy: '#001A35', lightNavy: '#0A2A4A' }

  const getConversationId = (userId) => {
    const users = [ADMIN_USER_ID, userId].sort()
    return `conversation_${users.join('_')}`
  }

  useEffect(() => { loadAllUsers() }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const term = searchTerm.toLowerCase()
    setFilteredUsers(allUsers.filter(u => {
      const matchSearch = !term || u.displayName.toLowerCase().includes(term) || u.role.toLowerCase().includes(term)
      const matchRole = !roleFilter || u.role === roleFilter
      return matchSearch && matchRole
    }))
  }, [searchTerm, roleFilter, allUsers])

  const loadAllUsers = async () => {
    setLoading(true)
    const cols = ['students', 'teachers', 'parents', 'principals', 'staff']
    const users = []
    for (const col of cols) {
      try {
        const snap = await getDocs(collection(db, col))
        snap.forEach(d => {
          const data = d.data()
          const firstName = col === 'parents' ? (data.parentFirstName || data.firstName || '') : (data.firstName || '')
          const lastName = col === 'parents' ? (data.parentLastName || data.lastName || '') : (data.lastName || data.LastName || '')
          const displayName = `${firstName} ${lastName}`.trim() || 'User'
          users.push({ id: d.id, collection: col, role: col.slice(0, -1), displayName, email: data.email || '', school: data.schoolName || '' })
        })
      } catch (err) { console.error(err) }
    }
    setAllUsers(users)
    setFilteredUsers(users)
    setLoading(false)
    loadUnreadCounts(users)
  }

  const loadUnreadCounts = async (users) => {
    const counts = {}
    for (const user of users) {
      try {
        const q = query(collection(db, 'messages'),
          where('conversationId', '==', getConversationId(user.id)),
          where('receiverId', '==', ADMIN_USER_ID),
          where('read', '==', false))
        const snap = await getDocs(q)
        counts[user.id] = snap.size
      } catch { counts[user.id] = 0 }
    }
    setUnreadCounts(counts)
  }

  const selectUser = (user) => {
    setSelectedUser(user)
    markAsRead(user.id)
    if (unsubRef.current) unsubRef.current()
    const convId = getConversationId(user.id)
    const q = query(collection(db, 'messages'), where('conversationId', '==', convId), orderBy('timestamp', 'asc'))
    unsubRef.current = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
  }

  const markAsRead = async (userId) => {
    try {
      const q = query(collection(db, 'messages'),
        where('conversationId', '==', getConversationId(userId)),
        where('receiverId', '==', ADMIN_USER_ID),
        where('read', '==', false))
      const snap = await getDocs(q)
      await Promise.all(snap.docs.map(d => updateDoc(d.ref, { read: true })))
      setUnreadCounts(prev => ({ ...prev, [userId]: 0 }))
    } catch (err) { console.error(err) }
  }

  const sendMessage = async () => {
    if (!inputText.trim() || !selectedUser) return
    try {
      await addDoc(collection(db, 'messages'), {
        conversationId: getConversationId(selectedUser.id),
        senderId: ADMIN_USER_ID, senderName: ADMIN_NAME, senderRole: 'admin',
        receiverId: selectedUser.id, receiverName: selectedUser.displayName, receiverRole: selectedUser.role,
        text: inputText.trim(), timestamp: serverTimestamp(), type: 'text', read: false, chatType: 'admin_to_user'
      })
      setInputText('')
    } catch (err) { alert('Error sending message: ' + err.message) }
  }

  const formatTime = (ts) => {
    if (!ts) return 'Just now'
    return ts.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (ts) => {
    if (!ts) return 'Today'
    const d = ts.toDate()
    const today = new Date()
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
    if (d.toDateString() === today.toDateString()) return 'Today'
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
  }

  const groupedMessages = messages.reduce((acc, msg) => {
    const date = msg.timestamp ? formatDate(msg.timestamp) : 'Today'
    if (!acc[date]) acc[date] = []
    acc[date].push(msg)
    return acc
  }, {})

  return (
    <div style={{ background: s.navy, minHeight: '100vh', color: 'white', fontFamily: 'Arial', display: 'flex', flexDirection: 'column' }}>

      {/* Navbar */}
      <nav style={{ background: s.navy, padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `2px solid ${s.turquoise}` }}>
        <button onClick={() => navigate('/admin/dashboard')}
          style={{ background: s.darkNavy, color: s.turquoise, padding: '0.5rem 1rem', border: `2px solid ${s.turquoise}`, borderRadius: '25px', cursor: 'pointer', fontWeight: 'bold' }}>
          ← Back to Dashboard
        </button>
        <div style={{ color: s.turquoise, fontSize: '1.5rem', fontWeight: 'bold' }}>Admin Support Chat</div>
        <div style={{ width: '80px' }} />
      </nav>

      {/* Main Layout */}
      <div style={{ display: 'flex', flex: 1, gap: '1rem', padding: '1rem', height: 'calc(100vh - 80px)' }}>

        {/* Sidebar */}
        <div style={{ width: '300px', background: s.darkNavy, border: `2px solid ${s.turquoise}`, borderRadius: '15px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '1rem', borderBottom: `2px solid ${s.turquoise}` }}>
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search users..."
              style={{ width: '100%', padding: '0.8rem 1rem', border: `2px solid ${s.turquoise}`, borderRadius: '25px', background: s.lightNavy, color: 'white', fontSize: '1rem', marginBottom: '0.5rem' }} />
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
              style={{ width: '100%', padding: '0.8rem 1rem', border: `2px solid ${s.turquoise}`, borderRadius: '25px', background: s.lightNavy, color: 'white', fontSize: '1rem' }}>
              <option value="">All Roles</option>
              {['student', 'teacher', 'parent', 'principal', 'staff'].map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
            {loading ? <div style={{ textAlign: 'center', padding: '2rem', color: s.turquoise }}>Loading users...</div>
              : filteredUsers.length === 0 ? <div style={{ textAlign: 'center', padding: '2rem', color: '#ccc' }}>No users found</div>
              : filteredUsers.map(user => (
                <div key={user.id} onClick={() => selectUser(user)}
                  style={{ padding: '1rem', marginBottom: '0.5rem', background: selectedUser?.id === user.id ? s.turquoise : s.lightNavy, borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem', color: selectedUser?.id === user.id ? s.navy : 'white' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: s.turquoise, color: s.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>
                    {user.displayName.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold' }}>{user.displayName}</div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</div>
                  </div>
                  {unreadCounts[user.id] > 0 && (
                    <div style={{ background: '#4CAF50', color: 'white', borderRadius: '50%', width: '20px', height: '20px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {unreadCounts[user.id]}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>

        {/* Chat Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: s.darkNavy, border: `2px solid ${s.turquoise}`, borderRadius: '15px', overflow: 'hidden' }}>

          {/* Chat Header */}
          <div style={{ background: s.turquoise, color: s.navy, padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: s.navy, color: s.turquoise, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              {selectedUser ? selectedUser.displayName.charAt(0) : '?'}
            </div>
            <div>
              <div style={{ fontWeight: 'bold' }}>{selectedUser ? selectedUser.displayName : 'Select a user to chat'}</div>
              <div style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '8px', height: '8px', background: '#4CAF50', borderRadius: '50%' }} />
                Online
              </div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {!selectedUser ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#ccc', gap: '1rem' }}>
                <div style={{ fontSize: '3rem', color: s.turquoise }}>💬</div>
                <div>Select a user from the sidebar to start chatting</div>
                <div style={{ fontSize: '0.9rem', color: '#999' }}>Messages sent here will be received by the selected user</div>
              </div>
            ) : messages.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#ccc' }}>
                <div style={{ fontSize: '3rem', color: s.turquoise }}>💬</div>
                <div>No messages yet with {selectedUser.displayName}</div>
              </div>
            ) : Object.entries(groupedMessages).map(([date, msgs]) => (
              <div key={date}>
                <div style={{ textAlign: 'center', color: s.turquoise, fontSize: '0.8rem', margin: '1rem 0' }}>{date}</div>
                {msgs.map(msg => {
                  const isSent = msg.senderId === ADMIN_USER_ID
                  return (
                    <div key={msg.id} style={{ display: 'flex', justifyContent: isSent ? 'flex-end' : 'flex-start', marginBottom: '0.5rem' }}>
                      <div style={{ maxWidth: '80%', padding: '0.8rem 1rem', borderRadius: '15px', background: isSent ? s.turquoise : s.lightNavy, color: isSent ? s.navy : 'white' }}>
                        {!isSent && <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>{msg.senderName}</div>}
                        {msg.type === 'image' ? (
                          <img src={msg.text} alt="sent" style={{ maxWidth: '250px', maxHeight: '250px', borderRadius: '10px', cursor: 'pointer' }} onClick={() => setPreviewImage(msg.text)} />
                        ) : <div>{msg.text}</div>}
                        <div style={{ fontSize: '0.7rem', marginTop: '0.3rem', opacity: 0.7, textAlign: 'right' }}>{formatTime(msg.timestamp)}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '1rem', borderTop: `1px solid ${s.lightNavy}`, display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input value={inputText} onChange={e => setInputText(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && sendMessage()}
              placeholder={selectedUser ? `Message ${selectedUser.displayName}...` : 'Select a user first...'}
              disabled={!selectedUser}
              style={{ flex: 1, padding: '0.8rem 1rem', border: `1px solid ${s.turquoise}`, borderRadius: '25px', background: s.lightNavy, color: 'white', outline: 'none' }} />
            <button onClick={sendMessage} disabled={!selectedUser}
              style={{ background: s.turquoise, color: s.navy, border: 'none', borderRadius: '50%', width: '45px', height: '45px', cursor: selectedUser ? 'pointer' : 'not-allowed', fontSize: '1.2rem' }}>
              ➤
            </button>
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div onClick={() => setPreviewImage(null)}
          style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={previewImage} alt="Preview" style={{ maxWidth: '90%', maxHeight: '90vh', borderRadius: '10px' }} />
        </div>
      )}
    </div>
  )
}
