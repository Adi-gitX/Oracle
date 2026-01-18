// Postman API Proxy - Server-side request executor
import type { NextApiRequest, NextApiResponse } from 'next';

interface ProxyRequest {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: string;
    timeout?: number;
}

interface ProxyResponse {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
    time: number;
    size: number;
    error?: string;
}

// Blocked domains for security
const BLOCKED_PATTERNS = [
    /^localhost/i,
    /^127\./,
    /^192\.168\./,
    /^10\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^0\./,
    /^169\.254\./,
    /metadata\.google/i,
    /169\.254\.169\.254/,
    /metadata\.aws/i,
];

function isBlockedUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        const hostname = parsed.hostname;

        return BLOCKED_PATTERNS.some(pattern => pattern.test(hostname));
    } catch {
        return true; // Block invalid URLs
    }
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ProxyResponse>
) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({
            status: 405,
            statusText: 'Method Not Allowed',
            headers: {},
            body: '',
            time: 0,
            size: 0,
            error: 'Only POST requests are allowed'
        });
    }

    const { method, url, headers, body, timeout = 30000 } = req.body as ProxyRequest;

    // Validate URL
    if (!url) {
        return res.status(400).json({
            status: 400,
            statusText: 'Bad Request',
            headers: {},
            body: '',
            time: 0,
            size: 0,
            error: 'URL is required'
        });
    }

    // Check for blocked URLs
    if (isBlockedUrl(url)) {
        return res.status(403).json({
            status: 403,
            statusText: 'Forbidden',
            headers: {},
            body: '',
            time: 0,
            size: 0,
            error: 'This URL is not allowed for security reasons'
        });
    }

    // Validate URL format
    try {
        new URL(url);
    } catch {
        return res.status(400).json({
            status: 400,
            statusText: 'Bad Request',
            headers: {},
            body: '',
            time: 0,
            size: 0,
            error: 'Invalid URL format'
        });
    }

    const startTime = Date.now();

    try {
        // Build fetch options
        const fetchOptions: RequestInit = {
            method: method || 'GET',
            headers: {
                ...headers,
                // Add user agent to identify requests
                'User-Agent': 'Oracle-Postman/1.0'
            },
            redirect: 'follow'
        };

        // Add body for non-GET requests
        if (body && method !== 'GET' && method !== 'HEAD') {
            fetchOptions.body = body;
        }

        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), Math.min(timeout, 30000));
        fetchOptions.signal = controller.signal;

        // Execute request
        const response = await fetch(url, fetchOptions);
        clearTimeout(timeoutId);

        // Read response body
        const responseText = await response.text();
        const endTime = Date.now();

        // Convert headers to object
        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((value, key) => {
            responseHeaders[key] = value;
        });

        // Calculate size
        const size = new TextEncoder().encode(responseText).length;

        return res.status(200).json({
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders,
            body: responseText,
            time: endTime - startTime,
            size
        });

    } catch (error) {
        const endTime = Date.now();

        let errorMessage = 'Request failed';
        if (error instanceof Error) {
            if (error.name === 'AbortError') {
                errorMessage = `Request timed out after ${timeout}ms`;
            } else {
                errorMessage = error.message;
            }
        }

        return res.status(500).json({
            status: 0,
            statusText: 'Error',
            headers: {},
            body: '',
            time: endTime - startTime,
            size: 0,
            error: errorMessage
        });
    }
}

// Increase body size limit for file uploads
export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb'
        }
    }
};
