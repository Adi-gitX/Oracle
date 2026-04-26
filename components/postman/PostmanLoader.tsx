import { useEffect, useState } from 'react'
import styles from '../../styles/Postman.module.css'

interface PostmanLoaderProps {
    method: string
    url: string
}

const PHASES = [
    { id: 'connect', label: 'Connecting', detail: 'DNS resolve · TLS handshake' },
    { id: 'send',    label: 'Sending',    detail: 'Request headers · payload' },
    { id: 'receive', label: 'Receiving',  detail: 'Streaming response' },
    { id: 'parse',   label: 'Parsing',    detail: 'Decoding body · headers' }
]

export default function PostmanLoader({ method, url }: PostmanLoaderProps) {
    const [phase, setPhase] = useState(0)
    const [elapsed, setElapsed] = useState(0)

    useEffect(() => {
        // Cycle through phases on a soft schedule. Real timing isn't measurable from the proxy,
        // so we animate to give users a sense of progression.
        const start = Date.now()
        const tick = setInterval(() => {
            const ms = Date.now() - start
            setElapsed(ms)
            if (ms < 200) setPhase(0)
            else if (ms < 600) setPhase(1)
            else if (ms < 1500) setPhase(2)
            else setPhase(3)
        }, 80)
        return () => clearInterval(tick)
    }, [])

    return (
        <div className={styles.loaderCard} data-testid="postman-loader">
            <div className={styles.loaderHeader}>
                <span className={styles.loaderMethod}>{method}</span>
                <span className={styles.loaderUrl}>{url.replace(/^https?:\/\//, '')}</span>
                <span className={styles.loaderTime}>{(elapsed / 1000).toFixed(1)}s</span>
            </div>
            <div className={styles.loaderPhases}>
                {PHASES.map((p, i) => {
                    const state = i < phase ? 'done' : i === phase ? 'active' : 'pending'
                    return (
                        <div
                            key={p.id}
                            className={`${styles.loaderPhase} ${styles[`loaderPhase_${state}`]}`}
                            data-state={state}
                        >
                            <span className={styles.loaderDot}>
                                {state === 'done' ? (
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                ) : state === 'active' ? (
                                    <span className={styles.loaderSpin} />
                                ) : null}
                            </span>
                            <div className={styles.loaderText}>
                                <span className={styles.loaderLabel}>{p.label}</span>
                                <span className={styles.loaderDetail}>{p.detail}</span>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
