import { useState, useEffect } from 'react'
import styles from '../../styles/Postman.module.css'
import { getHistory, clearHistory } from '../../lib/postman/storage'
import type { RequestHistoryItem, RequestConfig } from '../../lib/postman/types'
import { methodColors } from '../../lib/postman/types'

interface HistoryPanelProps {
    open: boolean
    onClose: () => void
    onLoad: (config: RequestConfig) => void
}

function relativeTime(ts: number): string {
    const diff = Date.now() - ts
    if (diff < 60_000) return 'just now'
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
    return `${Math.floor(diff / 86_400_000)}d ago`
}

export default function HistoryPanel({ open, onClose, onLoad }: HistoryPanelProps) {
    const [items, setItems] = useState<RequestHistoryItem[]>([])
    const [query, setQuery] = useState('')

    useEffect(() => {
        if (!open) return
        setItems(getHistory())
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [open, onClose])

    if (!open) return null

    const q = query.trim().toLowerCase()
    const filtered = q
        ? items.filter(i => (i.request?.url || '').toLowerCase().includes(q) || (i.request?.method || '').toLowerCase().includes(q))
        : items

    const handleClear = () => {
        if (typeof window !== 'undefined' && !window.confirm('Clear all request history? This cannot be undone.')) return
        clearHistory()
        setItems([])
    }

    return (
        <div className={styles.modal} onClick={onClose} role="dialog" aria-modal="true">
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720, padding: 0 }}>
                <div style={{ padding: '18px 20px 12px', borderBottom: '1px solid #1d1d22', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <h3 style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: '#e6e6e9', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
                        Request History
                        <span style={{ marginLeft: 8, color: '#55555c', fontSize: '0.7rem' }}>{items.length}</span>
                    </h3>
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Filter by URL or method…"
                        autoFocus
                        style={{
                            flex: 1, maxWidth: 280, padding: '7px 12px',
                            background: '#0a0a0b', border: '1px solid #26262d', borderRadius: 6,
                            color: '#e6e6e9', fontSize: '0.82rem', fontFamily: 'JetBrains Mono, monospace', outline: 'none'
                        }}
                        data-testid="history-filter"
                    />
                </div>

                <div style={{ maxHeight: 460, overflowY: 'auto', padding: 8 }}>
                    {filtered.length === 0 && (
                        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#55555c', fontSize: '0.84rem', fontFamily: 'Inter, system-ui, sans-serif' }}>
                            {items.length === 0 ? (
                                <>No requests yet. Send one and it&apos;ll appear here.</>
                            ) : (
                                <>No matches for &quot;{query}&quot;.</>
                            )}
                        </div>
                    )}
                    {filtered.map(item => {
                        const color = methodColors[item.request.method as keyof typeof methodColors] || '#8b8b93'
                        const ok = item.response.status >= 200 && item.response.status < 300
                        return (
                            <div
                                key={item.id}
                                onClick={() => { onLoad(item.request); onClose() }}
                                role="button"
                                tabIndex={0}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '10px 12px', borderRadius: 7, cursor: 'pointer',
                                    transition: 'background 0.12s ease',
                                    fontFamily: 'JetBrains Mono, monospace',
                                    background: 'transparent'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#16161a' }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                                data-testid="history-item"
                            >
                                <span style={{
                                    color, fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.08em',
                                    minWidth: 56, textTransform: 'uppercase'
                                }}>
                                    {item.request.method}
                                </span>
                                <span style={{
                                    flex: 1, minWidth: 0,
                                    color: '#e6e6e9', fontSize: '0.78rem',
                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                }}>
                                    {item.request.url}
                                </span>
                                <span style={{
                                    color: ok ? '#00E676' : item.response.status >= 500 ? '#FF5252' : '#FFC107',
                                    fontSize: '0.7rem', fontWeight: 600,
                                    minWidth: 36, textAlign: 'right'
                                }}>
                                    {item.response.status}
                                </span>
                                <span style={{ color: '#55555c', fontSize: '0.66rem', minWidth: 60, textAlign: 'right' }}>
                                    {relativeTime(item.timestamp)}
                                </span>
                            </div>
                        )
                    })}
                </div>

                {items.length > 0 && (
                    <div style={{ padding: '10px 16px', borderTop: '1px solid #1d1d22', background: '#111113', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.66rem', color: '#55555c', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                            Stored locally · auth fields stripped
                        </span>
                        <button
                            onClick={handleClear}
                            style={{
                                padding: '6px 12px', background: 'transparent',
                                border: '1px solid rgba(255, 82, 82, 0.3)', borderRadius: 5,
                                color: '#FF5252', fontSize: '0.7rem', fontWeight: 600,
                                fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em',
                                textTransform: 'uppercase', cursor: 'pointer'
                            }}
                            data-testid="history-clear"
                        >
                            Clear All
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
