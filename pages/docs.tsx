import React from 'react';
import Head from 'next/head'
import Link from 'next/link'
// import { Link as ScrollLink } from 'react-scroll' 
import styles from '../styles/Dashboard.module.css'
import docStyles from '../styles/Docs.module.css'
import StaggeredMenu from '../components/StaggeredMenu/StaggeredMenu'

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

export default function Docs() {
    const [activeSection, setActiveSection] = React.useState('');

    React.useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setActiveSection(entry.target.id);
                }
            });
        }, { rootMargin: '-20% 0px -35% 0px' });

        document.querySelectorAll('section[id]').forEach((section) => {
            observer.observe(section);
        });

        return () => observer.disconnect();
    }, []);

    const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
        e.preventDefault();
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
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
            />
            <Head>
                <title>Docs - Oracle</title>
            </Head>

            <div className={styles.backgroundGlow} />

            {/* Scrollable Area */}
            <div style={{ flex: 1, overflowY: 'auto', zIndex: 10, position: 'relative', scrollBehavior: 'smooth' }}>
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
                            <a href="#usage"
                                onClick={(e) => handleScrollTo(e, 'usage')}
                                className={`${docStyles.navLink} ${activeSection === 'usage' ? docStyles.active : ''}`}>
                                Usage Limits
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
                            <h2 className={docStyles.subtitle}>Security</h2>
                            <p className={docStyles.text}>
                                Your security is our priority. Oracle operates on a <strong>&quot;Verify &amp; Forget&quot;</strong> model.
                            </p>
                            <ul style={{ color: '#ccc', lineHeight: '1.8', paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
                                <li>Keys are sent to our server via HTTPS (TLS 1.3).</li>
                                <li>We execute a single &quot;list models&quot; or &quot;get account&quot; request to the provider.</li>
                                <li>The result (Valid/Invalid) is returned to you.</li>
                                <li><strong>Keys are never stored</strong> in a database or logs.</li>
                            </ul>
                        </section>

                        <section id="usage" className={docStyles.section}>
                            <h2 className={docStyles.subtitle}>Usage Limits</h2>
                            <p className={docStyles.text}>
                                Oracle is currently in free preview. There are no strict rate limits for individual usage.
                                For enterprise batch processing, please contact us.
                            </p>
                        </section>
                    </main>
                </div>
            </div>
        </div>
    )
}
