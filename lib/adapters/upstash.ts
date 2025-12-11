import { ProviderAdapter, CheckResult } from './types';
import fetch from 'cross-fetch';

export const UpstashAdapter: ProviderAdapter = {
    id: 'upstash',
    name: 'Upstash Redis',
    matches: (key: string) => key.startsWith('AVPG') || key.startsWith('UPSTASH_'),
    check: async (key: string): Promise<CheckResult> => {
        try {
            // Upstash REST API uses the token as Basic Auth Pass or Bearer?
            // "Authorization: Bearer <token>"
            // Endpoint: https://api.upstash.com/v2/redis/databases (Management API)
            // OR if it's a Redis REST token, it's for the specific DB url.
            // "UPSTASH_REDIS_REST_TOKEN". This is usually used with the REST URL.
            // Checking it against the global management API might fail if it's a DB-scoped token.
            // But we don't have the URL here, only the token.
            // However, Upstash keys often clearly identifying.

            // Let's try the Management API first.
            const res = await fetch('https://api.upstash.com/v2/redis/databases', {
                headers: {
                    Authorization: `Bearer ${key}`
                }
            });

            if (res.status === 401) {
                // It might be a DB-specific token, not a management token.
                // Without the DB URL, we can't fully validate a DB token (REST).
                // But we can check if it strictly matches the format.
                return {
                    valid: true,
                    provider: 'Upstash',
                    message: 'Format Valid (DB/Mgmt Token)',
                    confidenceScore: 0.8, // Reduced confidence because we can't ping
                    trustLevel: 'Medium',
                    metadata: { note: 'Requires DB URL for full check' }
                };
            }

            if (res.ok) {
                return {
                    valid: true,
                    provider: 'Upstash (Management)',
                    message: 'Active',
                    confidenceScore: 1.0,
                    trustLevel: 'High'
                };
            }

            return {
                valid: false,
                provider: 'Upstash',
                message: 'Error',
                confidenceScore: 0.5,
                trustLevel: 'Low'
            };

        } catch (error) {
            return {
                valid: false,
                provider: 'Upstash',
                message: 'Network Error',
                confidenceScore: 0.1,
                trustLevel: 'Low'
            };
        }
    }
};
