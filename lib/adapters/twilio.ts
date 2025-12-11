import { ProviderAdapter, CheckResult } from './types';
import fetch from 'cross-fetch';

export const TwilioAdapter: ProviderAdapter = {
    id: 'twilio',
    name: 'Twilio',
    matches: (key: string) => key.startsWith('AC') && (key.includes(':') || key.length === 34),
    check: async (key: string): Promise<CheckResult> => {
        try {
            if (!key.includes(':')) {
                return {
                    valid: false,
                    provider: 'Twilio',
                    message: 'Format Required: AccountSID:AuthToken',
                    confidenceScore: 0.8,
                    trustLevel: 'Low'
                };
            }

            const [sid, token] = key.split(':');
            const encoded = btoa(key);
            const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
                headers: {
                    Authorization: `Basic ${encoded}`
                }
            });

            if (res.status === 401) {
                return {
                    valid: false,
                    provider: 'Twilio',
                    message: 'Invalid API Key',
                    confidenceScore: 1.0,
                    trustLevel: 'Low'
                };
            }

            if (res.status === 403) {
                return {
                    valid: false,
                    provider: 'Twilio',
                    message: 'Leaked Key - Inactive',
                    confidenceScore: 1.0,
                    trustLevel: 'Low'
                };
            }

            if (res.ok) {
                const data = await res.json();
                return {
                    valid: true,
                    provider: 'Twilio',
                    message: `Active (${data.friendly_name || 'Account'})`,
                    premium: data.type === 'Full',
                    confidenceScore: 1.0,
                    trustLevel: 'High'
                };
            }

            return {
                valid: false,
                provider: 'Twilio',
                message: `Error: ${res.statusText}`,
                confidenceScore: 0.5,
                trustLevel: 'Low'
            };
        } catch (error) {
            return {
                valid: false,
                provider: 'Twilio',
                message: 'Network Error',
                confidenceScore: 0.1,
                trustLevel: 'Low'
            };
        }
    }
};
