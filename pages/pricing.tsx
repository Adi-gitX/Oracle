import Head from 'next/head'
import Link from 'next/link'
import styles from '../styles/Dashboard.module.css'
import StaggeredMenu from '../components/StaggeredMenu/StaggeredMenu'

const menuItems = [
    { label: 'Home', link: '/' },
    { label: 'Solutions', link: '/solutions' },
    { label: 'Pricing', link: '/pricing' },
    { label: 'Docs', link: '/docs' }
];

const socialItems = [
    { label: 'LinkedIn', link: 'https://www.linkedin.com/in/kammatiaditya/' },
    { label: 'GitHub', link: 'https://github.com/Adi-gitX' },
    { label: 'X', link: 'https://x.com/AdiGitX' }
];

export default function Pricing() {
    return (
        <div className={styles.dashboardContainer}>
            <StaggeredMenu
                items={menuItems}
                socialItems={socialItems}
                logo="Pricing"
                position="left"
                isFixed={true}
            />
            <Head>
                <title>Pricing - Oracle</title>
            </Head>

            {/* Background */}
            <div className={styles.backgroundGlow} />

            <div className={styles.centeredContent} style={{ paddingTop: '120px' }}>
                <div className={styles.pillBadge}>
                    <span>Free</span> Developer Preview
                </div>

                <h1 className={styles.heroTitle}>
                    Forever <span>Free</span>
                </h1>

                <p className={styles.heroSubtitle}>
                    No credit card required. No hidden fees. Just secure API key checking.
                </p>

                <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '16px',
                    padding: '2rem',
                    maxWidth: '400px',
                    width: '100%',
                    backdropFilter: 'blur(10px)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.5rem',
                    marginTop: '2rem'
                }}>
                    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Pro</h2>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                            <span style={{ fontSize: '3rem', fontWeight: '800', color: '#fff' }}>$0</span>
                            <span style={{ color: '#888' }}>/month</span>
                        </div>
                    </div>

                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem', color: '#ccc' }}>
                        {[
                            'Unlimited API Key Checks',
                            'Secure Local Processing',
                            'Support for 50+ Providers',
                            'Detailed Usage Analytics',
                            'Exportable Reports'
                        ].map((item, i) => (
                            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ color: '#4285f4' }}>✓</span> {item}
                            </li>
                        ))}
                    </ul>

                    <Link href="/dashboard">
                        <button style={{
                            width: '100%',
                            padding: '1rem',
                            background: '#fff',
                            color: '#000',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            marginTop: '1rem',
                            fontSize: '1rem'
                        }}>
                            Start Checking Now
                        </button>
                    </Link>
                </div>
            </div>
        </div>
    )
}
