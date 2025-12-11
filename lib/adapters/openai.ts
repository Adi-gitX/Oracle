import { ProviderAdapter, CheckResult } from './types';
import fetch from 'cross-fetch';

export const OpenAIAdapter: ProviderAdapter = {
    id: 'openai',
    name: 'OpenAI',
    matches: (key: string) => key.startsWith('sk-') || key.startsWith('sk-proj-'),
    check: async (key: string): Promise<CheckResult> => {
        try {
            const res = await fetch('https://api.openai.com/v1/models', {
                headers: { Authorization: `Bearer ${key}` },
            });

            if (res.status === 401) {
                return {
                    valid: false,
                    provider: 'OpenAI',
                    message: 'Invalid API Key',
                    confidenceScore: 1.0,
                    trustLevel: 'Low'
                };
            }

            if (res.status === 403) {
                return {
                    valid: false,
                    provider: 'OpenAI',
                    message: 'Leaked Key - Inactive',
                    confidenceScore: 1.0,
                    trustLevel: 'Low'
                };
            }

            if (res.status === 429) {
                return {
                    valid: true,
                    provider: 'OpenAI',
                    message: 'Active (Quota Exhausted)',
                    confidenceScore: 1.0,
                    trustLevel: 'High',
                    metadata: { note: 'Valid key but rate limit exceeded' }
                };
            }

            if (!res.ok) {
                return {
                    valid: false,
                    provider: 'OpenAI',
                    message: `Error: ${res.statusText}`,
                    confidenceScore: 0.8,
                    trustLevel: 'Low'
                };
            }

            const data = await res.json();
            const models = data.data.map((m: any) => m.id);
            const gpt4 = models.some((m: string) => m.includes('gpt-4'));

            return {
                valid: true,
                provider: 'OpenAI',
                premium: gpt4,
                message: gpt4 ? 'Active (GPT-4)' : 'Active',
                confidenceScore: 1.0,
                trustLevel: 'High'
            };
        } catch (error) {
            return {
                valid: false,
                provider: 'OpenAI',
                message: 'Network Error',
                confidenceScore: 0.1,
                trustLevel: 'Low'
            };
        }
    }
};
