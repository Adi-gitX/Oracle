import { ProviderAdapter, CheckResult } from './types';
import fetch from 'cross-fetch';

export const MapboxAdapter: ProviderAdapter = {
    id: 'mapbox',
    name: 'Mapbox',
    matches: (key: string) => key.startsWith('pk.') || key.startsWith('sk.') || key.startsWith('tk.'),
    check: async (key: string): Promise<CheckResult> => {
        try {
            // Using a low-cost/free endpoint like finding a place. 
            // Better to use tokens endpoint if possible but that needs sk usually.
            // Documentation suggests: https://api.mapbox.com/geocoding/v5/mapbox.places/Los%20Angeles.json?access_token=...

            const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/Washington.json?access_token=${key}&limit=1`);

            if (res.status === 401) {
                return {
                    valid: false,
                    provider: 'Mapbox',
                    message: 'Invalid API Key',
                    confidenceScore: 1.0,
                    trustLevel: 'Low'
                };
            }

            if (res.ok) {
                return {
                    valid: true,
                    provider: 'Mapbox',
                    message: 'Active',
                    confidenceScore: 1.0,
                    trustLevel: 'High'
                };
            }

            return {
                valid: false,
                provider: 'Mapbox',
                message: 'Error',
                confidenceScore: 0.5,
                trustLevel: 'Low'
            };

        } catch (error) {
            return {
                valid: false,
                provider: 'Mapbox',
                message: 'Network Error',
                confidenceScore: 0.1,
                trustLevel: 'Low'
            };
        }
    }
};
