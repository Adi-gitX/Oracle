import { useState } from 'react'
import styles from '../../styles/Postman.module.css'
import { AuthConfig, AuthType } from '../../lib/postman/types'

interface AuthEditorProps {
    auth: AuthConfig
    onChange: (auth: AuthConfig) => void
}

const AUTH_TYPES: { type: AuthType; label: string }[] = [
    { type: 'none', label: 'No Auth' },
    { type: 'bearer', label: 'Bearer Token' },
    { type: 'basic', label: 'Basic Auth' },
    { type: 'apikey', label: 'API Key' },
]

export default function AuthEditor({ auth, onChange }: AuthEditorProps) {
    const [showPassword, setShowPassword] = useState(false)

    const setAuthType = (type: AuthType) => {
        const newAuth: AuthConfig = { type }

        switch (type) {
            case 'bearer':
                newAuth.bearer = { token: '' }
                break
            case 'basic':
                newAuth.basic = { username: '', password: '' }
                break
            case 'apikey':
                newAuth.apikey = { key: 'X-API-Key', value: '', addTo: 'header' }
                break
        }

        onChange(newAuth)
    }

    return (
        <div>
            {/* Auth type selector */}
            <div className={styles.authSelector}>
                {AUTH_TYPES.map(({ type, label }) => (
                    <button
                        key={type}
                        className={`${styles.authButton} ${auth.type === type ? styles.authButtonActive : ''}`}
                        onClick={() => setAuthType(type)}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Auth fields based on type */}
            <div className={styles.authFields}>
                {auth.type === 'none' && (
                    <div style={{
                        fontSize: '0.85rem',
                        color: 'rgba(255,255,255,0.4)',
                        textAlign: 'center',
                        padding: '1rem'
                    }}>
                        This request does not use any authorization.
                    </div>
                )}

                {auth.type === 'bearer' && (
                    <div className={styles.authField}>
                        <label className={styles.authLabel}>Token</label>
                        <input
                            type="text"
                            className={styles.authInput}
                            placeholder="Enter your bearer token"
                            value={auth.bearer?.token || ''}
                            onChange={(e) => onChange({
                                ...auth,
                                bearer: { token: e.target.value }
                            })}
                        />
                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.25rem' }}>
                            The token will be sent as: Authorization: Bearer &lt;token&gt;
                        </span>
                    </div>
                )}

                {auth.type === 'basic' && (
                    <>
                        <div className={styles.authField}>
                            <label className={styles.authLabel}>Username</label>
                            <input
                                type="text"
                                className={styles.authInput}
                                placeholder="Username"
                                value={auth.basic?.username || ''}
                                onChange={(e) => onChange({
                                    ...auth,
                                    basic: {
                                        username: e.target.value,
                                        password: auth.basic?.password || ''
                                    }
                                })}
                            />
                        </div>
                        <div className={styles.authField}>
                            <label className={styles.authLabel}>Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className={styles.authInput}
                                    style={{ paddingRight: '40px' }}
                                    placeholder="Password"
                                    value={auth.basic?.password || ''}
                                    onChange={(e) => onChange({
                                        ...auth,
                                        basic: {
                                            username: auth.basic?.username || '',
                                            password: e.target.value
                                        }
                                    })}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute',
                                        right: '8px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'rgba(255,255,255,0.4)',
                                        cursor: 'pointer',
                                        padding: '4px'
                                    }}
                                >
                                    {showPassword ? (
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                            <line x1="1" y1="1" x2="23" y2="23" />
                                        </svg>
                                    ) : (
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {auth.type === 'apikey' && (
                    <>
                        <div className={styles.authField}>
                            <label className={styles.authLabel}>Key</label>
                            <input
                                type="text"
                                className={styles.authInput}
                                placeholder="Header or query param name"
                                value={auth.apikey?.key || ''}
                                onChange={(e) => onChange({
                                    ...auth,
                                    apikey: {
                                        ...auth.apikey!,
                                        key: e.target.value
                                    }
                                })}
                            />
                        </div>
                        <div className={styles.authField}>
                            <label className={styles.authLabel}>Value</label>
                            <input
                                type="text"
                                className={styles.authInput}
                                placeholder="API key value"
                                value={auth.apikey?.value || ''}
                                onChange={(e) => onChange({
                                    ...auth,
                                    apikey: {
                                        ...auth.apikey!,
                                        value: e.target.value
                                    }
                                })}
                            />
                        </div>
                        <div className={styles.authField}>
                            <label className={styles.authLabel}>Add to</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    className={`${styles.bodyTypeButton} ${auth.apikey?.addTo === 'header' ? styles.bodyTypeActive : ''}`}
                                    onClick={() => onChange({
                                        ...auth,
                                        apikey: { ...auth.apikey!, addTo: 'header' }
                                    })}
                                >
                                    Header
                                </button>
                                <button
                                    className={`${styles.bodyTypeButton} ${auth.apikey?.addTo === 'query' ? styles.bodyTypeActive : ''}`}
                                    onClick={() => onChange({
                                        ...auth,
                                        apikey: { ...auth.apikey!, addTo: 'query' }
                                    })}
                                >
                                    Query Params
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
