import type { RequestConfig } from './types'

/**
 * Encode a request to a compact URL hash payload.
 * Format: #r=<base64url(JSON)>
 * - Drops empty fields to keep URLs short
 * - Strips Authorization headers and auth secrets so shared links never leak credentials
 */
export function encodeRequestToHash(request: RequestConfig): string {
    const safeHeaders = (request.headers || []).filter(h => {
        if (!h?.enabled) return false
        const k = (h.key || '').trim().toLowerCase()
        if (!k) return false
        // Strip sensitive headers — never include in shareable links
        if (['authorization', 'cookie', 'x-api-key', 'api-key', 'x-auth-token'].includes(k)) return false
        return true
    }).map(({ key, value }) => ({ key, value }))

    const safeParams = (request.params || []).filter(p => p?.enabled && p.key).map(({ key, value }) => ({ key, value }))

    const payload: Record<string, unknown> = {
        v: 1,
        m: request.method,
        u: request.url || ''
    }
    if (safeHeaders.length) payload.h = safeHeaders
    if (safeParams.length) payload.q = safeParams
    if (request.body && request.body.type !== 'none' && request.body.raw) {
        payload.b = { t: request.body.type, c: request.body.raw.slice(0, 4000) }
    }

    const json = JSON.stringify(payload)
    const b64 = typeof window === 'undefined'
        ? Buffer.from(json, 'utf-8').toString('base64')
        : btoa(unescape(encodeURIComponent(json)))
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Decode a URL hash back into a partial RequestConfig.
 * Returns null on malformed input.
 */
export function decodeRequestFromHash(hash: string): Partial<RequestConfig> | null {
    if (!hash) return null
    try {
        const m = hash.match(/r=([^&]+)/)
        const raw = (m ? m[1] : hash.replace(/^#/, '')).trim()
        if (!raw) return null
        const padded = raw.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice(0, (4 - raw.length % 4) % 4)
        const json = typeof window === 'undefined'
            ? Buffer.from(padded, 'base64').toString('utf-8')
            : decodeURIComponent(escape(atob(padded)))
        const data = JSON.parse(json) as { v?: number; m?: string; u?: string; h?: { key: string; value: string }[]; q?: { key: string; value: string }[]; b?: { t: string; c: string } }
        if (!data || data.v !== 1) return null
        return {
            method: (data.m as RequestConfig['method']) || 'GET',
            url: data.u || '',
            headers: (data.h || []).map(h => ({ key: h.key, value: h.value, enabled: true })),
            params: (data.q || []).map(p => ({ key: p.key, value: p.value, enabled: true })),
            body: data.b ? { type: data.b.t as RequestConfig['body']['type'], raw: data.b.c } : undefined
        }
    } catch {
        return null
    }
}

/**
 * Build a shareable URL pointing at the dashboard with the request encoded.
 */
export function buildShareUrl(request: RequestConfig, baseHref?: string): string {
    if (typeof window === 'undefined' && !baseHref) return ''
    const base = baseHref || `${window.location.origin}/dashboard`
    return `${base}#r=${encodeRequestToHash(request)}`
}
