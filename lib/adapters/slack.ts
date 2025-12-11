import { ProviderAdapter, CheckResult } from './types';
import fetch from 'cross-fetch';

export const SlackAdapter: ProviderAdapter = {
    id: 'slack',
    name: 'Slack',
    matches: (key: string) => key.startsWith('xoxb-') || key.startsWith('xoxp-'),
    check: async (key: string): Promise<CheckResult> => {
        try {
            const res = await fetch('https://slack.com/api/auth.test', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${key}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            if (res.status === 401) { // Usually Slack returns 200 with ok:false, but just in case
                return {
                    valid: false,
                    provider: 'Slack',
                    message: 'Invalid API Key',
                    confidenceScore: 1.0,
                    trustLevel: 'Low'
                };
            }

            const data = await res.json();

            if (data.ok) {
                return {
                    valid: true,
                    provider: 'Slack',
                    message: `Active (${data.user} @ ${data.team})`,
                    confidenceScore: 1.0,
                    trustLevel: 'High'
                };
            } else {
                if (data.error === 'invalid_auth') {
                    return {
                        valid: false,
                        provider: 'Slack',
                        message: 'Invalid API Key',
                        confidenceScore: 1.0,
                        trustLevel: 'Low'
                    };
                }
                if (data.error === 'account_inactive' || data.error === 'token_revoked') {
                    return {
                        valid: false,
                        provider: 'Slack',
                        message: 'Leaked Key - Inactive',
                        confidenceScore: 1.0,
                        trustLevel: 'Low'
                    };
                }

                return {
                    valid: false,
                    provider: 'Slack',
                    message: `Error: ${data.error}`,
                    confidenceScore: 0.9,
                    trustLevel: 'Low'
                };
            }

        } catch (error) {
            return {
                valid: false,
                provider: 'Slack',
                message: 'Network Error',
                confidenceScore: 0.1,
                trustLevel: 'Low'
            };
        }
    }
};
