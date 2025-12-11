import { ProviderAdapter, CheckResult } from './types';

export const SupabaseAdapter: ProviderAdapter = {
    id: 'supabase',
    name: 'Supabase',
    matches: (key: string) => key.startsWith('sbp_') || key.startsWith('service_role'),
    check: async (key: string): Promise<CheckResult> => {
        // Supabase keys are often JWTs. 
        // We can try to decode the header to see if it looks like a JWT?
        // But the user mentioned 'service_role' or 'sbp_'

        if (key.startsWith('sbp_') || key.startsWith('service_role')) {
            return {
                valid: true,
                provider: 'Supabase',
                message: 'Format Valid',
                confidenceScore: 0.8,
                trustLevel: 'Medium',
                metadata: { note: 'Requires Project URL to fully validate' }
            };
        }

        return {
            valid: false,
            provider: 'Supabase',
            message: 'Invalid Format',
            confidenceScore: 0.5,
            trustLevel: 'Low'
        };
    }
};
