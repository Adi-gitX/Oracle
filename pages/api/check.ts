import type { NextApiRequest, NextApiResponse } from 'next'
import fetch from 'cross-fetch'

type CheckResponse = {
    valid: boolean
    provider?: string
    message?: string
    premium?: boolean
    models?: string[]
}

const checkOpenAI = async (key: string): Promise<CheckResponse> => {
    try {
        const res = await fetch('https://api.openai.com/v1/models', {
            headers: { Authorization: `Bearer ${key}` },
        })

        if (res.status === 401) return { valid: false, message: 'Invalid API Key' }
        if (!res.ok) return { valid: false, message: `Error: ${res.statusText}` }

        const data = await res.json()
        const models = data.data.map((m: any) => m.id)
        const hasGPT4 = models.some((m: string) => m.includes('gpt-4'))

        return {
            valid: true,
            provider: 'OpenAI',
            premium: hasGPT4,
            models: models.slice(0, 5), // just return a few
            message: hasGPT4 ? 'GPT-4 Enabled' : 'GPT-3.5 Only'
        }
    } catch (error) {
        return { valid: false, message: 'Network Error' }
    }
}

const checkAnthropic = async (key: string): Promise<CheckResponse> => {
    try {
        // Anthropic doesn't have a simple GET models endpoint that uses the key in the same standard way universally documented without version headers, 
        // but we can try a dummy message or see if they added one. 
        // Actually, asking for models is safested if exists, but usually a small complete request is needed.
        // Let's try a very small completion with max_tokens 1.
        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': key,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                max_tokens: 1,
                messages: [{ role: 'user', content: 'Hi' }]
            })
        })

        if (res.status === 401 || res.status === 403) return { valid: false, message: 'Invalid API Key' }
        // If we get 400 about model, the key is likely valid but model might be wrong (unlikely for haiku).
        // If we get 200, valid.

        // Also, checking for "premium" in Anthropic is harder, usually all paid.
        // We can assume valid = usable.

        if (res.ok) {
            return {
                valid: true,
                provider: 'Anthropic',
                premium: true, // Anthropic is generally paid-only for API
                message: 'Active'
            }
        }

        const errData = await res.json()
        return { valid: false, message: errData.error?.message || res.statusText }
    } catch (error) {
        return { valid: false, message: 'Network Error' }
    }
}

const checkGemini = async (key: string): Promise<CheckResponse> => {
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`)

        if (res.status === 400) return { valid: false, message: 'Invalid API Key' }
        if (!res.ok) return { valid: false, message: `Error: ${res.statusText}` }

        const data = await res.json()
        const models = data.models ? data.models.map((m: any) => m.name) : []

        return {
            valid: true,
            provider: 'Google Gemini',
            premium: false, // Gemini API is generally free or pay-as-you-go, no specific "premium" tier flag in models
            models: models.slice(0, 5),
            message: 'Active'
        }
    } catch (error) {
        return { valid: false, message: 'Network Error' }
    }
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<CheckResponse>
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ valid: false, message: 'Method Not Allowed' })
    }

    const { key } = req.body
    if (!key) return res.status(400).json({ valid: false, message: 'Missing Key' })

    let result: CheckResponse = { valid: false, provider: 'Unknown' }

    if (key.startsWith('sk-ant')) {
        result = await checkAnthropic(key)
        result.provider = 'Anthropic'
    } else if (key.startsWith('sk-')) {
        result = await checkOpenAI(key)
        result.provider = 'OpenAI'
    } else if (key.startsWith('AIza')) {
        result = await checkGemini(key)
        result.provider = 'Google Gemini'
    } else {
        // Try Gemini as fallback if it looks like a Google key but maybe different prefix? 
        // Usually AIza is standard. Fallback to invalid.
        result = { valid: false, message: 'Unknown Key Format' }
    }

    res.status(200).json(result)
}
