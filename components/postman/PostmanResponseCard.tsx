

import { useState } from 'react'
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
    const statusBg = isSuccess ? 'rgba(0, 230, 118, 0.12)' : isClientError ? 'rgba(255, 193, 7, 0.12)' : isServerError ? 'rgba(255, 82, 82, 0.12)' : 'rgba(158, 158, 158, 0.12)'

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

    return (
        <div style={{
            background: 'linear-gradient(145deg, rgba(18, 18, 18, 0.95), rgba(10, 10, 10, 0.98))',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.03) inset',
            animation: 'cardSlide 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
            marginTop: '12px'
        }}>

            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                background: 'linear-gradient(to right, rgba(255, 108, 55, 0.06), transparent)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.04)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                        padding: '5px 10px',
                        background: `${methodColors[request.method]}15`,
                        borderRadius: '8px',
                        color: methodColors[request.method],
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        fontFamily: "'SF Mono', 'Geist Mono', monospace",
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>
                        {request.method}
                    </span>
                    <span style={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontSize: '0.85rem',
                        fontFamily: "'SF Mono', 'Geist Mono', monospace",
                        maxWidth: '400px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}>
                        {request.url.replace(/^https?:\/\//, '')}
                    </span>
                </div>
            </div>


            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 18px',
                background: 'rgba(0, 0, 0, 0.2)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.04)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 14px',
                        background: statusBg,
                        borderRadius: '10px',
                        border: `1px solid ${statusColor}20`
                    }}>
                        <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: statusColor,
                            boxShadow: `0 0 8px ${statusColor}`
                        }} />
                        <span style={{
                            color: statusColor,
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            fontFamily: "'SF Mono', 'Geist Mono', monospace"
                        }}>
                            {response.status} {response.statusText}
                        </span>
                    </div>


                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255, 255, 255, 0.45)', fontSize: '0.8rem' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                            <span style={{ fontFamily: "'SF Mono', 'Geist Mono', monospace" }}>{response.time}ms</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255, 255, 255, 0.45)', fontSize: '0.8rem' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                            </svg>
                            <span style={{ fontFamily: "'SF Mono', 'Geist Mono', monospace" }}>{formatSize(response.size)}</span>
                        </div>
                    </div>
                </div>
            </div>


            <div style={{
                display: 'flex',
                gap: '4px',
                padding: '8px 14px',
                background: 'rgba(0, 0, 0, 0.3)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.04)'
            }}>
                {(['body', 'headers'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            padding: '10px 18px',
                            background: activeTab === tab ? 'rgba(255, 108, 55, 0.1)' : 'transparent',
                            border: 'none',
                            borderRadius: '8px',
                            color: activeTab === tab ? '#FF6C37' : 'rgba(255, 255, 255, 0.45)',
                            fontSize: '0.85rem',
                            fontWeight: activeTab === tab ? 600 : 400,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            position: 'relative'
                        }}
                    >
                        {tab === 'body' ? 'Body' : `Headers (${Object.keys(response.headers).length})`}
                        {activeTab === tab && (
                            <span style={{
                                position: 'absolute',
                                bottom: '-8px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                width: '24px',
                                height: '2px',
                                background: '#FF6C37',
                                borderRadius: '2px'
                            }} />
                        )}
                    </button>
                ))}
            </div>


            <div style={{
                maxHeight: '280px',
                overflowY: 'auto',
                background: 'rgba(0, 0, 0, 0.3)'
            }}>
                {activeTab === 'body' ? (
                    <pre style={{
                        margin: 0,
                        padding: '16px 18px',
                        color: '#e0e0e0',
                        fontSize: '0.82rem',
                        fontFamily: "'SF Mono', 'Geist Mono', 'JetBrains Mono', monospace",
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                    }}>
                        {formatBody(response.body)}
                    </pre>
                ) : (
                    <div style={{ padding: '14px 18px' }}>
                        {Object.entries(response.headers).map(([key, value], i) => (
                            <div
                                key={key}
                                style={{
                                    display: 'flex',
                                    gap: '16px',
                                    padding: '10px 0',
                                    borderBottom: i < Object.entries(response.headers).length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none'
                                }}
                            >
                                <span style={{
                                    color: '#FF6C37',
                                    fontWeight: 600,
                                    fontSize: '0.82rem',
                                    minWidth: '180px',
                                    fontFamily: "'SF Mono', 'Geist Mono', monospace"
                                }}>
                                    {key}
                                </span>
                                <span style={{
                                    color: 'rgba(255, 255, 255, 0.7)',
                                    fontSize: '0.82rem',
                                    fontFamily: "'SF Mono', 'Geist Mono', monospace"
                                }}>
                                    {String(value)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>


            <div style={{
                display: 'flex',
                gap: '10px',
                padding: '14px 18px',
                borderTop: '1px solid rgba(255, 255, 255, 0.04)',
                background: 'rgba(0, 0, 0, 0.2)'
            }}>
                <button
                    onClick={() => copyToClipboard(response.body, 'response')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '10px 16px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '10px',
                        color: copied === 'response' ? '#00E676' : 'rgba(255, 255, 255, 0.6)',
                        fontSize: '0.82rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
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
                    {copied === 'response' ? 'Copied!' : 'Copy Response'}
                </button>

                <button
                    onClick={() => copyToClipboard(exportToCurl(request), 'curl')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '10px 16px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '10px',
                        color: copied === 'curl' ? '#00E676' : 'rgba(255, 255, 255, 0.6)',
                        fontSize: '0.82rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
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
                    {copied === 'curl' ? 'Copied!' : 'Copy cURL'}
                </button>

                {onRetry && (
                    <button
                        onClick={onRetry}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '10px 16px',
                            background: 'linear-gradient(135deg, rgba(255, 108, 55, 0.12), rgba(255, 108, 55, 0.08))',
                            border: '1px solid rgba(255, 108, 55, 0.25)',
                            borderRadius: '10px',
                            color: '#FF6C37',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            marginLeft: 'auto'
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="23 4 23 10 17 10" />
                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                        </svg>
                        Retry
                    </button>
                )}
            </div>

            <style jsx>{`
                @keyframes cardSlide {
                    from {
                        opacity: 0;
                        transform: translateY(12px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    )
}
