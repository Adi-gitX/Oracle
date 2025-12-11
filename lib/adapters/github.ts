import { ProviderAdapter, CheckResult } from './types';
import fetch from 'cross-fetch';

export const GitHubAdapter: ProviderAdapter = {
    id: 'github',
    name: 'GitHub',
    matches: (key: string) => key.startsWith('ghp_') || key.startsWith('github_pat_'),
    check: async (key: string): Promise<CheckResult> => {
        try {
            const res = await fetch('https://api.github.com/user', {
                headers: {
                    Authorization: `token ${key}`
                }
            });

            if (res.status === 401) {
                return {
                    valid: false,
                    provider: 'GitHub',
                    message: 'Invalid API Key',
                    confidenceScore: 1.0,
                    trustLevel: 'Low'
                };
            }

            if (res.status === 403) {
                return {
                    valid: false,
                    provider: 'GitHub',
                    message: 'Leaked Key - Inactive', // Or Rate Limited, but following pattern
                    confidenceScore: 1.0,
                    trustLevel: 'Low'
                };
            }

            if (!res.ok) {
                return {
                    valid: false,
                    provider: 'GitHub',
                    message: `Error: ${res.statusText}`,
                    confidenceScore: 0.8,
                    trustLevel: 'Low'
                };
            }

            const data = await res.json();
            return {
                valid: true,
                provider: 'GitHub',
                message: `Active (${data.login})`,
                metadata: { scope: res.headers.get('x-oauth-scopes') || 'Unknown' },
                confidenceScore: 1.0,
                trustLevel: 'High'
            };

        } catch (error) {
            return {
                valid: false,
                provider: 'GitHub',
                message: 'Network Error',
                confidenceScore: 0.1,
                trustLevel: 'Low'
            };
        }
    }
};
