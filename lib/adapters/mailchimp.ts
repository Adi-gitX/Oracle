import { ProviderAdapter, CheckResult } from './types';
import fetch from 'cross-fetch';

export const MailChimpAdapter: ProviderAdapter = {
    id: 'mailchimp',
    name: 'MailChimp',
    matches: (key: string) => /-[a-z]{2}\d+$/.test(key), // Ends in -us21, -us5 etc
    check: async (key: string): Promise<CheckResult> => {
        try {
            // Format: genericstring-dc
            // DC is required for URL
            const parts = key.split('-');
            const dc = parts[parts.length - 1];

            const encoded = Buffer.from(`anystring:${key}`).toString('base64');
            const res = await fetch(`https://${dc}.api.mailchimp.com/3.0/`, {
                headers: {
                    Authorization: `Basic ${encoded}`
                }
            });

            if (res.status === 401) {
                return {
                    valid: false,
                    provider: 'MailChimp',
                    message: 'Invalid API Key',
                    confidenceScore: 1.0,
                    trustLevel: 'Low'
                };
            }

            if (res.ok) {
                const data = await res.json();
                return {
                    valid: true,
                    provider: 'MailChimp',
                    message: `Active (${data.account_name})`,
                    metadata: { role: data.role },
                    confidenceScore: 1.0,
                    trustLevel: 'High'
                };
            }

            return {
                valid: false,
                provider: 'MailChimp',
                message: 'Error',
                confidenceScore: 0.5,
                trustLevel: 'Low'
            };

        } catch (error) {
            return {
                valid: false,
                provider: 'MailChimp',
                message: 'Network Error',
                confidenceScore: 0.1,
                trustLevel: 'Low'
            };
        }
    }
};
