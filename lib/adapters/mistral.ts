import { ProviderAdapter, CheckResult } from './types';
import fetch from 'cross-fetch';

export const MistralAdapter: ProviderAdapter = {
    id: 'mistral',
    name: 'Mistral AI',
    matches: (key: string) => {
        // Conservative match, or relying on manual selection/check loop fallback
        return false;
    },
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
