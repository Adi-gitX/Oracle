import { ProviderAdapter, CheckResult } from './types';

export const CloudinaryAdapter: ProviderAdapter = {
    id: 'cloudinary',
    name: 'Cloudinary',
    matches: (key: string) => key.startsWith('cloudinary://') || /^[0-9]{15}$/.test(key),
    check: async (key: string): Promise<CheckResult> => {
        if (/^[0-9]{15}$/.test(key)) {
            return {
                valid: true,
                provider: 'Cloudinary',
                message: 'Format Valid (API Key)',
                confidenceScore: 0.8,
                trustLevel: 'Medium',
                metadata: { note: 'Requires Secret for full access' }
            };
        }

        if (key.startsWith('cloudinary://')) {
            return {
                valid: true,
                provider: 'Cloudinary',
                message: 'Format Valid (Connection String)',
                confidenceScore: 0.9,
                trustLevel: 'Medium'
            };
        }

        return {
            valid: false,
            provider: 'Cloudinary',
            message: 'Invalid Format',
            confidenceScore: 0.0,
            trustLevel: 'Low'
        };
    }
};
