import styles from '../styles/Dashboard.module.css'

interface KeyResult {
    key: string
    provider: string
    status: 'valid' | 'invalid' | 'unchecked'
    details?: string
    premium?: boolean
    confidenceScore?: number
    trustLevel?: 'High' | 'Medium' | 'Low'
}

interface ResultMessageProps {
    results: KeyResult[]
}

export default function ResultMessage({ results }: ResultMessageProps) {
    const working = results.filter(r => r.status === 'valid' && !r.premium)
    const premium = results.filter(r => r.premium)
    const invalid = results.filter(r => r.status === 'invalid')

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
    }

    const RenderCard = ({ title, items, type }: { title: string, items: KeyResult[], type: 'green' | 'red' | 'purple' }) => {
        if (items.length === 0) return null
        return (
            <div className={styles.resultCard}>
                <div className={styles.cardHeader}>
                    <div className={styles.cardTitle}>
                        <div className={`${styles.dot} ${styles[type]}`} />
                        {title}
                    </div>
                    <div className={styles.cardCount}>{items.length}</div>
                </div>
                <ul className={styles.cardList}>
                    {items.map((item, idx) => {
                        const isLeaked = item.details?.includes('Leaked')
                        // Trust Badge Logic
                        const trustColor = item.trustLevel === 'High' ? '#00E676' :
                            item.trustLevel === 'Medium' ? '#FFB74D' : '#FF5252';
                        const showTrust = item.confidenceScore !== undefined;

                        return (
                            <li key={idx} className={styles.cardItem}>
                                <div className={styles.itemInfo}>
                                    <div className={styles.providerName} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {item.provider}
                                        {isLeaked && <span style={{ fontSize: '10px', background: 'rgba(255, 100, 0, 0.2)', color: '#ff6400', padding: '2px 6px', borderRadius: '4px' }}>LEAKED</span>}
                                        {showTrust && !isLeaked && (
                                            <span style={{
                                                fontSize: '10px',
                                                background: `rgba(${item.trustLevel === 'High' ? '0,230,118' : '255,82,82'}, 0.1)`,
                                                color: trustColor,
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                border: `1px solid ${trustColor}33`
                                            }}>
                                                {item.trustLevel} Trust {(item.confidenceScore! * 100).toFixed(0)}%
                                            </span>
                                        )}
                                    </div>
                                    <div className={styles.keyText}>{item.key}</div>
                                </div>
                                <button
                                    className={styles.copyBtn}
                                    onClick={() => copyToClipboard(item.key)}
                                    title="Copy"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                </button>
                            </li>
                        )
                    })}
                </ul>
            </div>
        )
    }

    return (
        <div className={styles.resultsGrid}>
            {/* Working */}
            <RenderCard title="Working" items={working} type="green" />

            {/* Pro */}
            <RenderCard title="Pro" items={premium} type="purple" />

            {/* Invalid */}
            <RenderCard title="Invalid" items={invalid} type="red" />
        </div>
    )
}

