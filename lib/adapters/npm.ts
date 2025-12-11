import { ProviderAdapter, CheckResult } from './types';
import fetch from 'cross-fetch';

export const NPMAdapter: ProviderAdapter = {
    id: 'npm',
    name: 'NPM',
    matches: (key: string) => key.startsWith('npm_'),
    check: async (key: string): Promise<CheckResult> => {
        try {
            const res = await fetch('https://registry.npmjs.org/-/whoami', {
                headers: {
                    Authorization: `Bearer ${key}`
                }
            });

            if (res.status === 401) {
                return {
                    valid: false,
                    provider: 'NPM',
                    message: 'Invalid API Key',
                    confidenceScore: 1.0,
                    trustLevel: 'Low'
                };
            }

            if (res.status === 403) {
                return {
                    valid: false,
                    provider: 'NPM',
                    message: 'Leaked Key - Inactive',
                    confidenceScore: 1.0,
                    trustLevel: 'Low'
                };
            }

            if (res.ok) {
                const data = await res.json();
                return {
                    valid: true,
                    provider: 'NPM',
                    message: `Active (${data.username})`,
                    confidenceScore: 1.0,
                    trustLevel: 'High'
                };
            }

            return {
                valid: false,
                provider: 'NPM',
                message: 'Error',
                confidenceScore: 0.5,
                trustLevel: 'Low'
            };

        } catch (error) {
            return {
                valid: false,
                provider: 'NPM',
                message: 'Network Error',
                confidenceScore: 0.1,
                trustLevel: 'Low'
            };
        }
    }
};
