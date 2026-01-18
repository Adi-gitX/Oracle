// Postman Response Card - Beautiful inline response display

import { useState } from 'react'
import styles from '../../styles/Dashboard.module.css'
import { ResponseData, RequestConfig, methodColors, HttpMethod } from '../../lib/postman/types'
import { exportToCurl } from '../../lib/postman/CurlParser'

interface PostmanResponseCardProps {
    request: RequestConfig
    response: ResponseData
    onRetry?: () => void
}

export default function PostmanResponseCard({ request, response, onRetry }: PostmanResponseCardProps) {
    const [activeTab, setActiveTab] = useState<'body' | 'headers'>('body')
    const [copied, setCopied] = useState(false)
    const [expanded, setExpanded] = useState(true)

    // Format response body
    const formatBody = (body: string): string => {
        try {
            const parsed = JSON.parse(body)
            return JSON.stringify(parsed, null, 2)
        } catch {
            return body
        }
    }

    // Get status color
    const getStatusColor = (status: number): string => {
        if (status >= 200 && status < 300) return '#00C896'
        if (status >= 300 && status < 400) return '#2196F3'
        if (status >= 400 && status < 500) return '#F9A825'
        return '#E53935'
    }

    // Format size
    const formatSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    // Copy response
    const copyResponse = async () => {
        await navigator.clipboard.writeText(response.body)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    // Copy as cURL
    const copyCurl = async () => {
        const curl = exportToCurl(request)
        await navigator.clipboard.writeText(curl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const methodColor = methodColors[request.method]
    const statusColor = getStatusColor(response.status)
    const isSuccess = response.status >= 200 && response.status < 300

    return (
        <div style={{
            background: '#141414',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            overflow: 'hidden',
            marginTop: '1rem'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 1.25rem',
                background: 'linear-gradient(to right, rgba(255,255,255,0.02), transparent)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                cursor: 'pointer'
            }} onClick={() => setExpanded(!expanded)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Method Badge */}
                    <span style={{
                        padding: '4px 10px',
                        background: `${methodColor}20`,
                        color: methodColor,
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        fontFamily: "'Geist Mono', monospace"
                    }}>
                        {request.method}
                    </span>

                    {/* URL */}
                    <span style={{
                        color: 'rgba(255,255,255,0.7)',
                        fontSize: '0.9rem',
                        fontFamily: "'Geist Mono', monospace",
                        maxWidth: '400px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}>
                        {request.url}
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {/* Status Badge */}
                    <span style={{
                        padding: '4px 12px',
                        background: `${statusColor}15`,
                        color: statusColor,
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        fontFamily: "'Geist Mono', monospace",
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}>
                        {isSuccess && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={statusColor} strokeWidth="3">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        )}
                        {response.status} {response.statusText}
                    </span>

                    {/* Time & Size */}
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
                        {response.time}ms · {formatSize(response.size)}
                    </span>

                    {/* Expand/Collapse */}
                    <svg
                        width="16" height="16" viewBox="0 0 24 24"
                        fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2"
                        style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                    >
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </div>
            </div>

            {/* Content */}
            {expanded && (
                <>
                    {/* Tabs */}
                    <div style={{
                        display: 'flex',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        background: '#111'
                    }}>
                        <button
                            onClick={() => setActiveTab('body')}
                            style={{
                                padding: '0.75rem 1.25rem',
                                background: 'transparent',
                                border: 'none',
                                color: activeTab === 'body' ? '#fff' : 'rgba(255,255,255,0.5)',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                position: 'relative'
                            }}
                        >
                            Body
                            {activeTab === 'body' && (
                                <div style={{
                                    position: 'absolute',
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    height: '2px',
                                    background: '#FF6C37'
                                }} />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('headers')}
                            style={{
                                padding: '0.75rem 1.25rem',
                                background: 'transparent',
                                border: 'none',
                                color: activeTab === 'headers' ? '#fff' : 'rgba(255,255,255,0.5)',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                position: 'relative'
                            }}
                        >
                            Headers
                            <span style={{
                                marginLeft: '6px',
                                padding: '2px 6px',
                                background: 'rgba(255,255,255,0.1)',
                                borderRadius: '4px',
                                fontSize: '0.7rem'
                            }}>
                                {Object.keys(response.headers).length}
                            </span>
                            {activeTab === 'headers' && (
                                <div style={{
                                    position: 'absolute',
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    height: '2px',
                                    background: '#FF6C37'
                                }} />
                            )}
                        </button>
                    </div>

                    {/* Body Content */}
                    {activeTab === 'body' && (
                        <div style={{
                            padding: '1rem',
                            maxHeight: '400px',
                            overflow: 'auto'
                        }}>
                            <pre style={{
                                margin: 0,
                                padding: '1rem',
                                background: '#0d0d0d',
                                borderRadius: '8px',
                                color: '#e0e0e0',
                                fontSize: '0.85rem',
                                fontFamily: "'Geist Mono', monospace",
                                lineHeight: '1.5',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                overflow: 'auto'
                            }}>
                                {formatBody(response.body)}
                            </pre>
                        </div>
                    )}

                    {/* Headers Content */}
                    {activeTab === 'headers' && (
                        <div style={{ padding: '1rem' }}>
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.5rem'
                            }}>
                                {Object.entries(response.headers).map(([key, value]) => (
                                    <div key={key} style={{
                                        display: 'flex',
                                        gap: '1rem',
                                        padding: '0.5rem 0.75rem',
                                        background: 'rgba(255,255,255,0.02)',
                                        borderRadius: '6px'
                                    }}>
                                        <span style={{
                                            color: '#FF6C37',
                                            fontSize: '0.85rem',
                                            fontFamily: "'Geist Mono', monospace",
                                            minWidth: '180px'
                                        }}>
                                            {key}
                                        </span>
                                        <span style={{
                                            color: 'rgba(255,255,255,0.7)',
                                            fontSize: '0.85rem',
                                            fontFamily: "'Geist Mono', monospace",
                                            wordBreak: 'break-all'
                                        }}>
                                            {value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div style={{
                        display: 'flex',
                        gap: '0.5rem',
                        padding: '0.75rem 1rem',
                        borderTop: '1px solid rgba(255,255,255,0.06)',
                        background: '#111'
                    }}>
                        <button
                            onClick={copyResponse}
                            style={{
                                padding: '0.5rem 0.875rem',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '6px',
                                color: copied ? '#00C896' : 'rgba(255,255,255,0.6)',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all 0.2s'
                            }}
                        >
                            {copied ? (
                                <>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                                    Copy Response
                                </>
                            )}
                        </button>
                        <button
                            onClick={copyCurl}
                            style={{
                                padding: '0.5rem 0.875rem',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '6px',
                                color: 'rgba(255,255,255,0.6)',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="16 18 22 12 16 6" />
                                <polyline points="8 6 2 12 8 18" />
                            </svg>
                            Copy cURL
                        </button>
                        {onRetry && (
                            <button
                                onClick={onRetry}
                                style={{
                                    padding: '0.5rem 0.875rem',
                                    background: 'rgba(255, 108, 55, 0.1)',
                                    border: '1px solid rgba(255, 108, 55, 0.3)',
                                    borderRadius: '6px',
                                    color: '#FF6C37',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
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
                </>
            )}
        </div>
    )
}
