require('dotenv').config()
const express = require('express')
const cors = require('cors')
const rateLimit = require('express-rate-limit')
const { createClient } = require('@supabase/supabase-js')
const { GoogleGenerativeAI } = require('@google/generative-ai')

const app = express()
const PORT = process.env.PORT || 3001

// Supabase admin client (service role — never expose this to frontend)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

// ─── Middleware ───────────────────────────────────────────────
app.use(express.json())
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://montemy.vercel.app',
    /\.vercel\.app$/,
  ],
  credentials: true,
}))

// Rate limiter for AI route
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many requests, slow down.' },
})

// ─── JWT Verification Middleware ──────────────────────────────
async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' })
  }
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  req.user = user
  next()
}

// ─── Routes ───────────────────────────────────────────────────

// Health check — keeps Render warm
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Ping (alias for health)
app.get('/ping', (req, res) => {
  res.json({ pong: true })
})

// Admin: verify a user (approve/reject)
app.post('/api/admin/verify-user', verifyToken, async (req, res) => {
  const { userId, action } = req.body

  const { data: callerData } = await supabase
    .from('users')
    .select('role')
    .eq('id', req.user.id)
    .single()

  if (!callerData ||
