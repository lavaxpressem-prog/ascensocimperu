import type { VercelRequest, VercelResponse } from '@vercel/node'

const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!GOOGLE_AI_API_KEY) {
    return res.status(500).json({ error: 'GOOGLE_AI_API_KEY is not configured on the server' })
  }

  const { systemPrompt, messages } = req.body

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required' })
  }

  try {
    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
          contents,
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Google AI API error:', response.status, errorData)
      return res.status(response.status).json({
        error: errorData.error || { message: 'Error from AI API' },
      })
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from AI'

    return res.status(200).json({ content: text })
  } catch (error) {
    console.error('AI proxy error:', error)
    return res.status(500).json({ error: { message: 'Internal server error' } })
  }
}
