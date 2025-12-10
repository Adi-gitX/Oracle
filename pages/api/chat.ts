import type { NextApiRequest, NextApiResponse } from 'next'
import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = process.env.GOOGLE_API_KEY || ''
const genAI = new GoogleGenerativeAI(apiKey)

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' })
    }

    if (!apiKey) {
        return res.status(500).json({ message: 'Server configuration error: GOOGLE_API_KEY is missing.' })
    }

    const { message, context } = req.body

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

        const prompt = `
You are Oracle, an intelligent API key management assistant.
Context: The user has previously verified some API keys.
Here is the context of valid/working keys found in this session:
${JSON.stringify(context, null, 2)}

User Request: ${message}

Instructions:
1. Answer the user's request helpfully.
2. If they ask for a list of working keys, provide them in a clean, copy-paste friendly format.
3. Be professional and concise.
`

        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text()

        res.status(200).json({ reply: text })
    } catch (error: any) {
        console.error('Gemini API Error:', error)
        const status = error.status || 500
        const message = error.message || 'Error communicating with AI service'
        res.status(status).json({ message, error: error.toString() })
    }
}
