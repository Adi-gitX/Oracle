import { ProviderAdapter, CheckResult } from './types';
import fetch from 'cross-fetch';

export const OpenAIAdapter: ProviderAdapter = {
    id: 'openai',
    name: 'OpenAI',
    matches: (key: string) => key.startsWith('sk-'),
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
                    confidenceScore: 1.0, // We are 100% sure it's invalid
                    trustLevel: 'Low'
                };
            }

            if (!res.ok) {
                // Could be 429 (Quota) or 500
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
            const hasGPT4 = models.some((m: string) => m.includes('gpt-4'));

            return {
                valid: true,
                provider: 'OpenAI',
                models: models.slice(0, 10), // Increased from 5
                premium: hasGPT4,
                message: hasGPT4 ? 'GPT-4 Enabled' : 'GPT-3.5 Only',
                confidenceScore: 1.0,
                trustLevel: 'High'
            };
        } catch (error) {
            return {
                valid: false,
                provider: 'OpenAI',
                message: 'Network Error',
                confidenceScore: 0.1, // We couldn't verify
                trustLevel: 'Low'
            };
        }
    }
};
