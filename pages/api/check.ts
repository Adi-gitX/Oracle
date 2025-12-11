import type { NextApiRequest, NextApiResponse } from 'next'
import { decryptData, encryptData } from '../../utils/encryption' // Ensure encryption utils are here
import { CheckResult, ProviderAdapter } from '../../lib/adapters/types'
import { OpenAIAdapter } from '../../lib/adapters/openai'
import { AnthropicAdapter } from '../../lib/adapters/anthropic'
import { GeminiAdapter } from '../../lib/adapters/gemini'
import { CohereAdapter } from '../../lib/adapters/cohere'
import { HuggingFaceAdapter } from '../../lib/adapters/huggingface'
import { StripeAdapter } from '../../lib/adapters/stripe'
import { MistralAdapter } from '../../lib/adapters/mistral'
import { GroqAdapter } from '../../lib/adapters/groq'
import { AWSAdapter } from '../../lib/adapters/aws'
import { SupabaseAdapter } from '../../lib/adapters/supabase'
import { GitHubAdapter } from '../../lib/adapters/github'
import { SlackAdapter } from '../../lib/adapters/slack'
import { SendGridAdapter } from '../../lib/adapters/sendgrid'
import { TelegramAdapter } from '../../lib/adapters/telegram'
import { MapboxAdapter } from '../../lib/adapters/mapbox'
import { NPMAdapter } from '../../lib/adapters/npm'
import { HerokuAdapter } from '../../lib/adapters/heroku'
import { ShodanAdapter } from '../../lib/adapters/shodan'
import { TwilioAdapter } from '../../lib/adapters/twilio'
import { MailgunAdapter } from '../../lib/adapters/mailgun'
import { MailChimpAdapter } from '../../lib/adapters/mailchimp'
import { GitLabAdapter } from '../../lib/adapters/gitlab'
import { BitlyAdapter } from '../../lib/adapters/bitly'

const Adapters: ProviderAdapter[] = [
    OpenAIAdapter,
    AnthropicAdapter,
    GeminiAdapter,
    CohereAdapter,
    HuggingFaceAdapter,
    StripeAdapter,
    GroqAdapter,
    MistralAdapter,
    GitHubAdapter,
    SlackAdapter,
    SendGridAdapter,
    TelegramAdapter,
    MapboxAdapter,
    NPMAdapter,
    HerokuAdapter,
    ShodanAdapter,
    TwilioAdapter,
    MailgunAdapter,
    MailChimpAdapter,
    GitLabAdapter,
    BitlyAdapter,
    // Format fallbacks last
    AWSAdapter,
    SupabaseAdapter
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
