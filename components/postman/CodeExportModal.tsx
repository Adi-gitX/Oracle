import { useState, useEffect } from 'react'
import styles from '../../styles/Postman.module.css'
import type { RequestConfig } from '../../lib/postman/types'
import { exportToCurl } from '../../lib/postman/CurlParser'
import { exportToFetch, exportToPython, exportToGo, exportToHttpie } from '../../lib/postman/CodeExport'

interface CodeExportModalProps {
    request: RequestConfig
    onClose: () => void
}

type Lang = 'curl' | 'fetch' | 'python' | 'go' | 'httpie'

const TABS: { id: Lang; label: string }[] = [
    { id: 'curl', label: 'cURL' },
    { id: 'fetch', label: 'JS / fetch' },
    { id: 'python', label: 'Python' },
    { id: 'go', label: 'Go' },
    { id: 'httpie', label: 'HTTPie' }
]

export default function CodeExportModal({ request, onClose }: CodeExportModalProps) {
    const [active, setActive] = useState<Lang>('curl')
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    const code = (() => {
        switch (active) {
            case 'fetch': return exportToFetch(request)
            case 'python': return exportToPython(request)
            case 'go': return exportToGo(request)
            case 'httpie': return exportToHttpie(request)
            default: return exportToCurl(request)
        }
    })()

    const copy = () => {
        navigator.clipboard.writeText(code)
        setCopied(true)
        setTimeout(() => setCopied(false), 1800)
    }

    return (
        <div className={styles.modal} onClick={onClose} role="dialog" aria-modal="true">
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
                <h3 style={{ marginBottom: 14 }}>Export as Code</h3>
                <div className={styles.bodyTypes} style={{ marginBottom: 12 }}>
                    {TABS.map(t => (
                        <button
                            key={t.id}
                            className={`${styles.bodyTypeBtn} ${active === t.id ? styles.bodyTypeActive : ''}`}
                            onClick={() => setActive(t.id)}
                            data-testid={`code-export-tab-${t.id}`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
                <pre className={styles.curlTextarea} style={{ minHeight: 220, maxHeight: 360, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }} data-testid="code-export-output">{code}</pre>
                <div className={styles.modalActions}>
                    <button onClick={onClose} data-testid="code-export-close">Close</button>
                    <button onClick={copy} className={styles.primaryBtn} data-testid="code-export-copy">
                        {copied ? 'Copied!' : 'Copy to Clipboard'}
                    </button>
                </div>
            </div>
        </div>
    )
}
