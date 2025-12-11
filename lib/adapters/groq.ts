import { ProviderAdapter, CheckResult } from './types';
import fetch from 'cross-fetch';

export const GroqAdapter: ProviderAdapter = {
    id: 'groq',
    name: 'Groq',
    matches: (key: string) => key.startsWith('gsk_'),
    check: async (key: string): Promise<CheckResult> => {
        try {
            const res = await fetch('https://api.groq.com/openai/v1/models', {
                headers: {
                    Authorization: `Bearer ${key}`
                }
            });

            if (res.status === 401) {
                return {
                    valid: false,
                    provider: 'Groq',
                    message: 'Invalid API Key',
                    confidenceScore: 1.0,
                    trustLevel: 'Low'
                };
            }

            if (res.status === 403) {
                return {
                    valid: false,
                    provider: 'Groq',
                    message: 'Leaked Key - Inactive',
                    confidenceScore: 1.0,
                    trustLevel: 'Low'
                };
            }

            if (!res.ok) {
                return {
                    valid: false,
                    provider: 'Groq',
                    message: `Error: ${res.statusText}`,
                    confidenceScore: 0.8,
                    trustLevel: 'Low'
                };
            }

            const data = await res.json();
            return {
                valid: true,
                provider: 'Groq',
                message: 'Active',
                models: data.data.map((m: any) => m.id).slice(0, 5),
                confidenceScore: 1.0,
                trustLevel: 'High'
            };

        } catch (e) {
            return {
                valid: false,
                provider: 'Groq',
                message: 'Network Error',
                confidenceScore: 0.1,
                trustLevel: 'Low'
            };
        }
    }
};
