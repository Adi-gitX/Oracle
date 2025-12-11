import { ProviderAdapter, CheckResult } from './types';
import fetch from 'cross-fetch';

export const HerokuAdapter: ProviderAdapter = {
    id: 'heroku',
    name: 'Heroku',
    matches: (key: string) => /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(key) || key.length === 36,
    check: async (key: string): Promise<CheckResult> => {
        try {
            const res = await fetch('https://api.heroku.com/apps', {
                headers: {
                    'Accept': 'application/vnd.heroku+json; version=3',
                    'Authorization': `Bearer ${key}`
                }
            });

            if (res.status === 401) {
                return {
                    valid: false,
                    provider: 'Heroku',
                    message: 'Invalid API Key',
                    confidenceScore: 1.0,
                    trustLevel: 'Low'
                };
            }

            if (res.status === 403) {
                return {
                    valid: false,
                    provider: 'Heroku',
                    message: 'Leaked Key - Inactive',
                    confidenceScore: 1.0,
                    trustLevel: 'Low'
                };
            }

            if (!res.ok) {
                return {
                    valid: false,
                    provider: 'Heroku',
                    message: `Error: ${res.statusText}`,
                    confidenceScore: 0.8,
                    trustLevel: 'Low'
                };
            }

            const data = await res.json();
            const appCount = Array.isArray(data) ? data.length : 0;
            return {
                valid: true,
                provider: 'Heroku',
                message: `Active (${appCount} apps)`,
                confidenceScore: 1.0,
                trustLevel: 'High'
            };

        } catch (error) {
            return {
                valid: false,
                provider: 'Heroku',
                message: 'Network Error',
                confidenceScore: 0.1,
                trustLevel: 'Low'
            };
        }
    }
};
