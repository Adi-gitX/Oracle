import { useState, useRef, useEffect } from 'react'
import styles from '../styles/Dashboard.module.css'

interface ChatInputProps {
    onSend: (message: string) => void
    disabled?: boolean
    isCentered?: boolean
    isChatMode: boolean
    onToggleMode: () => void
}

export default function ChatInput({ onSend, disabled, isCentered = false, isChatMode, onToggleMode }: ChatInputProps) {
    const [input, setInput] = useState('')
    const textareaRef = useRef<HTMLTextAreaElement>(null)

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

    return (
        <div className={styles.inputWrapper}>
            <textarea
                ref={textareaRef}
                className={styles.textarea}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isChatMode ? "Ask Oracle about your keys..." : "Paste API keys to verify..."}
                rows={1}
                disabled={disabled}
            />

            <div className={styles.inputActions}>
                <div className={styles.actionLeft}>
                    <button className={styles.actionBtn}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                        Attach
                    </button>
                    <button className={styles.actionBtn}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                        Theme
                    </button>
                </div>

                <div className={styles.actionRight}>
                    <button
                        className={styles.actionBtn}
                        onClick={onToggleMode}
                        style={isChatMode ? { color: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)' } : {}}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        Chat
                    </button>
                    <button
                        className={styles.submitBtn}
                        onClick={handleSend}
                        disabled={disabled || !input.trim()}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
                    </button>
                </div>
            </div>
        </div>
    )
}
