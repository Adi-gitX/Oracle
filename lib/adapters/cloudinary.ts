import { ProviderAdapter, CheckResult } from './types';

export const CloudinaryAdapter: ProviderAdapter = {
    id: 'cloudinary',
    name: 'Cloudinary',
    matches: (key: string) => key.startsWith('cloudinary://') || /^[0-9]{15}$/.test(key),
    check: async (key: string): Promise<CheckResult> => {
        if (/^[0-9]{15}$/.test(key)) {
            return {
                valid: false,
                provider: 'Cloudinary',
                message: 'Format Recognized (API Key)',
                verificationLevel: 'format_only',
                confidenceScore: 0.8,
                trustLevel: 'Medium',
                metadata: { note: 'Requires Secret for full access' }
            };
        }

        if (key.startsWith('cloudinary://')) {
            return {
                valid: false,
                provider: 'Cloudinary',
                message: 'Format Recognized (Connection String)',
                verificationLevel: 'format_only',
                confidenceScore: 0.9,
                trustLevel: 'Medium'
            };
        }

        return {
            valid: false,
            provider: 'Cloudinary',
            message: 'Invalid Format',
            verificationLevel: 'unknown',
            confidenceScore: 0.0,
            trustLevel: 'Low'
        };
    }
};
