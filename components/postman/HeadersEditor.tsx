import styles from '../../styles/Postman.module.css'
import { KeyValue } from '../../lib/postman/types'

interface HeadersEditorProps {
    headers: KeyValue[]
    onChange: (headers: KeyValue[]) => void
}


const COMMON_HEADERS = [
    { key: 'Content-Type', value: 'application/json' },
    { key: 'Accept', value: 'application/json' },
    { key: 'Authorization', value: 'Bearer ' },
    { key: 'X-API-Key', value: '' },
    { key: 'Cache-Control', value: 'no-cache' },
]

export default function HeadersEditor({ headers, onChange }: HeadersEditorProps) {

    const addRow = () => {
        onChange([...headers, { key: '', value: '', enabled: true }])
    }


    const updateRow = (index: number, field: 'key' | 'value' | 'enabled', newValue: string | boolean) => {
        const updated = [...headers]
        updated[index] = { ...updated[index], [field]: newValue }
        onChange(updated)
    }


    const deleteRow = (index: number) => {
        onChange(headers.filter((_, i) => i !== index))
    }

    const addPreset = (preset: { key: string, value: string }) => {
        const exists = headers.some(h => h.key.toLowerCase() === preset.key.toLowerCase())
        if (!exists) {
            onChange([...headers, { ...preset, enabled: true }])
        }
    }

    return (
        <div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                {COMMON_HEADERS.map(preset => (
                    <button
                        key={preset.key}
                        className={styles.bodyTypeButton}
                        onClick={() => addPreset(preset)}
                        title={`Add ${preset.key} header`}
                    >
                        + {preset.key}
                    </button>
                ))}
            </div>


            <div className={styles.kvEditor}>
                {headers.map((header, index) => (
                    <div key={index} className={styles.kvRow}>
                        <input
                            type="checkbox"
                            className={styles.kvCheckbox}
                            checked={header.enabled}
                            onChange={(e) => updateRow(index, 'enabled', e.target.checked)}
                        />
                        <input
                            type="text"
                            className={`${styles.kvInput} ${!header.enabled ? styles.kvInputDisabled : ''}`}
                            placeholder="Header name"
                            value={header.key}
                            onChange={(e) => updateRow(index, 'key', e.target.value)}
                        />
                        <input
                            type="text"
                            className={`${styles.kvInput} ${!header.enabled ? styles.kvInputDisabled : ''}`}
                            placeholder="Value"
                            value={header.value}
                            onChange={(e) => updateRow(index, 'value', e.target.value)}
                        />
                        <button
                            className={styles.kvDelete}
                            onClick={() => deleteRow(index)}
                            title="Delete header"
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
                    Add header
                </button>
            </div>
        </div>
    )
}
