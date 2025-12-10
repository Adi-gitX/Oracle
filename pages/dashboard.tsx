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
    { label: 'Dashboard', link: '/dashboard' },
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
    const [isChatMode, setIsChatMode] = useState(false)
    const chatEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        if (messages.length > 0) {
            scrollToBottom()
        }
    }, [messages, loading])

    const processingRef = useRef(false)

    const handleSend = async (inputText: string) => {
        if (processingRef.current || loading) return
        processingRef.current = true

        const userMsgId = Date.now().toString()
        setMessages(prev => [...prev, { id: userMsgId, role: 'user', content: inputText }])
        setLoading(true)

        if (isChatMode) {
            // Chat Mode Logic
            try {
                // Gather context (all valid keys found so far)
                const allResults = messages.flatMap(m => m.results || [])
                const validKeys = allResults.filter(r => r.status === 'valid')

                const res = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: inputText,
                        context: validKeys
                    })
                })

                const data = await res.json()

                if (!res.ok) {
                    throw new Error(data.message || res.statusText)
                }

                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: data.reply || "I'm having trouble connecting right now."
                }])
            } catch (e) {
                const errorMessage = e instanceof Error ? e.message : "Sorry, I encountered an error while processing your request."
                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: `Error: ${errorMessage}`
                }])
            }
            setLoading(false)
            processingRef.current = false
            return
        }

        // Check Mode Logic
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
                content: "I couldn't find any valid API key formats in your message. please switch to chat mode if you want to talk."
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
        processingRef.current = false
    }

    return (
        <div className={styles.dashboardContainer}>
            <StaggeredMenu
                items={menuItems}
                socialItems={socialItems}
                logo={messages.length > 0 ? "Oracle Intelligent Check" : null}
                position="left"
                isFixed={true}
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
                        <ChatInput
                            onSend={handleSend}
                            disabled={loading}
                            isCentered={true}
                            isChatMode={isChatMode}
                            onToggleMode={() => setIsChatMode(!isChatMode)}
                        />
                    </div>
                </div>
            ) : (
                <div className={styles.chatLayout}>
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
                                    <div className={styles.messageText}>
                                        {isChatMode ? "Thinking..." : "Verifying credentials..."}
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Floating Input at bottom */}
                    <div className={styles.floatingInput}>
                        <div style={{ width: '100%', maxWidth: '800px' }}>
                            <ChatInput
                                onSend={handleSend}
                                disabled={loading}
                                isChatMode={isChatMode}
                                onToggleMode={() => setIsChatMode(!isChatMode)}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
