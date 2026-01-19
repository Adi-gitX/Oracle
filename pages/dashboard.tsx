import { useState, useRef, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import Image from 'next/image'
import styles from '../styles/Dashboard.module.css'
import ChatInput, { AppMode } from '../components/ChatInput'
import ResultMessage from '../components/ResultMessage'
import StaggeredMenu from '../components/StaggeredMenu/StaggeredMenu'
import RequestBuilder from '../components/postman/RequestBuilder'
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


    const [editorOpen, setEditorOpen] = useState(false)
    const [editorConfig, setEditorConfig] = useState<RequestConfig>({
        method: 'GET',
        url: '',
        headers: [],
        params: [],
        auth: { type: 'none' },
        body: { type: 'none' }
    })

    const scrollToBottom = () => {
        if (chatContainerRef.current) {
            const { scrollHeight, clientHeight } = chatContainerRef.current
            chatContainerRef.current.scrollTo({ top: scrollHeight - clientHeight, behavior: 'smooth' })
        }
    }

    const hasMessages = messages.length > 0

    useEffect(() => {
        const container = chatContainerRef.current
        const content = chatContentRef.current
        if (!container || !content) return
        const resizeObserver = new ResizeObserver(() => {
            const targetTop = container.scrollHeight - container.clientHeight
            if (targetTop > 0) container.scrollTo({ top: targetTop, behavior: 'smooth' })
        })
        resizeObserver.observe(content)
        return () => resizeObserver.disconnect()
    }, [hasMessages])

    const processingRef = useRef(false)


    const executePostmanRequest = async (config: RequestConfig): Promise<ResponseData> => {
        const headers: Record<string, string> = {}
        config.headers.filter(h => h.enabled && h.key).forEach(h => { headers[h.key] = h.value })

        if (config.auth.type === 'bearer' && config.auth.bearer?.token) {
            headers['Authorization'] = `Bearer ${config.auth.bearer.token}`
        } else if (config.auth.type === 'basic' && config.auth.basic) {
            headers['Authorization'] = `Basic ${btoa(`${config.auth.basic.username}:${config.auth.basic.password}`)}`
        } else if (config.auth.type === 'apikey' && config.auth.apikey?.addTo === 'header') {
            headers[config.auth.apikey.key] = config.auth.apikey.value
        }

        let url = config.url
        if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url

        const enabledParams = [...config.params.filter(p => p.enabled && p.key)]
        if (config.auth.type === 'apikey' && config.auth.apikey?.addTo === 'query') {
            enabledParams.push({ key: config.auth.apikey.key, value: config.auth.apikey.value, enabled: true })
        }
        if (enabledParams.length > 0) {
            url += (url.includes('?') ? '&' : '?') + enabledParams.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&')
        }

        let body: string | undefined
        if (config.body.type === 'json' && config.body.raw) {
            headers['Content-Type'] = 'application/json'
            body = config.body.raw
        } else if (config.body.type === 'raw' && config.body.raw) {
            body = config.body.raw
        } else if (config.body.type === 'x-www-form-urlencoded' && config.body.urlencoded) {
            headers['Content-Type'] = 'application/x-www-form-urlencoded'
            body = config.body.urlencoded.filter(p => p.enabled).map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&')
        }

        const res = await fetch('/api/postman', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ method: config.method, url, headers, body, timeout: 30000 })
        })

        const data = await res.json()
        if (data.error) throw new Error(data.error)
        return { status: data.status, statusText: data.statusText, headers: data.headers, body: data.body, time: data.time, size: data.size }
    }


    const handleEditorSend = async (config: RequestConfig) => {
        setLoading(true)
        setEditorConfig(config)
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: `${config.method} ${config.url}` }])

        try {
            const response = await executePostmanRequest(config)
            addToHistory({ id: generateId(), timestamp: Date.now(), request: config, response })
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: '', postmanResult: { request: config, response } }])
        } catch (e) {
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: `❌ **Request Failed**: ${e instanceof Error ? e.message : 'Unknown error'}` }])
        } finally {
            setLoading(false)
        }
    }


    const handleSend = async (inputText: string) => {
        if (processingRef.current || loading) return
        processingRef.current = true

        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: inputText }])
        setLoading(true)
        requestAnimationFrame(() => scrollToBottom())


        if (mode === 'postman') {
            try {
                const parsed = parseUserInput(inputText)
                setEditorConfig(parsed.config)
                const response = await executePostmanRequest(parsed.config)
                addToHistory({ id: generateId(), timestamp: Date.now(), request: parsed.config, response })
                setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: '', postmanResult: { request: parsed.config, response } }])
            } catch (e) {
                setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: `❌ **Request Failed**\n\n${e instanceof Error ? e.message : 'Unknown error'}` }])
            }
            setLoading(false)
            processingRef.current = false
            return
        }


        if (mode === 'chat') {
            try {
                const allResults = messages.flatMap(m => m.results || [])
                const validKeys = allResults.filter(r => r.status === 'valid')
                const encryptedBody = encryptData(JSON.stringify({ message: inputText, context: validKeys }))
                const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payload: encryptedBody, isEncrypted: true }) })
                const rawData = await res.json()
                const data = rawData.isEncrypted ? JSON.parse(decryptData(rawData.payload)) : rawData
                if (!res.ok) throw new Error(data.message || res.statusText)
                setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: data.reply || "I'm having trouble connecting right now." }])
            } catch (e) {
                setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: `Error: ${e instanceof Error ? e.message : 'Unknown error'}` }])
            }
            setLoading(false)
            processingRef.current = false
            return
        }


        const extractKeys = (line: string): { key: string, hint?: string }[] => {
            const patternSource = "\\b(AIza[a-zA-Z0-9-_]{35}|sk-proj-[a-zA-Z0-9-_]+|gsk_[a-zA-Z0-9]+|sk-ant-[a-zA-Z0-9-_]+|sk[_\\-][a-zA-Z0-9._-]+|pk[_\\-][a-zA-Z0-9._-]+|ghp_[a-zA-Z0-9]+|github_pat_[a-zA-Z0-9_]+|xox[bp]-[a-zA-Z0-9-]+|SG\\.[a-zA-Z0-9_\\-\\.]+|npm_[a-zA-Z0-9]+|glpat-[a-zA-Z0-9-]+|hf_[a-zA-Z0-9]+|AKIA[a-zA-Z0-9]{16}|[a-zA-Z0-9_\\-]{32,})";
            const regex = new RegExp(patternSource, 'g');
            const results: { key: string, hint?: string }[] = [];
            let match;
            while ((match = regex.exec(line)) !== null) results.push({ key: match[1], hint: undefined });
            return results;
        }

        const extractedItems = inputText.split('\n').flatMap(extractKeys).filter(Boolean);
        const uniqueItems = Array.from(new Map(extractedItems.map(item => [item.key, item])).values());

        if (uniqueItems.length === 0) {
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: "No valid API key formats found. Switch to Chat Mode to talk." }])
            setLoading(false)
            processingRef.current = false
            return
        }

        const results = await Promise.all(uniqueItems.map(async ({ key, hint }) => {
            try {
                const encryptedPayload = encryptData(JSON.stringify({ content: key, timestamp: Date.now() }));
                const res = await fetch('/api/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: encryptedPayload, hint, isEncrypted: true }) })
                const rawData = await res.json()
                const data = rawData.isEncrypted ? JSON.parse(decryptData(rawData.payload)) : rawData
                return { key, provider: data.provider || 'Unknown', status: (data.valid ? 'valid' : 'invalid') as 'valid' | 'invalid', details: data.message, premium: data.premium }
            } catch {
                return { key, provider: 'Unknown', status: 'invalid' as 'valid' | 'invalid', details: 'Network Error' }
            }
        }))

        setMessages(prev => [...prev, {
            id: Date.now().toString(), role: 'assistant',
            content: `Found ${results.filter(r => r.status === 'valid').length} working, ${results.filter(r => r.status === 'invalid').length} invalid.`,
            results
        }])
        setLoading(false)
        processingRef.current = false
    }

    const handleModeChange = (newMode: AppMode) => setMode(newMode)

    const getPageTitle = () => mode === 'postman' ? 'API Tester - Oracle' : messages.length === 0 ? 'Start - Oracle' : 'Results - Oracle'

    const heroContent = mode === 'postman'
        ? { badge: 'New', badgeText: 'Oracle API Tester', title: 'Test APIs with', subtitle: 'Type a URL, paste cURL, or click "Open Editor" for full control.' }
        : { badge: 'New', badgeText: 'Oracle Analysis v2.0', title: 'Verify API keys with', subtitle: 'Test all your API secrets at one place.' }

    const getLoadingText = () => mode === 'postman' ? 'Sending request...' : mode === 'chat' ? 'Thinking...' : 'Verifying credentials...'

    return (
        <div className={styles.dashboardContainer}>
            <StaggeredMenu
                items={menuItems}
                socialItems={socialItems}
                logo={messages.length > 0 || mode === 'postman' ? (mode === 'postman' ? "Oracle API Tester" : "Oracle Intelligent Check") : null}
                rightElement={
                    (messages.length > 0 || mode === 'postman') ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

                            {mode === 'postman' && (
                                <button
                                    onClick={() => setEditorOpen(!editorOpen)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '10px 18px',
                                        background: editorOpen
                                            ? 'linear-gradient(135deg, #FF6C37, #FF4F1F)'
                                            : 'rgba(255,108,55,0.1)',
                                        border: editorOpen
                                            ? 'none'
                                            : '1px solid rgba(255,108,55,0.3)',
                                        borderRadius: '10px',
                                        color: '#fff',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                                        boxShadow: editorOpen ? '0 4px 20px rgba(255, 108, 55, 0.3)' : 'none'
                                    }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        {editorOpen ? (
                                            <>
                                                <line x1="18" y1="6" x2="6" y2="18" />
                                                <line x1="6" y1="6" x2="18" y2="18" />
                                            </>
                                        ) : (
                                            <>
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                            </>
                                        )}
                                    </svg>
                                    {editorOpen ? 'Close Editor' : 'Open Editor'}
                                </button>
                            )}
                            <div
                                onClick={() => { setMessages([]); setEditorOpen(false); }}
                                style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                            >
                                <Image src="/assets/branding/oracle-iconLogo.png" alt="New Chat" width={35} height={35} className="hover:opacity-80 transition-opacity" />
                            </div>
                        </div>
                    ) : null
                }
                position="left"
                isFixed={true}
            />
            <Head><title>{getPageTitle()}</title></Head>


            <div
                className={styles.backgroundGlow}
                style={
                    messages.length > 0
                        ? { opacity: 0.5 }
                        : mode === 'postman'
                            ? { background: `radial-gradient(circle at 50% 0%, rgba(255, 108, 55, 0.35) 0%, transparent 60%), radial-gradient(circle at 50% 100%, rgba(255, 80, 30, 0.25) 0%, transparent 60%)` }
                            : undefined
                }
            />


            <div style={{
                display: 'flex',
                width: '100%',
                height: '100vh',
                transition: 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)'
            }}>

                <div style={{
                    flex: editorOpen ? '0 0 50%' : '1',
                    transition: 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {messages.length === 0 ? (
                        <div className={styles.centeredContent}>
                            <div className={styles.pillBadge} style={mode === 'postman' ? { borderColor: 'rgba(255, 108, 55, 0.3)' } : {}}>
                                <span style={mode === 'postman' ? { background: 'linear-gradient(135deg, #FF6C37, #FF4F1F)' } : {}}>{heroContent.badge}</span> {heroContent.badgeText}
                            </div>
                            <h1 className={styles.heroTitle} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0px', paddingLeft: '160px' }}>
                                {heroContent.title}
                                <span style={{ display: 'flex', alignItems: 'center', marginLeft: '-160px' }}>
                                    <Image src="/assets/branding/oracle-logo.png" alt="Oracle Logo" width={550} height={176} objectFit="contain" priority />
                                </span>
                            </h1>
                            <p className={styles.heroSubtitle}>{heroContent.subtitle}</p>
                            <div style={{ width: '100%', maxWidth: '700px' }}>
                                <ChatInput onSend={handleSend} disabled={loading} isCentered={true} mode={mode} onModeChange={handleModeChange} />
                            </div>
                        </div>
                    ) : (
                        <div className={styles.chatLayout}>
                            <div className={styles.chatScrollArea} ref={chatContainerRef}>
                                <div className={styles.chatContentInner} ref={chatContentRef}>
                                    {messages.map((msg) => (
                                        <div key={msg.id} className={`${styles.messageRow} ${styles[msg.role]}`}>
                                            <div className={styles.messageBubble}>
                                                <div className={styles.senderName}>{msg.role === 'user' ? 'You' : 'Oracle'}</div>
                                                {msg.content && <div className={styles.messageText}><ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown></div>}
                                                {msg.results && <ResultMessage results={msg.results} />}
                                                {msg.postmanResult && (
                                                    <div>
                                                        <PostmanResponseCard
                                                            request={msg.postmanResult.request}
                                                            response={msg.postmanResult.response}
                                                            onRetry={() => handleEditorSend(msg.postmanResult!.request)}
                                                        />
                                                        {mode === 'postman' && (
                                                            <button
                                                                onClick={() => { setEditorConfig(msg.postmanResult!.request); setEditorOpen(true); }}
                                                                style={{
                                                                    marginTop: '10px',
                                                                    padding: '10px 16px',
                                                                    background: 'rgba(255, 108, 55, 0.1)',
                                                                    border: '1px solid rgba(255, 108, 55, 0.3)',
                                                                    borderRadius: '10px',
                                                                    color: '#FF6C37',
                                                                    fontSize: '0.85rem',
                                                                    fontWeight: 600,
                                                                    cursor: 'pointer',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '8px',
                                                                    transition: 'all 0.2s'
                                                                }}
                                                            >
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                                </svg>
                                                                Edit in Editor
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {loading && (
                                        <div className={`${styles.messageRow} ${styles.assistant}`}>
                                            <div className={styles.messageBubble}>
                                                <div className={styles.senderName}>Oracle</div>
                                                <div className={styles.messageText} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ width: '8px', height: '8px', background: mode === 'postman' ? '#FF6C37' : '#3b82f6', borderRadius: '50%', animation: 'pulse 1s infinite' }} />
                                                    {getLoadingText()}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className={styles.floatingInput} style={{ flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '100%', maxWidth: editorOpen ? '100%' : '800px', padding: editorOpen ? '0 20px' : '0' }}>
                                    <ChatInput onSend={handleSend} disabled={loading} mode={mode} onModeChange={handleModeChange} />
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
                                    {mode === 'postman' ? 'Tip: Click "Open Editor" for full control →' : <>By using Oracle, you agree to our <Link href="/docs#legal"><a style={{ textDecoration: 'underline', color: 'rgba(255,255,255,0.4)' }}>Terms</a></Link>.</>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>


                <div style={{
                    position: 'fixed',
                    top: 0,
                    right: 0,
                    width: '50%',
                    height: '100vh',
                    background: 'linear-gradient(145deg, rgba(15, 15, 15, 0.98), rgba(8, 8, 8, 0.99))',
                    backdropFilter: 'blur(40px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                    borderLeft: '1px solid rgba(255, 108, 55, 0.15)',
                    transform: editorOpen ? 'translateX(0)' : 'translateX(100%)',
                    opacity: editorOpen ? 1 : 0,
                    transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                    zIndex: 100,
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: editorOpen
                        ? '-30px 0 80px rgba(0, 0, 0, 0.6), 0 0 60px rgba(255, 108, 55, 0.08) inset'
                        : 'none'
                }}>

                    <div style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        width: '2px',
                        height: '100%',
                        background: 'linear-gradient(to bottom, #FF6C37, transparent 30%, transparent 70%, #FF6C37)',
                        opacity: editorOpen ? 0.6 : 0,
                        transition: 'opacity 0.5s'
                    }} />


                    <div style={{
                        padding: '18px 24px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'linear-gradient(135deg, rgba(255, 108, 55, 0.08), rgba(255, 80, 30, 0.03), transparent)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '38px',
                                height: '38px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'linear-gradient(135deg, rgba(255, 108, 55, 0.2), rgba(255, 80, 30, 0.1))',
                                borderRadius: '12px',
                                border: '1px solid rgba(255, 108, 55, 0.2)'
                            }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF6C37" strokeWidth="2.5">
                                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                </svg>
                            </div>
                            <div>
                                <span style={{
                                    fontWeight: 700,
                                    color: '#fff',
                                    fontSize: '1rem',
                                    display: 'block'
                                }}>Request Editor</span>
                                <span style={{
                                    fontSize: '0.72rem',
                                    color: 'rgba(255, 108, 55, 0.7)',
                                    fontWeight: 500,
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px'
                                }}>Canvas Mode</span>
                            </div>
                        </div>
                        <button
                            onClick={() => setEditorOpen(false)}
                            style={{
                                width: '38px',
                                height: '38px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '12px',
                                color: 'rgba(255, 255, 255, 0.5)',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(229, 57, 53, 0.1)'
                                e.currentTarget.style.borderColor = 'rgba(229, 57, 53, 0.3)'
                                e.currentTarget.style.color = '#E53935'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'
                                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)'
                            }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>


                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '24px',
                        background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.2))'
                    }}>
                        <RequestBuilder
                            onSend={handleEditorSend}
                            loading={loading}
                            initialConfig={editorConfig}
                        />
                    </div>


                    <div style={{
                        padding: '14px 24px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                        background: 'rgba(0, 0, 0, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.35)' }}>
                            Press <kbd style={{
                                padding: '3px 8px',
                                background: 'rgba(255,255,255,0.06)',
                                borderRadius: '6px',
                                border: '1px solid rgba(255,255,255,0.08)',
                                fontFamily: 'inherit',
                                fontSize: '0.7rem'
                            }}>⌘</kbd> + <kbd style={{
                                padding: '3px 8px',
                                background: 'rgba(255,255,255,0.06)',
                                borderRadius: '6px',
                                border: '1px solid rgba(255,255,255,0.08)',
                                fontFamily: 'inherit',
                                fontSize: '0.7rem'
                            }}>Enter</kbd> to send
                        </span>
                        <span style={{
                            fontSize: '0.7rem',
                            color: 'rgba(255, 108, 55, 0.5)',
                            fontWeight: 500
                        }}>
                            Powered by Oracle
                        </span>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.2); }
                }
            `}</style>
        </div>
    )
}
