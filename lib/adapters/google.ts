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
            // 1. Check Gemini (Deep Verification via generateContent)
            // We use generateContent to trigger strict validation and leak detection
            try {
                const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
                    // Note: Gemini 3 Pro available as of Nov 2025, using stable 2.5-flash for reliability
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: "Hi" }] }]
                    })
                });

                const data = await geminiRes.json();

                // Success - Key works!
                if (geminiRes.ok && data.candidates) {
                    return {
                        valid: true,
                        provider: 'Google Gemini',
                        premium: false,
                        models: ['gemini-2.5-flash'],
                        message: 'Active',
                        confidenceScore: 1.0,
                        trustLevel: 'High'
                    };
                }

                // Check for error responses
                if (data.error) {
                    const msg = data.error.message || '';
                    const status = data.error.status || '';
                    const code = data.error.code || 0;

                    // CRITICAL: Leaked keys must be caught immediately
                    if (msg.toLowerCase().includes('leaked')) {
                        return {
                            valid: false,
                            provider: 'Google Gemini',
                            message: 'Leaked Key - Inactive',
                            confidenceScore: 1.0,
                            trustLevel: 'Low',
                            metadata: { note: 'Reported as leaked by Google' }
                        };
                    }

                    // Quota exhausted - key is VALID but out of quota
                    if (code === 429 || status === 'RESOURCE_EXHAUSTED') {
                        return {
                            valid: true,
                            provider: 'Google Gemini',
                            premium: false,
                            message: 'Active (Quota Exhausted)',
                            confidenceScore: 1.0,
                            trustLevel: 'High',
                            metadata: { note: 'Valid key but quota exceeded' }
                        };
                    }

                    // Permission denied (but not leaked) - could be project restriction
                    if (status === 'PERMISSION_DENIED' && !msg.toLowerCase().includes('leaked')) {
                        // Continue to other checks (might work for Maps/Firebase)
                    } else if (code === 400) {
                        // Invalid request format should not happen with our test, so key is likely invalid
                        return {
                            valid: false,
                            provider: 'Google Gemini',
                            message: 'Invalid API Key',
                            confidenceScore: 1.0,
                            trustLevel: 'Low'
                        };
                    }
                }
            } catch (e) {
                // Network error - continue to other checks
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
                // Continue
            }

            // 3. Check Google Places API
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

            // 5. Fallback: Firebase Check
            try {
                const fbRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${key}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ identifier: "test@example.com", continueUri: "http://localhost" })
                });
                const fbData = await fbRes.json();

                // Strict Analysis of Firebase Errors
                if (fbData.error) {
                    const msg = fbData.error.message || '';
                    const domain = fbData.error.errors?.[0]?.domain || '';
                    const reason = fbData.error.errors?.[0]?.reason || '';

                    // 1. Definite Valid signals (Auth is disabled but Project exists and Key is accepted)
                    // OPERATION_NOT_ALLOWED means the key authenticated, hit the project, but that auth method is off.
                    // This PROVES the key is Active.
                    if (msg.includes('OPERATION_NOT_ALLOWED') || reason === 'OPERATION_NOT_ALLOWED') {
                        return {
                            valid: true,
                            provider: 'Google / Firebase',
                            message: 'Active (Restricted)',
                            metadata: { note: 'Valid Key (Auth methods disabled)' },
                            confidenceScore: 0.9,
                            trustLevel: 'Medium'
                        };
                    }

                    // 2. Definite Invalid signals
                    // "API key not valid" -> Invalid
                    // "Billing not enabled" -> Inactive (User considers this not working)
                    // "Permission denied" -> Leaked/Blocked
                    // "Ip address not allowed" -> Restricted (Technically valid but not working here -> Invalid for user?)
                    // User said "no invalid or expired". Restricted IP means we can't use it.

                    if (msg.includes('API key not valid')) {
                        return {
                            valid: false,
                            provider: 'Google Services',
                            message: 'Invalid API Key',
                            confidenceScore: 1.0,
                            trustLevel: 'Low'
                        };
                    }

                    if (msg.includes('Billing not enabled') || reason === 'BILLING_NOT_ENABLED') {
                        return {
                            valid: false,
                            provider: 'Google Services',
                            message: 'Inactive (Billing Disabled)',
                            confidenceScore: 1.0,
                            trustLevel: 'Low'
                        };
                    }

                    if (msg.includes('Permission denied') || fbData.error.code === 403 || fbData.error.status === 'PERMISSION_DENIED') {
                        return {
                            valid: false,
                            provider: 'Google Services',
                            message: 'Leaked Key - Inactive',
                            confidenceScore: 1.0,
                            trustLevel: 'Low'
                        };
                    }

                    // Fallback for other errors: If we can't prove it's valid, assume invalid to be safe.
                    // This satisfies "no invalid key in working".
                    return {
                        valid: false,
                        provider: 'Google Services',
                        message: `Error: ${msg}`,
                        confidenceScore: 0.8,
                        trustLevel: 'Low'
                    };
                }

                // If no error (rare for this dummy call), it's valid.
                return {
                    valid: true,
                    provider: 'Google / Firebase',
                    message: 'Active',
                    confidenceScore: 1.0,
                    trustLevel: 'High'
                };

            } catch (e) {
                // Ignore
            }

            // If we are here, it's truly invalid.
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
