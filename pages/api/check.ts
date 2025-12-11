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
import { ClerkAdapter } from '../../lib/adapters/clerk'
import { DatabaseAdapter } from '../../lib/adapters/database'
import { CloudinaryAdapter } from '../../lib/adapters/cloudinary'
import { ResendAdapter } from '../../lib/adapters/resend'
import { UpstashAdapter } from '../../lib/adapters/upstash'
import { PusherAdapter } from '../../lib/adapters/pusher'

const Adapters: ProviderAdapter[] = [
    OpenAIAdapter,
    AnthropicAdapter,
    GeminiAdapter,
    CohereAdapter,
    HuggingFaceAdapter,
    StripeAdapter, // Handles sk_ keys for both Stripe and Clerk
    ClerkAdapter, // Handles pk_ keys
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
    DatabaseAdapter,
    CloudinaryAdapter,
    ResendAdapter,
    UpstashAdapter,
    PusherAdapter,
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

    const { key, hint, isEncrypted } = req.body
    let finalKey = key

    // 1. Decrypt if needed (Trust Layer)
    if (isEncrypted) {
        try {
            const decrypted = decryptData(key)

            // Expert Hardening: Parsing JSON payload with Timestamp check
            try {
                const payload = JSON.parse(decrypted);

                // Check if it's the secure payload format
                if (payload.content && payload.timestamp) {
                    const now = Date.now();
                    const reqTime = payload.timestamp;

                    // Replay Attack Protection: 60s Window
                    if (now - reqTime > 60000) {
                        return res.status(400).json({
                            valid: false, provider: 'Security', message: 'Request Expired (Replay Protection)',
                            confidenceScore: 1, trustLevel: 'High'
                        } as any);
                    }

                    finalKey = payload.content;
                } else {
                    // Strict Mode: Reject invalid schema
                    return res.status(400).json({
                        valid: false, provider: 'Security', message: 'Invalid Payload Schema',
                        confidenceScore: 1, trustLevel: 'High'
                    } as any);
                }
            } catch (jsonErr) {
                // Strict Mode: Reject non-JSON (Raw strings are no longer accepted)
                return res.status(400).json({
                    valid: false, provider: 'Security', message: 'Malformatted Payload',
                    confidenceScore: 1, trustLevel: 'High'
                } as any);
            }

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

    // Security: Input Sanitization (DoS Protection)
    if (finalKey.length > 2048) {
        return res.status(400).json({
            valid: false, provider: 'Security', message: 'Input Too Long',
            confidenceScore: 1, trustLevel: 'High'
        } as any)
    }

    // Advanced Heuristics: Placeholder & Entropy Analysis
    if (isPlaceholder(finalKey)) {
        return res.status(400).json({
            valid: false, provider: 'Heuristics', message: 'Detected Placeholder Key',
            confidenceScore: 1, trustLevel: 'High'
        } as any)
    }

    const entropy = calculateEntropy(finalKey);
    // Threshold: 3.0 is a conservative cutoff. Random hex/base64 is usually > 4.0.
    // Simple words like "password" are ~2.0. 
    // We only check keys > 16 chars to avoid flagging short valid passwords/tokens.
    if (finalKey.length > 16 && entropy < 2.5) {
        return res.status(400).json({
            valid: false, provider: 'Heuristics', message: 'Low Entropy (Likely Fake/Weak)',
            confidenceScore: 0.9, trustLevel: 'High'
        } as any)
    }

    // 2. Adapter Matching (Engineering Backbone)
    const adapter = Adapters.find(a => a.matches(finalKey))

    let result: CheckResult;

    if (adapter) {
        // 3. Delegation
        result = await adapter.check(finalKey);

        // 3.1 Hint Verification (Context-Awareness)
        if (hint) {
            const normalizedHint = hint.toUpperCase();

            // Heuristic Mismatches
            if (normalizedHint.includes('GROQ') && adapter.id === 'gemini') {
                // User pasted Google key into Groq variable
                result.provider = 'Google (Labeled Groq)';
                result.metadata = { ...result.metadata, warning: 'This key matches Google format, not Groq (gsk_...)' };
            }
            if (normalizedHint.includes('OPENAI') && adapter.id !== 'openai') {
                result.metadata = { ...result.metadata, warning: `Labeled OpenAI but detected ${adapter.name}` };
            }
            if (normalizedHint.includes('ANTHROPIC') && adapter.id !== 'anthropic') {
                result.metadata = { ...result.metadata, warning: `Labeled Anthropic but detected ${adapter.name}` };
            }
        }
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

// --- Helpers ---

function calculateEntropy(str: string): number {
    const len = str.length;
    const frequencies = new Map<string, number>();

    for (const char of str) {
        frequencies.set(char, (frequencies.get(char) || 0) + 1);
    }

    let entropy = 0;
    for (const count of frequencies.values()) {
        const p = count / len;
        entropy -= p * Math.log2(p);
    }

    return entropy;
}

function isPlaceholder(str: string): boolean {
    const lower = str.toLowerCase();
    const placeholders = [
        'your_api_key', 'your-api-key', 'insert_key_here', 'replace_me',
        'example_key', 'my_secret_key', '123456789', 'abcdefgh'
    ];
    return placeholders.some(p => lower.includes(p));
}
