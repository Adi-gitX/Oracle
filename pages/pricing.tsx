import Head from 'next/head'
import Link from 'next/link'
import Image from 'next/image'
import styles from '../styles/Dashboard.module.css'
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

export default function Pricing() {
    return (
        <div className={styles.dashboardContainer}>
            <StaggeredMenu
                items={menuItems}
                socialItems={socialItems}
                logo="Pricing"
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
                <title>Pricing - Oracle</title>
            </Head>

            <div className={styles.backgroundGlow} />

            <div className={styles.scrollArea}>
                <div className={styles.pricingContent}>
                    <div className={styles.pricingHeader}>
                        <div className={styles.pillBadge} style={{ margin: '0 auto 2rem' }}>
                            <span>Free Forever</span> Developer Friendly
                        </div>
                        <h1 className={styles.heroTitle} style={{ fontSize: '3.5rem' }}>
                            Simple, transparent pricing.
                        </h1>
                        <p className={styles.heroSubtitle} style={{ margin: '0 auto' }}>
                            No hidden fees. No credit cards required. Just instant API verification.
                        </p>
                    </div>

                    <div className={styles.pricingCard}>
                        <div style={{ borderBottom: '1px solid #333', paddingBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#ededed', marginBottom: '0.5rem' }}>Pro</h2>
                            <div style={{ display: 'flex', alignItems: 'baseline' }}>
                                <span className={styles.priceAmount}>$0</span>
                                <span className={styles.pricePeriod}>/month</span>
                            </div>
                            <p style={{ color: '#a1a1aa', marginTop: '1rem', fontSize: '0.95rem', lineHeight: '1.6' }}>
                                Full access to all verification features. <br />
                                Designed for individual developers and small teams.
                            </p>
                        </div>

                        <ul className={styles.featureList}>
                            {[
                                'Unlimited API Key Checks',
                                'Secure Local Processing',
                                'Support for 50+ Providers',
                                'Detailed Usage Analytics',
                                'Exportable Reports',
                                'Priority Email Support'
                            ].map((item, i) => (
                                <li key={i} className={styles.featureItem}>
                                    <span className={styles.checkIcon}>✓</span>
                                    {item}
                                </li>
                            ))}
                        </ul>

                        <Link href="/dashboard" style={{ width: '100%' }}>
                            <button className={styles.ctaButton}>
                                Start Checking Now
                            </button>
                        </Link>
                        <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#555' }}>
                            No credit card needed.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
