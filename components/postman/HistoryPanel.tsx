// Request History Panel - Shows past requests with quick replay

import { useState, useEffect } from 'react'
import styles from '../../styles/Postman.module.css'
import { RequestHistoryItem, methodColors } from '../../lib/postman/types'
import { getHistory, clearHistory } from '../../lib/postman/storage'

interface HistoryPanelProps {
    onSelectRequest: (item: RequestHistoryItem) => void
    isOpen: boolean
    onClose: () => void
}

export default function HistoryPanel({ onSelectRequest, isOpen, onClose }: HistoryPanelProps) {
    const [history, setHistory] = useState<RequestHistoryItem[]>([])
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        if (isOpen) {
            setHistory(getHistory())
        }
    }, [isOpen])

    const handleClear = () => {
        if (confirm('Clear all history?')) {
            clearHistory()
            setHistory([])
        }
    }

    const filteredHistory = history.filter(item =>
        item.request.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.request.method.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp)
        const now = new Date()
        const diff = now.getTime() - date.getTime()

        if (diff < 60000) return 'Just now'
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
        if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`

        return date.toLocaleDateString()
    }

    const extractDomain = (url: string) => {
        try {
            const parsed = new URL(url)
            return parsed.hostname + (parsed.pathname !== '/' ? parsed.pathname : '')
        } catch {
            return url
        }
    }

    if (!isOpen) return null

    return (
        <div className={styles.historyPanel}>
            {/* Header */}
            <div className={styles.historyHeader}>
                <h3>History</h3>
                <div className={styles.historyActions}>
                    <button onClick={handleClear} title="Clear history">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                    </button>
                    <button onClick={onClose} title="Close">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className={styles.historySearch}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                    type="text"
                    placeholder="Search history..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* History List */}
            <div className={styles.historyList}>
                {filteredHistory.length === 0 ? (
                    <div className={styles.historyEmpty}>
                        {searchQuery ? 'No matching requests' : 'No history yet'}
                    </div>
                ) : (
                    filteredHistory.map((item) => {
                        const methodColor = methodColors[item.request.method]
                        const isSuccess = item.response.status >= 200 && item.response.status < 300

                        return (
                            <button
                                key={item.id}
                                className={styles.historyItem}
                                onClick={() => onSelectRequest(item)}
                            >
                                <div className={styles.historyItemMain}>
                                    <span
                                        className={styles.historyMethod}
                                        style={{ color: methodColor }}
                                    >
                                        {item.request.method}
                                    </span>
                                    <span className={styles.historyUrl}>
                                        {extractDomain(item.request.url)}
                                    </span>
                                </div>
                                <div className={styles.historyItemMeta}>
                                    <span
                                        className={styles.historyStatus}
                                        style={{ color: isSuccess ? '#00C896' : '#E53935' }}
                                    >
                                        {item.response.status}
                                    </span>
                                    <span className={styles.historyTime}>
                                        {formatTime(item.timestamp)}
                                    </span>
                                </div>
                            </button>
                        )
                    })
                )}
            </div>
        </div>
    )
}
