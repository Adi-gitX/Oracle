import { useState, useRef, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import Image from 'next/image'
import styles from '../styles/Dashboard.module.css'
import ChatInput, { AppMode, ChatModelPreference } from '../components/ChatInput'
import ResultMessage from '../components/ResultMessage'
import StaggeredMenu from '../components/StaggeredMenu/StaggeredMenu'
import RequestBuilder from '../components/postman/RequestBuilder'
import PostmanResponseCard from '../components/postman/PostmanResponseCard'
import PostmanLoader from '../components/postman/PostmanLoader'
import HistoryPanel from '../components/postman/HistoryPanel'
import CommandPalette, { CommandItem } from '../components/CommandPalette'
import BYOKSettingsModal from '../components/BYOKSettingsModal'
import { useRouter } from 'next/router'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { encryptData, decryptData, isEncryptionAvailable } from '../utils/encryption'
import { parseUserInput } from '../lib/postman/RequestParser'
import { RequestConfig, ResponseData } from '../lib/postman/types'
import { addToHistory, generateId } from '../lib/postman/storage'

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
    modelUsed?: string
    isError?: boolean
}

const socialItems = [
    { label: 'LinkedIn', link: 'https://www.linkedin.com/in/kammatiaditya/' },
    { label: 'GitHub', link: 'https://github.com/Adi-gitX' },
    { label: 'X', link: 'https://x.com/AdiGitX' }
];

export default function Dashboard() {
    const [messages, setMessages] = useState<Message[]>([])
    const [loading, setLoading] = useState(false)
    const [lastPostmanInFlight, setLastPostmanInFlight] = useState<{ method: string; url: string } | null>(null)
    const [mode, setMode] = useState<AppMode>('check')
    const [modelPreference, setModelPreference] = useState<ChatModelPreference>('fast')
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
            chatContainerRef.current.scrollTo({ top: scrollHeight - clientHeight, behavior: 'auto' })
        }
    }

    const hasMessages = messages.length > 0
    const autoScrollRef = useRef(true)
    const PREF_KEY = 'oracle_ui_preferences_v1'
    const router = useRouter()

    useEffect(() => {
        if (typeof window === 'undefined') return
        try {
            const raw = localStorage.getItem(PREF_KEY)
            if (!raw) return
            const parsed = JSON.parse(raw) as { mode?: AppMode, chatModelPreference?: ChatModelPreference }
            if (parsed.mode && ['check', 'chat', 'postman'].includes(parsed.mode)) {
                setMode(parsed.mode)
            }
            if (parsed.chatModelPreference && ['fast', 'quality'].includes(parsed.chatModelPreference)) {
                setModelPreference(parsed.chatModelPreference)
            }
        } catch {
            // no-op
        }
    }, [])

    useEffect(() => {
        if (typeof window === 'undefined') return
        localStorage.setItem(PREF_KEY, JSON.stringify({ mode, chatModelPreference: modelPreference }))
    }, [mode, modelPreference])

    useEffect(() => {
        const container = chatContainerRef.current
        const content = chatContentRef.current
        if (!container || !content) return
        const resizeObserver = new ResizeObserver(() => {
            if (!autoScrollRef.current) return
            const targetTop = container.scrollHeight - container.clientHeight
            if (targetTop > 0) container.scrollTo({ top: targetTop, behavior: 'auto' })
        })
        resizeObserver.observe(content)
        return () => resizeObserver.disconnect()
    }, [hasMessages])

    const handleScroll = () => {
        const container = chatContainerRef.current
        if (!container) return
        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
        autoScrollRef.current = distanceFromBottom < 120
    }

    const processingRef = useRef(false)

    useEffect(() => {
        if (mode !== 'postman' && editorOpen) {
            setEditorOpen(false)
        }
    }, [mode, editorOpen])

    // ESC to close floating editor
    useEffect(() => {
        if (!editorOpen) return
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setEditorOpen(false) }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [editorOpen])

    // Load shared request from URL hash (#r=...) on mount
    useEffect(() => {
        if (typeof window === 'undefined') return
        const hash = window.location.hash
        if (!hash || !hash.includes('r=')) return
        // Lazy import to avoid SSR issues
        import('../lib/postman/Permalink').then(({ decodeRequestFromHash }) => {
            const decoded = decodeRequestFromHash(hash)
            if (!decoded || !decoded.url) return
            setEditorConfig(prev => ({
                ...prev,
                method: decoded.method ?? prev.method,
                url: decoded.url ?? prev.url,
                headers: decoded.headers ?? [],
                params: decoded.params ?? [],
                body: decoded.body ?? { type: 'none' }
            }))
            setMode('postman')
            setEditorOpen(true)
            // Clear the hash so refreshes don't keep re-opening
            try { history.replaceState(null, '', window.location.pathname) } catch { /* noop */ }
        })
    }, [])

    // Cmd+K / Ctrl+K command palette
    const [paletteOpen, setPaletteOpen] = useState(false)
    const [byokOpen, setByokOpen] = useState(false)
    const [historyOpen, setHistoryOpen] = useState(false)

    // Menu items — declared inside so the API Key Settings entry can open the BYOK modal
    const menuItems = [
        { label: 'Home', link: '/' },
        { label: 'Dashboard', link: '/dashboard' },
        { label: 'Pricing', link: '/pricing' },
        { label: 'Docs', link: '/docs' },
        { label: 'Suggestions', link: '/suggestions' },
        { label: 'Request History', link: '#', onClick: () => setHistoryOpen(true) },
        { label: 'API Key Settings', link: '#', onClick: () => setByokOpen(true) }
    ]
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault()
                setPaletteOpen(p => !p)
            } else if (e.key === 'Escape' && paletteOpen) {
                setPaletteOpen(false)
            }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [paletteOpen])

    // Auto-open BYOK modal when navigated with ?settings=byok (from sidebar on other pages)
    useEffect(() => {
        if (typeof window === 'undefined') return
        const url = new URL(window.location.href)
        if (url.searchParams.get('settings') === 'byok') {
            setByokOpen(true)
            url.searchParams.delete('settings')
            try { history.replaceState(null, '', url.pathname + (url.search || '') + url.hash) } catch { /* noop */ }
        }
    }, [])


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

        const txt = await res.text()
        let data: any = {}
        try {
            data = txt ? JSON.parse(txt) : {}
        } catch {
            throw new Error(`Server returned an invalid response (HTTP ${res.status}). Please try again.`)
        }
        if (data.error) throw new Error(data.error)
        if (!res.ok) throw new Error(data.message || res.statusText)
        return { status: data.status, statusText: data.statusText, headers: data.headers, body: data.body, time: data.time, size: data.size }
    }


    const handleEditorSend = async (config: RequestConfig) => {
        setLoading(true)
        setLastPostmanInFlight({ method: config.method, url: config.url })
        autoScrollRef.current = true
        setEditorConfig(config)
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: `${config.method} ${config.url}` }])

        try {
            const response = await executePostmanRequest(config)
            addToHistory({ id: generateId(), timestamp: Date.now(), request: config, response })
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: '', postmanResult: { request: config, response } }])
        } catch (e) {
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: e instanceof Error ? e.message : 'Unknown error', isError: true }])
        } finally {
            setLoading(false)
            setLastPostmanInFlight(null)
        }
    }


    const handleSend = async (inputText: string) => {
        if (processingRef.current || loading) return
        processingRef.current = true
        autoScrollRef.current = true

        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: inputText }])
        setLoading(true)
        requestAnimationFrame(() => scrollToBottom())


        if (mode === 'postman') {
            try {
                const parsed = parseUserInput(inputText)
                setEditorConfig(parsed.config)
                setLastPostmanInFlight({ method: parsed.config.method, url: parsed.config.url })
                const response = await executePostmanRequest(parsed.config)
                addToHistory({ id: generateId(), timestamp: Date.now(), request: parsed.config, response })
                setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: '', postmanResult: { request: parsed.config, response } }])
            } catch (e) {
                setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: e instanceof Error ? e.message : 'Unknown error', isError: true }])
            }
            setLoading(false)
            setLastPostmanInFlight(null)
            processingRef.current = false
            return
        }


        if (mode === 'chat') {
            try {
                const allResults = messages.flatMap(m => m.results || [])
                const validKeys = allResults.filter(r => r.status === 'valid')
                const encryptionEnabled = isEncryptionAvailable()
                const requestBody = encryptionEnabled
                    ? {
                        payload: encryptData(JSON.stringify({ message: inputText, context: validKeys, modelPreference })),
                        isEncrypted: true
                    }
                    : {
                        message: inputText,
                        context: validKeys,
                        modelPreference,
                        isEncrypted: false
                    }

                // BYOK: fetch user's encrypted Gemini key (decrypted in-browser only)
                const { secureGet, BYOK_GEMINI_KEY_STORAGE } = await import('../lib/SecureStore')
                const userKey = await secureGet(BYOK_GEMINI_KEY_STORAGE)
                const headers: Record<string, string> = { 'Content-Type': 'application/json' }
                if (userKey) headers['X-Oracle-LLM-Key'] = userKey

                const res = await fetch('/api/chat', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(requestBody)
                })
                const rawText = await res.text()
                let rawData: any = {}
                try {
                    rawData = rawText ? JSON.parse(rawText) : {}
                } catch {
                    throw new Error(
                        res.status === 503
                            ? 'AI chat is unavailable here. Try Postman mode or Check mode.'
                            : `Server returned an unexpected response (HTTP ${res.status}). Please try again later.`
                    )
                }
                const data = rawData.isEncrypted ? JSON.parse(decryptData(rawData.payload)) : rawData
                if (!res.ok) throw new Error(data.message || data.error || res.statusText)
                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: data.reply || "I'm having trouble connecting right now.",
                    modelUsed: data.modelUsed
                }])
            } catch (e) {
                setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: `${e instanceof Error ? e.message : 'Unknown error'}` }])
            }
            setLoading(false)
            processingRef.current = false
            return
        }


        const keyRegex = /\b(AIza[a-zA-Z0-9-_]{35}|sk-proj-[a-zA-Z0-9-_]{20,}|gsk_[a-zA-Z0-9]{20,}|sk-ant-[a-zA-Z0-9-_]{20,}|sk[_\-][a-zA-Z0-9._-]{20,}|pk[_\-][a-zA-Z0-9._-]{20,}|ghp_[a-zA-Z0-9]{20,}|github_pat_[a-zA-Z0-9_]{20,}|xox[baprs]-[a-zA-Z0-9-]{10,}|SG\.[a-zA-Z0-9_\-\.]{20,}|npm_[a-zA-Z0-9]{20,}|glpat-[a-zA-Z0-9-]{20,}|hf_[a-zA-Z0-9]{20,}|AKIA[a-zA-Z0-9]{16})\b/g
        const envLineRegex = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*[:=]\s*(.+?)\s*$/

        const extractKeys = (line: string): { key: string, providerHint?: string }[] => {
            const envMatch = line.match(envLineRegex)
            const providerHint = envMatch?.[1]
            const content = envMatch?.[2] || line
            const results: { key: string, providerHint?: string }[] = []

            keyRegex.lastIndex = 0
            let match: RegExpExecArray | null
            while ((match = keyRegex.exec(content)) !== null) {
                results.push({
                    key: match[1],
                    providerHint
                })
            }

            return results
        }

        const extractedItems = inputText.split('\n').flatMap(extractKeys).filter(Boolean)
        const uniqueItems = Array.from(
            extractedItems.reduce((acc, item) => {
                const existing = acc.get(item.key)
                if (!existing || (!existing.providerHint && item.providerHint)) {
                    acc.set(item.key, item)
                }
                return acc
            }, new Map<string, { key: string, providerHint?: string }>())
        ).map(([, value]) => value)

        if (uniqueItems.length === 0) {
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: "No valid API key formats found. Switch to Chat Mode to talk." }])
            setLoading(false)
            processingRef.current = false
            return
        }

        const results = await Promise.all(uniqueItems.map(async ({ key, providerHint }) => {
            try {
                const encryptionEnabled = isEncryptionAvailable()
                const requestBody = encryptionEnabled
                    ? {
                        key: encryptData(JSON.stringify({ content: key, timestamp: Date.now() })),
                        providerHint: providerHint ? { variableName: providerHint, source: 'env_line' } : undefined,
                        hint: providerHint,
                        isEncrypted: true
                    }
                    : {
                        key,
                        providerHint: providerHint ? { variableName: providerHint, source: 'env_line' } : undefined,
                        hint: providerHint,
                        isEncrypted: false
                    }

                const res = await fetch('/api/check', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                })
                const checkText = await res.text()
                let rawData: any = {}
                try {
                    rawData = checkText ? JSON.parse(checkText) : {}
                } catch {
                    rawData = { valid: false, message: `Server returned an unexpected response (HTTP ${res.status}).` }
                }
                const data = rawData.isEncrypted ? JSON.parse(decryptData(rawData.payload)) : rawData
                const verificationLevel = (data.verificationLevel || (data.valid ? 'verified' : 'unknown')) as 'verified' | 'format_only' | 'unknown'
                const status: KeyResult['status'] = data.valid
                    ? 'valid'
                    : verificationLevel === 'format_only'
                        ? 'unverified'
                        : 'invalid'
                const warnings = Array.isArray(data.warnings) ? data.warnings : []
                const details = [data.message, ...warnings].filter(Boolean).join('\n')

                return {
                    key,
                    provider: data.provider || 'Unknown',
                    status,
                    details,
                    premium: data.premium,
                    confidenceScore: data.confidenceScore,
                    trustLevel: data.trustLevel,
                    verificationLevel,
                    warnings
                }
            } catch {
                return {
                    key,
                    provider: 'Unknown',
                    status: 'invalid' as KeyResult['status'],
                    details: 'Network Error',
                    verificationLevel: 'unknown' as const
                }
            }
        }))

        setMessages(prev => [...prev, {
            id: Date.now().toString(), role: 'assistant',
            content: `Found ${results.filter(r => r.status === 'valid').length} working, ${results.filter(r => r.status === 'unverified').length} unverified, ${results.filter(r => r.status === 'invalid').length} invalid.`,
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
                    <div className={styles.menuRightActions}>
                        <button
                            onClick={() => setPaletteOpen(true)}
                            className={styles.cmdKBadge}
                            title="Open command palette (⌘K)"
                            aria-label="Open command palette"
                            data-testid="cmdk-header-btn"
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            <span>⌘K</span>
                        </button>

                        {mode === 'postman' && (
                            <button
                                onClick={() => setEditorOpen(!editorOpen)}
                                className={`${styles.editorToggleBtn} ${editorOpen ? styles.editorToggleBtnActive : ''}`}
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
                        {(messages.length > 0 || mode === 'postman') && (
                            <div
                                onClick={() => { setMessages([]); setEditorOpen(false); }}
                                className={styles.newSessionIconBtn}
                                title="New session"
                            >
                                <Image src="/assets/branding/oracle-iconLogo.png" alt="New Chat" width={35} height={35} className="hover:opacity-80 transition-opacity" />
                            </div>
                        )}
                    </div>
                }
                position="left"
                isFixed={true}
                accentColor="#FF6C37"
            />
            <Head><title>{getPageTitle()}</title></Head>


            <div
                className={`${styles.backgroundGlow} ${messages.length > 0 ? styles.backgroundGlowSubtle : ''} ${mode === 'postman' ? styles.backgroundGlowPostman : ''}`}
            />


            <div className={styles.workspaceShell}>

                <div className={`${styles.mainPane} ${editorOpen ? styles.mainPaneEditorOpen : ''}`}>
                    {messages.length === 0 ? (
                        <div className={styles.centeredContent}>
                            <div className={`${styles.pillBadge} ${styles.pillBadgeInternalFix} ${mode === 'postman' ? styles.postmanBadge : ''}`}>
                                <span>{heroContent.badge}</span> {heroContent.badgeText}
                            </div>
                            <h1 className={`${styles.heroTitle} ${styles.heroTitleRow}`}>
                                {heroContent.title}
                                <span className={styles.heroLogoMark}>
                                    <Image src="/assets/branding/oracle-logo.png" alt="Oracle Logo" width={550} height={176} objectFit="contain" priority />
                                </span>
                            </h1>
                            <p className={styles.heroSubtitle}>{heroContent.subtitle}</p>
                            <div className={styles.heroInputWrap}>
                                <ChatInput
                                    onSend={handleSend}
                                    disabled={loading}
                                    isCentered={true}
                                    mode={mode}
                                    onModeChange={handleModeChange}
                                    modelPreference={modelPreference}
                                    onModelPreferenceChange={setModelPreference}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className={styles.chatLayout}>
                            <div className={styles.chatScrollArea} ref={chatContainerRef} onScroll={handleScroll}>
                                <div className={styles.chatContentInner} ref={chatContentRef}>
                                    {messages.map((msg) => (
                                        <div key={msg.id} className={`${styles.messageRow} ${styles[msg.role]}`}>
                                            <div className={styles.messageBubble}>
                                                <div className={styles.senderName}>
                                                    {msg.role === 'user' ? 'You' : 'Oracle'}
                                                </div>
                                                {msg.content && (
                                                    msg.isError ? (
                                                        <div className={styles.errorCard} data-testid="chat-error-card">
                                                            <span className={styles.errorIcon}>
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                                                                    <circle cx="12" cy="12" r="10" />
                                                                    <line x1="12" y1="8" x2="12" y2="12" />
                                                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                                                </svg>
                                                            </span>
                                                            <div className={styles.errorBody}>
                                                                <div className={styles.errorTitle}>Request Failed</div>
                                                                <div className={styles.errorMessage}>{msg.content}</div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className={styles.messageText}><ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown></div>
                                                    )
                                                )}
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
                                                                className={styles.editInEditorBtn}
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
                                                {mode === 'postman' && lastPostmanInFlight ? (
                                                    <PostmanLoader method={lastPostmanInFlight.method} url={lastPostmanInFlight.url} />
                                                ) : (
                                                    <div className={`${styles.messageText} ${styles.loadingTextRow}`}>
                                                        <span className={`${styles.loadingPulseDot} ${mode === 'postman' ? styles.loadingPulseDotPostman : ''}`} />
                                                        {getLoadingText()}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className={styles.floatingInput}>
                                <div className={`${styles.floatingInputInner} ${editorOpen ? styles.floatingInputInnerEditorOpen : ''}`}>
                                    <ChatInput
                                        onSend={handleSend}
                                        disabled={loading}
                                        mode={mode}
                                        onModeChange={handleModeChange}
                                        modelPreference={modelPreference}
                                        onModelPreferenceChange={setModelPreference}
                                    />
                                </div>
                                <div className={styles.floatingInputHint}>
                                    {mode === 'postman'
                                        ? <>Tip: Click <span className={styles.kbd}>Open Editor</span> for full control · Press <span className={styles.kbd}>⌘K</span> for commands</>
                                        : <>Press <span className={styles.kbd}>⌘K</span> for commands · By using Oracle, you agree to our <Link href="/docs#legal"><a className={styles.floatingInputHintLink}>Terms</a></Link></>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>


                <div
                    className={`${styles.editorCanvasBackdrop} ${editorOpen ? styles.editorCanvasBackdropOpen : ''}`}
                    onClick={() => setEditorOpen(false)}
                    aria-hidden="true"
                />

                <div className={`${styles.editorCanvas} ${editorOpen ? styles.editorCanvasOpen : ''}`} role="dialog" aria-modal="true">

                    <div className={styles.editorCanvasGlow} />


                    <div className={styles.editorCanvasHeader}>
                        <div className={styles.editorCanvasHeaderLeft}>
                            <div className={styles.editorCanvasDots}>
                                <span className={`${styles.editorCanvasDot} ${styles.editorCanvasDotRed}`} />
                                <span className={`${styles.editorCanvasDot} ${styles.editorCanvasDotYellow}`} />
                                <span className={`${styles.editorCanvasDot} ${styles.editorCanvasDotGreen}`} />
                            </div>
                            <span className={styles.editorCanvasTitle}>
                                request_editor.tsx
                            </span>
                            <span className={styles.editorCanvasSubtitle}>CANVAS</span>
                        </div>
                        <button
                            onClick={() => setEditorOpen(false)}
                            className={styles.editorCanvasCloseBtn}
                            aria-label="Close editor"
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>


                    <div className={styles.editorCanvasBody}>
                        <RequestBuilder
                            onSend={handleEditorSend}
                            loading={loading}
                            initialConfig={editorConfig}
                        />
                    </div>


                    <div className={styles.editorCanvasFooter}>
                        <span className={styles.editorCanvasFooterHint}>
                            Press <kbd className={styles.editorCanvasKbd}>⌘</kbd> + <kbd className={styles.editorCanvasKbd}>Enter</kbd> to send
                        </span>
                        <span className={styles.editorCanvasFooterBrand}>
                            Powered by Oracle
                        </span>
                    </div>
                </div>
            </div>

            <CommandPalette
                open={paletteOpen}
                onClose={() => setPaletteOpen(false)}
                commands={[
                    { id: 'mode-chat', group: 'Modes', label: 'Switch to Chat Mode', hint: 'Ask the AI assistant', shortcut: 'C', onSelect: () => setMode('chat') },
                    { id: 'mode-check', group: 'Modes', label: 'Switch to Check Mode', hint: 'Validate API keys', shortcut: 'V', onSelect: () => setMode('check') },
                    { id: 'mode-postman', group: 'Modes', label: 'Switch to Postman Mode', hint: 'Test HTTP requests', shortcut: 'P', onSelect: () => setMode('postman') },
                    { id: 'open-editor', group: 'Actions', label: editorOpen ? 'Close Editor' : 'Open Postman Editor', hint: 'Floating request canvas', shortcut: 'E', onSelect: () => { setMode('postman'); setEditorOpen(o => !o) } },
                    { id: 'clear-chat', group: 'Actions', label: 'Clear Conversation', hint: 'Wipes the current message list', onSelect: () => setMessages([]) },
                    { id: 'focus-input', group: 'Actions', label: 'Focus Input', hint: 'Jump to the message field', shortcut: '/', onSelect: () => {
                        const ta = document.querySelector<HTMLTextAreaElement>('textarea')
                        ta?.focus()
                    } },
                    { id: 'toggle-model', group: 'Settings', label: modelPreference === 'fast' ? 'Switch to Quality Model' : 'Switch to Fast Model', hint: 'Toggle Gemini Flash / Pro', onSelect: () => setModelPreference(p => p === 'fast' ? 'quality' : 'fast') },
                    { id: 'byok-settings', group: 'Settings', label: 'API Key Settings (BYOK)', hint: 'Use your own Gemini key — encrypted locally', shortcut: 'S', onSelect: () => setByokOpen(true) },
                    { id: 'history', group: 'Actions', label: 'Open Request History', hint: 'See and replay your last 100 requests', shortcut: 'H', onSelect: () => { setMode('postman'); setHistoryOpen(true) } },
                    { id: 'nav-home', group: 'Navigate', label: 'Home', hint: '/', onSelect: () => router.push('/') },
                    { id: 'nav-docs', group: 'Navigate', label: 'Documentation', hint: '/docs', onSelect: () => router.push('/docs') },
                    { id: 'nav-pricing', group: 'Navigate', label: 'Pricing', hint: '/pricing', onSelect: () => router.push('/pricing') },
                    { id: 'nav-suggestions', group: 'Navigate', label: 'Suggestions', hint: '/suggestions', onSelect: () => router.push('/suggestions') }
                ]}
            />

            <BYOKSettingsModal open={byokOpen} onClose={() => setByokOpen(false)} />
            <HistoryPanel
                open={historyOpen}
                onClose={() => setHistoryOpen(false)}
                onLoad={(cfg) => {
                    setEditorConfig(cfg)
                    setMode('postman')
                    setEditorOpen(true)
                }}
            />

        </div>
    )
}
