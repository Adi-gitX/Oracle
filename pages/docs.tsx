import React from 'react';
import Head from 'next/head'
import Link from 'next/link'
import Image from 'next/image'
import styles from '../styles/Dashboard.module.css'
import docStyles from '../styles/Docs.module.css'
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

// Actual supported providers (verified against pages/api/check.ts)
const aiProviders = ['OpenAI', 'Anthropic', 'Google Gemini', 'Groq', 'Cohere', 'Mistral', 'HuggingFace'];
const cloudProviders = ['AWS', 'Google Cloud', 'Firebase', 'Supabase', 'Heroku', 'Cloudinary', 'Upstash', 'Postgres / Database'];
const devOpsProviders = ['GitHub', 'GitLab', 'NPM', 'Stripe', 'Clerk', 'Pusher', 'Shodan'];
const commsProviders = ['Slack', 'SendGrid', 'Mailgun', 'MailChimp', 'Resend', 'Twilio', 'Telegram', 'Mapbox', 'Bitly'];

export default function Docs() {
    const [activeSection, setActiveSection] = React.useState('');
    const scrollRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setActiveSection(entry.target.id);
                }
            });
        }, {
            root: scrollRef.current,
            rootMargin: '-20% 0px -35% 0px',
            threshold: 0.1
        });

        const sections = document.querySelectorAll('section[id]');
        sections.forEach((section) => observer.observe(section));

        return () => observer.disconnect();
    }, []);

    const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
        e.preventDefault();
        const element = document.getElementById(id);
        if (element && scrollRef.current) {
            const containerTop = scrollRef.current.getBoundingClientRect().top;
            const elementTop = element.getBoundingClientRect().top;
            const relativeTop = elementTop - containerTop + scrollRef.current.scrollTop;

            scrollRef.current.scrollTo({
                top: relativeTop - 40,
                behavior: 'smooth'
            });
        }
    };

    return (
        <div className={styles.dashboardContainer}>
            <StaggeredMenu
                items={menuItems}
                socialItems={socialItems}
                logo="Documentation"
                position="left"
                isFixed={true}
                rightElement={
                    <Link href="/dashboard">
                        <a>
                            <Image
                                src="/assets/branding/oracle-iconLogo.png"
                                alt="Oracle Icon"
                                width={40}
                                height={40}
                                objectFit="contain"
                                style={{ cursor: 'pointer' }}
                            />
                        </a>
                    </Link>
                }
            />
            <Head>
                <title>Docs - Oracle</title>
            </Head>

            <div className={styles.backgroundGlow} />

            <div
                ref={scrollRef}
                style={{ flex: 1, overflowY: 'auto', zIndex: 10, position: 'relative', scrollBehavior: 'smooth' }}
            >
                <div className={docStyles.docsContainer}>
                    <aside className={docStyles.sidebar}>
                        <div>
                            <div className={docStyles.sidebarTitle}>Start Here</div>
                            <a href="#intro"
                                onClick={(e) => handleScrollTo(e, 'intro')}
                                className={`${docStyles.navLink} ${activeSection === 'intro' ? docStyles.active : ''}`}>
                                Introduction
                            </a>
                            <a href="#features"
                                onClick={(e) => handleScrollTo(e, 'features')}
                                className={`${docStyles.navLink} ${activeSection === 'features' ? docStyles.active : ''}`}>
                                Key Features
                            </a>
                        </div>
                        <div>
                            <div className={docStyles.sidebarTitle}>Modes</div>
                            <a href="#mode-check"
                                onClick={(e) => handleScrollTo(e, 'mode-check')}
                                className={`${docStyles.navLink} ${activeSection === 'mode-check' ? docStyles.active : ''}`}>
                                Check Mode
                            </a>
                            <a href="#mode-chat"
                                onClick={(e) => handleScrollTo(e, 'mode-chat')}
                                className={`${docStyles.navLink} ${activeSection === 'mode-chat' ? docStyles.active : ''}`}>
                                Chat Mode
                            </a>
                            <a href="#mode-postman"
                                onClick={(e) => handleScrollTo(e, 'mode-postman')}
                                className={`${docStyles.navLink} ${activeSection === 'mode-postman' ? docStyles.active : ''}`}>
                                Postman Mode
                            </a>
                        </div>
                        <div>
                            <div className={docStyles.sidebarTitle}>Reference</div>
                            <a href="#providers"
                                onClick={(e) => handleScrollTo(e, 'providers')}
                                className={`${docStyles.navLink} ${activeSection === 'providers' ? docStyles.active : ''}`}>
                                Supported Providers
                            </a>
                            <a href="#context-aware"
                                onClick={(e) => handleScrollTo(e, 'context-aware')}
                                className={`${docStyles.navLink} ${activeSection === 'context-aware' ? docStyles.active : ''}`}>
                                Context-Aware Validation
                            </a>
                            <a href="#security"
                                onClick={(e) => handleScrollTo(e, 'security')}
                                className={`${docStyles.navLink} ${activeSection === 'security' ? docStyles.active : ''}`}>
                                Security Architecture
                            </a>
                        </div>
                        <div>
                            <div className={docStyles.sidebarTitle}>Legal</div>
                            <a href="#legal"
                                onClick={(e) => handleScrollTo(e, 'legal')}
                                className={`${docStyles.navLink} ${activeSection === 'legal' ? docStyles.active : ''}`}>
                                Terms &amp; Privacy
                            </a>
                        </div>
                    </aside>

                    <main className={docStyles.content}>
                        <section id="intro" className={docStyles.section}>
                            <h1 className={docStyles.title}>Introduction</h1>
                            <p className={docStyles.text}>
                                Oracle is a developer-first companion for working with API keys and HTTP services. It does three things really well: <strong>verifies</strong> if a key is valid and what it&apos;s for, <strong>tests</strong> any HTTP endpoint with a familiar request builder, and <strong>answers questions</strong> about your API stack with an integrated AI assistant.
                            </p>
                            <p className={docStyles.text}>
                                Designed for DevOps engineers, security teams, and product developers, Oracle helps you move faster while keeping credentials secure. No accounts. No per-request fees. No keys ever stored server-side.
                            </p>
                        </section>

                        <section id="features" className={docStyles.section}>
                            <h2 className={docStyles.subtitle}>Key Features</h2>
                            <ul className={docStyles.featureList} style={{ color: '#a1a1aa', lineHeight: '1.8' }}>
                                <li><strong>Three Modes In One Tool:</strong> Verify keys (Check), test APIs (Postman), and ask questions (Chat) — all from a single input.</li>
                                <li><strong>Multi-Provider Validation:</strong> Native support for 29 services across AI, cloud, infrastructure, communications, and developer tooling.</li>
                                <li><strong>Context-Aware Analysis:</strong> Detects mismatches between variable names (e.g. <code>OPENAI_KEY</code>) and the actual key vendor — preventing config drift before it hits production.</li>
                                <li><strong>Granular Error Reporting:</strong> Distinguishes between <code>Invalid (401)</code>, <code>Forbidden (403)</code>, and <code>Quota Exceeded (429)</code> instead of returning a generic &quot;failed&quot;.</li>
                                <li><strong>SSRF-Hardened Postman Proxy:</strong> Outbound HTTP requests run through a sandboxed proxy with DNS rebinding protection, redirect caps, and response-size limits.</li>
                                <li><strong>Smart Format Fallbacks:</strong> Identifies cross-provider key collisions (e.g. Google / Firebase / Gemini share <code>AIza…</code>; Stripe / Clerk both start with <code>sk_…</code>).</li>
                            </ul>
                        </section>

                        <section id="mode-check" className={docStyles.section}>
                            <h2 className={docStyles.subtitle}>Check Mode</h2>
                            <p className={docStyles.text}>
                                Paste any API key or an entire <code>.env</code> snippet. Oracle returns provider, validity, permissions where available, and a verification level (<code>verified</code> / <code>format_only</code> / <code>unknown</code>).
                            </p>
                            <div className={docStyles.codeBlock}>
                                {`# Input (paste anything)
OPENAI_API_KEY=sk-proj-abc123...

# Oracle Result
provider:           OpenAI
status:             Valid (200)
verificationLevel:  verified
keyType:            project
permissions:        chat.completions, embeddings, images`}
                            </div>
                            <p className={docStyles.text}>
                                Use Check when you want a fast, definitive answer about a credential without writing any code or curl commands.
                            </p>
                        </section>

                        <section id="mode-chat" className={docStyles.section}>
                            <h2 className={docStyles.subtitle}>Chat Mode</h2>
                            <p className={docStyles.text}>
                                A built-in AI assistant grounded in API knowledge. Ask about provider quirks, key formats, error codes, or how to debug an integration. Powered by Google Gemini (<code>gemini-2.5-flash</code> for speed; <code>gemini-2.5-pro</code> for depth — toggle in the input).
                            </p>
                            <ul style={{ color: '#a1a1aa', lineHeight: '1.8', paddingLeft: '1.5rem' }}>
                                <li><strong>Fast model</strong> — sub-second responses, ideal for quick lookups.</li>
                                <li><strong>Quality model</strong> — deeper reasoning for migration plans, security reviews, and debugging.</li>
                                <li>Conversations stay in your browser session; nothing is persisted server-side.</li>
                            </ul>
                            <p className={docStyles.text}>
                                Configure the model via <code>GOOGLE_API_KEY</code> (or <code>GEMINI_API_KEY</code>) in your environment.
                            </p>
                        </section>

                        <section id="mode-postman" className={docStyles.section}>
                            <h2 className={docStyles.subtitle}>Postman Mode</h2>
                            <p className={docStyles.text}>
                                A full-featured request builder for any HTTP API — without leaving Oracle. Supports headers, query params, four authorization types (None / Bearer / Basic / API Key), JSON bodies, redirects, and timing metrics.
                            </p>
                            <ul style={{ color: '#a1a1aa', lineHeight: '1.8', paddingLeft: '1.5rem' }}>
                                <li><strong>cURL import / export</strong> — paste a cURL command to instantly populate the editor, or copy your request out.</li>
                                <li><strong>Floating editor window</strong> — open the macOS-style canvas to edit headers, auth, body, and params with full keyboard support (<code>ESC</code> closes, click-outside to dismiss).</li>
                                <li><strong>Live response card</strong> — color-coded status pill, response time, payload size, headers tab, and one-click Copy Response / Copy cURL / Retry.</li>
                                <li><strong>Sandboxed proxy</strong> — all outbound calls flow through <code>/api/postman</code> which blocks private/loopback IPs (<code>127.0.0.0/8</code>, <code>10.0.0.0/8</code>, <code>192.168.0.0/16</code>) and limits responses to 1 MB.</li>
                            </ul>
                        </section>

                        <section id="providers" className={docStyles.section}>
                            <h2 className={docStyles.subtitle}>Supported Providers (29)</h2>
                            <p className={docStyles.text}>
                                The list below reflects the providers Oracle currently has dedicated validation logic for. Format-only matches still surface for unrecognized keys with a <code>format_only</code> verification level.
                            </p>

                            <h3 style={{ color: '#fff', fontSize: '1.05rem', marginTop: '1.75rem', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.04em' }}>AI &amp; LLM Services</h3>
                            <div className={docStyles.providerList}>
                                {aiProviders.map(p => (
                                    <div key={p} className={docStyles.providerItem}><span style={{ color: '#FF6C37' }}>●</span> {p}</div>
                                ))}
                            </div>

                            <h3 style={{ color: '#fff', fontSize: '1.05rem', marginTop: '1.75rem', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.04em' }}>Infrastructure &amp; Cloud</h3>
                            <div className={docStyles.providerList}>
                                {cloudProviders.map(p => (
                                    <div key={p} className={docStyles.providerItem}><span style={{ color: '#FF6C37' }}>●</span> {p}</div>
                                ))}
                            </div>

                            <h3 style={{ color: '#fff', fontSize: '1.05rem', marginTop: '1.75rem', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.04em' }}>DevOps &amp; Payments</h3>
                            <div className={docStyles.providerList}>
                                {devOpsProviders.map(p => (
                                    <div key={p} className={docStyles.providerItem}><span style={{ color: '#FF6C37' }}>●</span> {p}</div>
                                ))}
                            </div>

                            <h3 style={{ color: '#fff', fontSize: '1.05rem', marginTop: '1.75rem', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.04em' }}>Communication &amp; Utilities</h3>
                            <div className={docStyles.providerList}>
                                {commsProviders.map(p => (
                                    <div key={p} className={docStyles.providerItem}><span style={{ color: '#FF6C37' }}>●</span> {p}</div>
                                ))}
                            </div>
                        </section>

                        <section id="context-aware" className={docStyles.section}>
                            <h2 className={docStyles.subtitle}>Context-Aware Validation</h2>
                            <p className={docStyles.text}>
                                Environment variables are often copy-pasted incorrectly. Oracle reads the variable name AND the key prefix, then flags mismatches before they reach production.
                            </p>
                            <div className={docStyles.codeBlock}>
                                {`# Bad Configuration Example
GROQ_API_KEY="AIzaSyB..."   <-- This is a Google key, not Groq!

# Oracle Result:
[WARNING] Detected: Google (labelled as Groq)
"Key matches Google's AIza... format. Groq keys start with 'gsk_'."`}
                            </div>
                        </section>

                        <section id="security" className={docStyles.section}>
                            <h2 className={docStyles.subtitle}>Security Architecture</h2>
                            <p className={docStyles.text}>
                                Oracle uses a defense-in-depth model with strict verification semantics and production-safe defaults.
                            </p>
                            <ul style={{ color: '#a1a1aa', lineHeight: '1.8', paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
                                <li><strong>Strict Verification Levels:</strong> Every result includes <code>verificationLevel</code> (<code>verified</code>, <code>format_only</code>, <code>unknown</code>). Format-only matches are never reported as &quot;working&quot;.</li>
                                <li><strong>SSRF Hardening:</strong> The Postman proxy resolves DNS, blocks private and loopback IP ranges, caps redirects at 5, and limits responses to 1 MB.</li>
                                <li><strong>Optional Payload Encryption:</strong> When <code>NEXT_PUBLIC_ENCRYPTION_KEY</code> is set, request and response bodies are encrypted in transit between the browser and Oracle&apos;s API routes.</li>
                                <li><strong>Privacy-Safe Leak Handling:</strong> Oracle never sends raw keys to third-party code-search providers.</li>
                                <li><strong>Local History Off By Default:</strong> Postman request history is opt-in. When enabled, <code>Authorization</code> headers and auth fields are redacted before being saved to <code>localStorage</code>.</li>
                                <li><strong>Zero Server-Side Persistence:</strong> Oracle has no credential database. Verification happens in-memory per request.</li>
                            </ul>
                        </section>

                        <section id="legal" className={docStyles.section}>
                            <h2 className={docStyles.subtitle}>Legal &amp; Terms of Service</h2>

                            <h3 className={docStyles.subtitle} style={{ fontSize: '1.2rem', marginTop: '2rem' }}>1. Disclaimer of Warranty</h3>
                            <p className={docStyles.text} style={{ fontSize: '0.9rem', color: '#a1a1aa' }}>
                                THE SOFTWARE IS PROVIDED &quot;AS IS&quot;, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
                            </p>

                            <h3 className={docStyles.subtitle} style={{ fontSize: '1.2rem', marginTop: '2rem' }}>2. Limitation of Liability</h3>
                            <p className={docStyles.text}>
                                You expressly understand and agree that Oracle shall not be liable for any direct, indirect, incidental, special, consequential or exemplary damages, including but not limited to, damages for loss of profits, goodwill, use, data or other intangible losses resulting from the use or the inability to use the service.
                            </p>

                            <h3 className={docStyles.subtitle} style={{ fontSize: '1.2rem', marginTop: '2rem' }}>3. Zero Retention Policy</h3>
                            <p className={docStyles.text}>
                                Oracle is designed to avoid server-side credential persistence. Verification requests are processed in-memory and are not written to any Oracle database.
                            </p>
                            <p className={docStyles.text}>
                                Optional payload encryption is supported when configured, and HTTPS transport is required in production. Local client-side history is user-controlled and redacted by default behavior.
                            </p>

                            <h3 className={docStyles.subtitle} style={{ fontSize: '1.2rem', marginTop: '2rem' }}>4. User Responsibility</h3>
                            <p className={docStyles.text}>
                                You are solely responsible for the security of your API keys. We recommend rotating any keys that you believe may have been compromised, regardless of Oracle&apos;s verification results.
                            </p>
                        </section>
                    </main>
                </div>
            </div>
        </div>
    )
}
