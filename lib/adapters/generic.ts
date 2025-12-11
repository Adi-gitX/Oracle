
import { ProviderAdapter, CheckResult } from './types';

export const GenericSecretAdapter: ProviderAdapter = {
    id: 'generic_secret',
    name: 'Generic Secret',
    matches: (key: string) => {
        // Exclude keys that look like malformed API keys from known providers
        // These should be caught by their specific adapters or marked invalid
        const looksLikeAPIKey =
            key.includes('Iza') ||  // Partial Google key
            key.startsWith('k-') || // Partial OpenAI  
            key.startsWith('sk-ant') || // Partial Anthropic
            key.startsWith('gsk') || // Partial Groq
            key.length === 40; // Many API keys are exactly 40 chars (Cohere, etc.)

        if (looksLikeAPIKey) return false;

        // Match high-entropy secrets (32+ chars, mixed case/numbers/symbols)
        // Only for things like NEXTAUTH_SECRET, database connection strings, etc.
        return key.length >= 32 && /[a-zA-Z0-9_\-=]+/.test(key);
    },
    check: async (key: string): Promise<CheckResult> => {
        // We cannot validate generic secrets, but we can acknowledge they look like secrets.
        return {
            valid: true,
            provider: 'Secret Key',
            message: 'Format Valid',
            confidenceScore: 0.5,
            trustLevel: 'Low',
            metadata: { note: 'Cannot verify ownership' }
        };
    }
};
