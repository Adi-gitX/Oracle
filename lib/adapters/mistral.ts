import { ProviderAdapter, CheckResult } from './types';
import fetch from 'cross-fetch';

export const MistralAdapter: ProviderAdapter = {
    id: 'mistral',
    name: 'Mistral AI',
    matches: (key: string) => key.length >= 32 && /^[a-z0-9]{32,}$/i.test(key) && !key.startsWith('sk-') && !key.startsWith('AIza'),
    check: async (key: string): Promise<CheckResult> => {
        try {
            const res = await fetch('https://api.mistral.ai/v1/models', {
                headers: {
                    Authorization: `Bearer ${key}`
                }
            });

            if (res.status === 401) {
                return {
                    valid: false,
                    provider: 'Mistral AI',
                    message: 'Invalid API Key',
                    confidenceScore: 1.0,
                    trustLevel: 'Low'
                };
            }

            if (res.status === 403) {
                return {
                    valid: false,
                    provider: 'Mistral AI',
                    message: 'Leaked Key - Inactive',
                    confidenceScore: 1.0,
                    trustLevel: 'Low'
                };
            }

            if (res.status === 429) {
                return {
                    valid: true,
                    provider: 'Mistral AI',
                    message: 'Active (Quota Exhausted)',
                    confidenceScore: 1.0,
                    trustLevel: 'High',
                    metadata: { note: 'Valid key but rate limit exceeded' }
                };
            }

            if (!res.ok) {
                return {
                    valid: false,
                    provider: 'Mistral AI',
                    message: `Error: ${res.statusText}`,
                    confidenceScore: 0.8,
                    trustLevel: 'Low'
                };
            }

            const data = await res.json();
            return {
                valid: true,
                provider: 'Mistral AI',
                message: 'Active',
                models: data.data.map((m: any) => m.id).slice(0, 5),
                confidenceScore: 1.0,
                trustLevel: 'High'
            };
        } catch (e) {
            return {
                valid: false,
                provider: 'Mistral AI',
                message: 'Network Error',
                confidenceScore: 0.1,
                trustLevel: 'Low'
            };
        }
    }
};
