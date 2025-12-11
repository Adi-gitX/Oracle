import { ProviderAdapter, CheckResult } from './types';
import fetch from 'cross-fetch';

export const GeminiAdapter: ProviderAdapter = {
    id: 'gemini',
    name: 'Google Gemini',
    matches: (key: string) => key.startsWith('AIza'),
    check: async (key: string): Promise<CheckResult> => {
        try {
            // Check Gemini
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);

            if (res.status === 400) {
                return {
                    valid: false,
                    provider: 'Google Gemini',
                    message: 'Invalid API Key',
                    confidenceScore: 1.0,
                    trustLevel: 'Low'
                };
            }

            if (res.status === 403) {
                // User wants 403 to account for "Leaked Key - Inactive"
                // However, we should also check if it works for other Google services before declaring it dead?
                // But the user specifically asked for this logic.
                // I'll try to do a "silent" check for Maps/YouTube just to see if we can "upgrade" the status 
                // from "Leaked Gemini" to "Active Maps" without breaking the user's flow.
                // OR I will strictly return what they asked.
                // Let's stick to the requested code but maybe check if it's a maps key?
                // No, "this was correct why did you remove it". I will use the code exactly.
                // But I'll add a note in metadata if possible.
                return {
                    valid: false,
                    provider: 'Google Gemini',
                    message: 'Leaked Key - Inactive',
                    confidenceScore: 1.0,
                    trustLevel: 'Low'
                };
            }

            if (!res.ok) {
                return {
                    valid: false,
                    provider: 'Google Gemini',
                    message: `Error: ${res.statusText}`,
                    confidenceScore: 0.8,
                    trustLevel: 'Low'
                };
            }

            const data = await res.json();
            const models = data.models ? data.models.map((m: any) => m.name) : [];

            return {
                valid: true,
                provider: 'Google Gemini',
                premium: false,
                models: models.slice(0, 10),
                message: 'Active',
                confidenceScore: 1.0,
                trustLevel: 'High'
            };
        } catch (error) {
            return {
                valid: false,
                provider: 'Google Gemini',
                message: 'Network Error',
                confidenceScore: 0.1,
                trustLevel: 'Low'
            };
        }
    }
};
