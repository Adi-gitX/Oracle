/**
 * Lightweight in-memory IP rate limiter — no Redis needed.
 *
 * Note: Each Vercel serverless function instance has its own memory, so this is
 * a soft limit, not a hard one. Good enough for "stop one user from burning the
 * server key dry". For stricter limits, swap to Upstash Redis behind the same API.
 */

interface Bucket {
    count: number
    resetAt: number
}

const buckets = new Map<string, Bucket>()
let lastCleanup = Date.now()

function cleanup(now: number) {
    if (now - lastCleanup < 60_000) return
    lastCleanup = now
    const keysToDelete: string[] = []
    buckets.forEach((b, key) => {
        if (b.resetAt < now) keysToDelete.push(key)
    })
    keysToDelete.forEach(k => buckets.delete(k))
}

export interface RateLimitResult {
    ok: boolean
    remaining: number
    limit: number
    resetAt: number
    retryAfterSec: number
}

export function rateLimit(identifier: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now()
    cleanup(now)

    const existing = buckets.get(identifier)
    if (!existing || existing.resetAt < now) {
        const fresh: Bucket = { count: 1, resetAt: now + windowMs }
        buckets.set(identifier, fresh)
        return { ok: true, remaining: limit - 1, limit, resetAt: fresh.resetAt, retryAfterSec: 0 }
    }

    existing.count += 1
    if (existing.count > limit) {
        return {
            ok: false,
            remaining: 0,
            limit,
            resetAt: existing.resetAt,
            retryAfterSec: Math.ceil((existing.resetAt - now) / 1000)
        }
    }

    return { ok: true, remaining: limit - existing.count, limit, resetAt: existing.resetAt, retryAfterSec: 0 }
}

export function getClientIp(req: { headers: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } }): string {
    const xff = req.headers['x-forwarded-for']
    if (xff) {
        const first = (Array.isArray(xff) ? xff[0] : xff).split(',')[0].trim()
        if (first) return first
    }
    const realIp = req.headers['x-real-ip']
    if (realIp && typeof realIp === 'string') return realIp
    return req.socket?.remoteAddress || 'unknown'
}
