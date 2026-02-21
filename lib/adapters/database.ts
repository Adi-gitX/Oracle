import { ProviderAdapter, CheckResult } from './types';

export const DatabaseAdapter: ProviderAdapter = {
    id: 'database',
    name: 'Database',
    matches: (key: string) => /^(postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\//.test(key),
    check: async (key: string): Promise<CheckResult> => {
        // We cannot easily check DB connections from Vercel Edge/Serverless without drivers.
        // But we can parse it and validate the format and maybe extraction user/host.

        try {
            const url = new URL(key);
            const protocol = url.protocol.replace(':', '');
            const host = url.hostname;
            const user = url.username;
            // Mask password

            return {
                valid: false,
                provider: `Database (${protocol})`,
                message: `Format Recognized (Host: ${host})`,
                verificationLevel: 'format_only',
                metadata: {
                    user: user || 'None',
                    host: host,
                    protocol: protocol
                },
                confidenceScore: 0.9,
                trustLevel: 'Medium'
            };

        } catch (e) {
            return {
                valid: false,
                provider: 'Database',
                message: 'Invalid Connection String Format',
                verificationLevel: 'unknown',
                confidenceScore: 1.0,
                trustLevel: 'Low'
            };
        }
    }
};
