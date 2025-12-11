import { ProviderAdapter, CheckResult } from './types';
import fetch from 'cross-fetch';

export const HuggingFaceAdapter: ProviderAdapter = {
    id: 'huggingface',
    name: 'HuggingFace',
    matches: (key: string) => key.startsWith('hf_'),
    check: async (key: string): Promise<CheckResult> => {
        try {
            const res = await fetch('https://huggingface.co/api/whoami-v2', {
                headers: {
                    Authorization: `Bearer ${key}`
                }
            });

            if (res.status === 401) {
                return {
                    valid: false,
                    provider: 'HuggingFace',
                    message: 'Invalid API Key',
                    confidenceScore: 1.0,
                    trustLevel: 'Low'
                };
            }

            if (res.status === 403) {
                return {
                    valid: false,
                    provider: 'HuggingFace',
                    message: 'Leaked Key - Inactive',
                    confidenceScore: 1.0,
                    trustLevel: 'Low'
                };
            }

            if (!res.ok) {
                return {
                    valid: false,
                    provider: 'HuggingFace',
                    message: `Error: ${res.statusText}`,
                    confidenceScore: 0.8,
                    trustLevel: 'Low'
                };
            }

            const data = await res.json();
            return {
                valid: true,
                provider: 'HuggingFace',
                message: `Active (${data.name})`,
                metadata: { type: data.type, email: data.email },
                confidenceScore: 1.0,
                trustLevel: 'High'
            };
        } catch (error) {
            return {
                valid: false,
                provider: 'HuggingFace',
                message: 'Network Error',
                confidenceScore: 0.1,
                trustLevel: 'Low'
            };
        }
    }
};
