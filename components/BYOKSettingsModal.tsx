import { useState, useEffect, useRef } from 'react'
import styles from '../styles/Postman.module.css'
import { secureGet, secureSet, secureRemove, BYOK_GEMINI_KEY_STORAGE } from '../lib/SecureStore'

interface BYOKSettingsModalProps {
    open: boolean
    onClose: () => void
}

export default function BYOKSettingsModal({ open, onClose }: BYOKSettingsModalProps) {
    const [key, setKey] = useState('')
    const [reveal, setReveal] = useState(false)
    const [hasStored, setHasStored] = useState(false)
    const [status, setStatus] = useState<{ kind: 'idle' | 'saving' | 'saved' | 'cleared' | 'invalid'; msg?: string }>({ kind: 'idle' })
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (!open) return
        let alive = true
        secureGet(BYOK_GEMINI_KEY_STORAGE).then(stored => {
            if (!alive) return
            setHasStored(!!stored)
            setKey(stored ? stored : '')
        })
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        const t = setTimeout(() => inputRef.current?.focus(), 30)
        return () => { alive = false; window.removeEventListener('keydown', onKey); clearTimeout(t) }
    }, [open, onClose])

    if (!open) return null

    const trimmed = key.trim()
    const looksLikeGemini = trimmed.startsWith('AIza') && trimmed.length >= 30

    const save = async () => {
        if (!trimmed) return
        if (!looksLikeGemini) {
            setStatus({ kind: 'invalid', msg: 'This does not look like a Gemini key. Expected to start with AIza...' })
            return
        }
        setStatus({ kind: 'saving' })
        await secureSet(BYOK_GEMINI_KEY_STORAGE, trimmed)
        setHasStored(true)
        setStatus({ kind: 'saved', msg: 'Saved. Encrypted with AES-GCM in your browser only.' })
        setTimeout(() => setStatus({ kind: 'idle' }), 2400)
    }

    const clear = () => {
        secureRemove(BYOK_GEMINI_KEY_STORAGE)
        setKey('')
        setHasStored(false)
        setStatus({ kind: 'cleared', msg: 'Cleared. Oracle will use the server key (if configured).' })
        setTimeout(() => setStatus({ kind: 'idle' }), 2400)
    }

    return (
        <div className={styles.modal} onClick={onClose} role="dialog" aria-modal="true">
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
                <h3 style={{ marginBottom: 4 }}>Bring Your Own Gemini Key</h3>
                <p style={{ margin: '0 0 16px 0', fontSize: '0.78rem', color: '#8b8b93', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: 1.6 }}>
                    Paste your own Google Gemini API key. It is encrypted with <strong style={{ color: '#FF6C37' }}>AES-GCM</strong> in your browser using a per-device key derived from Web Crypto. The key never leaves your machine except as a header on the chat request you send. Nothing is stored server-side.
                </p>

                <div style={{ position: 'relative', marginBottom: 12 }}>
                    <input
                        ref={inputRef}
                        type={reveal ? 'text' : 'password'}
                        value={key}
                        onChange={(e) => { setKey(e.target.value); setStatus({ kind: 'idle' }) }}
                        placeholder="AIzaSy..."
                        autoComplete="off"
                        spellCheck={false}
                        style={{
                            width: '100%',
                            padding: '12px 44px 12px 14px',
                            background: '#0a0a0b',
                            border: '1px solid #26262d',
                            borderRadius: 8,
                            color: '#e6e6e9',
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: '0.86rem',
                            outline: 'none',
                            boxSizing: 'border-box'
                        }}
                        data-testid="byok-input"
                    />
                    <button
                        type="button"
                        onClick={() => setReveal(r => !r)}
                        title={reveal ? 'Hide key' : 'Reveal key'}
                        style={{
                            position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                            background: 'transparent', border: 'none', padding: 8,
                            color: '#8b8b93', cursor: 'pointer', display: 'inline-flex'
                        }}
                    >
                        {reveal ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                <line x1="1" y1="1" x2="23" y2="23" />
                            </svg>
                        ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                            </svg>
                        )}
                    </button>
                </div>

                {status.msg && (
                    <div style={{
                        padding: '8px 12px',
                        borderRadius: 6,
                        fontSize: '0.78rem',
                        marginBottom: 14,
                        fontFamily: 'JetBrains Mono, monospace',
                        background: status.kind === 'invalid' ? 'rgba(255, 82, 82, 0.08)' : 'rgba(0, 230, 118, 0.08)',
                        border: `1px solid ${status.kind === 'invalid' ? 'rgba(255, 82, 82, 0.25)' : 'rgba(0, 230, 118, 0.22)'}`,
                        color: status.kind === 'invalid' ? '#FF5252' : '#00E676'
                    }}>
                        {status.msg}
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 12px', background: '#0a0a0b', border: '1px solid #1d1d22', borderRadius: 8, marginBottom: 14 }}>
                    <div style={{ fontSize: '0.62rem', color: '#55555c', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.14em' }}>Status</div>
                    <div style={{ fontSize: '0.84rem', color: hasStored ? '#FF6C37' : '#8b8b93' }}>
                        {hasStored ? 'Personal key active — chat uses your Gemini quota.' : 'No personal key — chat uses the server key (if configured).'}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 8, fontSize: '0.7rem', color: '#55555c', marginBottom: 14, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.5 }}>
                    <span style={{ color: '#FF6C37', flexShrink: 0 }}>↗</span>
                    <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" style={{ color: '#8b8b93', textDecoration: 'underline' }}>
                        aistudio.google.com/apikey
                    </a>
                    <span>— get a free Gemini key in 30 seconds</span>
                </div>

                <div className={styles.modalActions}>
                    {hasStored && (
                        <button onClick={clear} data-testid="byok-clear" style={{ marginRight: 'auto', color: '#FF5252', borderColor: 'rgba(255, 82, 82, 0.3)' }}>
                            Clear Key
                        </button>
                    )}
                    <button onClick={onClose} data-testid="byok-close">Close</button>
                    <button onClick={save} className={styles.primaryBtn} disabled={!trimmed || status.kind === 'saving'} data-testid="byok-save">
                        {status.kind === 'saving' ? 'Encrypting…' : 'Save Encrypted'}
                    </button>
                </div>
            </div>
        </div>
    )
}
