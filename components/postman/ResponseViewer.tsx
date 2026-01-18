import { useState } from 'react'
import styles from '../../styles/Postman.module.css'
import { ResponseData, methodColors, HttpMethod } from '../../lib/postman/types'

interface ResponseViewerProps {
    response: ResponseData | null
    loading: boolean
    error?: string
    method?: HttpMethod
}

export default function ResponseViewer({ response, loading, error, method }: ResponseViewerProps) {
    const [activeTab, setActiveTab] = useState<'body' | 'headers' | 'cookies'>('body')
    const [copySuccess, setCopySuccess] = useState(false)

    // Format response body (try JSON pretty print)
    const formatBody = (body: string): string => {
        try {
            const parsed = JSON.parse(body)
            return JSON.stringify(parsed, null, 2)
        } catch {
            return body
        }
    }

    // Format file size
    const formatSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
    }

    // Get status class
    const getStatusClass = (status: number): string => {
        if (status >= 200 && status < 300) return styles.status2xx
        if (status >= 300 && status < 400) return styles.status3xx
        if (status >= 400 && status < 500) return styles.status4xx
        return styles.status5xx
    }

    // Copy to clipboard
    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text)
            setCopySuccess(true)
            setTimeout(() => setCopySuccess(false), 2000)
        } catch (e) {
            console.error('Failed to copy:', e)
        }
    }

    // Download response
    const downloadResponse = () => {
        if (!response) return

        const blob = new Blob([response.body], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `response-${Date.now()}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    // Loading state
    if (loading) {
        return (
            <div className={styles.responseContainer}>
                <div className={styles.responseHeader}>
                    <span className={styles.responseTitle}>Response</span>
                </div>
                <div className={styles.loading}>
                    <div className={styles.spinner} />
                    <span>Sending request...</span>
                </div>
            </div>
        )
    }

    // Error state
    if (error) {
        return (
            <div className={styles.responseContainer}>
                <div className={styles.responseHeader}>
                    <span className={styles.responseTitle}>Response</span>
                </div>
                <div className={styles.responseBody}>
                    <div className={styles.errorMessage}>
                        <strong>Error:</strong> {error}
                    </div>
                </div>
            </div>
        )
    }

    // Empty state
    if (!response) {
        return (
            <div className={styles.responseContainer}>
                <div className={styles.responseHeader}>
                    <span className={styles.responseTitle}>Response</span>
                </div>
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>📡</div>
                    <div className={styles.emptyTitle}>No response yet</div>
                    <div className={styles.emptyText}>
                        Enter a URL and click Send to make a request
                    </div>
                </div>
            </div>
        )
    }

    // Headers count
    const headersCount = Object.keys(response.headers).length

    return (
        <div className={styles.responseContainer}>
            {/* Header with stats */}
            <div className={styles.responseHeader}>
                <span className={styles.responseTitle}>Response</span>
                <div className={styles.responseStats}>
                    <span className={`${styles.statusBadge} ${getStatusClass(response.status)}`}>
                        {response.status} {response.statusText}
                    </span>
                    <span className={styles.responseStat}>
                        ⏱️ {response.time}ms
                    </span>
                    <span className={styles.responseStat}>
                        📦 {formatSize(response.size)}
                    </span>
                </div>
            </div>

            {/* Tabs */}
            <div className={styles.tabHeader}>
                <button
                    className={`${styles.tab} ${activeTab === 'body' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('body')}
                >
                    Body
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'headers' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('headers')}
                >
                    Headers
                    <span className={styles.tabCount}>{headersCount}</span>
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'cookies' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('cookies')}
                >
                    Cookies
                    {response.cookies && response.cookies.length > 0 && (
                        <span className={styles.tabCount}>{response.cookies.length}</span>
                    )}
                </button>
            </div>

            {/* Content */}
            <div className={styles.responseBody}>
                {activeTab === 'body' && (
                    <div className={styles.responseCode}>
                        <pre>{formatBody(response.body)}</pre>
                    </div>
                )}

                {activeTab === 'headers' && (
                    <div className={styles.kvEditor}>
                        {Object.entries(response.headers).map(([key, value]) => (
                            <div key={key} className={styles.kvRow}>
                                <span className={styles.kvInput} style={{ flex: '0 0 200px', background: 'transparent', border: 'none' }}>
                                    {key}
                                </span>
                                <span className={styles.kvInput} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)' }}>
                                    {value}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'cookies' && (
                    <div>
                        {response.cookies && response.cookies.length > 0 ? (
                            <div className={styles.kvEditor}>
                                {response.cookies.map((cookie, idx) => (
                                    <div key={idx} className={styles.kvRow}>
                                        <span className={styles.kvInput} style={{ flex: '0 0 150px', background: 'transparent', border: 'none' }}>
                                            {cookie.name}
                                        </span>
                                        <span className={styles.kvInput} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)' }}>
                                            {cookie.value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={styles.emptyState}>
                                <div className={styles.emptyText}>No cookies in response</div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className={styles.responseActions}>
                <button
                    className={styles.responseAction}
                    onClick={() => copyToClipboard(response.body)}
                >
                    {copySuccess ? (
                        <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00C896" strokeWidth="2">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                            Copied!
                        </>
                    ) : (
                        <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                            Copy
                        </>
                    )}
                </button>
                <button
                    className={styles.responseAction}
                    onClick={downloadResponse}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download
                </button>
            </div>
        </div>
    )
}
