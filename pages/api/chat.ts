import type { NextApiRequest, NextApiResponse } from 'next'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { decryptData, encryptData } from '../../utils/encryption'

const rateLimit = (ip: string) => {
    const limit = 20
    const windowMs = 60 * 1000

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


    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown'
    if (!rateLimit(String(ip))) {
        return res.status(429).json({ message: 'Too many requests. Please try again in a minute.' })
    }


    const getApiKeys = () => {
        const keys = []
        if (process.env.GOOGLE_API_KEY) keys.push(process.env.GOOGLE_API_KEY)

        let i = 2
        while (process.env[`GOOGLE_API_KEY_${i}`]) {
            keys.push(process.env[`GOOGLE_API_KEY_${i}`] as string)
            i++
        }
        return keys
    }

    const apiKeys = getApiKeys()

    if (apiKeys.length === 0) {
        return res.status(500).json({ message: 'Server configuration error: GOOGLE_API_KEY is missing.' })
    }


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


    let lastError: any = null

    for (const key of apiKeys) {
        try {
            const genAI = new GoogleGenerativeAI(key)
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


            const responsePayload = { reply: text }
            const encryptedResponse = encryptData(JSON.stringify(responsePayload))

            return res.status(200).json({ payload: encryptedResponse, isEncrypted: true } as any)

        } catch (error: any) {
            console.error(`Gemini API Error with key ending in ...${key.slice(-4)}:`, error.message)
            lastError = error

            if (error.status === 429 || error.message?.includes('429') || error.message?.includes('quota')) {
                continue
            }

            break
        }
    }


    const status = (lastError as any)?.status || 500
    const errorMessage = (lastError as any)?.message || 'Error communicating with AI service'
    res.status(status).json({ message: errorMessage, error: String(lastError) })
}


declare global {
    var rateLimitMap: Map<string, { count: number, startTime: number }>
}
