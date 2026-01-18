import { useState, useRef, useEffect } from 'react'
import styles from '../styles/Dashboard.module.css'
import postmanStyles from '../styles/Postman.module.css'

export type AppMode = 'check' | 'chat' | 'postman'

interface ChatInputProps {
    onSend: (message: string) => void
    disabled?: boolean
    isCentered?: boolean
    mode: AppMode
    onModeChange: (mode: AppMode) => void
}

export default function ChatInput({ onSend, disabled, isCentered = false, mode, onModeChange }: ChatInputProps) {
    const [input, setInput] = useState('')
    const [showModeMenu, setShowModeMenu] = useState(false)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const menuRef = useRef<HTMLDivElement>(null)

    const adjustHeight = () => {
        const textarea = textareaRef.current
        if (textarea) {
            textarea.style.height = 'auto'
            textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
        }
    }

    useEffect(() => {
        adjustHeight()
    }, [input])

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowModeMenu(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            if (e.repeat) return
            e.preventDefault()
            handleSend()
        }
    }

    const handleSend = () => {
        if (!input.trim() || disabled) return
        onSend(input)
        setInput('')
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
        }
    }

    const getPlaceholder = () => {
        switch (mode) {
            case 'chat':
                return "Ask Oracle about your keys..."
            case 'postman':
                return "Paste URL, cURL, or describe your API request..."
            default:
                return "Paste API keys to verify..."
        }
    }

    const getModeLabel = () => {
        switch (mode) {
            case 'chat':
                return 'Chat'
            case 'postman':
                return 'Postman'
            default:
                return 'Check'
        }
    }

    const getModeColor = () => {
        switch (mode) {
            case 'chat':
                return { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' }
            case 'postman':
                return { color: '#FF6C37', bg: 'rgba(255, 108, 55, 0.1)' }
            default:
                return { color: 'rgba(255,255,255,0.5)', bg: 'transparent' }
        }
    }

    const modeStyle = getModeColor()

    const modes: { key: AppMode; label: string; icon: JSX.Element; color: string; description: string }[] = [
        {
            key: 'check',
            label: 'Check Mode',
            description: 'Validate API keys',
            icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
            ),
            color: '#00E676'
        },
        {
            key: 'chat',
            label: 'Chat Mode',
            description: 'Ask about APIs',
            icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
            ),
            color: '#3b82f6'
        },
        {
            key: 'postman',
            label: 'Postman Mode',
            description: 'Test API endpoints',
            icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
            ),
            color: '#FF6C37'
        }
    ]

    return (
        <div className={styles.inputWrapper} style={mode === 'postman' ? { borderColor: 'rgba(255, 108, 55, 0.3)' } : {}}>
            <textarea
                ref={textareaRef}
                className={styles.textarea}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={getPlaceholder()}
                rows={1}
                disabled={disabled}
            />

            <div className={styles.inputActions}>
                <div className={styles.actionLeft}>
                    <button className={styles.actionBtn}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                        </svg>
                        Attach
                    </button>

                    {/* Mode Selector */}
                    <div style={{ position: 'relative' }} ref={menuRef}>
                        <button
                            className={styles.actionBtn}
                            onClick={() => setShowModeMenu(!showModeMenu)}
                            style={{
                                color: modeStyle.color,
                                background: modeStyle.bg,
                                borderColor: mode !== 'check' ? `${modeStyle.color}33` : 'transparent'
                            }}
                        >
                            {modes.find(m => m.key === mode)?.icon}
                            {getModeLabel()}
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: '2px' }}>
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        </button>

                        {showModeMenu && (
                            <div style={{
                                position: 'absolute',
                                top: 'calc(100% + 8px)',
                                left: '0',
                                background: 'rgba(18, 18, 18, 0.98)',
                                backdropFilter: 'blur(20px)',
                                WebkitBackdropFilter: 'blur(20px)',
                                border: '1px solid rgba(255,255,255,0.12)',
                                borderRadius: '14px',
                                padding: '6px',
                                minWidth: '220px',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05) inset',
                                zIndex: 9999
                            }}>
                                {modes.map(m => (
                                    <button
                                        key={m.key}
                                        onClick={() => {
                                            onModeChange(m.key)
                                            setShowModeMenu(false)
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            background: mode === m.key ? `${m.color}18` : 'transparent',
                                            border: mode === m.key ? `1px solid ${m.color}30` : '1px solid transparent',
                                            borderRadius: '10px',
                                            color: mode === m.key ? m.color : 'rgba(255,255,255,0.85)',
                                            fontSize: '0.875rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            textAlign: 'left',
                                            transition: 'all 0.15s ease',
                                            marginBottom: '2px'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (mode !== m.key) {
                                                e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (mode !== m.key) {
                                                e.currentTarget.style.background = 'transparent'
                                                e.currentTarget.style.borderColor = 'transparent'
                                            }
                                        }}
                                    >
                                        <span style={{
                                            color: m.color,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '34px',
                                            height: '34px',
                                            background: `${m.color}15`,
                                            borderRadius: '8px',
                                            flexShrink: 0
                                        }}>
                                            {m.icon}
                                        </span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{m.label}</div>
                                            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', marginTop: '1px' }}>
                                                {m.description}
                                            </div>
                                        </div>
                                        {mode === m.key && (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={m.color} strokeWidth="2.5" style={{ flexShrink: 0 }}>
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.actionRight}>
                    <button
                        className={styles.submitBtn}
                        onClick={handleSend}
                        disabled={disabled || !input.trim()}
                        style={mode === 'postman' ? { background: '#FF6C37' } : {}}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="19" x2="12" y2="5" />
                            <polyline points="5 12 12 5 19 12" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    )
}
