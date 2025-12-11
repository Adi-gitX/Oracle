import { ProviderAdapter, CheckResult } from './types';
import fetch from 'cross-fetch';

export const BitlyAdapter: ProviderAdapter = {
    id: 'bitly',
    name: 'Bitly',
    matches: (key: string) => /^[a-f0-9]{40}$/.test(key), // 40 char hex usually generic info
    check: async (key: string): Promise<CheckResult> => {
        try {
            const res = await fetch('https://api-ssl.bitly.com/v4/user', {
                headers: {
                    Authorization: `Bearer ${key}`
                }
            });

            if (res.status === 401 || res.status === 403) {
                return {
                    valid: false,
                    provider: 'Bitly',
                    message: 'Invalid API Key',
                    confidenceScore: 1.0,
                    trustLevel: 'Low'
                };
            }

            if (res.ok) {
                const data = await res.json();
                return {
                    valid: true,
                    provider: 'Bitly',
                    message: `Active (${data.name})`,
                    premium: data.is_active,
                    confidenceScore: 1.0,
                    trustLevel: 'High'
                };
            }

            return {
                valid: false,
                provider: 'Bitly',
                message: 'Error',
                confidenceScore: 0.5,
                trustLevel: 'Low'
            };

        } catch (error) {
            return {
                valid: false,
                provider: 'Bitly',
                message: 'Network Error',
                confidenceScore: 0.1,
                trustLevel: 'Low'
            };
        }
    }
};
