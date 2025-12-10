import type { NextApiRequest, NextApiResponse } from 'next'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { decryptData } from '../../utils/encryption'

const apiKey = process.env.GOOGLE_API_KEY || ''
const genAI = new GoogleGenerativeAI(apiKey)

// Simple in-memory rate limiter
const rateLimit = (ip: string) => {
    const limit = 20 // requests
    const windowMs = 60 * 1000 // 1 minute

    if (!global.rateLimitMap) {
        global.rateLimitMap = new Map()
    }

    const now = Date.now()
    const userRecord = global.rateLimitMap.get(ip) || { count: 0, startTime: now }

    if (now - userRecord.startTime > windowMs) {
        userRecord.count = 1
        userRecord.startTime = now
    } else {
        userRecord.count += 1
    }

    global.rateLimitMap.set(ip, userRecord)

    return userRecord.count <= limit
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' })
    }

    // Rate Limiting
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown'
    if (!rateLimit(String(ip))) {
        return res.status(429).json({ message: 'Too many requests. Please try again in a minute.' })
    }

    if (!apiKey) {
        return res.status(500).json({ message: 'Server configuration error: GOOGLE_API_KEY is missing.' })
    }

    // ...
    const { payload, isEncrypted, message: rawMessage, context: rawContext } = req.body

    let message = rawMessage
    let context = rawContext

    if (isEncrypted && payload) {
        try {
            const decrypted = decryptData(payload)
            const parsed = JSON.parse(decrypted)
            message = parsed.message
            context = parsed.context
        } catch (e) {
            return res.status(400).json({ message: 'Encryption Error' })
        }
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

        const prompt = `
You are Oracle, an elite API security consultant.
Your goal is to help developers verify, debug, and manage their API credentials.

CONTEXT:
${context.length > 0
                ? `The user has verified these keys in this session:\n${JSON.stringify(context, null, 2)}`
                : 'No keys have been verified in this session yet.'
            }

USER MESSAGE:
"${message}"

INSTRUCTIONS:
1. be concise, professional, and helpful.
2. format responses using Markdown (bold for emphasis, code blocks for code/keys, lists for steps).
3. If the user asks about the keys above, analyze them based on the provided JSON data.
4. If the user asks general tech questions, answer them briefly.
5. Do not invent keys. Only discuss keys provided in context or by the user.
`

        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text()

        res.status(200).json({ reply: text })
    } catch (error: unknown) {
        console.error('Gemini API Error:', error)
        const status = (error as any).status || 500
        const message = (error as any).message || 'Error communicating with AI service'
        res.status(status).json({ message, error: String(error) })
    }
}

// Add global type for rate limiter to persist across hot reloads in dev
declare global {
    var rateLimitMap: Map<string, { count: number, startTime: number }>
}
