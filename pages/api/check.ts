import type { NextApiRequest, NextApiResponse } from 'next';
import { decryptData, encryptData, isEncryptionAvailable } from '../../utils/encryption';
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
import { GenericSecretAdapter } from '../../lib/adapters/generic';
import { ProviderAdapter, CheckResult } from '../../lib/adapters/types';

interface CheckRequestBody {
    key?: string;
    hint?: string;
    providerHint?: string | Record<string, unknown>;
    isEncrypted?: boolean;
    payload?: string;
    preferEncrypted?: boolean;
}

export const Adapters: ProviderAdapter[] = [
    OpenAIAdapter,
    AnthropicAdapter,
    GoogleAdapter,
    StripeAdapter,
    CohereAdapter,
    HuggingFaceAdapter,
    MistralAdapter,
    GroqAdapter,
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
    AWSAdapter,
    SupabaseAdapter,
    ClerkAdapter,
    DatabaseAdapter,
    CloudinaryAdapter,
    ResendAdapter,
    UpstashAdapter,
    PusherAdapter,
    GenericSecretAdapter
];

export const AMBIGUOUS_ADAPTER_IDS = new Set([
    'cohere',
    'mistral',
    'shodan',
    'bitly',
    'generic_secret'
]);

const HINT_KEYWORDS: Array<{ keyword: string; id: string }> = [
    { keyword: 'OPENAI', id: 'openai' },
    { keyword: 'ANTHROPIC', id: 'anthropic' },
    { keyword: 'GOOGLE', id: 'google' },
    { keyword: 'GEMINI', id: 'google' },
    { keyword: 'FIREBASE', id: 'google' },
    { keyword: 'GROQ', id: 'groq' },
    { keyword: 'COHERE', id: 'cohere' },
    { keyword: 'MISTRAL', id: 'mistral' },
    { keyword: 'HUGGINGFACE', id: 'huggingface' },
    { keyword: 'HF', id: 'huggingface' },
    { keyword: 'STRIPE', id: 'stripe' },
    { keyword: 'CLERK', id: 'clerk' },
    { keyword: 'GITHUB', id: 'github' },
    { keyword: 'GITLAB', id: 'gitlab' },
    { keyword: 'SLACK', id: 'slack' },
    { keyword: 'SENDGRID', id: 'sendgrid' },
    { keyword: 'TELEGRAM', id: 'telegram' },
    { keyword: 'MAPBOX', id: 'mapbox' },
    { keyword: 'NPM', id: 'npm' },
    { keyword: 'HEROKU', id: 'heroku' },
    { keyword: 'SHODAN', id: 'shodan' },
    { keyword: 'TWILIO', id: 'twilio' },
    { keyword: 'MAILGUN', id: 'mailgun' },
    { keyword: 'MAILCHIMP', id: 'mailchimp' },
    { keyword: 'BITLY', id: 'bitly' },
    { keyword: 'AWS', id: 'aws' },
    { keyword: 'SUPABASE', id: 'supabase' },
    { keyword: 'DATABASE', id: 'database' },
    { keyword: 'CLOUDINARY', id: 'cloudinary' },
    { keyword: 'RESEND', id: 'resend' },
    { keyword: 'UPSTASH', id: 'upstash' },
    { keyword: 'PUSHER', id: 'pusher' }
];

const encryptionReady = () => isEncryptionAvailable();

function normalizeVerification(result: CheckResult): CheckResult {
    const warnings = Array.isArray(result.warnings) ? [...result.warnings] : [];

    if (typeof result.metadata?.warning === 'string') {
        warnings.push(result.metadata.warning);
    }

    return {
        ...result,
        verificationLevel: result.verificationLevel || (result.valid ? 'verified' : 'unknown'),
        warnings
    };
}

export function parseHintIds(hint: unknown): Set<string> {
    const ids = new Set<string>();
    const candidates: string[] = [];

    if (typeof hint === 'string') {
        candidates.push(hint);
    } else if (hint && typeof hint === 'object') {
        const raw = hint as Record<string, unknown>;
        for (const key of ['provider', 'id', 'name', 'label', 'source', 'variableName']) {
            const value = raw[key];
            if (typeof value === 'string' && value.trim().length > 0) {
                candidates.push(value);
            }
        }
    }

    for (const value of candidates) {
        const normalized = value.toUpperCase();
        for (const item of HINT_KEYWORDS) {
            if (normalized.includes(item.keyword)) {
                ids.add(item.id);
            }
        }

        const direct = value.trim().toLowerCase();
        if (Adapters.some((adapter) => adapter.id === direct)) {
            ids.add(direct);
        }
    }

    return ids;
}

export function pickAdapter(matches: ProviderAdapter[], hintIds: Set<string>): ProviderAdapter | null {
    if (matches.length === 0) return null;

    const hintedMatches = matches.filter((adapter) => hintIds.has(adapter.id));
    if (hintedMatches.length === 1) {
        return hintedMatches[0];
    }

    if (matches.length === 1) {
        const only = matches[0];
        if (AMBIGUOUS_ADAPTER_IDS.has(only.id) && hintIds.size === 0) {
            return null;
        }
        return only;
    }

    const nonAmbiguous = matches.filter((adapter) => !AMBIGUOUS_ADAPTER_IDS.has(adapter.id));
    if (nonAmbiguous.length === 1) {
        return nonAmbiguous[0];
    }

    return null;
}

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
        'your_api_key',
        'your-api-key',
        'insert_key_here',
        'replace_me',
        'example_key',
        'my_secret_key',
        '123456789',
        'abcdefgh'
    ];
    return placeholders.some((p) => lower.includes(p));
}

function apiError(
    res: NextApiResponse,
    status: number,
    code: string,
    message: string,
    details?: Record<string, unknown>
): void {
    res.status(status).json({
        message,
        error: { code, message, ...(details || {}) }
    });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return apiError(res, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
    }

    try {
        const body = (req.body || {}) as CheckRequestBody;
        const rawHint = body.providerHint || body.hint;
        const hintIds = parseHintIds(rawHint);

        let finalKey: string | null = null;

        if (body.isEncrypted) {
            if (!encryptionReady()) {
                return apiError(res, 400, 'ENCRYPTION_UNAVAILABLE', 'Encryption Error: key not configured');
            }

            try {
                const encryptedKey = body.key || body.payload || '';
                const decrypted = decryptData(encryptedKey);
                const parsed = JSON.parse(decrypted);

                if (!parsed?.content || !parsed?.timestamp) {
                    return apiError(res, 400, 'INVALID_PAYLOAD', 'Invalid Payload Schema');
                }

                const now = Date.now();
                if (now - Number(parsed.timestamp) > 60000) {
                    return apiError(res, 400, 'REPLAY_PROTECTION', 'Request Expired (Replay Protection)');
                }

                finalKey = String(parsed.content);
            } catch {
                return apiError(res, 400, 'ENCRYPTION_ERROR', 'Encryption Error');
            }
        } else {
            finalKey = body.key || body.payload || null;
        }

        if (typeof finalKey !== 'string' || finalKey.length === 0) {
            return apiError(res, 400, 'MISSING_KEY', 'Missing Key');
        }

        const keyToCheck = finalKey;

        if (keyToCheck.length > 2048) {
            return apiError(res, 400, 'INPUT_TOO_LONG', 'Input Too Long');
        }

        if (isPlaceholder(keyToCheck)) {
            return apiError(res, 400, 'PLACEHOLDER_KEY', 'Detected Placeholder Key');
        }

        const entropy = calculateEntropy(keyToCheck);
        if (keyToCheck.length > 16 && entropy < 2.5) {
            return apiError(res, 400, 'LOW_ENTROPY', 'Low Entropy (Likely Fake/Weak)');
        }

        const matchingAdapters = Adapters.filter((adapter) => adapter.matches(keyToCheck));
        const adapter = pickAdapter(matchingAdapters, hintIds);

        let result: CheckResult;

        if (!adapter) {
            const ambiguousProvider = matchingAdapters.length > 0
                ? `Ambiguous: ${matchingAdapters.map((a) => a.name).join(', ')}`
                : 'Unknown';

            result = {
                valid: false,
                provider: ambiguousProvider,
                message: matchingAdapters.length > 0
                    ? 'Ambiguous Key Format. Add a provider hint for strict verification.'
                    : 'Unknown Key Format',
                verificationLevel: matchingAdapters.length > 0 ? 'format_only' : 'unknown',
                warnings: matchingAdapters.length > 0
                    ? ['Provide providerHint/hint to resolve ambiguous key formats.']
                    : [],
                confidenceScore: 0.0,
                trustLevel: 'Low'
            };
        } else {
            result = normalizeVerification(await adapter.check(keyToCheck));

            if (hintIds.size > 0 && !hintIds.has(adapter.id)) {
                const mismatch = `Input hint did not match detected provider (${adapter.name}).`;
                result.warnings = [...(result.warnings || []), mismatch];
                result.metadata = { ...result.metadata, warning: mismatch };
            }

            if (typeof rawHint === 'string') {
                const normalizedHint = rawHint.toUpperCase();
                if (normalizedHint.includes('GROQ') && adapter.id === 'google') {
                    result.provider = 'Google (Labeled Groq)';
                    result.warnings = [
                        ...(result.warnings || []),
                        'This key matches Google format, not Groq (gsk_...).'
                    ];
                }
            }

            if (result.valid && result.verificationLevel === 'verified') {
                const leakStatus = await checkLeak(keyToCheck);
                if (leakStatus === 'skipped') {
                    result.warnings = [
                        ...(result.warnings || []),
                        'Leak check skipped to avoid sending raw secrets to third parties.'
                    ];
                }
            }
        }

        const wantsEncryptedResponse = Boolean(body.isEncrypted || body.preferEncrypted);
        if (wantsEncryptedResponse && encryptionReady()) {
            const encryptedResult = encryptData(JSON.stringify(result));
            return res.status(200).json({ payload: encryptedResult, isEncrypted: true });
        }

        return res.status(200).json(result);
    } catch {
        return apiError(res, 500, 'INTERNAL_ERROR', 'Internal Server Error');
    }
}
