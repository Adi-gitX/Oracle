import { ProviderAdapter, CheckResult } from './types';
import fetch from 'cross-fetch';

export const GitLabAdapter: ProviderAdapter = {
    id: 'gitlab',
    name: 'GitLab',
    matches: (key: string) => key.startsWith('glpat-') || key.length === 20,
    check: async (key: string): Promise<CheckResult> => {
        try {
            const res = await fetch('https://gitlab.com/api/v4/user', {
                headers: {
                    'PRIVATE-TOKEN': key
                }
            });

            if (res.status === 401) {
                return {
                    valid: false,
                    provider: 'GitLab',
                    message: 'Invalid API Key',
                    confidenceScore: 1.0,
                    trustLevel: 'Low'
                };
            }

            if (res.status === 403) {
                return {
                    valid: false,
                    provider: 'GitLab',
                    message: 'Leaked Key - Inactive',
                    confidenceScore: 1.0,
                    trustLevel: 'Low'
                };
            }

            if (!res.ok) {
                return {
                    valid: false,
                    provider: 'GitLab',
                    message: `Error: ${res.statusText}`,
                    confidenceScore: 0.8,
                    trustLevel: 'Low'
                };
            }

            const data = await res.json();
            return {
                valid: true,
                provider: 'GitLab',
                message: `Active (${data.username})`,
                confidenceScore: 1.0,
                trustLevel: 'High'
            };

        } catch (error) {
            return {
                valid: false,
                provider: 'GitLab',
                message: 'Network Error',
                confidenceScore: 0.1,
                trustLevel: 'Low'
            };
        }
    }
};
