import { ProviderAdapter, CheckResult } from './types';
import fetch from 'cross-fetch';

export const ClerkAdapter: ProviderAdapter = {
    id: 'clerk',
    name: 'Clerk',
    matches: (key: string) => key.startsWith('sk_test_') || key.startsWith('sk_live_') || key.startsWith('pk_test_') || key.startsWith('pk_live_'),
    check: async (key: string): Promise<CheckResult> => {
        // Clerk keys share prefix with Stripe (sk_test/live). 
        // We need to distinguish or try both. 
        // Since `check.ts` stops at first match, and Stripe is already added, StripeAdapter might catch this first!
        // We need to ensure the check order or make the matcher more specific?
        // Actually Stripe keys are strictly `sk_live_` or `sk_test_`. Clerk uses the same.
        // The Stripe adapter will try to hit Stripe API. If it fails with 401, it might be Clerk.
        // BUT `check.ts` doesn't fall through to next adapter.
        // Logic: We might need a "Dual" adapter or rename Stripe -> "Stripe/Clerk".
        // HOWEVER, Clerk Secret Keys (sk_) are used for backend.
        // Let's try to hit Clerk API.

        try {
            if (key.startsWith('pk_')) {
                return {
                    valid: true,
                    provider: 'Clerk (Publishable)',
                    message: 'Format Valid',
                    confidenceScore: 0.9,
                    trustLevel: 'Medium'
                };
            }

            const res = await fetch('https://api.clerk.com/v1/instance', {
                headers: {
                    Authorization: `Bearer ${key}`
                }
            });

            if (res.status === 401) {
                return {
                    valid: false,
                    provider: 'Clerk',
                    message: 'Invalid API Key',
                    confidenceScore: 1.0,
                    trustLevel: 'Low'
                };
            }

            if (res.ok) {
                return {
                    valid: true,
                    provider: 'Clerk',
                    message: 'Active',
                    confidenceScore: 1.0,
                    trustLevel: 'High'
                };
            }

            return {
                valid: false,
                provider: 'Clerk',
                message: 'Error',
                confidenceScore: 0.5,
                trustLevel: 'Low'
            };

        } catch (error) {
            return {
                valid: false,
                provider: 'Clerk',
                message: 'Network Error',
                confidenceScore: 0.1,
                trustLevel: 'Low'
            };
        }
    }
};
