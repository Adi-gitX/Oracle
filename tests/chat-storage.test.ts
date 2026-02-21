import test from 'node:test'
import assert from 'node:assert/strict'
import { applyRateLimit, getApiKeys, getClientIp } from '../pages/api/chat'
import { sanitizeHistoryItem, sanitizeStorage } from '../lib/postman/storage'

test('getApiKeys supports sparse and indexed key names', () => {
    const originalEnv = { ...process.env }

    process.env.GOOGLE_API_KEY = 'base-key'
    process.env.GOOGLE_API_KEY_1 = 'key-1'
    process.env.GOOGLE_API_KEY_3 = 'key-3'
    process.env.GEMINI_API_KEY_2 = 'key-2'

    const keys = getApiKeys()
    assert.deepEqual(keys, ['base-key', 'key-1', 'key-2', 'key-3'])

    process.env = originalEnv
})

test('getClientIp reads first forwarded address token', () => {
    const req = {
        headers: { 'x-forwarded-for': '203.0.113.10, 10.0.0.1' },
        socket: { remoteAddress: '127.0.0.1' }
    }

    assert.equal(getClientIp(req as any), '203.0.113.10')
})

test('applyRateLimit caps requests within a window', () => {
    global.chatRateLimitMap = new Map()
    for (let i = 0; i < 20; i += 1) {
        assert.equal(applyRateLimit('198.51.100.2'), true)
    }
    assert.equal(applyRateLimit('198.51.100.2'), false)
})

test('sanitizeHistoryItem redacts secrets from auth and headers', () => {
    const item = sanitizeHistoryItem({
        id: '1',
        timestamp: Date.now(),
        request: {
            method: 'GET',
            url: 'https://api.example.com?token=abc',
            headers: [{ key: 'Authorization', value: 'Bearer top-secret', enabled: true }],
            params: [{ key: 'api_key', value: 'abc123', enabled: true }],
            auth: { type: 'bearer', bearer: { token: 'top-secret' } },
            body: { type: 'raw', raw: 'plain-secret' }
        },
        response: {
            status: 200,
            statusText: 'OK',
            headers: { 'set-cookie': 'session=abc' },
            body: 'ok',
            time: 10,
            size: 2
        }
    })

    assert.ok(item)
    assert.equal(item!.request.url.includes('token=%5BREDACTED%5D'), true)
    assert.equal(item!.request.headers[0].value, '[REDACTED]')
    assert.equal(item!.request.auth.bearer?.token, '[REDACTED]')
    assert.equal(item!.request.body.raw, '[REDACTED]')
    assert.equal(item!.response.headers['set-cookie'], '[REDACTED]')
})

test('sanitizeStorage falls back to safe defaults for malformed storage', () => {
    const storage = sanitizeStorage({
        history: 'bad',
        settings: { timeout: 'oops' }
    })

    assert.deepEqual(storage.history, [])
    assert.equal(storage.settings.historyEnabled, false)
    assert.equal(storage.settings.timeout, 30000)
})
