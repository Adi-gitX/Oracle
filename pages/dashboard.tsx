import { useState, useRef, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import Image from 'next/image'
import styles from '../styles/Dashboard.module.css'
import ChatInput from '../components/ChatInput'
import ResultMessage from '../components/ResultMessage'
import StaggeredMenu from '../components/StaggeredMenu/StaggeredMenu'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { encryptData, decryptData } from '../utils/encryption'

interface KeyResult {
    key: string
    provider: string
    status: 'valid' | 'invalid' | 'unchecked'
    details?: string
    premium?: boolean
}

interface Message {
    role: 'user' | 'assistant'
    content: string
    results?: KeyResult[]
    id: string
}

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

export default function Dashboard() {
    const [messages, setMessages] = useState<Message[]>([])
    const [loading, setLoading] = useState(false)
    const [isChatMode, setIsChatMode] = useState(false) // Toggle between Check Mode (false) and Chat Mode (true)
    const chatContainerRef = useRef<HTMLDivElement>(null)
    const chatContentRef = useRef<HTMLDivElement>(null)

    // Auto-scroll logic
    const scrollToBottom = () => {
        if (chatContainerRef.current) {
            const { scrollHeight, clientHeight } = chatContainerRef.current
            chatContainerRef.current.scrollTo({
                top: scrollHeight - clientHeight,
                behavior: 'smooth'
            })
        }
    }

    const hasMessages = messages.length > 0

    // Optimized Auto-scroll with ResizeObserver
    useEffect(() => {
        const container = chatContainerRef.current
        const content = chatContentRef.current
        if (!container || !content) return

        const resizeObserver = new ResizeObserver(() => {
            const targetTop = container.scrollHeight - container.clientHeight
            if (targetTop > 0) {
                container.scrollTo({ top: targetTop, behavior: 'smooth' })
            }
        })

        resizeObserver.observe(content)
        return () => resizeObserver.disconnect()
    }, [hasMessages]) // Only re-run when chat mode initially activates

    const processingRef = useRef(false)

    const handleSend = async (inputText: string) => {
        if (processingRef.current || loading) return
        processingRef.current = true

        const userMsgId = Date.now().toString()
        setMessages(prev => [...prev, { id: userMsgId, role: 'user', content: inputText }])
        setLoading(true)

        // Force immediate scroll for user message
        requestAnimationFrame(() => {
            scrollToBottom()
        })

        if (isChatMode) {
            try {
                // Gather context (valid keys)
                const allResults = messages.flatMap(m => m.results || [])
                const validKeys = allResults.filter(r => r.status === 'valid')

                const encryptedBody = encryptData(JSON.stringify({
                    message: inputText,
                    context: validKeys
                }))

                const res = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ payload: encryptedBody, isEncrypted: true })
                })

                const rawData = await res.json()
                let data = rawData

                if (rawData.isEncrypted) {
                    try {
                        data = JSON.parse(decryptData(rawData.payload))
                    } catch (e) {
                        throw new Error("Failed to decrypt server response")
                    }
                }

                if (!res.ok) {
                    throw new Error(data.message || res.statusText)
                }

                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: data.reply || "I'm having trouble connecting right now."
                }])
            } catch (e) {
                const errorMessage = e instanceof Error ? e.message : "Sorry, I encountered an error."
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
            const match = line.match(/(AIza[a-zA-Z0-9-_]+|sk-ant-[a-zA-Z0-9-_]+|sk[_\-][a-zA-Z0-9._-]+|pk[_\-][a-zA-Z0-9._-]+|ghp_[a-zA-Z0-9]+|github_pat_[a-zA-Z0-9_]+|xox[bp]-[a-zA-Z0-9-]+|SG\.[a-zA-Z0-9_\-\.]+|npm_[a-zA-Z0-9]+|glpat-[a-zA-Z0-9-]+|key-[a-zA-Z0-9-]+|hf_[a-zA-Z0-9]+|[0-9]{8,}:[a-zA-Z0-9_-]{35}|AC[a-f0-9]{32}|AKIA[a-zA-Z0-9]{16}|(postgres|mysql|mongodb(\+srv)?):\/\/[^\s]+|cloudinary:\/\/[^\s]+|[0-9]{15}|[a-zA-Z0-9]{32,})/);
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
                content: "I couldn't find any valid API key formats. Switch to Chat Mode to talk."
            }])
            setLoading(false)
            processingRef.current = false
            return
        }

        const resultsPromises = uniqueKeys.map(async (key) => {
            try {
                const encryptedKey = encryptData(key);
                const res = await fetch('/api/check', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key: encryptedKey, isEncrypted: true })
                })

                const rawData = await res.json()
                let data = rawData

                if (rawData.isEncrypted) {
                    try {
                        data = JSON.parse(decryptData(rawData.payload))
                    } catch (e) {
                        return {
                            key,
                            provider: 'Unknown',
                            status: 'invalid' as 'valid' | 'invalid',
                            details: 'Decryption Error'
                        }
                    }
                }

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
        const summaryText = `Processed ${uniqueKeys.length} keys. Found ${workingCount} working, ${deadCount} invalid.`

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
                rightElement={
                    messages.length > 0 ? (
                        <div
                            onClick={() => {
                                setMessages([])
                                setIsChatMode(false)
                            }}
                            style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                        >
                            <Image
                                src="/assets/branding/oracle-iconLogo.png"
                                alt="New Chat"
                                width={35}
                                height={35}
                                className="hover:opacity-80 transition-opacity"
                            />
                        </div>
                    ) : null
                }
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

                    <h1 className={styles.heroTitle} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0px', paddingLeft: '160px' }}>
                        Verify API keys with
                        <span style={{ display: 'flex', alignItems: 'center', marginLeft: '-160px' }}>
                            <Image
                                src="/assets/branding/oracle-logo.png"
                                alt="Oracle Logo"
                                width={550}
                                height={176}
                                objectFit="contain"
                                priority
                            />
                        </span>
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
                    <div className={styles.chatScrollArea} ref={chatContainerRef}>
                        <div className={styles.chatContentInner} ref={chatContentRef}>
                            {messages.map((msg) => (
                                <div key={msg.id} className={`${styles.messageRow} ${styles[msg.role]}`}>
                                    <div className={styles.messageBubble}>
                                        <div className={styles.senderName}>
                                            {msg.role === 'user' ? 'You' : 'Oracle'}
                                        </div>
                                        <div className={styles.messageText}>
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {msg.content || ''}
                                            </ReactMarkdown>
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
                            <div />
                        </div>
                    </div>

                    {/* Floating Input at bottom */}
                    <div className={styles.floatingInput} style={{ flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '100%', maxWidth: '800px' }}>
                            <ChatInput
                                onSend={handleSend}
                                disabled={loading}
                                isChatMode={isChatMode}
                                onToggleMode={() => setIsChatMode(!isChatMode)}
                            />
                        </div>
                        <div style={{
                            fontSize: '0.7rem',
                            color: 'rgba(255,255,255,0.3)',
                            textAlign: 'center',
                            maxWidth: '600px',
                            lineHeight: '1.4'
                        }}>
                            By using Oracle, you agree to our <Link href="/docs#legal"><a style={{ textDecoration: 'underline', color: 'rgba(255,255,255,0.4)' }}>Terms of Service</a></Link>.
                            Zero Retention Policy Active. Provided &quot;AS IS&quot; without warranty.
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
