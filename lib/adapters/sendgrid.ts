import { ProviderAdapter, CheckResult } from './types';
import fetch from 'cross-fetch';

export const SendGridAdapter: ProviderAdapter = {
    id: 'sendgrid',
    name: 'SendGrid',
    matches: (key: string) => key.startsWith('SG.'),
    check: async (key: string): Promise<CheckResult> => {
        try {
            const res = await fetch('https://api.sendgrid.com/v3/scopes', {
                headers: {
                    Authorization: `Bearer ${key}`
                }
            });

            if (res.status === 401) {
                return {
                    valid: false,
                    provider: 'SendGrid',
                    message: 'Invalid API Key',
                    confidenceScore: 1.0,
                    trustLevel: 'Low'
                };
            }

            if (res.ok) {
                const data = await res.json();
                const scopes = data.scopes ? data.scopes.length : 0;
                return {
                    valid: true,
                    provider: 'SendGrid',
                    message: `Active (${scopes} scopes)`,
                    confidenceScore: 1.0,
                    trustLevel: 'High'
                };
            }

            return {
                valid: false,
                provider: 'SendGrid',
                message: 'Error',
                confidenceScore: 0.5,
                trustLevel: 'Low'
            };

        } catch (error) {
            return {
                valid: false,
                provider: 'SendGrid',
                message: 'Network Error',
                confidenceScore: 0.1,
                trustLevel: 'Low'
            };
        }
    }
};
