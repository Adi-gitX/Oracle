import React from 'react';
import Head from 'next/head'
import Link from 'next/link'
import Image from 'next/image'
// import { Link as ScrollLink } from 'react-scroll' 
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
            root: scrollRef.current, // Use the scroll container as root
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
            // Calculate position relative to container
            const containerTop = scrollRef.current.getBoundingClientRect().top;
            const elementTop = element.getBoundingClientRect().top;
            const relativeTop = elementTop - containerTop + scrollRef.current.scrollTop;

            // Adjust for sticky header/padding (approx 100px)
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

            {/* Scrollable Area */}
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
                            <a href="#authentication"
                                onClick={(e) => handleScrollTo(e, 'authentication')}
                                className={`${docStyles.navLink} ${activeSection === 'authentication' ? docStyles.active : ''}`}>
                                Authentication
                            </a>
                        </div>
                        <div>
                            <div className={docStyles.sidebarTitle}>Core</div>
                            <a href="#providers"
                                onClick={(e) => handleScrollTo(e, 'providers')}
                                className={`${docStyles.navLink} ${activeSection === 'providers' ? docStyles.active : ''}`}>
                                Supported Providers
                            </a>
                            <a href="#security"
                                onClick={(e) => handleScrollTo(e, 'security')}
                                className={`${docStyles.navLink} ${activeSection === 'security' ? docStyles.active : ''}`}>
                                Security Model
                            </a>
                        </div>
                        <div>
                            <div className={docStyles.sidebarTitle}>API</div>
                            <a href="#chat"
                                onClick={(e) => handleScrollTo(e, 'chat')}
                                className={`${docStyles.navLink} ${activeSection === 'chat' ? docStyles.active : ''}`}>
                                AI Assistant
                            </a>
                            <a href="#usage"
                                onClick={(e) => handleScrollTo(e, 'usage')}
                                className={`${docStyles.navLink} ${activeSection === 'usage' ? docStyles.active : ''}`}>
                                Usage Limits
                            </a>
                            <a href="#legal"
                                onClick={(e) => handleScrollTo(e, 'legal')}
                                className={`${docStyles.navLink} ${activeSection === 'legal' ? docStyles.active : ''}`}>
                                Legal & Terms
                            </a>
                        </div>
                    </aside>

                    <main className={docStyles.content}>
                        <section id="intro" className={docStyles.section}>
                            <h1 className={docStyles.title}>Introduction</h1>
                            <p className={docStyles.text}>
                                Oracle is the developer-first tool for verifying, debugging, and auditing API keys.
                                We solve the problem of &quot;Is this key working?&quot; by securely testing it against the official provider endpoints.
                            </p>
                            <p className={docStyles.text}>
                                Whether you&apos;re cleaning up a detailed .env file or auditing a legacy codebase, Oracle gives you instant clarity on which credentials are active, what permissions they have (when possible), and if they correspond to a paid plan.
                            </p>
                        </section>

                        <section id="authentication" className={docStyles.section}>
                            <h2 className={docStyles.subtitle}>Authentication</h2>
                            <p className={docStyles.text}>
                                Oracle works by detecting API key formats in your input text. You do not need to format your input in JSON. Simply paste your entire config file, log dump, or chat history.
                            </p>
                            <div className={docStyles.codeBlock}>
                                {`# Example Input
OPENAI_API_KEY=sk-proj-12345...
ANTHROPIC_KEY=sk-ant-api03...
GOOGLE_API_KEY=AIzaSyD...`}
                            </div>
                        </section>

                        <section id="providers" className={docStyles.section}>
                            <h2 className={docStyles.subtitle}>Supported Providers</h2>
                            <div className={docStyles.providerList}>
                                {['OpenAI', 'Anthropic', 'Google Gemini', 'Cohere', 'Mistral', 'Groq', 'HuggingFace', 'Stripe', 'AWS (Basic)', 'Supabase'].map(p => (
                                    <div key={p} className={docStyles.providerItem}>
                                        <span style={{ color: '#3b82f6' }}>●</span> {p}
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section id="security" className={docStyles.section}>
                            <h2 className={docStyles.subtitle}>Security & Privacy</h2>
                            <p className={docStyles.text}>
                                Your security is our priority. Oracle operates on a <strong>&quot;Verify &amp; Forget&quot;</strong> model and includes enterprise-grade protection.
                            </p>
                            <p className={docStyles.text}>
                                Oracle is built with a <strong>&quot;Zero-Retention / Maximum Encryption&quot;</strong> architecture.
                            </p>
                            <ul style={{ color: '#a1a1aa', lineHeight: '1.8', paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
                                <li><strong>In-Memory Processing:</strong> Your keys are processed in RAM and never written to disk or databases.</li>
                                <li><strong>End-to-End Encryption (E2EE):</strong>
                                    We use advanced <strong>AES-256 Client-Side Encryption</strong>.
                                    Your data is encrypted <em>before</em> it leaves your browser and responses are encrypted by the server.
                                    Even if the HTTPS layer is compromised, your data remains an opaque, unreadable hash to any interceptor.
                                </li>
                                <li><strong>Leaked Key Detection:</strong> We automatically check against public leak databases.</li>
                                <li><strong>Rate Limiting:</strong> Strict per-IP limits prevent brute-force attacks.</li>
                            </ul>
                        </section>

                        <section id="chat" className={docStyles.section}>
                            <h2 className={docStyles.subtitle}>AI Assistant (Oracle)</h2>
                            <p className={docStyles.text}>
                                The dashboard includes a context-aware AI assistant. You can ask Oracle to:
                            </p>
                            <ul style={{ color: '#ccc', lineHeight: '1.8', paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
                                <li>Explain errors for invalid keys.</li>
                                <li>Check if a specific model (e.g., GPT-4) is available on your key.</li>
                                <li>Provide security best practices.</li>
                            </ul>
                        </section>

                        <section id="usage" className={docStyles.section}>
                            <h2 className={docStyles.subtitle}>Usage Limits</h2>
                            <p className={docStyles.text}>
                                Oracle is currently in free preview. There are no strict rate limits for individual usage.
                                For enterprise batch processing, please contact us.
                            </p>
                        </section>

                        <section id="legal" className={docStyles.section}>
                            <h2 className={docStyles.subtitle}>Legal & Terms of Service</h2>

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
                                Oracle operates on a strict &quot;Zero Retention&quot; basis. We do not store, log, or persist your API keys continuously. Keys are processed in-memory for the duration of the verification request and are immediately discarded.
                            </p>
                            <p className={docStyles.text}>
                                While we employ industry-standard encryption (AES-256) for transmission, you acknowledge that you are using this service at your own risk. We serve as a passthrough verification tool only.
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
