// Canvas Panel - Postman editor that slides in from the right like Gemini canvas

import { useState, useEffect, useRef } from 'react'
import styles from '../../styles/Canvas.module.css'
import postmanStyles from '../../styles/Postman.module.css'
import { RequestConfig, ResponseData, RequestHistoryItem, methodColors } from '../../lib/postman/types'
import { addToHistory, generateId, getHistory } from '../../lib/postman/storage'
import { exportToCurl, parseCurl, isCurlCommand } from '../../lib/postman/CurlParser'

interface CanvasPanelProps {
    isOpen: boolean
    onClose: () => void
    initialConfig?: RequestConfig
    onRequestComplete?: (request: RequestConfig, response: ResponseData) => void
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const

const defaultConfig: RequestConfig = {
    method: 'GET',
    url: '',
    headers: [],
    params: [],
    auth: { type: 'none' },
    body: { type: 'none' }
}

export default function CanvasPanel({ isOpen, onClose, initialConfig, onRequestComplete }: CanvasPanelProps) {
    const [config, setConfig] = useState<RequestConfig>(initialConfig || defaultConfig)
    const [response, setResponse] = useState<ResponseData | null>(null)
    const [loading, setLoading] = useState(false)
    const [activeTab, setActiveTab] = useState<'params' | 'headers' | 'auth' | 'body'>('params')
    const [responseTab, setResponseTab] = useState<'body' | 'headers'>('body')
    const [showMethodMenu, setShowMethodMenu] = useState(false)
    const [history, setHistory] = useState<RequestHistoryItem[]>([])
    const [showHistory, setShowHistory] = useState(false)

    // Load initial config when it changes
    useEffect(() => {
        if (initialConfig) {
            setConfig(initialConfig)
        }
    }, [initialConfig])

    // Load history
    useEffect(() => {
        if (isOpen) {
            setHistory(getHistory().slice(0, 10))
        }
    }, [isOpen])

    // Execute request
    const executeRequest = async () => {
        if (!config.url.trim()) return

        setLoading(true)
        setResponse(null)

        try {
            // Build headers
            const headers: Record<string, string> = {}
            config.headers.filter(h => h.enabled && h.key).forEach(h => {
                headers[h.key] = h.value
            })

            // Add auth
            if (config.auth.type === 'bearer' && config.auth.bearer?.token) {
                headers['Authorization'] = `Bearer ${config.auth.bearer.token}`
            } else if (config.auth.type === 'basic' && config.auth.basic) {
                const encoded = btoa(`${config.auth.basic.username}:${config.auth.basic.password}`)
                headers['Authorization'] = `Basic ${encoded}`
            } else if (config.auth.type === 'apikey' && config.auth.apikey?.addTo === 'header') {
                headers[config.auth.apikey.key] = config.auth.apikey.value
            }

            // Build URL
            let url = config.url
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url
            }

            const enabledParams = config.params.filter(p => p.enabled && p.key)
            if (config.auth.type === 'apikey' && config.auth.apikey?.addTo === 'query') {
                enabledParams.push({
                    key: config.auth.apikey.key,
                    value: config.auth.apikey.value,
                    enabled: true
                })
            }

            if (enabledParams.length > 0) {
                const queryString = enabledParams
                    .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
                    .join('&')
                url += (url.includes('?') ? '&' : '?') + queryString
            }

            // Build body
            let body: string | undefined
            if (config.body.type === 'json' && config.body.raw) {
                headers['Content-Type'] = 'application/json'
                body = config.body.raw
            } else if (config.body.type === 'raw' && config.body.raw) {
                body = config.body.raw
            } else if (config.body.type === 'x-www-form-urlencoded' && config.body.urlencoded) {
                headers['Content-Type'] = 'application/x-www-form-urlencoded'
                body = config.body.urlencoded.filter(p => p.enabled)
                    .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
                    .join('&')
            }

            const res = await fetch('/api/postman', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ method: config.method, url, headers, body, timeout: 30000 })
            })

            const data = await res.json()

            if (data.error) {
                throw new Error(data.error)
            }

            const responseData: ResponseData = {
                status: data.status,
                statusText: data.statusText,
                headers: data.headers,
                body: data.body,
                time: data.time,
                size: data.size
            }

            setResponse(responseData)

            // Save to history
            const historyItem = {
                id: generateId(),
                timestamp: Date.now(),
                request: { ...config, url },
                response: responseData
            }
            addToHistory(historyItem)
            setHistory(prev => [historyItem, ...prev.slice(0, 9)])

            // Notify parent
            if (onRequestComplete) {
                onRequestComplete({ ...config, url }, responseData)
            }
        } catch (e) {
            setResponse({
                status: 0,
                statusText: 'Error',
                headers: {},
                body: JSON.stringify({ error: e instanceof Error ? e.message : 'Request failed' }),
                time: 0,
                size: 0
            })
        } finally {
            setLoading(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault()
            executeRequest()
        }
    }

    const loadFromHistory = (item: RequestHistoryItem) => {
        setConfig(item.request)
        setResponse(item.response)
        setShowHistory(false)
    }

    const methodColor = methodColors[config.method]

    const getStatusColor = () => {
        if (!response) return '#888'
        if (response.status >= 200 && response.status < 300) return '#00C896'
        if (response.status >= 400 && response.status < 500) return '#FFC107'
        if (response.status >= 500) return '#E53935'
        return '#888'
    }

    const formatBody = (bodyStr: string) => {
        try {
            return JSON.stringify(JSON.parse(bodyStr), null, 2)
        } catch {
            return bodyStr
        }
    }

    if (!isOpen) return null

    return (
        <div className={`${styles.canvasPanel} ${isOpen ? styles.open : ''}`} onKeyDown={handleKeyDown}>
            {/* Resize handle */}
            <div className={styles.canvasResizer} />

            {/* Header */}
            <div className={styles.canvasHeader}>
                <div className={styles.canvasTitle}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                    API Request Editor
                </div>
                <div className={styles.canvasActions}>
                    <button
                        className={styles.canvasActionBtn}
                        onClick={() => setShowHistory(!showHistory)}
                        title="History"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                    </button>
                    <button
                        className={styles.canvasActionBtn}
                        onClick={() => navigator.clipboard.writeText(exportToCurl(config))}
                        title="Copy as cURL"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="16 18 22 12 16 6" />
                            <polyline points="8 6 2 12 8 18" />
                        </svg>
                    </button>
                    <button
                        className={`${styles.canvasActionBtn} ${styles.canvasCloseBtn}`}
                        onClick={onClose}
                        title="Close"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* History dropdown */}
            {showHistory && (
                <div style={{
                    position: 'absolute',
                    top: '60px',
                    right: '20px',
                    width: '300px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    background: 'rgba(18, 18, 18, 0.98)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    zIndex: 100
                }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontWeight: 600 }}>
                        Recent Requests
                    </div>
                    {history.length === 0 ? (
                        <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                            No history yet
                        </div>
                    ) : (
                        history.map(item => (
                            <button
                                key={item.id}
                                onClick={() => loadFromHistory(item)}
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    background: 'transparent',
                                    border: 'none',
                                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    cursor: 'pointer',
                                    textAlign: 'left'
                                }}
                            >
                                <span style={{
                                    color: methodColors[item.request.method],
                                    fontWeight: 700,
                                    fontSize: '0.75rem',
                                    fontFamily: "'Geist Mono', monospace"
                                }}>
                                    {item.request.method}
                                </span>
                                <span style={{
                                    flex: 1,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    color: 'rgba(255,255,255,0.8)',
                                    fontSize: '0.85rem'
                                }}>
                                    {item.request.url.replace(/^https?:\/\//, '')}
                                </span>
                                <span style={{
                                    color: item.response.status >= 200 && item.response.status < 300 ? '#00C896' : '#E53935',
                                    fontSize: '0.75rem',
                                    fontWeight: 600
                                }}>
                                    {item.response.status}
                                </span>
                            </button>
                        ))
                    )}
                </div>
            )}

            {/* Content */}
            <div className={styles.canvasContent}>
                {/* URL Bar */}
                <div style={{
                    display: 'flex',
                    gap: '8px',
                    marginBottom: '16px',
                    background: '#141414',
                    padding: '12px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.06)'
                }}>
                    {/* Method */}
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => setShowMethodMenu(!showMethodMenu)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '10px 14px',
                                background: `${methodColor}15`,
                                border: `1px solid ${methodColor}30`,
                                borderRadius: '8px',
                                color: methodColor,
                                fontWeight: 700,
                                fontSize: '0.8rem',
                                fontFamily: "'Geist Mono', monospace",
                                cursor: 'pointer',
                                minWidth: '95px'
                            }}
                        >
                            {config.method}
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        </button>
                        {showMethodMenu && (
                            <div style={{
                                position: 'absolute',
                                top: 'calc(100% + 4px)',
                                left: 0,
                                background: 'rgba(18,18,18,0.98)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                padding: '4px',
                                zIndex: 50
                            }}>
                                {HTTP_METHODS.map(m => (
                                    <button
                                        key={m}
                                        onClick={() => {
                                            setConfig(prev => ({ ...prev, method: m }))
                                            setShowMethodMenu(false)
                                        }}
                                        style={{
                                            display: 'block',
                                            width: '100%',
                                            padding: '8px 12px',
                                            background: config.method === m ? 'rgba(255,255,255,0.05)' : 'transparent',
                                            border: 'none',
                                            borderRadius: '4px',
                                            color: methodColors[m],
                                            fontWeight: 700,
                                            fontSize: '0.8rem',
                                            fontFamily: "'Geist Mono', monospace",
                                            textAlign: 'left',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* URL Input */}
                    <input
                        type="text"
                        value={config.url}
                        onChange={(e) => {
                            const val = e.target.value
                            if (isCurlCommand(val)) {
                                try {
                                    setConfig(parseCurl(val))
                                } catch { }
                            } else {
                                setConfig(prev => ({ ...prev, url: val }))
                            }
                        }}
                        placeholder="Enter URL or paste cURL..."
                        style={{
                            flex: 1,
                            padding: '10px 14px',
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '0.9rem',
                            fontFamily: "'Geist Mono', monospace",
                            outline: 'none'
                        }}
                    />

                    {/* Send Button */}
                    <button
                        onClick={executeRequest}
                        disabled={loading || !config.url.trim()}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '10px 20px',
                            background: 'linear-gradient(135deg, #FF6C37, #FF4F1F)',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#fff',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            cursor: loading || !config.url.trim() ? 'not-allowed' : 'pointer',
                            opacity: loading || !config.url.trim() ? 0.5 : 1
                        }}
                    >
                        {loading ? (
                            <span style={{
                                width: '14px',
                                height: '14px',
                                border: '2px solid rgba(255,255,255,0.3)',
                                borderTopColor: '#fff',
                                borderRadius: '50%',
                                animation: 'spin 0.8s linear infinite'
                            }} />
                        ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="22" y1="2" x2="11" y2="13" />
                                <polygon points="22 2 15 22 11 13 2 9 22 2" />
                            </svg>
                        )}
                        Send
                    </button>
                </div>

                {/* Request Tabs */}
                <div className={styles.canvasTabs}>
                    {(['params', 'headers', 'auth', 'body'] as const).map(tab => (
                        <button
                            key={tab}
                            className={`${styles.canvasTab} ${activeTab === tab ? styles.active : ''}`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div style={{
                    padding: '16px',
                    background: '#111',
                    borderRadius: '0 0 12px 12px',
                    marginBottom: '16px',
                    maxHeight: '200px',
                    overflowY: 'auto'
                }}>
                    {activeTab === 'params' && (
                        <KeyValueEditor
                            items={config.params}
                            onChange={(params) => setConfig(prev => ({ ...prev, params }))}
                            keyPlaceholder="Parameter"
                            valuePlaceholder="Value"
                        />
                    )}
                    {activeTab === 'headers' && (
                        <div>
                            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                                {[
                                    { key: 'Content-Type', value: 'application/json' },
                                    { key: 'Accept', value: 'application/json' },
                                    { key: 'Authorization', value: 'Bearer ' },
                                ].map(preset => (
                                    <button
                                        key={preset.key}
                                        onClick={() => {
                                            if (!config.headers.some(h => h.key === preset.key)) {
                                                setConfig(prev => ({
                                                    ...prev,
                                                    headers: [...prev.headers, { ...preset, enabled: true }]
                                                }))
                                            }
                                        }}
                                        style={{
                                            padding: '4px 10px',
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            borderRadius: '4px',
                                            color: 'rgba(255,255,255,0.5)',
                                            fontSize: '0.75rem',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        + {preset.key}
                                    </button>
                                ))}
                            </div>
                            <KeyValueEditor
                                items={config.headers}
                                onChange={(headers) => setConfig(prev => ({ ...prev, headers }))}
                                keyPlaceholder="Header"
                                valuePlaceholder="Value"
                            />
                        </div>
                    )}
                    {activeTab === 'auth' && (
                        <AuthSection auth={config.auth} onChange={(auth) => setConfig(prev => ({ ...prev, auth }))} />
                    )}
                    {activeTab === 'body' && (
                        <BodySection
                            body={config.body}
                            onChange={(body) => setConfig(prev => ({ ...prev, body }))}
                            method={config.method}
                        />
                    )}
                </div>

                {/* Response */}
                {response && (
                    <div style={{
                        background: '#141414',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.06)',
                        overflow: 'hidden'
                    }}>
                        {/* Response header */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            background: 'rgba(255,255,255,0.02)',
                            borderBottom: '1px solid rgba(255,255,255,0.06)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{
                                    padding: '4px 10px',
                                    background: `${getStatusColor()}20`,
                                    color: getStatusColor(),
                                    borderRadius: '6px',
                                    fontWeight: 600,
                                    fontSize: '0.85rem',
                                    fontFamily: "'Geist Mono', monospace"
                                }}>
                                    {response.status} {response.statusText}
                                </span>
                                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
                                    {response.time}ms
                                </span>
                                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
                                    {response.size > 1024 ? `${(response.size / 1024).toFixed(1)} KB` : `${response.size} B`}
                                </span>
                            </div>
                            <button
                                onClick={() => navigator.clipboard.writeText(response.body)}
                                style={{
                                    padding: '6px 12px',
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '6px',
                                    color: 'rgba(255,255,255,0.6)',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer'
                                }}
                            >
                                Copy
                            </button>
                        </div>

                        {/* Response tabs */}
                        <div className={styles.canvasTabs}>
                            <button
                                className={`${styles.canvasTab} ${responseTab === 'body' ? styles.active : ''}`}
                                onClick={() => setResponseTab('body')}
                            >
                                Body
                            </button>
                            <button
                                className={`${styles.canvasTab} ${responseTab === 'headers' ? styles.active : ''}`}
                                onClick={() => setResponseTab('headers')}
                            >
                                Headers ({Object.keys(response.headers).length})
                            </button>
                        </div>

                        {/* Response body */}
                        <div style={{
                            padding: '16px',
                            maxHeight: '300px',
                            overflowY: 'auto',
                            background: '#0d0d0d'
                        }}>
                            {responseTab === 'body' ? (
                                <pre style={{
                                    margin: 0,
                                    color: '#e0e0e0',
                                    fontSize: '0.85rem',
                                    fontFamily: "'Geist Mono', monospace",
                                    lineHeight: 1.5,
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word'
                                }}>
                                    {formatBody(response.body)}
                                </pre>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {Object.entries(response.headers).map(([key, value]) => (
                                        <div key={key} style={{ display: 'flex', gap: '12px', fontSize: '0.85rem' }}>
                                            <span style={{ color: '#FF6C37', minWidth: '150px' }}>{key}:</span>
                                            <span style={{ color: 'rgba(255,255,255,0.7)' }}>{String(value)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <style jsx global>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    )
}

// Simple Key-Value Editor
function KeyValueEditor({ items, onChange, keyPlaceholder, valuePlaceholder }: {
    items: any[]
    onChange: (items: any[]) => void
    keyPlaceholder: string
    valuePlaceholder: string
}) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {items.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={(e) => {
                            const updated = [...items]
                            updated[i] = { ...item, enabled: e.target.checked }
                            onChange(updated)
                        }}
                        style={{ accentColor: '#FF6C37' }}
                    />
                    <input
                        type="text"
                        value={item.key}
                        onChange={(e) => {
                            const updated = [...items]
                            updated[i] = { ...item, key: e.target.value }
                            onChange(updated)
                        }}
                        placeholder={keyPlaceholder}
                        style={{
                            flex: 1,
                            padding: '8px 12px',
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '6px',
                            color: item.enabled ? '#fff' : 'rgba(255,255,255,0.3)',
                            fontSize: '0.85rem',
                            fontFamily: "'Geist Mono', monospace",
                            outline: 'none'
                        }}
                    />
                    <input
                        type="text"
                        value={item.value}
                        onChange={(e) => {
                            const updated = [...items]
                            updated[i] = { ...item, value: e.target.value }
                            onChange(updated)
                        }}
                        placeholder={valuePlaceholder}
                        style={{
                            flex: 1,
                            padding: '8px 12px',
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '6px',
                            color: item.enabled ? '#fff' : 'rgba(255,255,255,0.3)',
                            fontSize: '0.85rem',
                            fontFamily: "'Geist Mono', monospace",
                            outline: 'none'
                        }}
                    />
                    <button
                        onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                        style={{
                            width: '28px',
                            height: '28px',
                            background: 'transparent',
                            border: 'none',
                            color: 'rgba(255,255,255,0.3)',
                            cursor: 'pointer'
                        }}
                    >
                        ×
                    </button>
                </div>
            ))}
            <button
                onClick={() => onChange([...items, { key: '', value: '', enabled: true }])}
                style={{
                    padding: '8px 12px',
                    background: 'transparent',
                    border: '1px dashed rgba(255,255,255,0.15)',
                    borderRadius: '6px',
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                }}
            >
                + Add
            </button>
        </div>
    )
}

// Auth Section
function AuthSection({ auth, onChange }: { auth: any, onChange: (auth: any) => void }) {
    const types = ['none', 'bearer', 'basic', 'apikey'] as const

    return (
        <div>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
                {types.map(type => (
                    <button
                        key={type}
                        onClick={() => {
                            const newAuth: any = { type }
                            if (type === 'bearer') newAuth.bearer = { token: '' }
                            if (type === 'basic') newAuth.basic = { username: '', password: '' }
                            if (type === 'apikey') newAuth.apikey = { key: 'X-API-Key', value: '', addTo: 'header' }
                            onChange(newAuth)
                        }}
                        style={{
                            padding: '8px 14px',
                            background: auth.type === type ? 'rgba(255,108,55,0.1)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${auth.type === type ? 'rgba(255,108,55,0.3)' : 'rgba(255,255,255,0.08)'}`,
                            borderRadius: '8px',
                            color: auth.type === type ? '#FF6C37' : 'rgba(255,255,255,0.6)',
                            fontSize: '0.85rem',
                            cursor: 'pointer'
                        }}
                    >
                        {type === 'none' ? 'No Auth' : type === 'bearer' ? 'Bearer' : type === 'basic' ? 'Basic' : 'API Key'}
                    </button>
                ))}
            </div>

            {auth.type === 'bearer' && (
                <input
                    type="text"
                    value={auth.bearer?.token || ''}
                    onChange={(e) => onChange({ ...auth, bearer: { token: e.target.value } })}
                    placeholder="Enter bearer token"
                    style={{
                        width: '100%',
                        padding: '10px 14px',
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '0.9rem',
                        outline: 'none'
                    }}
                />
            )}

            {auth.type === 'basic' && (
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                        type="text"
                        value={auth.basic?.username || ''}
                        onChange={(e) => onChange({ ...auth, basic: { ...auth.basic, username: e.target.value } })}
                        placeholder="Username"
                        style={{
                            flex: 1,
                            padding: '10px 14px',
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '0.9rem',
                            outline: 'none'
                        }}
                    />
                    <input
                        type="password"
                        value={auth.basic?.password || ''}
                        onChange={(e) => onChange({ ...auth, basic: { ...auth.basic, password: e.target.value } })}
                        placeholder="Password"
                        style={{
                            flex: 1,
                            padding: '10px 14px',
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '0.9rem',
                            outline: 'none'
                        }}
                    />
                </div>
            )}

            {auth.type === 'apikey' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            type="text"
                            value={auth.apikey?.key || ''}
                            onChange={(e) => onChange({ ...auth, apikey: { ...auth.apikey, key: e.target.value } })}
                            placeholder="Key name"
                            style={{
                                flex: 1,
                                padding: '10px 14px',
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '0.9rem',
                                outline: 'none'
                            }}
                        />
                        <input
                            type="text"
                            value={auth.apikey?.value || ''}
                            onChange={(e) => onChange({ ...auth, apikey: { ...auth.apikey, value: e.target.value } })}
                            placeholder="Value"
                            style={{
                                flex: 1,
                                padding: '10px 14px',
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '0.9rem',
                                outline: 'none'
                            }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {['header', 'query'].map(addTo => (
                            <button
                                key={addTo}
                                onClick={() => onChange({ ...auth, apikey: { ...auth.apikey, addTo } })}
                                style={{
                                    padding: '8px 14px',
                                    background: auth.apikey?.addTo === addTo ? 'rgba(255,108,55,0.1)' : 'rgba(255,255,255,0.03)',
                                    border: `1px solid ${auth.apikey?.addTo === addTo ? 'rgba(255,108,55,0.3)' : 'rgba(255,255,255,0.08)'}`,
                                    borderRadius: '6px',
                                    color: auth.apikey?.addTo === addTo ? '#FF6C37' : 'rgba(255,255,255,0.6)',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer'
                                }}
                            >
                                {addTo === 'header' ? 'Header' : 'Query Param'}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {auth.type === 'none' && (
                <div style={{ padding: '16px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                    No authentication configured
                </div>
            )}
        </div>
    )
}

// Body Section
function BodySection({ body, onChange, method }: { body: any, onChange: (body: any) => void, method: string }) {
    if (method === 'GET' || method === 'HEAD') {
        return (
            <div style={{ padding: '16px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                {method} requests do not have a body
            </div>
        )
    }

    const types = ['none', 'json', 'form-data', 'x-www-form-urlencoded', 'raw'] as const

    return (
        <div>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                {types.map(type => (
                    <button
                        key={type}
                        onClick={() => {
                            const newBody: any = { type }
                            if (type === 'json' || type === 'raw') newBody.raw = ''
                            if (type === 'form-data') newBody.formData = []
                            if (type === 'x-www-form-urlencoded') newBody.urlencoded = []
                            onChange(newBody)
                        }}
                        style={{
                            padding: '6px 12px',
                            background: body.type === type ? 'rgba(255,108,55,0.1)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${body.type === type ? 'rgba(255,108,55,0.3)' : 'rgba(255,255,255,0.08)'}`,
                            borderRadius: '6px',
                            color: body.type === type ? '#FF6C37' : 'rgba(255,255,255,0.6)',
                            fontSize: '0.8rem',
                            cursor: 'pointer'
                        }}
                    >
                        {type}
                    </button>
                ))}
            </div>

            {(body.type === 'json' || body.type === 'raw') && (
                <textarea
                    value={body.raw || ''}
                    onChange={(e) => onChange({ ...body, raw: e.target.value })}
                    placeholder={body.type === 'json' ? '{\n  "key": "value"\n}' : 'Enter raw body...'}
                    rows={6}
                    style={{
                        width: '100%',
                        padding: '12px',
                        background: 'rgba(0,0,0,0.4)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '8px',
                        color: '#e0e0e0',
                        fontSize: '0.85rem',
                        fontFamily: "'Geist Mono', monospace",
                        resize: 'vertical',
                        outline: 'none'
                    }}
                />
            )}

            {(body.type === 'form-data' || body.type === 'x-www-form-urlencoded') && (
                <KeyValueEditor
                    items={body.type === 'form-data' ? (body.formData || []) : (body.urlencoded || [])}
                    onChange={(items) => onChange({
                        ...body,
                        [body.type === 'form-data' ? 'formData' : 'urlencoded']: items
                    })}
                    keyPlaceholder="Key"
                    valuePlaceholder="Value"
                />
            )}

            {body.type === 'none' && (
                <div style={{ padding: '16px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                    No body configured
                </div>
            )}
        </div>
    )
}
