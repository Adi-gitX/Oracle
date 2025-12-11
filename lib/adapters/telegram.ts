import { ProviderAdapter, CheckResult } from './types';
import fetch from 'cross-fetch';

export const TelegramAdapter: ProviderAdapter = {
    id: 'telegram',
    name: 'Telegram',
    matches: (key: string) => /^\d{8,10}:[\w-]{35}$/.test(key),
    check: async (key: string): Promise<CheckResult> => {
        try {
            const res = await fetch(`https://api.telegram.org/bot${key}/getMe`);
            const data = await res.json();

            if (data.ok) {
                return {
                    valid: true,
                    provider: 'Telegram',
                    message: `Active (@${data.result.username})`,
                    confidenceScore: 1.0,
                    trustLevel: 'High'
                };
            }

            if (res.status === 401 || data.error_code === 401) {
                return {
                    valid: false,
                    provider: 'Telegram',
                    message: 'Invalid Bot Token',
                    confidenceScore: 1.0,
                    trustLevel: 'Low'
                };
            }

            return {
                valid: false,
                provider: 'Telegram',
                message: data.description || 'Error',
                confidenceScore: 0.9,
                trustLevel: 'Low'
            };

        } catch (error) {
            return {
                valid: false,
                provider: 'Telegram',
                message: 'Network Error',
                confidenceScore: 0.1,
                trustLevel: 'Low'
            };
        }
    }
};
