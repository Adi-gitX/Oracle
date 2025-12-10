import { useState, useRef, useEffect } from 'react'
import Head from 'next/head'
import styles from '../styles/Dashboard.module.css'
import ChatInput from '../components/ChatInput'
import ResultMessage from '../components/ResultMessage'
import StaggeredMenu from '../components/StaggeredMenu/StaggeredMenu'

interface KeyResult {
    key: string
    provider: string
    status: 'valid' | 'invalid' | 'unchecked'
    details?: string
    premium?: boolean
}

interface Message {
    role: 'user' | 'assistant'
    content?: string
    results?: KeyResult[]
    id: string
}

const menuItems = [
    { label: 'Home', link: '/' },
    { label: 'Pricing', link: '/pricing' },
    { label: 'Docs', link: '/docs' },
];

const socialItems = [
    { label: 'LinkedIn', link: 'https://www.linkedin.com/in/kammatiaditya/' },
    { label: 'GitHub', link: 'https://github.com/Adi-gitX' },
    { label: 'X', link: 'https://x.com/AdiGitX' }
];

export default function Dashboard() {
    const [messages, setMessages] = useState<Message[]>([])
    const [loading, setLoading] = useState(false)
    const chatEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        if (messages.length > 0) {
            scrollToBottom()
        }
    }, [messages, loading])

    const handleCheck = async (inputText: string) => {
        const userMsgId = Date.now().toString()
        setMessages(prev => [...prev, { id: userMsgId, role: 'user', content: inputText }])
        setLoading(true)

        const extractKey = (line: string) => {
            const match = line.match(/(AIza[a-zA-Z0-9-_]+|sk-ant-[a-zA-Z0-9-_]+|sk-[a-zA-Z0-9-]+)/);
            return match ? match[0] : null;
        }

        const keys = inputText.split('\n')
            .map(extractKey)
            .filter((k): k is string => !!k);

        const uniqueKeys = Array.from(new Set(keys));

        if (uniqueKeys.length === 0) {
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: "I couldn't find any valid API key formats in your message. Please try again."
            }])
            setLoading(false)
            return
        }

        const resultsPromises = uniqueKeys.map(async (key) => {
            try {
                const res = await fetch('/api/check', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key })
                })
                const data = await res.json()
                return {
                    key,
                    provider: data.provider || 'Unknown',
                    status: (data.valid ? 'valid' : 'invalid') as 'valid' | 'invalid',
                    details: data.message || (data.valid ? 'Active' : 'Error'),
                    premium: data.premium
                }
            } catch (e) {
                return {
                    key,
                    provider: 'Unknown',
                    status: 'invalid' as 'valid' | 'invalid',
                    details: 'Network Error'
                }
            }
        })

        const newResults = await Promise.all(resultsPromises)
        const workingCount = newResults.filter(r => r.status === 'valid').length
        const deadCount = newResults.filter(r => r.status === 'invalid').length
        const summaryText = `I processed ${uniqueKeys.length} keys. Found ${workingCount} working and ${deadCount} invalid.`

        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: summaryText,
            results: newResults
        }])
        setLoading(false)
    }
    return (
        <div className={styles.dashboardContainer}>
            <StaggeredMenu
                items={menuItems}
                socialItems={socialItems}
                logo={messages.length > 0 ? "Oracle Intelligent Check" : null}
                position="left"
                isFixed={true}
            // Colors handled by CSS for glassmorphism
            />
            <Head>
                <title>{messages.length === 0 ? 'Start - Oracle' : 'Results - Oracle'}</title>
            </Head>

            {/* Background */}
            <div className={styles.backgroundGlow} style={messages.length > 0 ? { opacity: 0.5 } : undefined} />

            {messages.length === 0 ? (
                <div className={styles.centeredContent}>
                    <div className={styles.pillBadge}>
                        <span>New</span> Oracle Analysis v2.0
                    </div>

                    <h1 className={styles.heroTitle}>
                        Build something <span>Oracle</span>
                    </h1>

                    <p className={styles.heroSubtitle}>
                        Test all your API secrets and more all at one place.
                    </p>

                    <div style={{ width: '100%', maxWidth: '700px' }}>
                        <ChatInput onSend={handleCheck} disabled={loading} isCentered={true} />
                    </div>
                </div>
            ) : (
                <div className={styles.chatLayout}>
                    {/* Header removed - now in StaggeredMenu */}

                    <div className={styles.chatScrollArea}>
                        {messages.map((msg) => (
                            <div key={msg.id} className={`${styles.messageRow} ${styles[msg.role]}`}>
                                <div className={styles.messageBubble}>
                                    <div className={styles.senderName}>
                                        {msg.role === 'user' ? 'You' : 'Oracle'}
                                    </div>
                                    <div className={styles.messageText}>
                                        {msg.content}
                                    </div>
                                    {msg.results && <ResultMessage results={msg.results} />}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className={`${styles.messageRow} ${styles.assistant}`}>
                                <div className={styles.messageBubble}>
                                    <div className={styles.senderName}>Oracle</div>
                                    <div className={styles.messageText}>Verifying credentials...</div>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Floating Input at bottom */}
                    <div className={styles.floatingInput}>
                        <div style={{ width: '100%', maxWidth: '800px' }}>
                            <ChatInput onSend={handleCheck} disabled={loading} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
