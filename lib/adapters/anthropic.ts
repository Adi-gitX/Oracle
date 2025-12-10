import { ProviderAdapter, CheckResult } from './types';
import fetch from 'cross-fetch';

export const AnthropicAdapter: ProviderAdapter = {
    id: 'anthropic',
    name: 'Anthropic',
    matches: (key: string) => key.startsWith('sk-ant'),
    check: async (key: string): Promise<CheckResult> => {
        try {
            const res = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'x-api-key': key,
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'claude-3-haiku-20240307',
                    max_tokens: 1,
                    messages: [{ role: 'user', content: 'Hi' }]
                })
            });

            if (res.status === 401 || res.status === 403) {
                return {
                    valid: false,
                    provider: 'Anthropic',
                    message: 'Invalid API Key',
                    confidenceScore: 1.0,
                    trustLevel: 'Low'
                };
            }

            if (res.ok) {
                return {
                    valid: true,
                    provider: 'Anthropic',
                    premium: true,
                    message: 'Active',
                    models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'], // Checking allows access to all standard models
                    confidenceScore: 1.0,
                    trustLevel: 'High'
                };
            }

            const errData = await res.json();
            return {
                valid: false,
                provider: 'Anthropic',
                message: errData.error?.message || res.statusText,
                confidenceScore: 0.9,
                trustLevel: 'Low'
            };
        } catch (error) {
            return {
                valid: false,
                provider: 'Anthropic',
                message: 'Network Error',
                confidenceScore: 0.1,
                trustLevel: 'Low'
            };
        }
    }
};
