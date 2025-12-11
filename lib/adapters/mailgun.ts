import { ProviderAdapter, CheckResult } from './types';
import fetch from 'cross-fetch';

export const MailgunAdapter: ProviderAdapter = {
    id: 'mailgun',
    name: 'Mailgun',
    matches: (key: string) => key.startsWith('key-') || key.startsWith('api:key-'),
    check: async (key: string): Promise<CheckResult> => {
        try {
            // Handle "api:key-..." or just "key-..."
            let authStr = key;
            if (!key.startsWith('api:')) {
                authStr = `api:${key}`;
            }

            const encoded = Buffer.from(authStr).toString('base64');
            // Using a generic endpoint like domains list
            const res = await fetch('https://api.mailgun.net/v3/domains', {
                headers: {
                    Authorization: `Basic ${encoded}`
                }
            });

            if (res.status === 401) {
                return {
                    valid: false,
                    provider: 'Mailgun',
                    message: 'Invalid API Key',
                    confidenceScore: 1.0,
                    trustLevel: 'Low'
                };
            }

            if (res.ok) {
                const data = await res.json();
                const count = data.items ? data.items.length : 0;
                return {
                    valid: true,
                    provider: 'Mailgun',
                    message: `Active (${count} domains)`,
                    confidenceScore: 1.0,
                    trustLevel: 'High'
                };
            }

            return {
                valid: false,
                provider: 'Mailgun',
                message: 'Error',
                confidenceScore: 0.5,
                trustLevel: 'Low'
            };

        } catch (error) {
            return {
                valid: false,
                provider: 'Mailgun',
                message: 'Network Error',
                confidenceScore: 0.1,
                trustLevel: 'Low'
            };
        }
    }
};
