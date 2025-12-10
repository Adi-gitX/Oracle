import type { NextApiRequest, NextApiResponse } from 'next'
import { decryptData, encryptData } from '../../utils/encryption' // Ensure encryption utils are here
import { CheckResult, ProviderAdapter } from '../../lib/adapters/types'
import { OpenAIAdapter } from '../../lib/adapters/openai'
import { AnthropicAdapter } from '../../lib/adapters/anthropic'
import { GeminiAdapter } from '../../lib/adapters/gemini'

const Adapters: ProviderAdapter[] = [
    OpenAIAdapter,
    AnthropicAdapter,
    GeminiAdapter
]

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<CheckResult | { message: string }>
) {
    if (req.method !== 'POST') {
        return res.status(405).json({
            valid: false, provider: 'System', message: 'Method Not Allowed',
            confidenceScore: 0, trustLevel: 'Low'
        } as any)
    }

    const { key, isEncrypted } = req.body
    let finalKey = key

    // 1. Decrypt if needed (Trust Layer)
    if (isEncrypted) {
        try {
            finalKey = decryptData(key)
        } catch (e) {
            console.error('Decryption failed', e)
            return res.status(400).json({
                valid: false, provider: 'System', message: 'Encryption Error',
                confidenceScore: 0, trustLevel: 'Low'
            } as any)
        }
    }

    if (!finalKey) return res.status(400).json({
        valid: false, provider: 'System', message: 'Missing Key',
        confidenceScore: 0, trustLevel: 'Low'
    } as any)

    // 2. Adapter Matching (Engineering Backbone)
    const adapter = Adapters.find(a => a.matches(finalKey))

    let result: CheckResult;

    if (adapter) {
        // 3. Delegation
        result = await adapter.check(finalKey);
    } else {
        // Fallback for unknown formats
        result = {
            valid: false,
            provider: 'Unknown',
            message: 'Unknown Key Format',
            confidenceScore: 0.0,
            trustLevel: 'Low'
        };
    }

    // 4. Sanitation (Trust Layer - Best Effort)
    finalKey = null; // Explicit wipe hint

    // 5. Response Encryption (Trust Layer)
    const encryptedResult = encryptData(JSON.stringify(result));

    // Type assertion to any because we are sending an encrypted payload wrapper, 
    // not the CheckResult shape directly on the wire.
    res.status(200).json({ payload: encryptedResult, isEncrypted: true } as any);
}
