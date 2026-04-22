import { useState } from 'react'
import styles from '../../styles/Postman.module.css'
import { RequestConfig, ResponseData, methodColors } from '../../lib/postman/types'
import { exportToCurl } from '../../lib/postman/CurlParser'

interface PostmanResponseCardProps {
    request: RequestConfig
    response: ResponseData
    onRetry?: () => void
}

export default function PostmanResponseCard({ request, response, onRetry }: PostmanResponseCardProps) {
    const [activeTab, setActiveTab] = useState<'body' | 'headers'>('body')
    const [copied, setCopied] = useState<string | null>(null)

    const isSuccess = response.status >= 200 && response.status < 300
    const isClientError = response.status >= 400 && response.status < 500
    const isServerError = response.status >= 500

    const statusColor = isSuccess ? '#00E676' : isClientError ? '#FFC107' : isServerError ? '#FF5252' : '#9E9E9E'
    const statusBg = isSuccess ? 'rgba(0, 230, 118, 0.1)' : isClientError ? 'rgba(255, 193, 7, 0.1)' : isServerError ? 'rgba(255, 82, 82, 0.1)' : 'rgba(158, 158, 158, 0.1)'

    const formatBody = (body: string) => {
        try {
            return JSON.stringify(JSON.parse(body), null, 2)
        } catch {
            return body
        }
    }

    const copyToClipboard = (text: string, type: string) => {
        navigator.clipboard.writeText(text)
        setCopied(type)
        setTimeout(() => setCopied(null), 2000)
    }

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
    }

    const methodColor = methodColors[request.method]

    return (
        <div className={styles.responseCard} data-testid="postman-response-card">
            {/* Top: method + URL */}
            <div className={styles.respTopBar}>
                <span
                    className={styles.respMethodTag}
                    style={{ color: methodColor, background: `${methodColor}15` }}
                >
                    {request.method}
                </span>
                <span className={styles.respUrl}>
                    {request.url.replace(/^https?:\/\//, '')}
                </span>
            </div>

            {/* Stats: status, time, size */}
            <div className={styles.respStatsRow}>
                <span
                    className={styles.respStatusPill}
                    style={{ color: statusColor, background: statusBg, border: `1px solid ${statusColor}25` }}
                    data-testid="postman-response-status"
                >
                    {response.status} {response.statusText}
                </span>
                <span className={styles.respMeta}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                    </svg>
                    {response.time}ms
                </span>
                <span className={styles.respMeta}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                    </svg>
                    {formatSize(response.size)}
                </span>
            </div>

            {/* Tabs */}
            <div className={styles.respTabBar}>
                <button
                    className={`${styles.respTab} ${activeTab === 'body' ? styles.respTabActive : ''}`}
                    onClick={() => setActiveTab('body')}
                    data-testid="postman-resp-tab-body"
                >
                    Body
                </button>
                <button
                    className={`${styles.respTab} ${activeTab === 'headers' ? styles.respTabActive : ''}`}
                    onClick={() => setActiveTab('headers')}
                    data-testid="postman-resp-tab-headers"
                >
                    Headers ({Object.keys(response.headers).length})
                </button>
            </div>

            {/* Content */}
            <div className={styles.respBodyWrap}>
                {activeTab === 'body' ? (
                    <pre className={styles.respBodyPre} data-testid="postman-resp-body">{formatBody(response.body)}</pre>
                ) : (
                    <div className={styles.respHeadersList} data-testid="postman-resp-headers">
                        {Object.entries(response.headers).map(([key, value]) => (
                            <div key={key} className={styles.respHeaderRow}>
                                <span className={styles.respHeaderKey}>{key}</span>
                                <span className={styles.respHeaderValue}>{String(value)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className={styles.respActions}>
                <button
                    onClick={() => copyToClipboard(response.body, 'response')}
                    className={`${styles.respActionBtn} ${copied === 'response' ? styles.respActionCopied : ''}`}
                    data-testid="postman-copy-response-btn"
                >
                    {copied === 'response' ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                    )}
                    {copied === 'response' ? 'Copied' : 'Copy Response'}
                </button>

                <button
                    onClick={() => copyToClipboard(exportToCurl(request), 'curl')}
                    className={`${styles.respActionBtn} ${copied === 'curl' ? styles.respActionCopied : ''}`}
                    data-testid="postman-copy-curl-btn"
                >
                    {copied === 'curl' ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="16 18 22 12 16 6" />
                            <polyline points="8 6 2 12 8 18" />
                        </svg>
                    )}
                    {copied === 'curl' ? 'Copied' : 'Copy cURL'}
                </button>

                {onRetry && (
                    <button
                        onClick={onRetry}
                        className={`${styles.respActionBtn} ${styles.respActionPrimary}`}
                        data-testid="postman-retry-btn"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="23 4 23 10 17 10" />
                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                        </svg>
                        Retry
                    </button>
                )}
            </div>
        </div>
    )
}
