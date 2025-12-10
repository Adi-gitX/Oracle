import Head from 'next/head'
import Link from 'next/link'
import styles from '../styles/Dashboard.module.css'
import StaggeredMenu from '../components/StaggeredMenu/StaggeredMenu'

const menuItems = [
    { label: 'Home', link: '/' },
    { label: 'Pricing', link: '/pricing' },
    { label: 'Docs', link: '/docs' },
];

const socialItems = [
    { label: 'LinkedIn', link: 'https://www.linkedin.com/in/kammatiaditya/' },
    { label: 'GitHub', link: 'https://github.com/Adi-gitX' },
    { label: 'X', link: 'https://x.com/AdiGitX' }
];

export default function Pricing() {
    return (
        <div className={styles.dashboardContainer} style={{ overflowY: 'auto' }}>
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

            <div className={styles.backgroundGlow} />

            <div style={{
                maxWidth: '800px',
                margin: '0 auto',
                padding: '120px 2rem 4rem',
                position: 'relative',
                zIndex: 10
            }}>
                <div style={{ marginBottom: '4rem' }}>
                    <h1 className={styles.heroTitle} style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                        Simple, transparent pricing.
                    </h1>
                    <p className={styles.heroSubtitle} style={{ fontSize: '1.2rem', color: '#a1a1aa' }}>
                        No hidden fees. No credit cards required. Just instant API verification.
                    </p>
                </div>

                <div className={styles.pricingCard}>
                    <div style={{ borderBottom: '1px solid #333', paddingBottom: '2rem', marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#ededed', marginBottom: '0.5rem' }}>Pro</h2>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                            <span style={{ fontSize: '3.5rem', fontWeight: '700', color: '#fff', letterSpacing: '-0.02em' }}>$0</span>
                            <span style={{ color: '#737373', fontSize: '1.1rem' }}>/month</span>
                        </div>
                        <p style={{ color: '#a1a1aa', marginTop: '1rem', fontSize: '0.95rem' }}>
                            Full access to all verification features. Forever free for developers.
                        </p>
                    </div>

                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {[
                            'Unlimited API Key Checks',
                            'Secure Local Processing (Verify & Forget)',
                            'Support for 50+ Providers',
                            'Detailed Usage Analytics',
                            'Exportable Reports',
                            'Priority Email Support'
                        ].map((item, i) => (
                            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1rem', color: '#ededed' }}>
                                <span style={{ color: '#fff', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '50%', border: '1px solid #333' }}>✓</span>
                                {item}
                            </li>
                        ))}
                    </ul>

                    <Link href="/dashboard">
                        <button style={{
                            width: '100%',
                            padding: '1rem',
                            background: '#fff',
                            color: '#000',
                            border: '1px solid #fff',
                            borderRadius: '8px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            marginTop: '2rem',
                            fontSize: '1rem',
                            transition: 'all 0.2s ease'
                        }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.background = '#e5e5e5';
                                e.currentTarget.style.borderColor = '#e5e5e5';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.background = '#fff';
                                e.currentTarget.style.borderColor = '#fff';
                            }}
                        >
                            Start Checking Now
                        </button>
                    </Link>
                    <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#555', marginTop: '1rem' }}>
                        Free forever. No credit card needed.
                    </p>
                </div>
            </div>
        </div>
    )
}
