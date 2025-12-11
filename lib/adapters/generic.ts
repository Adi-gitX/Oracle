
import { ProviderAdapter, CheckResult } from './types';

export const GenericSecretAdapter: ProviderAdapter = {
    id: 'generic_secret',
    name: 'Generic Secret',
    matches: (key: string) => {
        // Match high efficacy secrets (32+ chars, mixed case/numbers/symbols)
        // Only if not matched by others (since this is last)
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
