/**
 * SecureStore — browser-side AES-GCM encrypted storage.
 *
 * Threat model:
 * - Stops a casual look at localStorage from revealing a Gemini key.
 * - Does NOT defend against a malicious browser extension or XSS — those threats need CSP and
 *   a no-third-party policy.
 * - Encryption key is derived from a constant app salt + the persistent device id (random),
 *   so the encrypted blob is meaningless if copied to another browser.
 */

const STORAGE_VERSION = 1
const APP_SALT = 'oracle-byok-v1-2026'
const DEVICE_KEY = 'oracle_device_id_v1'

function getDeviceId(): string {
    if (typeof window === 'undefined') return ''
    let id = localStorage.getItem(DEVICE_KEY)
    if (!id) {
        const arr = new Uint8Array(16)
        crypto.getRandomValues(arr)
        id = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
        localStorage.setItem(DEVICE_KEY, id)
    }
    return id
}

async function deriveKey(): Promise<CryptoKey> {
    const baseKey = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(`${APP_SALT}|${getDeviceId()}`),
        'PBKDF2',
        false,
        ['deriveKey']
    )
    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: new TextEncoder().encode(APP_SALT),
            iterations: 100_000,
            hash: 'SHA-256'
        },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    )
}

function toB64(bytes: Uint8Array): string {
    let s = ''
    bytes.forEach(b => { s += String.fromCharCode(b) })
    return btoa(s)
}

function fromB64(s: string): Uint8Array {
    const bin = atob(s)
    const out = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
    return out
}

export async function secureSet(key: string, plaintext: string): Promise<void> {
    if (typeof window === 'undefined') return
    if (!plaintext) { localStorage.removeItem(key); return }
    const k = await deriveKey()
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, new TextEncoder().encode(plaintext))
    const payload = JSON.stringify({ v: STORAGE_VERSION, iv: toB64(iv), ct: toB64(new Uint8Array(cipher)) })
    localStorage.setItem(key, payload)
}

export async function secureGet(key: string): Promise<string | null> {
    if (typeof window === 'undefined') return null
    const raw = localStorage.getItem(key)
    if (!raw) return null
    try {
        const { v, iv, ct } = JSON.parse(raw) as { v: number; iv: string; ct: string }
        if (v !== STORAGE_VERSION) return null
        const k = await deriveKey()
        const buf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(iv) }, k, fromB64(ct))
        return new TextDecoder().decode(buf)
    } catch {
        return null
    }
}

export function secureRemove(key: string): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(key)
}

export const BYOK_GEMINI_KEY_STORAGE = 'oracle_byok_gemini_v1'
