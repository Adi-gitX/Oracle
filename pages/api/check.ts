import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { encryptData, decryptData } from '../../utils/encryption';
import { checkLeak } from '../../lib/services/leakChecker';
import { OpenAIAdapter } from '../../lib/adapters/openai';
import { AnthropicAdapter } from '../../lib/adapters/anthropic';
import { GoogleAdapter } from '../../lib/adapters/google';
import { StripeAdapter } from '../../lib/adapters/stripe';
import { CohereAdapter } from '../../lib/adapters/cohere';
import { HuggingFaceAdapter } from '../../lib/adapters/huggingface';
import { MistralAdapter } from '../../lib/adapters/mistral';
import { GroqAdapter } from '../../lib/adapters/groq';
import { GitHubAdapter } from '../../lib/adapters/github';
import { SlackAdapter } from '../../lib/adapters/slack';
import { SendGridAdapter } from '../../lib/adapters/sendgrid';
import { TelegramAdapter } from '../../lib/adapters/telegram';
import { MapboxAdapter } from '../../lib/adapters/mapbox';
import { NPMAdapter } from '../../lib/adapters/npm';
import { HerokuAdapter } from '../../lib/adapters/heroku';
import { ShodanAdapter } from '../../lib/adapters/shodan';
import { TwilioAdapter } from '../../lib/adapters/twilio';
import { MailgunAdapter } from '../../lib/adapters/mailgun';
import { MailChimpAdapter } from '../../lib/adapters/mailchimp';
import { GitLabAdapter } from '../../lib/adapters/gitlab';
import { BitlyAdapter } from '../../lib/adapters/bitly';
import { AWSAdapter } from '../../lib/adapters/aws';
import { SupabaseAdapter } from '../../lib/adapters/supabase';
import { ClerkAdapter } from '../../lib/adapters/clerk';
import { DatabaseAdapter } from '../../lib/adapters/database';
import { CloudinaryAdapter } from '../../lib/adapters/cloudinary';
import { ResendAdapter } from '../../lib/adapters/resend';
import { UpstashAdapter } from '../../lib/adapters/upstash';
import { PusherAdapter } from '../../lib/adapters/pusher';
import { ProviderAdapter, CheckResult } from '../../lib/adapters/types';

export const config = {
    runtime: 'experimental-edge',
};

import { GenericSecretAdapter } from '../../lib/adapters/generic';

// 2. Adapter Registry
export const Adapters: ProviderAdapter[] = [
    OpenAIAdapter, AnthropicAdapter, GoogleAdapter, StripeAdapter, CohereAdapter,
    HuggingFaceAdapter, MistralAdapter, GroqAdapter, GitHubAdapter, SlackAdapter,
    SendGridAdapter, TelegramAdapter, MapboxAdapter, NPMAdapter, HerokuAdapter,
    ShodanAdapter, TwilioAdapter, MailgunAdapter, MailChimpAdapter, GitLabAdapter,
    BitlyAdapter, AWSAdapter, SupabaseAdapter, ClerkAdapter, DatabaseAdapter,
    CloudinaryAdapter, ResendAdapter, UpstashAdapter, PusherAdapter, GenericSecretAdapter
];

export default async function handler(req: NextRequest) {
    if (req.method !== 'POST') {
        return new NextResponse('Method Not Allowed', { status: 405 });
    }

    let finalKey: string | null = null;
    let hint: string | undefined = undefined;

    try {
        const body = await req.json();
        const { key, hint: bodyHint, isEncrypted } = body;
        hint = bodyHint;

        // 1. Decrypt if needed (Trust Layer)
        if (isEncrypted) {
            try {
                const decrypted = decryptData(key);

                // Expert Hardening: Parsing JSON payload with Timestamp check
                try {
                    const payload = JSON.parse(decrypted);

                    // Check if it's the secure payload format
                    if (payload.content && payload.timestamp) {
                        const now = Date.now();
                        const reqTime = payload.timestamp;

                        // Replay Attack Protection: 60s Window
                        if (now - reqTime > 60000) {
                            return NextResponse.json({
                                valid: false, provider: 'Security', message: 'Request Expired (Replay Protection)',
                                confidenceScore: 1, trustLevel: 'High'
                            }, { status: 400 });
                        }

                        finalKey = payload.content;
                    } else {
                        // Strict Mode: Reject invalid schema
                        return NextResponse.json({
                            valid: false, provider: 'Security', message: 'Invalid Payload Schema',
                            confidenceScore: 1, trustLevel: 'High'
                        }, { status: 400 });
                    }
                } catch (jsonErr) {
                    // Strict Mode: Reject non-JSON
                    return NextResponse.json({
                        valid: false, provider: 'Security', message: 'Malformatted Payload',
                        confidenceScore: 1, trustLevel: 'High'
                    }, { status: 400 });
                }

            } catch (e) {
                console.error('Decryption failed', e);
                return NextResponse.json({
                    valid: false, provider: 'System', message: 'Encryption Error',
                    confidenceScore: 0, trustLevel: 'Low'
                }, { status: 400 });
            }
        } else {
            // If checking unencrypted (legacy or internal), assume plain text
            finalKey = key;
        }

        if (!finalKey) return NextResponse.json({
            valid: false, provider: 'System', message: 'Missing Key',
            confidenceScore: 0, trustLevel: 'Low'
        }, { status: 400 });

        // Security: Input Sanitization (DoS Protection)
        if (finalKey.length > 2048) {
            return NextResponse.json({
                valid: false, provider: 'Security', message: 'Input Too Long',
                confidenceScore: 1, trustLevel: 'High'
            }, { status: 400 });
        }

        // Advanced Heuristics: Placeholder & Entropy Analysis
        if (isPlaceholder(finalKey)) {
            return NextResponse.json({
                valid: false, provider: 'Heuristics', message: 'Detected Placeholder Key',
                confidenceScore: 1, trustLevel: 'High'
            }, { status: 400 });
        }

        const entropy = calculateEntropy(finalKey);
        // Threshold: 3.0 is conservative.
        if (finalKey.length > 16 && entropy < 2.5) {
            return NextResponse.json({
                valid: false, provider: 'Heuristics', message: 'Low Entropy (Likely Fake/Weak)',
                confidenceScore: 0.9, trustLevel: 'High'
            }, { status: 400 });
        }

        // 2. Adapter Matching (Engineering Backbone)
        const adapter = Adapters.find(a => a.matches(finalKey!));

        let result: CheckResult;

        if (adapter) {
            // 3. Delegation
            result = await adapter.check(finalKey);

            // 3.1 Leak Monitoring (Enterprise Security)
            // We check leak status for all valid keys.
            if (result.valid) {
                const leakStatus = await checkLeak(finalKey);

                if (leakStatus === 'leaked') {
                    // Critical: Revoke validity for leaked keys
                    result.valid = false;
                    // result.provider = `${result.provider}`;
                    result.message = "This key works, but it's public on GitHub. Revoke immediately.";
                    result.trustLevel = 'Low';
                    result.metadata = { ...result.metadata, leaked: true, warning: 'Key found in public GitHub code! Revoke immediately.' };
                } else if (leakStatus === 'skipped') {
                    result.metadata = { ...result.metadata, warning: 'Leak check skipped (GitHub Rate Limit)' };
                    result.message += ' (Leak Check Limited)';
                }
            }

            // 3.2 Hint Verification (Context-Awareness)
            if (hint) {
                const normalizedHint = hint.toUpperCase();

                // Heuristic Mismatches
                if (normalizedHint.includes('GROQ') && adapter.id === 'gemini') {
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

        return NextResponse.json({ payload: encryptedResult, isEncrypted: true });

    } catch (error) {
        console.error('Handler error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

// --- Helpers ---

function calculateEntropy(str: string): number {
    const len = str.length;
    const frequencies = new Map<string, number>();

    for (const char of str) {
        frequencies.set(char, (frequencies.get(char) || 0) + 1);
    }

    let entropy = 0;
    for (const count of Array.from(frequencies.values())) {
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
