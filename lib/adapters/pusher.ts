import { ProviderAdapter, CheckResult } from './types';

export const PusherAdapter: ProviderAdapter = {
    id: 'pusher',
    name: 'Pusher',
    matches: (key: string) => /^[a-f0-9]{20}$/.test(key),
    check: async (key: string): Promise<CheckResult> => {
        // Pusher keys/secrets are 20 char hex.
        // We can't easily validate them without App ID or Cluster.
        // But we can identify the format.

        return {
            valid: true,
            provider: 'Pusher',
            message: 'Format Valid',
            confidenceScore: 0.7,
            trustLevel: 'Medium',
            metadata: { note: 'Format Check Only' }
        };
    }
};
