import { useEffect, useState, useRef } from 'react'

export interface CommandItem {
    id: string
    label: string
    hint?: string
    shortcut?: string
    onSelect: () => void
    icon?: React.ReactNode
    group?: string
}

interface CommandPaletteProps {
    open: boolean
    commands: CommandItem[]
    onClose: () => void
}

export default function CommandPalette({ open, commands, onClose }: CommandPaletteProps) {
    const [query, setQuery] = useState('')
    const [active, setActive] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)
    const listRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!open) { setQuery(''); setActive(0); return }
        const t = setTimeout(() => inputRef.current?.focus(), 30)
        return () => clearTimeout(t)
    }, [open])

    const q = query.trim().toLowerCase()
    const filtered = q
        ? commands.filter(c => c.label.toLowerCase().includes(q) || (c.hint || '').toLowerCase().includes(q))
        : commands

    useEffect(() => { setActive(0) }, [query])

    useEffect(() => {
        if (!open) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, filtered.length - 1)) }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
            else if (e.key === 'Enter') {
                e.preventDefault()
                const item = filtered[active]
                if (item) { item.onSelect(); onClose() }
            }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [open, filtered, active, onClose])

    useEffect(() => {
        const el = listRef.current?.querySelector<HTMLElement>(`[data-cmd-idx="${active}"]`)
        el?.scrollIntoView({ block: 'nearest' })
    }, [active])

    if (!open) return null

    return (
        <div
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            style={{
                position: 'fixed', inset: 0,
                background: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                zIndex: 10001,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                paddingTop: '12vh',
                animation: 'oraclePaletteFade 0.18s ease-out'
            }}
        >
            <style jsx>{`
                @keyframes oraclePaletteFade {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes oraclePaletteSlide {
                    from { opacity: 0; transform: translateY(-12px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: 'min(620px, calc(100vw - 32px))',
                    background: '#0a0a0b',
                    border: '1px solid #26262d',
                    borderRadius: 14,
                    overflow: 'hidden',
                    boxShadow: '0 30px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03) inset',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    animation: 'oraclePaletteSlide 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
                data-testid="cmd-palette"
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid #1d1d22' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b8b93" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search actions, modes, pages…"
                        style={{
                            flex: 1, background: 'transparent', border: 'none', outline: 'none',
                            color: '#e6e6e9', fontSize: '0.95rem', fontFamily: 'inherit'
                        }}
                        data-testid="cmd-palette-input"
                    />
                    <kbd style={{
                        padding: '2px 7px', background: '#16161a', borderRadius: 4,
                        border: '1px solid #26262d', color: '#8b8b93', fontSize: '0.66rem',
                        fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.06em'
                    }}>ESC</kbd>
                </div>

                <div ref={listRef} style={{ maxHeight: 360, overflowY: 'auto', padding: '6px' }}>
                    {filtered.length === 0 && (
                        <div style={{ padding: '32px 18px', textAlign: 'center', color: '#55555c', fontSize: '0.86rem' }}>
                            No results for &quot;{query}&quot;
                        </div>
                    )}
                    {filtered.map((cmd, i) => (
                        <div
                            key={cmd.id}
                            data-cmd-idx={i}
                            onMouseEnter={() => setActive(i)}
                            onClick={() => { cmd.onSelect(); onClose() }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                                padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                                background: i === active ? '#16161a' : 'transparent',
                                borderLeft: i === active ? '2px solid #FF6C37' : '2px solid transparent',
                                transition: 'background 0.1s ease'
                            }}
                            data-testid={`cmd-palette-item-${cmd.id}`}
                        >
                            {cmd.icon && (
                                <span style={{ width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#8b8b93' }}>
                                    {cmd.icon}
                                </span>
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ color: '#e6e6e9', fontSize: '0.9rem', fontWeight: 500 }}>{cmd.label}</div>
                                {cmd.hint && (
                                    <div style={{ color: '#55555c', fontSize: '0.72rem', marginTop: 2 }}>{cmd.hint}</div>
                                )}
                            </div>
                            {cmd.shortcut && (
                                <kbd style={{
                                    padding: '2px 7px', background: '#0a0a0b', borderRadius: 4,
                                    border: '1px solid #26262d', color: '#8b8b93', fontSize: '0.65rem',
                                    fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.06em'
                                }}>{cmd.shortcut}</kbd>
                            )}
                        </div>
                    ))}
                </div>

                <div style={{
                    padding: '8px 14px', borderTop: '1px solid #1d1d22', background: '#111113',
                    display: 'flex', alignItems: 'center', gap: 14, fontSize: '0.66rem',
                    fontFamily: 'JetBrains Mono, monospace', color: '#55555c', letterSpacing: '0.08em', textTransform: 'uppercase'
                }}>
                    <span>↑↓ Navigate</span>
                    <span>↵ Select</span>
                    <span style={{ marginLeft: 'auto', color: '#FF6C37' }}>⌘K</span>
                </div>
            </div>
        </div>
    )
}
