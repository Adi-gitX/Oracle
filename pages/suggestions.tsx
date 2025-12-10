import { useState } from 'react'
import Head from 'next/head'
import styles from '../styles/Dashboard.module.css'
import StaggeredMenu from '../components/StaggeredMenu/StaggeredMenu'

const menuItems = [
    { label: 'Home', link: '/' },
    { label: 'Dashboard', link: '/dashboard' },
    { label: 'Pricing', link: '/pricing' },
    { label: 'Docs', link: '/docs' },
    { label: 'Suggestions', link: '/suggestions' },
];

const socialItems = [
    { label: 'LinkedIn', link: 'https://www.linkedin.com/in/kammatiaditya/' },
    { label: 'GitHub', link: 'https://github.com/Adi-gitX' },
    { label: 'X', link: 'https://x.com/AdiGitX' }
];

export default function Suggestions() {
    const [subject, setSubject] = useState('')
    const [message, setMessage] = useState('')
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setStatus('loading')

        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subject, message })
            })

            if (res.ok) {
                setStatus('success')
                setSubject('')
                setMessage('')
            } else {
                setStatus('error')
            }
        } catch (e) {
            setStatus('error')
        }
    }

    return (
        <div className={styles.dashboardContainer}>
            <StaggeredMenu
                items={menuItems}
                socialItems={socialItems}
                logo="Feedback"
                position="left"
                isFixed={true}
            />
            <Head>
                <title>Suggestions - Oracle</title>
            </Head>

            <div className={styles.backgroundGlow} />

            <div className={styles.scrollArea}>
                <div className={styles.centeredContent} style={{ paddingTop: '100px', animation: 'fadeIn 0.5s ease-out' }}>
                    <div className={styles.pillBadge} style={{ marginBottom: '2rem' }}>
                        <span>Beta</span> Help us improve
                    </div>

                    <h1 className={styles.heroTitle}>
                        Make Oracle <span>Better</span>
                    </h1>
                    <p className={styles.heroSubtitle}>
                        Have a feature request or found a bug? Let us know directly.
                    </p>

                    <form onSubmit={handleSubmit} className={styles.feedbackForm}>
                        <input
                            type="text"
                            placeholder="Subject (e.g. Feature Idea)"
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                            required
                            className={styles.glassInput}
                        />

                        <textarea
                            placeholder="Tell us what you'd like to see..."
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            required
                            rows={6}
                            className={styles.glassInput}
                            style={{ resize: 'none' }}
                        />

                        <button
                            type="submit"
                            disabled={status === 'loading'}
                            className={styles.submitButton}
                        >
                            {status === 'loading' ? 'Sending...' : 'Send Suggestion'}
                        </button>

                        {status === 'success' && (
                            <div className={`${styles.statusMessage} ${styles.statusSuccess}`}>
                                Thanks! We received your feedback.
                            </div>
                        )}
                        {status === 'error' && (
                            <div className={`${styles.statusMessage} ${styles.statusError}`}>
                                Something went wrong. Please try again.
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    )
}
