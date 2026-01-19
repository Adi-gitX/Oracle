import { useState, useEffect } from 'react'
import styles from '../../styles/Postman.module.css'
import PostmanInput from './PostmanInput'
import ResponseViewer from './ResponseViewer'
import { RequestConfig, ResponseData, KeyValue } from '../../lib/postman/types'
import { addToHistory, generateId } from '../../lib/postman/storage'
import { exportToCurl } from '../../lib/postman/CurlParser'

interface PostmanModeProps {
    onBack?: () => void
}

export default function PostmanMode({ onBack }: PostmanModeProps) {
    const [loading, setLoading] = useState(false)
    const [response, setResponse] = useState<ResponseData | null>(null)
    const [error, setError] = useState<string | undefined>()
    const [lastRequest, setLastRequest] = useState<RequestConfig | null>(null)

    const handleSendRequest = async (config: RequestConfig) => {
        setLoading(true)
        setError(undefined)
        setResponse(null)
        setLastRequest(config)

        try {

            const headers: Record<string, string> = {}


            config.headers.filter(h => h.enabled && h.key).forEach(h => {
                headers[h.key] = h.value
            })


            if (config.auth.type === 'bearer' && config.auth.bearer?.token) {
                headers['Authorization'] = `Bearer ${config.auth.bearer.token}`
            } else if (config.auth.type === 'basic' && config.auth.basic) {
                const encoded = btoa(`${config.auth.basic.username}:${config.auth.basic.password}`)
                headers['Authorization'] = `Basic ${encoded}`
            } else if (config.auth.type === 'apikey' && config.auth.apikey?.addTo === 'header') {
                headers[config.auth.apikey.key] = config.auth.apikey.value
            }


            let url = config.url
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


            let body: string | undefined
            if (config.body.type === 'json' && config.body.raw) {
                headers['Content-Type'] = 'application/json'
                body = config.body.raw
            } else if (config.body.type === 'raw' && config.body.raw) {
                body = config.body.raw
            } else if (config.body.type === 'x-www-form-urlencoded' && config.body.urlencoded) {
                headers['Content-Type'] = 'application/x-www-form-urlencoded'
                body = config.body.urlencoded
                    .filter(p => p.enabled)
                    .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
                    .join('&')
            } else if (config.body.type === 'form-data' && config.body.formData) {
                const formData = config.body.formData
                    .filter(p => p.enabled)
                    .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
                    .join('&')
                body = formData
            }


            const res = await fetch('/api/postman', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    method: config.method,
                    url,
                    headers,
                    body,
                    timeout: 30000
                })
            })

            const data = await res.json()

            if (data.error) {
                setError(data.error)
            } else {
                const responseData: ResponseData = {
                    status: data.status,
                    statusText: data.statusText,
                    headers: data.headers,
                    body: data.body,
                    time: data.time,
                    size: data.size
                }
                setResponse(responseData)


                addToHistory({
                    id: generateId(),
                    timestamp: Date.now(),
                    request: config,
                    response: responseData
                })
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to send request')
        } finally {
            setLoading(false)
        }
    }


    const copyAsCurl = () => {
        if (lastRequest) {
            const curl = exportToCurl(lastRequest)
            navigator.clipboard.writeText(curl)
        }
    }

    return (
        <div className={styles.postmanContainer}>
            <div className={styles.postmanContent}>

                {!response && !loading && !error && (
                    <div style={{
                        textAlign: 'center',
                        padding: '2rem 0',
                        marginBottom: '1rem'
                    }}>
                        <h2 style={{
                            fontSize: '1.5rem',
                            fontWeight: 700,
                            background: 'linear-gradient(180deg, #fff 0%, #999 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            marginBottom: '0.5rem'
                        }}>
                            Oracle API Tester
                        </h2>
                        <p style={{
                            color: 'rgba(255,255,255,0.5)',
                            fontSize: '0.95rem'
                        }}>
                            Test APIs without leaving the chat. Enter a URL, configure your request, and hit Send.
                        </p>
                    </div>
                )}


                <PostmanInput
                    onSend={handleSendRequest}
                    loading={loading}
                />


                <ResponseViewer
                    response={response}
                    loading={loading}
                    error={error}
                    method={lastRequest?.method}
                />


                {lastRequest && (
                    <div style={{
                        display: 'flex',
                        gap: '0.5rem',
                        justifyContent: 'center',
                        marginTop: '0.5rem'
                    }}>
                        <button
                            onClick={copyAsCurl}
                            style={{
                                padding: '0.5rem 1rem',
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
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                            Copy as cURL
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
