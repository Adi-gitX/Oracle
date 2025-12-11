import { ProviderAdapter, CheckResult } from './types';
import fetch from 'cross-fetch';

export const AnthropicAdapter: ProviderAdapter = {
    id: 'anthropic',
    name: 'Anthropic',
    matches: (key: string) => key.startsWith('sk-ant-'),
    check: async (key: string): Promise<CheckResult> => {
        try {
            const res = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'x-api-key': key,
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    max_tokens: 1,
                    messages: [{ role: 'user', content: 'test' }],
                    model: 'claude-sonnet-4.5' // Latest stable model as of 2025 (Claude 3.5 retired Oct 2025)
                }),
            });

            if (res.status === 401) {
                return {
                    valid: false,
                    provider: 'Anthropic',
                    message: 'Invalid API Key',
                    confidenceScore: 1.0,
                    trustLevel: 'Low'
                };
            }

            if (res.status === 403) {
                return {
                    valid: false,
                    provider: 'Anthropic',
                    message: 'Leaked Key - Inactive',
                    confidenceScore: 1.0,
                    trustLevel: 'Low'
                };
            }

            // Anthropic returns 400 for valid keys but invalid request body (sometimes).
            // But here we sent a valid body. If we lack credits, it might be 400 or 402 or 429.
            // 402 = Payment Required (Credits exhausted but key valid). 
            // Users usually want to know if it works. 402 means "Active but Empty".
            if (res.status === 402) {
                return {
                    valid: true,
                    provider: 'Anthropic',
                    message: 'Active (No Credits)',
                    confidenceScore: 1.0,
                    trustLevel: 'Medium'
                };
            }

            if (res.status === 429) {
                return {
                    valid: true,
                    provider: 'Anthropic',
                    message: 'Active (Quota Exhausted)',
                    confidenceScore: 1.0,
                    trustLevel: 'High',
                    metadata: { note: 'Valid key but rate limit exceeded' }
                };
            }

            if (!res.ok) {
                return {
                    valid: false,
                    provider: 'Anthropic',
                    message: `Error: ${res.statusText}`,
                    confidenceScore: 0.8,
                    trustLevel: 'Low'
                };
            }

            return {
                valid: true,
                provider: 'Anthropic',
                message: 'Active',
                confidenceScore: 1.0,
                trustLevel: 'High'
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
