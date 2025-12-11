import { ProviderAdapter, CheckResult } from './types';
import fetch from 'cross-fetch';

export const ShodanAdapter: ProviderAdapter = {
    id: 'shodan',
    name: 'Shodan',
    matches: (key: string) => key.length === 32,
    check: async (key: string): Promise<CheckResult> => {
        try {
            const res = await fetch(`https://api.shodan.io/api-info?key=${key}`);

            if (res.status === 401) {
                return {
                    valid: false,
                    provider: 'Shodan',
                    message: 'Invalid API Key',
                    confidenceScore: 1.0,
                    trustLevel: 'Low'
                };
            }

            if (res.status === 403) {
                return {
                    valid: false,
                    provider: 'Shodan',
                    message: 'Leaked Key - Inactive',
                    confidenceScore: 1.0,
                    trustLevel: 'Low'
                };
            }

            const data = await res.json();

            if (res.ok && data.query_credits !== undefined) {
                return {
                    valid: true,
                    provider: 'Shodan',
                    message: `Active (${data.query_credits} credits)`,
                    premium: data.plan !== 'oss',
                    confidenceScore: 1.0,
                    trustLevel: 'High'
                };
            }

            return {
                valid: false,
                provider: 'Shodan',
                message: 'Error',
                confidenceScore: 0.5,
                trustLevel: 'Low'
            };

        } catch (error) {
            return {
                valid: false,
                provider: 'Shodan',
                message: 'Network Error',
                confidenceScore: 0.1,
                trustLevel: 'Low'
            };
        }
    }
};
