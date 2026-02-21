import styles from '../styles/Dashboard.module.css'

interface KeyResult {
    key: string
    provider: string
    status: 'valid' | 'invalid' | 'unverified'
    details?: string
    premium?: boolean
    confidenceScore?: number
    trustLevel?: 'High' | 'Medium' | 'Low'
    verificationLevel?: 'verified' | 'format_only' | 'unknown'
    warnings?: string[]
}

interface ResultMessageProps {
    results: KeyResult[]
}

export default function ResultMessage({ results }: ResultMessageProps) {
    const working = results.filter(r => r.status === 'valid' && !r.premium)
    const premium = results.filter(r => r.premium)
    const unverified = results.filter(r => r.status === 'unverified')
    const invalid = results.filter(r => r.status === 'invalid')

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
    }

    const RenderCard = ({ title, items, type }: { title: string, items: KeyResult[], type: 'green' | 'red' | 'purple' | 'orange' }) => {
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
                        const isExhausted = item.details?.includes('Exhausted') || item.details?.includes('Quota')
                        const trustColor = item.trustLevel === 'High'
                            ? '#00E676'
                            : item.trustLevel === 'Medium'
                                ? '#FFB74D'
                                : '#FF5252'
                        const showTrust = item.confidenceScore !== undefined;
                        const warningText = item.warnings?.join(' | ') || ''
                        const verificationLabel = item.verificationLevel === 'format_only'
                            ? 'Format Only'
                            : item.verificationLevel === 'verified'
                                ? 'Verified'
                                : 'Unknown'

                        return (
                            <li key={idx} className={styles.cardItem}>
                                <div className={styles.itemInfo}>
                                    <div className={styles.providerName} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {item.provider}
                                        {isLeaked && <span style={{ fontSize: '10px', background: 'rgba(255, 100, 0, 0.2)', color: '#ff6400', padding: '2px 6px', borderRadius: '4px' }}>LEAKED</span>}
                                        {isExhausted && !isLeaked && <span style={{ fontSize: '10px', background: 'rgba(255, 193, 7, 0.2)', color: '#ffc107', padding: '2px 6px', borderRadius: '4px' }}>EXHAUSTED</span>}
                                        {showTrust && !isLeaked && !isExhausted && (
                                            <span style={{
                                                fontSize: '10px',
                                                background: item.trustLevel === 'High'
                                                    ? 'rgba(0,230,118,0.1)'
                                                    : item.trustLevel === 'Medium'
                                                        ? 'rgba(255,183,77,0.12)'
                                                        : 'rgba(255,82,82,0.1)',
                                                color: trustColor,
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                border: `1px solid ${trustColor}33`
                                            }}>
                                                {item.trustLevel} Trust {(item.confidenceScore! * 100).toFixed(0)}%
                                            </span>
                                        )}
                                        <span style={{
                                            fontSize: '10px',
                                            background: 'rgba(255,255,255,0.08)',
                                            color: 'rgba(255,255,255,0.75)',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            border: '1px solid rgba(255,255,255,0.12)'
                                        }}>
                                            {verificationLabel}
                                        </span>
                                    </div>
                                    <div className={styles.keyText}>{item.key}</div>
                                    {(item.details || warningText) && (
                                        <div style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.55)', marginTop: '6px', whiteSpace: 'pre-wrap' }}>
                                            {item.details || warningText}
                                        </div>
                                    )}
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

            {/* Unverified */}
            <RenderCard title="Unverified" items={unverified} type="orange" />

            {/* Invalid */}
            <RenderCard title="Invalid" items={invalid} type="red" />
        </div>
    )
}
