import { ProviderAdapter, CheckResult } from './types';
import fetch from 'cross-fetch';

export const ResendAdapter: ProviderAdapter = {
    id: 'resend',
    name: 'Resend',
    matches: (key: string) => key.startsWith('re_'),
    check: async (key: string): Promise<CheckResult> => {
        try {
            const res = await fetch('https://api.resend.com/emails', {
                method: 'POST', // Resend doesn't have a simple GET 'whoami'. We can try to list domains or generic.
                // Actually, POST to /emails with invalid body might return 400 vs 401.
                // Better: GET /domains (requires domain permission).
                // Let's try GET /api/keys (not available).
                // Let's try GET /domains.
            });

            // Wait, standard GET /domains
            const domainsRes = await fetch('https://api.resend.com/domains', {
                headers: {
                    Authorization: `Bearer ${key}`
                }
            });

            if (domainsRes.status === 401 || domainsRes.status === 403) {
                return {
                    valid: false,
                    provider: 'Resend',
                    message: 'Invalid API Key',
                    confidenceScore: 1.0,
                    trustLevel: 'Low'
                };
            }

            if (domainsRes.ok) {
                return {
                    valid: true,
                    provider: 'Resend',
                    message: 'Active',
                    confidenceScore: 1.0,
                    trustLevel: 'High'
                };
            }

            // Rate limit check
            if (domainsRes.status === 429) {
                return {
                    valid: true,
                    provider: 'Resend',
                    message: 'Active (Rate Limited)',
                    confidenceScore: 1.0,
                    trustLevel: 'Medium'
                };
            }


            return {
                valid: false,
                provider: 'Resend',
                message: `Error: ${domainsRes.statusText}`,
                confidenceScore: 0.8,
                trustLevel: 'Low'
            };

        } catch (error) {
            return {
                valid: false,
                provider: 'Resend',
                message: 'Network Error',
                confidenceScore: 0.1,
                trustLevel: 'Low'
            };
        }
    }
};
