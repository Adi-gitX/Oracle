import styles from '../../styles/Postman.module.css'
import { KeyValue } from '../../lib/postman/types'

interface ParamsEditorProps {
    params: KeyValue[]
    onChange: (params: KeyValue[]) => void
}

export default function ParamsEditor({ params, onChange }: ParamsEditorProps) {

    const addRow = () => {
        onChange([...params, { key: '', value: '', enabled: true }])
    }


    const updateRow = (index: number, field: 'key' | 'value' | 'enabled', newValue: string | boolean) => {
        const updated = [...params]
        updated[index] = { ...updated[index], [field]: newValue }
        onChange(updated)
    }


    const deleteRow = (index: number) => {
        onChange(params.filter((_, i) => i !== index))
    }

    return (
        <div className={styles.kvEditor}>

            {params.length > 0 && (
                <div className={styles.kvRow} style={{ marginBottom: '0.5rem' }}>
                    <div style={{ width: '18px' }} />
                    <span style={{ flex: 1, fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
                        KEY
                    </span>
                    <span style={{ flex: 1, fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
                        VALUE
                    </span>
                    <div style={{ width: '32px' }} />
                </div>
            )}


            {params.map((param, index) => (
                <div key={index} className={styles.kvRow}>
                    <input
                        type="checkbox"
                        className={styles.kvCheckbox}
                        checked={param.enabled}
                        onChange={(e) => updateRow(index, 'enabled', e.target.checked)}
                    />
                    <input
                        type="text"
                        className={`${styles.kvInput} ${!param.enabled ? styles.kvInputDisabled : ''}`}
                        placeholder="Parameter name"
                        value={param.key}
                        onChange={(e) => updateRow(index, 'key', e.target.value)}
                    />
                    <input
                        type="text"
                        className={`${styles.kvInput} ${!param.enabled ? styles.kvInputDisabled : ''}`}
                        placeholder="Value"
                        value={param.value}
                        onChange={(e) => updateRow(index, 'value', e.target.value)}
                    />
                    <button
                        className={styles.kvDelete}
                        onClick={() => deleteRow(index)}
                        title="Delete parameter"
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
                Add parameter
            </button>


            {params.length === 0 && (
                <div style={{
                    fontSize: '0.8rem',
                    color: 'rgba(255,255,255,0.4)',
                    marginTop: '0.5rem',
                    textAlign: 'center'
                }}>
                    Query parameters will be appended to the URL
                </div>
            )}
        </div>
    )
}
