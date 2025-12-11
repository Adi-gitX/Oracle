import { ProviderAdapter, CheckResult } from './types';

export const AWSAdapter: ProviderAdapter = {
    id: 'aws',
    name: 'AWS',
    matches: (key: string) => key.startsWith('AKIA'),
    check: async (key: string): Promise<CheckResult> => {
        // AWS Format Validation only
        // AKIA is 20 chars long, usually.
        if (key.length === 20 && /^[A-Z0-9]+$/.test(key)) {
            return {
                valid: true,
                provider: 'AWS',
                message: 'Format Valid (Access Key ID)',
                confidenceScore: 0.9,
                trustLevel: 'Medium',
                metadata: { note: 'Requires Secret Key to fully validate' }
            };
        }

        return {
            valid: false,
            provider: 'AWS',
            message: 'Invalid Format',
            confidenceScore: 0.8,
            trustLevel: 'Low'
        };
    }
};
