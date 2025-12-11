import { ProviderAdapter, CheckResult } from './types';
import fetch from 'cross-fetch';

export const CohereAdapter: ProviderAdapter = {
    id: 'cohere',
    name: 'Cohere',
    matches: (key: string) => key.length === 40,
    check: async (key: string): Promise<CheckResult> => {
        try {
            const res = await fetch('https://api.cohere.com/v1/check-api-key', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${key}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });

            if (res.status === 401) {
                return {
                    valid: false,
                    provider: 'Cohere',
                    message: 'Invalid API Key',
                    confidenceScore: 1.0,
                    trustLevel: 'Low'
                };
            }

            if (res.status === 403) {
                return {
                    valid: false,
                    provider: 'Cohere',
                    message: 'Leaked Key - Inactive',
                    confidenceScore: 1.0,
                    trustLevel: 'Low'
                };
            }

            if (!res.ok) {
                return {
                    valid: false,
                    provider: 'Cohere',
                    message: `Error: ${res.statusText}`,
                    confidenceScore: 0.8,
                    trustLevel: 'Low'
                };
            }

            const data = await res.json();
            return {
                valid: true,
                provider: 'Cohere',
                message: data.valid ? 'Active' : 'Inactive',
                confidenceScore: 1.0,
                trustLevel: 'High'
            };

        } catch (error) {
            return {
                valid: false,
                provider: 'Cohere',
                message: 'Network Error',
                confidenceScore: 0.1,
                trustLevel: 'Low'
            };
        }
    }
};
