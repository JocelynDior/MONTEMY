// The only file that talks to an AI service. Everything else calls chat() or streamChat().
// Today it uses Gemini. To move to another model in v1.3, change this file only.
//
// Messages are provider-neutral: [{ role: 'user' | 'assistant', content: 'text' }].
// Tools are provider-neutral JSON-schema declarations: [{ name, description, parameters }].

const { GoogleGenAI } = require('@google/genai')

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

const MAX_MESSAGE_CHARS = 4000

// Gemini wants upper-case type names ('OBJECT', 'STRING'); our declarations use JSON-schema names.
function toGeminiSchema(schema) {
  if (!schema || typeof schema !== 'object') return schema
  const out = {}
  for (const [key, value] of Object.entries(schema)) {
    if (key === 'type' && typeof value === 'string') out.type = value.toUpperCase()
    else if (key === 'properties' && value && typeof value === 'object') {
      out.properties = Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toGeminiSchema(v)]))
    } else if (key === 'items') out.items = toGeminiSchema(value)
    else out[key] = value
  }
  return out
}

// Clean the history: valid roles and strings only, must start with a user turn
function toContents(messages) {
  const contents = (Array.isArray(messages) ? messages : [])
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content.slice(0, MAX_MESSAGE_CHARS) }] }))
  while (contents.length && contents[0].role !== 'user') contents.shift()
  return contents
}

function buildConfig({ system, maxOutputTokens, temperature, tools }) {
  const config = {
    systemInstruction: system || undefined,
    maxOutputTokens: maxOutputTokens || 1024,
    temperature: temperature ?? 0.7,
  }
  if (Array.isArray(tools) && tools.length) {
    config.tools = [{
      functionDeclarations: tools.map(t => ({
        name: t.name,
        description: t.description,
        parameters: toGeminiSchema(t.parameters || { type: 'object', properties: {} }),
      })),
    }]
  }
  return config
}

// Streams the reply as plain text chunks (used by the AI Tutor).
async function* streamChat({ system, messages, maxOutputTokens, temperature }) {
  const stream = await client.models.generateContentStream({
    model: MODEL,
    contents: toContents(messages),
    config: buildConfig({ system, maxOutputTokens, temperature }),
  })
  for await (const chunk of stream) {
    const text = chunk.text
    if (text) yield text
  }
}

// One full reply. Returns { text, toolCalls: [{ name, args }] }; toolCalls is empty when no tool was asked for.
async function chat({ system, messages, maxOutputTokens, temperature, tools }) {
  const response = await client.models.generateContent({
    model: MODEL,
    contents: toContents(messages),
    config: buildConfig({ system, maxOutputTokens, temperature, tools }),
  })
  const parts = response?.candidates?.[0]?.content?.parts || []
  const text = parts.map(p => (typeof p.text === 'string' ? p.text : '')).join('').trim()
  const toolCalls = parts.filter(p => p.functionCall).map(p => ({ name: p.functionCall.name, args: p.functionCall.args || {} }))
  return { text, toolCalls }
}

module.exports = { chat, streamChat, MODEL }
