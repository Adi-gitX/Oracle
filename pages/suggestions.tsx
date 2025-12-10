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

            <div className={styles.centeredContent} style={{ paddingTop: '100px', animation: 'fadeIn 0.5s ease-out' }}>
                <h1 className={styles.heroTitle}>
                    Make Oracle <span>Better</span>
                </h1>
                <p className={styles.heroSubtitle}>
                    Have a feature request or found a bug? Let us know directly.
                </p>

                <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '1rem', background: '#111', padding: '2rem', borderRadius: '16px', border: '1px solid #333' }}>

                    <input
                        type="text"
                        placeholder="Subject (e.g. Feature Idea)"
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                        required
                        style={{
                            background: '#222', border: '1px solid #444',
                            padding: '12px', borderRadius: '8px', color: '#fff', outline: 'none'
                        }}
                    />

                    <textarea
                        placeholder="Tell us what you'd like to see..."
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        required
                        rows={6}
                        style={{
                            background: '#222', border: '1px solid #444',
                            padding: '12px', borderRadius: '8px', color: '#fff', outline: 'none', resize: 'none'
                        }}
                    />

                    <button
                        type="submit"
                        disabled={status === 'loading'}
                        style={{
                            background: '#fff', color: '#000', padding: '12px',
                            borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer',
                            opacity: status === 'loading' ? 0.7 : 1
                        }}
                    >
                        {status === 'loading' ? 'Sending...' : 'Send Suggestion'}
                    </button>

                    {status === 'success' && <p style={{ color: '#00E676', fontSize: '0.9rem', textAlign: 'center' }}>Thanks! We received your feedback.</p>}
                    {status === 'error' && <p style={{ color: '#FF5252', fontSize: '0.9rem', textAlign: 'center' }}>Something went wrong. Please try again.</p>}
                </form>
            </div>
        </div>
    )
}
