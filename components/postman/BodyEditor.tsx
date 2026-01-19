import { useState, useEffect } from 'react'
import styles from '../../styles/Postman.module.css'
import { RequestBody, BodyType, KeyValue } from '../../lib/postman/types'

interface BodyEditorProps {
    body: RequestBody
    onChange: (body: RequestBody) => void
}

const BODY_TYPES: { type: BodyType; label: string }[] = [
    { type: 'none', label: 'none' },
    { type: 'json', label: 'JSON' },
    { type: 'form-data', label: 'form-data' },
    { type: 'x-www-form-urlencoded', label: 'x-www-form-urlencoded' },
    { type: 'raw', label: 'raw' },
]

export default function BodyEditor({ body, onChange }: BodyEditorProps) {
    const [jsonError, setJsonError] = useState<string | null>(null)


    useEffect(() => {
        if (body.type === 'json' && body.raw) {
            try {
                JSON.parse(body.raw)
                setJsonError(null)
            } catch (e) {
                if (e instanceof Error) {
                    setJsonError(e.message)
                }
            }
        } else {
            setJsonError(null)
        }
    }, [body.type, body.raw])

    const setBodyType = (type: BodyType) => {
        const newBody: RequestBody = { type }

        switch (type) {
            case 'json':
            case 'raw':
                newBody.raw = body.raw || ''
                break
            case 'form-data':
                newBody.formData = body.formData || []
                break
            case 'x-www-form-urlencoded':
                newBody.urlencoded = body.urlencoded || []
                break
        }

        onChange(newBody)
    }


    const formatJSON = () => {
        if (body.raw) {
            try {
                const parsed = JSON.parse(body.raw)
                onChange({ ...body, raw: JSON.stringify(parsed, null, 2) })
                setJsonError(null)
            } catch {
            }
        }
    }


    const renderKeyValueEditor = (items: KeyValue[], updateFn: (items: KeyValue[]) => void) => {
        const addRow = () => {
            updateFn([...items, { key: '', value: '', enabled: true }])
        }

        const updateRow = (index: number, field: 'key' | 'value' | 'enabled', newValue: string | boolean) => {
            const updated = [...items]
            updated[index] = { ...updated[index], [field]: newValue }
            updateFn(updated)
        }

        const deleteRow = (index: number) => {
            updateFn(items.filter((_, i) => i !== index))
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
                            className={`${styles.kvInput} ${!item.enabled ? styles.kvInputDisabled : ''}`}
                            placeholder="Key"
                            value={item.key}
                            onChange={(e) => updateRow(index, 'key', e.target.value)}
                        />
                        <input
                            type="text"
                            className={`${styles.kvInput} ${!item.enabled ? styles.kvInputDisabled : ''}`}
                            placeholder="Value"
                            value={item.value}
                            onChange={(e) => updateRow(index, 'value', e.target.value)}
                        />
                        <button
                            className={styles.kvDelete}
                            onClick={() => deleteRow(index)}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                        </button>
                    </div>
                ))}
                <button className={styles.addRowButton} onClick={addRow}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Add row
                </button>
            </div>
        )
    }

    return (
        <div>

            <div className={styles.bodyTypeSelector}>
                {BODY_TYPES.map(({ type, label }) => (
                    <button
                        key={type}
                        className={`${styles.bodyTypeButton} ${body.type === type ? styles.bodyTypeActive : ''}`}
                        onClick={() => setBodyType(type)}
                    >
                        {label}
                    </button>
                ))}
            </div>


            {body.type === 'none' && (
                <div style={{
                    fontSize: '0.85rem',
                    color: 'rgba(255,255,255,0.4)',
                    textAlign: 'center',
                    padding: '2rem'
                }}>
                    This request does not have a body.
                </div>
            )}

            {(body.type === 'json' || body.type === 'raw') && (
                <div>
                    {body.type === 'json' && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                                application/json
                            </span>
                            <button
                                className={styles.bodyTypeButton}
                                onClick={formatJSON}
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                            >
                                Format JSON
                            </button>
                        </div>
                    )}
                    <textarea
                        className={styles.bodyTextarea}
                        placeholder={body.type === 'json'
                            ? '{\n  "key": "value"\n}'
                            : 'Enter raw body content...'
                        }
                        value={body.raw || ''}
                        onChange={(e) => onChange({ ...body, raw: e.target.value })}
                        style={jsonError ? { borderColor: 'rgba(249, 62, 62, 0.5)' } : {}}
                    />
                    {jsonError && (
                        <div style={{
                            fontSize: '0.75rem',
                            color: '#f93e3e',
                            marginTop: '0.5rem',
                            padding: '0.5rem',
                            background: 'rgba(249, 62, 62, 0.1)',
                            borderRadius: '4px'
                        }}>
                            Invalid JSON: {jsonError}
                        </div>
                    )}
                </div>
            )}

            {body.type === 'form-data' && (
                <div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.75rem' }}>
                        multipart/form-data
                    </div>
                    {renderKeyValueEditor(
                        body.formData || [],
                        (items) => onChange({ ...body, formData: items })
                    )}
                </div>
            )}

            {body.type === 'x-www-form-urlencoded' && (
                <div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.75rem' }}>
                        application/x-www-form-urlencoded
                    </div>
                    {renderKeyValueEditor(
                        body.urlencoded || [],
                        (items) => onChange({ ...body, urlencoded: items })
                    )}
                </div>
            )}
        </div>
    )
}
