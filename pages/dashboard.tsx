import { useState, useRef, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import Image from 'next/image'
import styles from '../styles/Dashboard.module.css'
import ChatInput, { AppMode } from '../components/ChatInput'
import ResultMessage from '../components/ResultMessage'
import StaggeredMenu from '../components/StaggeredMenu/StaggeredMenu'
import PostmanResponseCard from '../components/postman/PostmanResponseCard'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { encryptData, decryptData } from '../utils/encryption'
import { parseUserInput } from '../lib/postman/RequestParser'
import { RequestConfig, ResponseData, methodColors } from '../lib/postman/types'
import { addToHistory, generateId } from '../lib/postman/storage'

interface KeyResult {
    key: string
    provider: string
    status: 'valid' | 'invalid' | 'unchecked'
    details?: string
    premium?: boolean
}

interface PostmanResult {
    request: RequestConfig
    response: ResponseData
}

interface Message {
    role: 'user' | 'assistant'
    content: string
    results?: KeyResult[]
    postmanResult?: PostmanResult
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
    const [mode, setMode] = useState<AppMode>('check')
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
    }, [hasMessages])

    const processingRef = useRef(false)

    // Execute Postman request
    const executePostmanRequest = async (config: RequestConfig): Promise<ResponseData> => {
        // Build headers object
        const headers: Record<string, string> = {}

        // Add enabled headers
        config.headers.filter(h => h.enabled && h.key).forEach(h => {
            headers[h.key] = h.value
        })

        // Add auth headers
        if (config.auth.type === 'bearer' && config.auth.bearer?.token) {
            headers['Authorization'] = `Bearer ${config.auth.bearer.token}`
        } else if (config.auth.type === 'basic' && config.auth.basic) {
            const encoded = btoa(`${config.auth.basic.username}:${config.auth.basic.password}`)
            headers['Authorization'] = `Basic ${encoded}`
        } else if (config.auth.type === 'apikey' && config.auth.apikey?.addTo === 'header') {
            headers[config.auth.apikey.key] = config.auth.apikey.value
        }

        // Build URL with params
        let url = config.url
        const enabledParams = config.params.filter(p => p.enabled && p.key)

        if (config.auth.type === 'apikey' && config.auth.apikey?.addTo === 'query') {
            enabledParams.push({
                key: config.auth.apikey.key,
                value: config.auth.apikey.value,
                enabled: true
            })
        }

        if (enabledParams.length > 0) {
            const queryString = enabledParams
                .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
                .join('&')
            url += (url.includes('?') ? '&' : '?') + queryString
        }

        // Build body
        let body: string | undefined
        if (config.body.type === 'json' && config.body.raw) {
            headers['Content-Type'] = 'application/json'
            body = config.body.raw
        } else if (config.body.type === 'raw' && config.body.raw) {
            body = config.body.raw
        } else if (config.body.type === 'x-www-form-urlencoded' && config.body.urlencoded) {
            headers['Content-Type'] = 'application/x-www-form-urlencoded'
            body = config.body.urlencoded
                .filter(p => p.enabled)
                .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
                .join('&')
        }

        const res = await fetch('/api/postman', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                method: config.method,
                url,
                headers,
                body,
                timeout: 30000
            })
        })

        const data = await res.json()

        if (data.error) {
            throw new Error(data.error)
        }

        return {
            status: data.status,
            statusText: data.statusText,
            headers: data.headers,
            body: data.body,
            time: data.time,
            size: data.size
        }
    }

    const handleSend = async (inputText: string) => {
        if (processingRef.current || loading) return
        processingRef.current = true

        const userMsgId = Date.now().toString()
        setMessages(prev => [...prev, { id: userMsgId, role: 'user', content: inputText }])
        setLoading(true)

        requestAnimationFrame(() => {
            scrollToBottom()
        })

        // ============ POSTMAN MODE ============
        if (mode === 'postman') {
            try {
                // Parse the user input into a request config
                const parsed = parseUserInput(inputText)

                // Show parsing info
                const methodColor = methodColors[parsed.config.method]

                // Execute the request
                const response = await executePostmanRequest(parsed.config)

                // Save to history
                addToHistory({
                    id: generateId(),
                    timestamp: Date.now(),
                    request: parsed.config,
                    response
                })

                // Add response message with the card
                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: '',
                    postmanResult: {
                        request: parsed.config,
                        response
                    }
                }])
            } catch (e) {
                const errorMessage = e instanceof Error ? e.message : 'Failed to execute request'
                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: `❌ **Request Failed**\n\n${errorMessage}\n\nTry:\n- Check if the URL is correct\n- Make sure the endpoint is accessible\n- Verify your request format`
                }])
            }
            setLoading(false)
            processingRef.current = false
            return
        }

        // ============ CHAT MODE ============
        if (mode === 'chat') {
            try {
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

        // ============ CHECK MODE ============
        const extractKeys = (line: string): { key: string, hint?: string }[] => {
            const patternSource = "\\b(AIza[a-zA-Z0-9-_]{35}|sk-proj-[a-zA-Z0-9-_]+|gsk_[a-zA-Z0-9]+|sk-ant-[a-zA-Z0-9-_]+|sk[_\\-][a-zA-Z0-9._-]+|pk[_\\-][a-zA-Z0-9._-]+|pk\\.[a-zA-Z0-9._-]+|sk\\.[a-zA-Z0-9._-]+|tk\\.[a-zA-Z0-9._-]+|ghp_[a-zA-Z0-9]+|github_pat_[a-zA-Z0-9_]+|xox[bp]-[a-zA-Z0-9-]+|SG\\.[a-zA-Z0-9_\\-\\.]+|npm_[a-zA-Z0-9]+|glpat-[a-zA-Z0-9-]+|key-[a-zA-Z0-9-]+|api:key-[a-zA-Z0-9-]+|hf_[a-zA-Z0-9]+|re_[a-zA-Z0-9_]+|AVPG[a-zA-Z0-9]+|UPSTASH_[a-zA-Z0-9_]+|[0-9]{8,}:[a-zA-Z0-9_-]{35}|AC[a-f0-9]{32}(?::[a-zA-Z0-9]{32})?|AKIA[a-zA-Z0-9]{16}|sbp_[a-zA-Z0-9]+|service_role|GOCSPX-[a-zA-Z0-9_-]+|[0-9]+-[a-z0-9]+\\.apps\\.googleusercontent\\.com|(?:postgres(?:ql)?|mysql|mongodb(?:\\+srv)?):\\/\\/[^\\s\\\"']+|cloudinary:\\/\\/[^\\s\\\"']+|[a-f0-9]{20}|[0-9]{15}|[a-zA-Z0-9_\\-]{32,})";

            const regex = new RegExp(patternSource, 'g');
            const results: { key: string, hint?: string }[] = [];
            let match;

            while ((match = regex.exec(line)) !== null) {
                const cleanKey = match[1];
                let hint = undefined;
                const preMatch = line.substring(0, match.index);
                const varMatch = preMatch.match(/([A-Z0-9_]+)\s*[=:]\s*["']?$/);
                if (varMatch) {
                    hint = varMatch[1];
                }
                results.push({ key: cleanKey, hint });
            }
            return results;
        }

        const extractedItems = inputText.split('\n')
            .flatMap(extractKeys)
            .filter((item): item is { key: string, hint?: string } => !!item);

        const uniqueItems = Array.from(new Map(extractedItems.map(item => [item.key, item])).values());

        if (uniqueItems.length === 0) {
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: "I couldn't find any valid API key formats. Switch to Chat Mode to talk."
            }])
            setLoading(false)
            processingRef.current = false
            return
        }

        const resultsPromises = uniqueItems.map(async ({ key, hint }) => {
            try {
                const payload = {
                    content: key,
                    timestamp: Date.now()
                };
                const encryptedPayload = encryptData(JSON.stringify(payload));

                const res = await fetch('/api/check', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key: encryptedPayload, hint, isEncrypted: true })
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
        const summaryText = `Processed ${uniqueItems.length} keys. Found ${workingCount} working, ${deadCount} invalid.`

        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: summaryText,
            results: newResults
        }])
        setLoading(false)
        processingRef.current = false
    }

    const handleModeChange = (newMode: AppMode) => {
        setMode(newMode)
    }

    const getPageTitle = () => {
        if (mode === 'postman') return 'API Tester - Oracle'
        if (messages.length === 0) return 'Start - Oracle'
        return 'Results - Oracle'
    }

    const getHeroContent = () => {
        if (mode === 'postman') {
            return {
                badge: 'New',
                badgeText: 'Oracle API Tester',
                title: 'Test APIs with',
                subtitle: 'Paste URL, cURL, or describe your request. We\'ll handle the rest.'
            }
        }
        return {
            badge: 'New',
            badgeText: 'Oracle Analysis v2.0',
            title: 'Verify API keys with',
            subtitle: 'Test all your API secrets and more all at one place.'
        }
    }

    const heroContent = getHeroContent()

    // Get loading text based on mode
    const getLoadingText = () => {
        switch (mode) {
            case 'postman':
                return 'Sending request...'
            case 'chat':
                return 'Thinking...'
            default:
                return 'Verifying credentials...'
        }
    }

    return (
        <div className={styles.dashboardContainer}>
            <StaggeredMenu
                items={menuItems}
                socialItems={socialItems}
                logo={messages.length > 0 ? (mode === 'postman' ? "Oracle API Tester" : "Oracle Intelligent Check") : null}
                rightElement={
                    messages.length > 0 ? (
                        <div
                            onClick={() => {
                                setMessages([])
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
                <title>{getPageTitle()}</title>
            </Head>

            {/* Background */}
            <div
                className={styles.backgroundGlow}
                style={
                    messages.length > 0
                        ? { opacity: 0.5 }
                        : mode === 'postman'
                            ? {
                                background: `
                                    radial-gradient(circle at 50% 0%, rgba(255, 108, 55, 0.35) 0%, transparent 60%),
                                    radial-gradient(circle at 50% 100%, rgba(255, 80, 30, 0.25) 0%, transparent 60%)
                                `
                            }
                            : undefined
                }
            />

            {messages.length === 0 ? (
                <div className={styles.centeredContent}>
                    <div className={styles.pillBadge} style={mode === 'postman' ? { borderColor: 'rgba(255, 108, 55, 0.3)' } : {}}>
                        <span style={mode === 'postman' ? { background: 'linear-gradient(135deg, #FF6C37, #FF4F1F)' } : {}}>
                            {heroContent.badge}
                        </span>
                        {heroContent.badgeText}
                    </div>

                    <h1 className={styles.heroTitle} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0px', paddingLeft: '160px' }}>
                        {heroContent.title}
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
                        {heroContent.subtitle}
                    </p>

                    {/* Postman helper tips */}
                    {mode === 'postman' && (
                        <div style={{
                            display: 'flex',
                            gap: '0.75rem',
                            marginBottom: '1.5rem',
                            flexWrap: 'wrap',
                            justifyContent: 'center'
                        }}>
                            {[
                                'GET https://api.example.com/users',
                                'curl -X POST ...',
                                'POST to jsonplaceholder/posts'
                            ].map((example, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        const input = document.querySelector('textarea')
                                        if (input) {
                                            input.value = example
                                            input.dispatchEvent(new Event('input', { bubbles: true }))
                                        }
                                    }}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        background: 'rgba(255, 108, 55, 0.1)',
                                        border: '1px solid rgba(255, 108, 55, 0.2)',
                                        borderRadius: '8px',
                                        color: 'rgba(255, 255, 255, 0.6)',
                                        fontSize: '0.8rem',
                                        fontFamily: "'Geist Mono', monospace",
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {example}
                                </button>
                            ))}
                        </div>
                    )}

                    <div style={{ width: '100%', maxWidth: '700px' }}>
                        <ChatInput
                            onSend={handleSend}
                            disabled={loading}
                            isCentered={true}
                            mode={mode}
                            onModeChange={handleModeChange}
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
                                        {msg.content && (
                                            <div className={styles.messageText}>
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {msg.content}
                                                </ReactMarkdown>
                                            </div>
                                        )}
                                        {msg.results && <ResultMessage results={msg.results} />}
                                        {msg.postmanResult && (
                                            <PostmanResponseCard
                                                request={msg.postmanResult.request}
                                                response={msg.postmanResult.response}
                                                onRetry={() => {
                                                    // Re-run the same request
                                                    handleSend(msg.postmanResult!.request.url)
                                                }}
                                            />
                                        )}
                                    </div>
                                </div>
                            ))}
                            {loading && (
                                <div className={`${styles.messageRow} ${styles.assistant}`}>
                                    <div className={styles.messageBubble}>
                                        <div className={styles.senderName}>Oracle</div>
                                        <div className={styles.messageText} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{
                                                display: 'inline-block',
                                                width: '8px',
                                                height: '8px',
                                                background: mode === 'postman' ? '#FF6C37' : '#3b82f6',
                                                borderRadius: '50%',
                                                animation: 'pulse 1s ease-in-out infinite'
                                            }} />
                                            {getLoadingText()}
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
                                mode={mode}
                                onModeChange={handleModeChange}
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

            {/* Pulse animation */}
            <style jsx global>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.2); }
                }
            `}</style>
        </div>
    )
}
