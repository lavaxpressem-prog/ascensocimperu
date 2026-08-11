import type { VercelRequest, VercelResponse } from '@vercel/node'

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { systemPrompt, messages } = req.body

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required' })
  }

  try {
    const ollamaMessages = []

    if (systemPrompt) {
      ollamaMessages.push({ role: 'system', content: systemPrompt })
    }

    for (const m of messages) {
      ollamaMessages.push({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })
    }

    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: ollamaMessages,
        stream: false,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      console.error('Ollama API error:', response.status, errorText)
      return res.status(response.status).json({
        error: { message: `Error from Ollama: ${errorText}` },
      })
    }

    const data = await response.json()
    const text = data.message?.content || 'No response from AI'

    return res.status(200).json({ content: text })
  } catch (error) {
    console.error('AI proxy error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return res.status(500).json({ error: { message } })
  }
}
