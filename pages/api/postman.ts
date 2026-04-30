import type { NextApiRequest, NextApiResponse } from 'next';
import dns from 'dns';
import net from 'net';
import http from 'http';
import https from 'https';
import { URL as NodeURL } from 'url';

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
    truncated?: boolean;
    cookies?: Array<{ name: string; value: string }>;
    error?: string;
    errorObject?: { code: string; message: string };
}

const MAX_TIMEOUT_MS = 30000;
const MIN_TIMEOUT_MS = 1000;
const MAX_REDIRECTS = 5;
const MAX_RESPONSE_BYTES = 1_000_000;
const ALLOWED_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

const BLOCKED_HOST_PATTERNS = [
    /^localhost$/i,
    /^localhost\./i,
    /^local$/i,
    /^0\.0\.0\.0$/,
    /^metadata\.google/i,
    /^metadata\.aws/i,
    /^169\.254\.169\.254$/,
    /\.internal$/i,
    /\.local$/i
];

const HOP_BY_HOP_HEADERS = new Set([
    'host',
    'content-length',
    'connection',
    'proxy-connection',
    'keep-alive',
    'transfer-encoding',
    'upgrade',
    'te',
    'trailer',
    'proxy-authorization',
    'proxy-authenticate'
]);

export function isPrivateIPv4(host: string): boolean {
    const parts = host.split('.').map((p) => Number(p));
    if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
        return true;
    }

    if (parts[0] === 10) return true;
    if (parts[0] === 127) return true;
    if (parts[0] === 0) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;

    return false;
}

export function isPrivateIPv6(host: string): boolean {
    const normalized = host.toLowerCase();
    if (normalized === '::1' || normalized === '::') return true;
    if (normalized.startsWith('fe80:')) return true;
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
    if (normalized.startsWith('::ffff:')) {
        const ipv4 = normalized.replace('::ffff:', '');
        return net.isIP(ipv4) === 4 ? isPrivateIPv4(ipv4) : true;
    }
    return false;
}

export function isBlockedHostName(hostname: string): boolean {
    const normalized = hostname.toLowerCase();
    return BLOCKED_HOST_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function parseAllowlist(): string[] {
    return (process.env.ORACLE_PROXY_ALLOWLIST || '')
        .split(',')
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean);
}

export function allowlistMatch(hostname: string, allowlist: string[]): boolean {
    if (allowlist.length === 0) return false;

    const normalized = hostname.toLowerCase();
    return allowlist.some((allowed) => {
        if (allowed.startsWith('.')) {
            return normalized.endsWith(allowed) || normalized === allowed.slice(1);
        }
        return normalized === allowed;
    });
}

export async function isBlockedByDns(hostname: string): Promise<boolean> {
    const ipType = net.isIP(hostname);
    if (ipType === 4) return isPrivateIPv4(hostname);
    if (ipType === 6) return isPrivateIPv6(hostname);

    const lookups = await dns.promises.lookup(hostname, { all: true, verbatim: true });
    if (lookups.length === 0) return true;

    for (const entry of lookups) {
        if (entry.family === 4 && isPrivateIPv4(entry.address)) return true;
        if (entry.family === 6 && isPrivateIPv6(entry.address)) return true;
    }

    return false;
}

export function sanitizeHeaders(headers: Record<string, string> | undefined): Record<string, string> {
    const cleaned: Record<string, string> = {};
    if (!headers || typeof headers !== 'object') return cleaned;

    for (const [key, value] of Object.entries(headers)) {
        if (!key) continue;
        const lowered = key.toLowerCase();
        if (HOP_BY_HOP_HEADERS.has(lowered)) continue;
        if (typeof value !== 'string') continue;
        cleaned[key] = value;
    }

    if (!Object.keys(cleaned).some((k) => k.toLowerCase() === 'user-agent')) {
        cleaned['User-Agent'] = 'Oracle-Postman/2.0';
    }

    return cleaned;
}

async function validateTarget(urlString: string, allowlist: string[]): Promise<URL> {
    const parsed = new URL(urlString);

    if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Only http/https protocols are allowed');
    }

    if (parsed.username || parsed.password) {
        throw new Error('URLs with embedded credentials are not allowed');
    }

    if (!allowlistMatch(parsed.hostname, allowlist)) {
        if (isBlockedHostName(parsed.hostname)) {
            throw new Error('This URL is not allowed for security reasons');
        }

        const blocked = await isBlockedByDns(parsed.hostname);
        if (blocked) {
            throw new Error('This URL resolved to a private or restricted address');
        }
    }

    return parsed;
}

// Native http/https implementation — avoids Next.js 12 fetch polyfill issues
interface NativeResponse {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
    size: number;
    truncated: boolean;
    setCookies: string[];
    location: string | null;
}

function nativeHttpRequest(
    targetUrl: string,
    method: string,
    headers: Record<string, string>,
    body: string | undefined,
    timeoutMs: number,
    maxBytes: number
): Promise<NativeResponse> {
    return new Promise((resolve, reject) => {
        let parsed: NodeURL;
        try { parsed = new NodeURL(targetUrl); } catch (e) { return reject(new Error('Invalid URL')); }

        const lib = parsed.protocol === 'https:' ? https : http;
        const options: http.RequestOptions = {
            method,
            protocol: parsed.protocol,
            hostname: parsed.hostname,
            port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
            path: parsed.pathname + parsed.search,
            headers
        };

        const req = lib.request(options, (res) => {
            const chunks: Buffer[] = [];
            let total = 0;
            let truncated = false;

            res.on('data', (chunk: Buffer) => {
                total += chunk.length;
                if (total <= maxBytes) {
                    chunks.push(chunk);
                } else if (!truncated) {
                    truncated = true;
                    const overflow = total - maxBytes;
                    const allowed = chunk.subarray(0, chunk.length - overflow);
                    if (allowed.length > 0) chunks.push(allowed);
                    res.destroy();
                }
            });

            res.on('end', () => {
                const outHeaders: Record<string, string> = {};
                for (const [k, v] of Object.entries(res.headers)) {
                    if (Array.isArray(v)) outHeaders[k] = v.join(', ');
                    else if (typeof v === 'string') outHeaders[k] = v;
                }
                const setCookies = Array.isArray(res.headers['set-cookie']) ? res.headers['set-cookie'] as string[] : [];
                const merged = Buffer.concat(chunks);
                resolve({
                    status: res.statusCode || 0,
                    statusText: res.statusMessage || '',
                    headers: outHeaders,
                    body: merged.toString('utf-8'),
                    size: merged.length,
                    truncated,
                    setCookies,
                    location: (res.headers.location as string) || null
                });
            });

            res.on('error', reject);
        });

        req.setTimeout(timeoutMs, () => {
            req.destroy(new Error(`Request timed out after ${timeoutMs}ms`));
        });
        req.on('error', reject);

        if (body && !['GET', 'HEAD'].includes(method)) {
            req.write(body);
        }
        req.end();
    });
}

async function readResponseWithLimit(response: Response, maxBytes: number): Promise<{ body: string; size: number; truncated: boolean }> {
    if (!response.body) {
        return { body: '', size: 0, truncated: false };
    }
    const buf = await response.arrayBuffer();
    const bytes = new Uint8Array(buf);
    const truncated = bytes.byteLength > maxBytes;
    const sliced = truncated ? bytes.subarray(0, maxBytes) : bytes;
    return {
        body: new TextDecoder().decode(sliced),
        size: sliced.byteLength,
        truncated
    };
}

function extractCookies(headers: Headers): Array<{ name: string; value: string }> {
    const getSetCookie = (headers as unknown as { getSetCookie?: () => string[] }).getSetCookie;
    if (!getSetCookie) return [];

    return getSetCookie()
        .map((raw) => raw.split(';')[0])
        .map((pair) => {
            const [name, ...rest] = pair.split('=');
            return { name: name || '', value: rest.join('=') || '' };
        })
        .filter((cookie) => cookie.name.length > 0);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ProxyResponse>) {
    if (req.method !== 'POST') {
        return res.status(405).json({
            status: 405,
            statusText: 'Method Not Allowed',
            headers: {},
            body: '',
            time: 0,
            size: 0,
            error: 'Only POST requests are allowed',
            errorObject: { code: 'METHOD_NOT_ALLOWED', message: 'Only POST requests are allowed' }
        });
    }

    const body = (req.body || {}) as ProxyRequest;
    const method = String(body.method || 'GET').toUpperCase();
    const url = String(body.url || '').trim();
    const timeout = Math.max(MIN_TIMEOUT_MS, Math.min(Number(body.timeout || MAX_TIMEOUT_MS), MAX_TIMEOUT_MS));

    if (!url) {
        return res.status(400).json({
            status: 400,
            statusText: 'Bad Request',
            headers: {},
            body: '',
            time: 0,
            size: 0,
            error: 'URL is required',
            errorObject: { code: 'URL_REQUIRED', message: 'URL is required' }
        });
    }

    if (!ALLOWED_METHODS.has(method)) {
        return res.status(400).json({
            status: 400,
            statusText: 'Bad Request',
            headers: {},
            body: '',
            time: 0,
            size: 0,
            error: 'HTTP method is not allowed',
            errorObject: { code: 'METHOD_DISALLOWED', message: 'HTTP method is not allowed' }
        });
    }

    const startTime = Date.now();
    const allowlist = parseAllowlist();
    let timeoutId: NodeJS.Timeout | null = null;

    try {
        let currentUrl = url;
        let currentMethod = method;
        let currentBody = body.body;
        let redirectCount = 0;
        const cleanedHeaders = sanitizeHeaders(body.headers);

        while (true) {
            await validateTarget(currentUrl, allowlist);

            const response = await nativeHttpRequest(
                currentUrl,
                currentMethod,
                cleanedHeaders,
                currentBody,
                timeout,
                MAX_RESPONSE_BYTES
            );

            const isRedirect = [301, 302, 303, 307, 308].includes(response.status);

            if (isRedirect && response.location) {
                redirectCount += 1;
                if (redirectCount > MAX_REDIRECTS) {
                    throw new Error(`Too many redirects (max ${MAX_REDIRECTS})`);
                }

                const nextUrl = new NodeURL(response.location, currentUrl);
                currentUrl = nextUrl.toString();

                if (response.status === 303) {
                    currentMethod = 'GET';
                    currentBody = undefined;
                }

                continue;
            }

            const endTime = Date.now();

            const cookies = response.setCookies
                .map((raw) => raw.split(';')[0])
                .map((pair) => {
                    const [name, ...rest] = pair.split('=');
                    return { name: name || '', value: rest.join('=') || '' };
                })
                .filter((c) => c.name);

            return res.status(200).json({
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
                body: response.body,
                time: endTime - startTime,
                size: response.size,
                truncated: response.truncated,
                cookies
            });
        }
    } catch (error) {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }

        const endTime = Date.now();
        let errorMessage = 'Request failed';

        if (error instanceof Error) {
            errorMessage = error.name === 'AbortError'
                ? `Request timed out after ${timeout}ms`
                : error.message;
        }

        const statusCode = errorMessage.includes('not allowed') || errorMessage.includes('restricted')
            ? 403
            : 500;

        return res.status(statusCode).json({
            status: 0,
            statusText: 'Error',
            headers: {},
            body: '',
            time: endTime - startTime,
            size: 0,
            error: errorMessage,
            errorObject: {
                code: statusCode === 403 ? 'TARGET_BLOCKED' : 'REQUEST_FAILED',
                message: errorMessage
            }
        });
    }
}

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb'
        }
    }
};
