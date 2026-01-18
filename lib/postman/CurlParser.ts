// cURL Command Parser

import type { RequestConfig, HttpMethod, KeyValue } from './types';

/**
 * Parse a cURL command into a RequestConfig object
 */
export function parseCurl(curlCommand: string): RequestConfig {
    const config: RequestConfig = {
        method: 'GET',
        url: '',
        headers: [],
        params: [],
        auth: { type: 'none' },
        body: { type: 'none' }
    };

    // Clean up the command
    let command = curlCommand
        .replace(/\\\n/g, ' ')  // Handle line continuations
        .replace(/\s+/g, ' ')   // Normalize whitespace
        .trim();

    // Remove 'curl' prefix if present
    if (command.toLowerCase().startsWith('curl ')) {
        command = command.substring(5).trim();
    }

    // Extract URL (could be quoted or unquoted)
    const urlMatch = command.match(/(?:^|\s)(['"]?)((https?:\/\/[^\s'"]+)|([^\s'"]+))(\1)(?:\s|$)/);
    if (urlMatch) {
        config.url = urlMatch[2] || urlMatch[4];
    }

    // Extract method (-X or --request)
    const methodMatch = command.match(/(?:-X|--request)\s+(['"]?)(\w+)\1/i);
    if (methodMatch) {
        config.method = methodMatch[2].toUpperCase() as HttpMethod;
    }

    // Extract headers (-H or --header)
    const headerPattern = /(?:-H|--header)\s+(['"])([^'"]+)\1/gi;
    let headerMatch;
    while ((headerMatch = headerPattern.exec(command)) !== null) {
        const headerValue = headerMatch[2];
        const colonIndex = headerValue.indexOf(':');
        if (colonIndex > 0) {
            const key = headerValue.substring(0, colonIndex).trim();
            const value = headerValue.substring(colonIndex + 1).trim();

            // Check for Authorization header
            if (key.toLowerCase() === 'authorization') {
                if (value.toLowerCase().startsWith('bearer ')) {
                    config.auth = {
                        type: 'bearer',
                        bearer: { token: value.substring(7) }
                    };
                } else if (value.toLowerCase().startsWith('basic ')) {
                    try {
                        const decoded = atob(value.substring(6));
                        const [username, password] = decoded.split(':');
                        config.auth = {
                            type: 'basic',
                            basic: { username, password: password || '' }
                        };
                    } catch {
                        // Keep as header if can't decode
                        config.headers.push({ key, value, enabled: true });
                    }
                } else {
                    config.headers.push({ key, value, enabled: true });
                }
            } else {
                config.headers.push({ key, value, enabled: true });
            }
        }
    }

    // Extract data (-d, --data, --data-raw, --data-binary)
    const dataPattern = /(?:-d|--data(?:-raw|-binary)?)\s+(['"])(.+?)\1/gi;
    let dataMatch;
    while ((dataMatch = dataPattern.exec(command)) !== null) {
        const data = dataMatch[2];

        // Try to determine if it's JSON
        try {
            JSON.parse(data);
            config.body = { type: 'json', raw: data };
            if (config.method === 'GET') {
                config.method = 'POST';
            }
        } catch {
            // Check if it's URL encoded
            if (data.includes('=')) {
                const pairs = data.split('&');
                const urlencoded: KeyValue[] = pairs.map(pair => {
                    const [key, value] = pair.split('=');
                    return {
                        key: decodeURIComponent(key || ''),
                        value: decodeURIComponent(value || ''),
                        enabled: true
                    };
                });
                config.body = { type: 'x-www-form-urlencoded', urlencoded };
            } else {
                config.body = { type: 'raw', raw: data };
            }
            if (config.method === 'GET') {
                config.method = 'POST';
            }
        }
    }

    // Extract user (-u or --user) for basic auth
    const userMatch = command.match(/(?:-u|--user)\s+(['"]?)([^'"]+)\1/i);
    if (userMatch) {
        const [username, password] = userMatch[2].split(':');
        config.auth = {
            type: 'basic',
            basic: { username, password: password || '' }
        };
    }

    // Parse URL query parameters
    if (config.url) {
        try {
            const url = new URL(config.url);
            url.searchParams.forEach((value, key) => {
                config.params.push({ key, value, enabled: true });
            });
            // Store URL without query params
            config.url = `${url.origin}${url.pathname}`;
        } catch {
            // URL might be incomplete, keep as-is
        }
    }

    return config;
}

/**
 * Export a RequestConfig as a cURL command
 */
export function exportToCurl(config: RequestConfig): string {
    const parts: string[] = ['curl'];

    // Method
    if (config.method !== 'GET') {
        parts.push(`-X ${config.method}`);
    }

    // Build full URL with params
    let fullUrl = config.url;
    const enabledParams = config.params.filter(p => p.enabled);
    if (enabledParams.length > 0) {
        const queryString = enabledParams
            .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
            .join('&');
        fullUrl += (fullUrl.includes('?') ? '&' : '?') + queryString;
    }
    parts.push(`'${fullUrl}'`);

    // Headers
    config.headers.filter(h => h.enabled).forEach(header => {
        parts.push(`-H '${header.key}: ${header.value}'`);
    });

    // Auth
    if (config.auth.type === 'bearer' && config.auth.bearer) {
        parts.push(`-H 'Authorization: Bearer ${config.auth.bearer.token}'`);
    } else if (config.auth.type === 'basic' && config.auth.basic) {
        parts.push(`-u '${config.auth.basic.username}:${config.auth.basic.password}'`);
    } else if (config.auth.type === 'apikey' && config.auth.apikey) {
        if (config.auth.apikey.addTo === 'header') {
            parts.push(`-H '${config.auth.apikey.key}: ${config.auth.apikey.value}'`);
        }
    }

    // Body
    if (config.body.type === 'json' && config.body.raw) {
        parts.push(`-H 'Content-Type: application/json'`);
        parts.push(`-d '${config.body.raw}'`);
    } else if (config.body.type === 'x-www-form-urlencoded' && config.body.urlencoded) {
        const data = config.body.urlencoded
            .filter(p => p.enabled)
            .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
            .join('&');
        parts.push(`-d '${data}'`);
    } else if (config.body.type === 'raw' && config.body.raw) {
        parts.push(`-d '${config.body.raw}'`);
    }

    return parts.join(' \\\n  ');
}

/**
 * Check if a string looks like a cURL command
 */
export function isCurlCommand(text: string): boolean {
    const trimmed = text.trim().toLowerCase();
    return trimmed.startsWith('curl ') || trimmed === 'curl';
}
