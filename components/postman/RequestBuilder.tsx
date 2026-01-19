

import { useState, useEffect } from 'react'
import styles from '../../styles/Postman.module.css'
import { RequestConfig, HttpMethod, KeyValue, AuthConfig, RequestBody, methodColors } from '../../lib/postman/types'
import { parseCurl, isCurlCommand, exportToCurl } from '../../lib/postman/CurlParser'

interface RequestBuilderProps {
    onSend: (config: RequestConfig) => void
    loading: boolean
    initialConfig?: RequestConfig
}

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

const defaultConfig: RequestConfig = {
    method: 'GET',
    url: '',
    headers: [],
    params: [],
    auth: { type: 'none' },
    body: { type: 'none' }
}

export default function RequestBuilder({ onSend, loading, initialConfig }: RequestBuilderProps) {
    const [config, setConfig] = useState<RequestConfig>(initialConfig || defaultConfig)
    const [activeTab, setActiveTab] = useState<'params' | 'headers' | 'auth' | 'body'>('params')
    const [showMethodMenu, setShowMethodMenu] = useState(false)
    const [curlInput, setCurlInput] = useState('')
    const [showCurlImport, setShowCurlImport] = useState(false)


    useEffect(() => {
        if (initialConfig) {
            setConfig(initialConfig)
        }
    }, [initialConfig])


    useEffect(() => {
        try {
            const url = new URL(config.url)
            const urlParams: KeyValue[] = []
            url.searchParams.forEach((value, key) => {
                urlParams.push({ key, value, enabled: true })
            })
            if (urlParams.length > 0 && config.params.length === 0) {
                setConfig(prev => ({ ...prev, params: urlParams }))
            }
        } catch { }
    }, [config.url])

    const handleSend = () => {
        if (!config.url.trim()) return


        let finalUrl = config.url
        if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
            finalUrl = 'https://' + finalUrl
        }

        onSend({ ...config, url: finalUrl })
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault()
            handleSend()
        }
    }

    const handleCurlImport = () => {
        if (isCurlCommand(curlInput)) {
            try {
                const parsed = parseCurl(curlInput)
                setConfig(parsed)
                setShowCurlImport(false)
                setCurlInput('')
            } catch (e) {
                alert('Failed to parse cURL command')
            }
        }
    }

    const updateParams = (params: KeyValue[]) => {
        setConfig(prev => ({ ...prev, params }))
    }

    const updateHeaders = (headers: KeyValue[]) => {
        setConfig(prev => ({ ...prev, headers }))
    }

    const updateAuth = (auth: AuthConfig) => {
        setConfig(prev => ({ ...prev, auth }))
    }

    const updateBody = (body: RequestBody) => {
        setConfig(prev => ({ ...prev, body }))
    }

    const methodColor = methodColors[config.method]


    const activeParamsCount = config.params.filter(p => p.enabled && p.key).length
    const activeHeadersCount = config.headers.filter(h => h.enabled && h.key).length

    return (
        <div className={styles.requestBuilder} onKeyDown={handleKeyDown}>

            <div className={styles.urlBar}>

                <div style={{ position: 'relative' }}>
                    <button
                        className={styles.methodSelector}
                        onClick={() => setShowMethodMenu(!showMethodMenu)}
                        style={{
                            color: methodColor,
                            background: `${methodColor}15`,
                            borderColor: `${methodColor}30`
                        }}
                    >
                        {config.method}
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    </button>

                    {showMethodMenu && (
                        <div className={styles.methodDropdown}>
                            {HTTP_METHODS.map(method => (
                                <button
                                    key={method}
                                    onClick={() => {
                                        setConfig(prev => ({ ...prev, method }))
                                        setShowMethodMenu(false)
                                    }}
                                    style={{ color: methodColors[method] }}
                                    className={config.method === method ? styles.methodActive : ''}
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
                    onChange={(e) => {
                        const value = e.target.value
                        if (isCurlCommand(value)) {
                            try {
                                const parsed = parseCurl(value)
                                setConfig(parsed)
                            } catch { }
                        } else {
                            setConfig(prev => ({ ...prev, url: value }))
                        }
                    }}
                />


                <button
                    className={styles.sendButton}
                    onClick={handleSend}
                    disabled={loading || !config.url.trim()}
                >
                    {loading ? (
                        <span className={styles.spinner} />
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


            <div className={styles.tabBar}>
                <button
                    className={`${styles.tab} ${activeTab === 'params' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('params')}
                >
                    Params
                    {activeParamsCount > 0 && <span className={styles.tabBadge}>{activeParamsCount}</span>}
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'headers' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('headers')}
                >
                    Headers
                    {activeHeadersCount > 0 && <span className={styles.tabBadge}>{activeHeadersCount}</span>}
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'auth' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('auth')}
                >
                    Auth
                    {config.auth.type !== 'none' && <span className={styles.tabBadgeActive}>●</span>}
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'body' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('body')}
                >
                    Body
                    {config.body.type !== 'none' && <span className={styles.tabBadgeActive}>●</span>}
                </button>


                <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                    <button
                        className={styles.tabAction}
                        onClick={() => setShowCurlImport(true)}
                        title="Import cURL"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="16 18 22 12 16 6" />
                            <polyline points="8 6 2 12 8 18" />
                        </svg>
                        Import
                    </button>
                    <button
                        className={styles.tabAction}
                        onClick={() => {
                            navigator.clipboard.writeText(exportToCurl(config))
                        }}
                        title="Copy as cURL"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        cURL
                    </button>
                </div>
            </div>


            <div className={styles.tabContent}>
                {activeTab === 'params' && (
                    <KeyValueEditor
                        items={config.params}
                        onChange={updateParams}
                        keyPlaceholder="Parameter name"
                        valuePlaceholder="Value"
                    />
                )}

                {activeTab === 'headers' && (
                    <div>
                        <div className={styles.presetButtons}>
                            {[
                                { key: 'Content-Type', value: 'application/json' },
                                { key: 'Accept', value: 'application/json' },
                                { key: 'Authorization', value: 'Bearer ' },
                            ].map(preset => (
                                <button
                                    key={preset.key}
                                    className={styles.presetButton}
                                    onClick={() => {
                                        if (!config.headers.some(h => h.key === preset.key)) {
                                            updateHeaders([...config.headers, { ...preset, enabled: true }])
                                        }
                                    }}
                                >
                                    + {preset.key}
                                </button>
                            ))}
                        </div>
                        <KeyValueEditor
                            items={config.headers}
                            onChange={updateHeaders}
                            keyPlaceholder="Header name"
                            valuePlaceholder="Value"
                        />
                    </div>
                )}

                {activeTab === 'auth' && (
                    <AuthEditor auth={config.auth} onChange={updateAuth} />
                )}

                {activeTab === 'body' && (
                    <BodyEditor body={config.body} onChange={updateBody} method={config.method} />
                )}
            </div>


            {showCurlImport && (
                <div className={styles.modal} onClick={() => setShowCurlImport(false)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <h3>Import cURL Command</h3>
                        <textarea
                            className={styles.curlTextarea}
                            placeholder="Paste your cURL command here..."
                            value={curlInput}
                            onChange={e => setCurlInput(e.target.value)}
                            rows={6}
                        />
                        <div className={styles.modalActions}>
                            <button onClick={() => setShowCurlImport(false)}>Cancel</button>
                            <button className={styles.primaryBtn} onClick={handleCurlImport}>Import</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}


function KeyValueEditor({
    items,
    onChange,
    keyPlaceholder,
    valuePlaceholder
}: {
    items: KeyValue[]
    onChange: (items: KeyValue[]) => void
    keyPlaceholder: string
    valuePlaceholder: string
}) {
    const addRow = () => {
        onChange([...items, { key: '', value: '', enabled: true }])
    }

    const updateRow = (index: number, field: 'key' | 'value' | 'enabled', newValue: string | boolean) => {
        const updated = [...items]
        updated[index] = { ...updated[index], [field]: newValue }
        onChange(updated)
    }

    const deleteRow = (index: number) => {
        onChange(items.filter((_, i) => i !== index))
    }

    return (
        <div className={styles.kvEditor}>
            {items.map((item, index) => (
                <div key={index} className={styles.kvRow}>
                    <input
                        type="checkbox"
                        className={styles.kvCheckbox}
                        checked={item.enabled}
                        onChange={(e) => updateRow(index, 'enabled', e.target.checked)}
                    />
                    <input
                        type="text"
                        className={`${styles.kvInput} ${!item.enabled ? styles.kvDisabled : ''}`}
                        placeholder={keyPlaceholder}
                        value={item.key}
                        onChange={(e) => updateRow(index, 'key', e.target.value)}
                    />
                    <input
                        type="text"
                        className={`${styles.kvInput} ${!item.enabled ? styles.kvDisabled : ''}`}
                        placeholder={valuePlaceholder}
                        value={item.value}
                        onChange={(e) => updateRow(index, 'value', e.target.value)}
                    />
                    <button className={styles.kvDelete} onClick={() => deleteRow(index)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
            ))}
            <button className={styles.addRowBtn} onClick={addRow}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add
            </button>
        </div>
    )
}


function AuthEditor({ auth, onChange }: { auth: AuthConfig, onChange: (auth: AuthConfig) => void }) {
    const [showPassword, setShowPassword] = useState(false)

    const authTypes = [
        { type: 'none' as const, label: 'No Auth' },
        { type: 'bearer' as const, label: 'Bearer Token' },
        { type: 'basic' as const, label: 'Basic Auth' },
        { type: 'apikey' as const, label: 'API Key' },
    ]

    const setAuthType = (type: typeof auth.type) => {
        const newAuth: AuthConfig = { type }
        if (type === 'bearer') newAuth.bearer = { token: '' }
        if (type === 'basic') newAuth.basic = { username: '', password: '' }
        if (type === 'apikey') newAuth.apikey = { key: 'X-API-Key', value: '', addTo: 'header' }
        onChange(newAuth)
    }

    return (
        <div className={styles.authEditor}>
            <div className={styles.authTypes}>
                {authTypes.map(({ type, label }) => (
                    <button
                        key={type}
                        className={`${styles.authTypeBtn} ${auth.type === type ? styles.authTypeActive : ''}`}
                        onClick={() => setAuthType(type)}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <div className={styles.authContent}>
                {auth.type === 'none' && (
                    <div className={styles.authEmpty}>
                        This request does not use any authorization.
                    </div>
                )}

                {auth.type === 'bearer' && (
                    <div className={styles.authField}>
                        <label>Token</label>
                        <input
                            type="text"
                            placeholder="Enter bearer token"
                            value={auth.bearer?.token || ''}
                            onChange={(e) => onChange({ ...auth, bearer: { token: e.target.value } })}
                        />
                        <span className={styles.authHint}>Will be sent as: Authorization: Bearer &lt;token&gt;</span>
                    </div>
                )}

                {auth.type === 'basic' && (
                    <>
                        <div className={styles.authField}>
                            <label>Username</label>
                            <input
                                type="text"
                                placeholder="Username"
                                value={auth.basic?.username || ''}
                                onChange={(e) => onChange({
                                    ...auth,
                                    basic: { username: e.target.value, password: auth.basic?.password || '' }
                                })}
                            />
                        </div>
                        <div className={styles.authField}>
                            <label>Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Password"
                                    value={auth.basic?.password || ''}
                                    onChange={(e) => onChange({
                                        ...auth,
                                        basic: { username: auth.basic?.username || '', password: e.target.value }
                                    })}
                                />
                                <button
                                    type="button"
                                    className={styles.passwordToggle}
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? '👁️' : '👁️‍🗨️'}
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {auth.type === 'apikey' && (
                    <>
                        <div className={styles.authField}>
                            <label>Key Name</label>
                            <input
                                type="text"
                                placeholder="Header or param name"
                                value={auth.apikey?.key || ''}
                                onChange={(e) => onChange({
                                    ...auth,
                                    apikey: { ...auth.apikey!, key: e.target.value }
                                })}
                            />
                        </div>
                        <div className={styles.authField}>
                            <label>Value</label>
                            <input
                                type="text"
                                placeholder="API key value"
                                value={auth.apikey?.value || ''}
                                onChange={(e) => onChange({
                                    ...auth,
                                    apikey: { ...auth.apikey!, value: e.target.value }
                                })}
                            />
                        </div>
                        <div className={styles.authField}>
                            <label>Add to</label>
                            <div className={styles.authToggle}>
                                <button
                                    className={auth.apikey?.addTo === 'header' ? styles.active : ''}
                                    onClick={() => onChange({ ...auth, apikey: { ...auth.apikey!, addTo: 'header' } })}
                                >
                                    Header
                                </button>
                                <button
                                    className={auth.apikey?.addTo === 'query' ? styles.active : ''}
                                    onClick={() => onChange({ ...auth, apikey: { ...auth.apikey!, addTo: 'query' } })}
                                >
                                    Query Param
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}


function BodyEditor({
    body,
    onChange,
    method
}: {
    body: RequestBody
    onChange: (body: RequestBody) => void
    method: HttpMethod
}) {
    const [jsonError, setJsonError] = useState<string | null>(null)

    const bodyTypes = [
        { type: 'none' as const, label: 'none' },
        { type: 'json' as const, label: 'JSON' },
        { type: 'form-data' as const, label: 'form-data' },
        { type: 'x-www-form-urlencoded' as const, label: 'x-www-form-urlencoded' },
        { type: 'raw' as const, label: 'raw' },
    ]


    useEffect(() => {
        if (body.type === 'json' && body.raw) {
            try {
                JSON.parse(body.raw)
                setJsonError(null)
            } catch (e) {
                setJsonError((e as Error).message)
            }
        } else {
            setJsonError(null)
        }
    }, [body.type, body.raw])

    const setBodyType = (type: typeof body.type) => {
        const newBody: RequestBody = { type }
        if (type === 'json' || type === 'raw') newBody.raw = body.raw || ''
        if (type === 'form-data') newBody.formData = body.formData || []
        if (type === 'x-www-form-urlencoded') newBody.urlencoded = body.urlencoded || []
        onChange(newBody)
    }

    const formatJSON = () => {
        if (body.raw) {
            try {
                const parsed = JSON.parse(body.raw)
                onChange({ ...body, raw: JSON.stringify(parsed, null, 2) })
            } catch { }
        }
    }

    if (method === 'GET' || method === 'HEAD') {
        return (
            <div className={styles.authEmpty}>
                {method} requests do not have a body.
            </div>
        )
    }

    return (
        <div className={styles.bodyEditor}>
            <div className={styles.bodyTypes}>
                {bodyTypes.map(({ type, label }) => (
                    <button
                        key={type}
                        className={`${styles.bodyTypeBtn} ${body.type === type ? styles.bodyTypeActive : ''}`}
                        onClick={() => setBodyType(type)}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <div className={styles.bodyContent}>
                {body.type === 'none' && (
                    <div className={styles.authEmpty}>
                        This request does not have a body.
                    </div>
                )}

                {(body.type === 'json' || body.type === 'raw') && (
                    <div>
                        {body.type === 'json' && (
                            <div className={styles.bodyActions}>
                                <span>application/json</span>
                                <button onClick={formatJSON}>Format JSON</button>
                            </div>
                        )}
                        <textarea
                            className={`${styles.bodyTextarea} ${jsonError ? styles.bodyError : ''}`}
                            placeholder={body.type === 'json' ? '{\n  "key": "value"\n}' : 'Enter raw body...'}
                            value={body.raw || ''}
                            onChange={(e) => onChange({ ...body, raw: e.target.value })}
                            rows={8}
                        />
                        {jsonError && (
                            <div className={styles.jsonError}>Invalid JSON: {jsonError}</div>
                        )}
                    </div>
                )}

                {body.type === 'form-data' && (
                    <KeyValueEditor
                        items={body.formData || []}
                        onChange={(items) => onChange({ ...body, formData: items })}
                        keyPlaceholder="Key"
                        valuePlaceholder="Value"
                    />
                )}

                {body.type === 'x-www-form-urlencoded' && (
                    <KeyValueEditor
                        items={body.urlencoded || []}
                        onChange={(items) => onChange({ ...body, urlencoded: items })}
                        keyPlaceholder="Key"
                        valuePlaceholder="Value"
                    />
                )}
            </div>
        </div>
    )
}
