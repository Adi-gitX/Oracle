import { useState, useRef, useEffect } from 'react'
import styles from '../../styles/Postman.module.css'
import { HttpMethod, KeyValue, AuthConfig, RequestBody, RequestConfig, methodColors, defaultRequestConfig } from '../../lib/postman/types'
import { parseCurl, isCurlCommand } from '../../lib/postman/CurlParser'
import HeadersEditor from './HeadersEditor'
import ParamsEditor from './ParamsEditor'
import AuthEditor from './AuthEditor'
import BodyEditor from './BodyEditor'

interface PostmanInputProps {
    onSend: (config: RequestConfig) => Promise<void>
    loading: boolean
    initialConfig?: RequestConfig
}

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

export default function PostmanInput({ onSend, loading, initialConfig }: PostmanInputProps) {
    const [config, setConfig] = useState<RequestConfig>(initialConfig || defaultRequestConfig)
    const [showMethodDropdown, setShowMethodDropdown] = useState(false)
    const [activeTab, setActiveTab] = useState<'params' | 'headers' | 'auth' | 'body'>('params')
    const [showCurlModal, setShowCurlModal] = useState(false)
    const [curlInput, setCurlInput] = useState('')

    const dropdownRef = useRef<HTMLDivElement>(null)


    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowMethodDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])


    const handleUrlChange = (value: string) => {
        if (isCurlCommand(value)) {
            setCurlInput(value)
            setShowCurlModal(true)
        } else {
            setConfig(prev => ({ ...prev, url: value }))
        }
    }


    const handleCurlImport = () => {
        try {
            const parsed = parseCurl(curlInput)
            setConfig(parsed)
            setShowCurlModal(false)
            setCurlInput('')
        } catch (e) {
            console.error('Failed to parse cURL:', e)
        }
    }


    const handleSend = () => {
        if (!config.url.trim() || loading) return


        let url = config.url.trim()
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url
        }

        onSend({ ...config, url })
    }


    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault()
            handleSend()
        }
    }


    const updateHeaders = (headers: KeyValue[]) => setConfig(prev => ({ ...prev, headers }))
    const updateParams = (params: KeyValue[]) => setConfig(prev => ({ ...prev, params }))
    const updateAuth = (auth: AuthConfig) => setConfig(prev => ({ ...prev, auth }))
    const updateBody = (body: RequestBody) => setConfig(prev => ({ ...prev, body }))

    const getMethodColor = (method: HttpMethod) => methodColors[method]


    const enabledHeaders = config.headers.filter(h => h.enabled && h.key).length
    const enabledParams = config.params.filter(p => p.enabled && p.key).length

    return (
        <div className={styles.postmanInputContainer}>

            <div className={styles.requestBar}>

                <div className={styles.methodSelector} ref={dropdownRef}>
                    <button
                        className={styles.methodButton}
                        onClick={() => setShowMethodDropdown(!showMethodDropdown)}
                        style={{ color: getMethodColor(config.method) }}
                    >
                        {config.method}
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    </button>

                    {showMethodDropdown && (
                        <div className={styles.methodDropdown}>
                            {HTTP_METHODS.map(method => (
                                <button
                                    key={method}
                                    className={styles.methodOption}
                                    style={{ color: getMethodColor(method) }}
                                    onClick={() => {
                                        setConfig(prev => ({ ...prev, method }))
                                        setShowMethodDropdown(false)
                                    }}
                                >
                                    {method}
                                </button>
                            ))}
                        </div>
                    )}
                </div>


                <input
                    type="text"
                    className={styles.urlInput}
                    placeholder="Enter URL or paste cURL command..."
                    value={config.url}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                />


                <button
                    className={styles.sendButton}
                    onClick={handleSend}
                    disabled={loading || !config.url.trim()}
                >
                    {loading ? (
                        <>
                            <div className={styles.spinner} />
                            Sending...
                        </>
                    ) : (
                        <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="22" y1="2" x2="11" y2="13" />
                                <polygon points="22 2 15 22 11 13 2 9 22 2" />
                            </svg>
                            Send
                        </>
                    )}
                </button>
            </div>


            <div className={styles.tabContainer}>
                <div className={styles.tabHeader}>
                    <button
                        className={`${styles.tab} ${activeTab === 'params' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('params')}
                    >
                        Params
                        {enabledParams > 0 && <span className={styles.tabCount}>{enabledParams}</span>}
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'headers' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('headers')}
                    >
                        Headers
                        {enabledHeaders > 0 && <span className={styles.tabCount}>{enabledHeaders}</span>}
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'auth' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('auth')}
                    >
                        Auth
                        {config.auth.type !== 'none' && <span className={styles.tabCount}>●</span>}
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'body' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('body')}
                    >
                        Body
                        {config.body.type !== 'none' && <span className={styles.tabCount}>●</span>}
                    </button>


                    <button
                        className={styles.tab}
                        onClick={() => setShowCurlModal(true)}
                        style={{ marginLeft: 'auto' }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        Import cURL
                    </button>
                </div>

                <div className={styles.tabContent}>
                    {activeTab === 'params' && (
                        <ParamsEditor params={config.params} onChange={updateParams} />
                    )}
                    {activeTab === 'headers' && (
                        <HeadersEditor headers={config.headers} onChange={updateHeaders} />
                    )}
                    {activeTab === 'auth' && (
                        <AuthEditor auth={config.auth} onChange={updateAuth} />
                    )}
                    {activeTab === 'body' && (
                        <BodyEditor body={config.body} onChange={updateBody} />
                    )}
                </div>
            </div>


            {showCurlModal && (
                <div className={styles.curlModal} onClick={() => setShowCurlModal(false)}>
                    <div className={styles.curlModalContent} onClick={e => e.stopPropagation()}>
                        <div className={styles.curlModalHeader}>
                            <h3 className={styles.curlModalTitle}>Import cURL Command</h3>
                            <button
                                className={styles.curlModalClose}
                                onClick={() => setShowCurlModal(false)}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                        <div className={styles.curlModalBody}>
                            <textarea
                                className={styles.curlTextarea}
                                placeholder="Paste your cURL command here..."
                                value={curlInput}
                                onChange={(e) => setCurlInput(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className={styles.curlModalActions}>
                            <button
                                className={styles.curlCancelButton}
                                onClick={() => {
                                    setShowCurlModal(false)
                                    setCurlInput('')
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                className={styles.curlImportButton}
                                onClick={handleCurlImport}
                                disabled={!curlInput.trim()}
                            >
                                Import
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
