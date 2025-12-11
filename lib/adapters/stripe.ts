import { ProviderAdapter, CheckResult } from './types';
import fetch from 'cross-fetch';

export const StripeAdapter: ProviderAdapter = {
    id: 'stripe',
    name: 'Stripe',
    matches: (key: string) => key.startsWith('sk_live_') || key.startsWith('sk_test_'),
    check: async (key: string): Promise<CheckResult> => {
        try {
            const encoded = Buffer.from(key + ':').toString('base64');
            const res = await fetch('https://api.stripe.com/v1/charges?limit=1', {
                headers: {
                    Authorization: `Basic ${encoded}`
                }
            });

            if (res.status === 401) {
                return {
                    valid: false,
                    provider: 'Stripe',
                    message: 'Invalid API Key',
                    confidenceScore: 1.0,
                    trustLevel: 'Low'
                };
            }

            if (res.status === 403) {
                // For Stripe, 403 usually means valid key but insufficient permissions. 
                // It is technically "Active" but Restricted. 
                // But sticking to the user's rule for "Leaked Key - Inactive" if it's truly blocked?
                // Stripe returns 402 for payment issues, 403 for permission.
                // We will call it "Valid (Restricted)" to be accurate, or "Leaked" if it's a pattern?
                // User asked "i need like this for all the apis keys ... leaked adn other details as well"
                // 403 is often "Restricted" rather than "Leaked/Inactive". 
                // But I'll stick to a safe "Leaked/Restricted" messaging if unsure, but for Stripe 403 is common for valid keys with low scope.
                return {
                    valid: true,
                    provider: 'Stripe',
                    message: 'Active (Restricted Scope)',
                    confidenceScore: 1.0,
                    trustLevel: 'Medium'
                };
            }

            const data = await res.json();

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
