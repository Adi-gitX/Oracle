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
                            <a href="#features"
                                onClick={(e) => handleScrollTo(e, 'features')}
                                className={`${docStyles.navLink} ${activeSection === 'features' ? docStyles.active : ''}`}>
                                Key Features
                            </a>
                        </div>
                        <div>
                            <div className={docStyles.sidebarTitle}>Core</div>
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
                                Terms & Privacy
                            </a>
                        </div>
                    </aside>

                    <main className={docStyles.content}>
                        <section id="intro" className={docStyles.section}>
                            <h1 className={docStyles.title}>Introduction</h1>
                            <p className={docStyles.text}>
                                Oracle is the enterprise-grade tool for Verifying, Auditing, and Securing API infrastructure.
                                We solve the critical problem of credential opacity—instantly determining if a key is active, what permissions it holds, and if it belongs to the service you think it does.
                            </p>
                            <p className={docStyles.text}>
                                Designed for DevOps, Security Engineers, and Developers, Oracle parses complex environment files (`.env`), logs, and configs to provide a unified health report of your entire credential stack.
                            </p>
                        </section>

                        <section id="features" className={docStyles.section}>
                            <h2 className={docStyles.subtitle}>Key Features</h2>
                            <ul className={docStyles.featureList} style={{ color: '#a1a1aa', lineHeight: '1.8' }}>
                                <li><strong>Multi-Provider Support:</strong> Native validation for over 30+ services (AI, Cloud, Database, Infra).</li>
                                <li><strong>Context-Aware Analysis:</strong> Detects mismatches between variable names (e.g., `OPENAI_KEY`) and legitimate key types (e.g., Google keys), preventing configuration drift.</li>
                                <li><strong>Granular Error Reporting:</strong> Distinguishes between <code>Invalid</code> (401), <code>Leaked/Inactive</code> (403), and <code>Quota Exceeded</code> (429).</li>
                                <li><strong>Smart Fallbacks:</strong> Automatically identifying cross-provider formats (e.g., Stripe/Clerk collisions, Google/Firebase/Gemini shared prefixes).</li>
                            </ul>
                        </section>

                        <section id="providers" className={docStyles.section}>
                            <h2 className={docStyles.subtitle}>Supported Providers (28+)</h2>
                            <p className={docStyles.text}>Oracle supports a massive ecosystem of APIs, constantly updated.</p>

                            <h3 style={{ color: '#fff', fontSize: '1.1rem', marginTop: '1.5rem' }}>AI & LLM Services</h3>
                            <div className={docStyles.providerList}>
                                {['OpenAI', 'Anthropic', 'Google Gemini', 'Cohere', 'Mistral', 'Groq', 'HuggingFace'].map(p => (
                                    <div key={p} className={docStyles.providerItem}><span style={{ color: '#3b82f6' }}>●</span> {p}</div>
                                ))}
                            </div>

                            <h3 style={{ color: '#fff', fontSize: '1.1rem', marginTop: '1.5rem' }}>Infrastructure & Cloud</h3>
                            <div className={docStyles.providerList}>
                                {['AWS', 'Google Cloud', 'Firebase', 'Supabase', 'Heroku', 'Cloudinary', 'Upstash', 'Neon/Postgres'].map(p => (
                                    <div key={p} className={docStyles.providerItem}><span style={{ color: '#10b981' }}>●</span> {p}</div>
                                ))}
                            </div>

                            <h3 style={{ color: '#fff', fontSize: '1.1rem', marginTop: '1.5rem' }}>DevOps & Tools</h3>
                            <div className={docStyles.providerList}>
                                {['GitHub', 'GitLab', 'NPM', 'Docker', 'Pusher', 'Shodan'].map(p => (
                                    <div key={p} className={docStyles.providerItem}><span style={{ color: '#a855f7' }}>●</span> {p}</div>
                                ))}
                            </div>

                            <h3 style={{ color: '#fff', fontSize: '1.1rem', marginTop: '1.5rem' }}>Communication & Marketing</h3>
                            <div className={docStyles.providerList}>
                                {['Slack', 'SendGrid', 'Resend', 'Mailgun', 'MailChimp', 'Twilio', 'Telegram'].map(p => (
                                    <div key={p} className={docStyles.providerItem}><span style={{ color: '#f59e0b' }}>●</span> {p}</div>
                                ))}
                            </div>
                        </section>

                        <section id="context-aware" className={docStyles.section}>
                            <h2 className={docStyles.subtitle}>Context-Aware Validation</h2>
                            <p className={docStyles.text}>
                                Environment variables are often copy-pasted incorrectly. Oracle reads the context around your key.
                            </p>
                            <div className={docStyles.codeBlock}>
                                {`# Bad Configuration Example
GROQ_API_KEY="AIzaSyB..."  <-- This is actually a Google Key!

# Oracle Result:
[WARNING] Google (Labeled Groq)
"This key matches Google format, not Groq (gsk_...)."`}
                            </div>
                        </section>

                        <section id="security" className={docStyles.section}>
                            <h2 className={docStyles.subtitle}>Security Architecture</h2>
                            <p className={docStyles.text}>
                                We employ a <strong>Zero-Trust, Zero-Retention</strong> architecture designed for maximum security.
                            </p>
                            <ul style={{ color: '#a1a1aa', lineHeight: '1.8', paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
                                <li><strong>Client-Side Encryption:</strong> Keys are encrypted with AES-256 GCM <em>before</em> leaving your browser. The plain-text key is never visible to the network.</li>
                                <li><strong>Ephemeral Processing:</strong> Keys are decrypted in volatile memory (RAM) only for the microseconds required to validate them against the provider.</li>
                                <li><strong>Immediate Sanitization:</strong> Variables holding credentials are strictly nullified and garbage-collected immediately after use.</li>
                                <li><strong>No Persistence:</strong> We do not use a database for credentials. There are no logs, no caches, and no backups of your keys.</li>
                            </ul>
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
