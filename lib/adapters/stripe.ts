import { ProviderAdapter, CheckResult } from './types';
import fetch from 'cross-fetch';

export const StripeAdapter: ProviderAdapter = {
    id: 'stripe',
    name: 'Stripe / Clerk',
    matches: (key: string) => key.startsWith('sk_live_') || key.startsWith('sk_test_'),
    check: async (key: string): Promise<CheckResult> => {
        try {
            // 1. Try Stripe
            const encoded = Buffer.from(key + ':').toString('base64');
            const res = await fetch('https://api.stripe.com/v1/charges?limit=1', {
                headers: {
                    Authorization: `Basic ${encoded}`
                }
            });

            if (res.ok) {
                return {
                    valid: true,
                    provider: 'Stripe',
                    message: key.startsWith('sk_live_') ? 'Active (Live)' : 'Active (Test)',
                    premium: key.startsWith('sk_live_'),
                    confidenceScore: 1.0,
                    trustLevel: 'High'
                };
            }

            // 2. If Stripe fails (401), Try Clerk
            // Clerk Secret Keys also start with sk_test/live
            if (res.status === 401) {
                try {
                    const clerkRes = await fetch('https://api.clerk.com/v1/jwks', {
                        headers: {
                            Authorization: `Bearer ${key}`
                        }
                    });

                    if (clerkRes.ok) {
                        return {
                            valid: true,
                            provider: 'Clerk',
                            message: 'Active',
                            confidenceScore: 1.0,
                            trustLevel: 'High'
                        };
                    }
                } catch (e) {
                    // Ignore clerk error and return Stripe invalid
                }
            }

            if (res.status === 401) {
                return {
                    valid: false,
                    provider: 'Stripe / Clerk',
                    message: 'Invalid API Key',
                    confidenceScore: 1.0,
                    trustLevel: 'Low'
                };
            }

            if (res.status === 403) {
                return {
                    valid: true,
                    provider: 'Stripe',
                    message: 'Active (Restricted Scope)',
                    confidenceScore: 1.0,
                    trustLevel: 'Medium'
                };
            }

            const data = await res.json();
            if (data.error) {
                return {
                    valid: false,
                    provider: 'Stripe',
                    message: data.error.message || 'Error',
                    confidenceScore: 0.9,
                    trustLevel: 'Low'
                };
            }

            return {
                valid: false,
                provider: 'Stripe',
                message: 'Unknown Error',
                confidenceScore: 0.5,
                trustLevel: 'Low'
            };

        } catch (error) {
            return {
                valid: false,
                provider: 'Stripe',
                message: 'Network Error',
                confidenceScore: 0.1,
                trustLevel: 'Low'
            };
        }
    }
};
