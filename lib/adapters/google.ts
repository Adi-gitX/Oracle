import { ProviderAdapter, CheckResult } from './types';
import fetch from 'cross-fetch';

export const GoogleAdapter: ProviderAdapter = {
    id: 'google',
    name: 'Google Services',
    matches: (key: string) => key.startsWith('AIza') || key.startsWith('GOCSPX-') || key.endsWith('.apps.googleusercontent.com'),
    check: async (key: string): Promise<CheckResult> => {
        // Handle Client Secret (GOCSPX)
        if (key.startsWith('GOCSPX-')) {
            return {
                valid: true,
                provider: 'Google Client Secret',
                message: 'Format Valid',
                confidenceScore: 0.9,
                trustLevel: 'High',
                metadata: { note: 'Secret Key' }
            };
        }

        // Handle Client ID
        if (key.endsWith('.apps.googleusercontent.com')) {
            return {
                valid: true,
                provider: 'Google Client ID',
                message: 'Format Valid',
                confidenceScore: 0.9,
                trustLevel: 'High',
                metadata: { note: 'Public Identifier' }
            };
        }

        try {
            // 1. Check Gemini
            try {
                const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
                if (geminiRes.ok) {
                    const data = await geminiRes.json();
                    const models = data.models ? data.models.map((m: any) => m.name) : [];
                    return {
                        valid: true,
                        provider: 'Google Gemini',
                        premium: false,
                        models: models.slice(0, 10),
                        message: 'Active',
                        confidenceScore: 1.0,
                        trustLevel: 'High'
                    };
                }
            } catch (e) {
                // Continue to next service
            }

            // 2. Check Google Maps (Geocoding API)
            try {
                const mapsRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=New+York&key=${key}`);
                const mapsData = await mapsRes.json();

                if (mapsData.status === 'OK' || mapsData.status === 'ZERO_RESULTS') {
                    return {
                        valid: true,
                        provider: 'Google Maps',
                        message: 'Active',
                        confidenceScore: 1.0,
                        trustLevel: 'High'
                    };
                }
                // If specific error message suggests valid key but other error, handle it?
                // e.g. "OVER_QUERY_LIMIT" -> Valid but quota exceeded
                if (mapsData.status === 'OVER_QUERY_LIMIT') {
                    return {
                        valid: true,
                        provider: 'Google Maps',
                        message: 'Quota Exceeded',
                        confidenceScore: 1.0,
                        trustLevel: 'High'
                    };
                }
            } catch (e) {
            }

            // 3. Check Google Places API (Find Place)
            try {
                const placesRes = await fetch(`https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=Museum&inputtype=textquery&fields=name&key=${key}`);
                const placesData = await placesRes.json();

                if (placesData.status === 'OK' || placesData.status === 'ZERO_RESULTS') {
                    return {
                        valid: true,
                        provider: 'Google Places',
                        message: 'Active',
                        confidenceScore: 1.0,
                        trustLevel: 'High'
                    };
                }
            } catch (e) {
                // Continue
            }

            // 4. Check YouTube Data API
            try {
                const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=id&q=test&maxResults=1&key=${key}`);
                if (ytRes.ok) {
                    return {
                        valid: true,
                        provider: 'Google YouTube',
                        message: 'Active',
                        confidenceScore: 1.0,
                        trustLevel: 'High'
                    };
                }
            } catch (e) {
                // Continue
            }

            // If we are here, all checks failed or returned error.
            // We return Invalid, but with a generic Google provider
            return {
                valid: false,
                provider: 'Google Services',
                message: 'Invalid API Key',
                confidenceScore: 1.0,
                trustLevel: 'Low'
            };

        } catch (error) {
            return {
                valid: false,
                provider: 'Google Services',
                message: 'Network Error',
                confidenceScore: 0.1,
                trustLevel: 'Low'
            };
        }
    }
};
