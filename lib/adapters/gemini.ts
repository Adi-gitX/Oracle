import { ProviderAdapter, CheckResult } from './types';
import fetch from 'cross-fetch';

export const GeminiAdapter: ProviderAdapter = {
    id: 'gemini',
    name: 'Google Gemini',
    matches: (key: string) => key.startsWith('AIza'),
    check: async (key: string): Promise<CheckResult> => {
        try {
            // 1. Check Gemini (User's Primary Logic)
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);

            if (res.ok) {
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
            }

            // 2. Fallback: Firebase / Google Maps
            // If Gemini fails (400 Invalid or 403 Forbidden), it might be a valid Firebase or Maps key.
            // We check this silently to avoid false negatives for "AIza" keys that are just not Gemini enabled.

            if (res.status === 400 || res.status === 403) {
                try {
                    // Try Firebase (Identity Toolkit)
                    // Using createAuthUri as a safe-ish check.
                    const fbRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${key}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ identifier: "test@example.com", continueUri: "http://localhost" })
                    });
                    const fbData = await fbRes.json();

                    // If we get specific "API key not valid" error, then it's truly invalid.
                    // Any other error (like domain not authorized, missing email, etc) implies the KEY itself is valid.
                    const isInvalidKey = fbData.error && fbData.error.message.includes('API key not valid');

                    if (!isInvalidKey) {
                        return {
                            valid: true,
                            provider: 'Firebase / Google',
                            message: 'Active (Firebase)',
                            metadata: { note: 'Gemini access disabled' },
                            confidenceScore: 0.9,
                            trustLevel: 'Medium'
                        };
                    }

                } catch (e) {
                    // Ignore
                }
            }

            // Original Error Handling Preserved as Fallback
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
                return {
                    valid: false,
                    provider: 'Google Gemini',
                    message: 'Leaked Key - Inactive',
                    confidenceScore: 1.0,
                    trustLevel: 'Low'
                };
            }

            return {
                valid: false,
                provider: 'Google Gemini',
                message: `Error: ${res.statusText}`,
                confidenceScore: 0.8,
                trustLevel: 'Low'
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
