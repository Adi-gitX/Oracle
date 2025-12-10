import Head from 'next/head'
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

const features = [
    {
        title: "For Developers",
        description: "Stop guessing if your API keys are valid. Paste your .env file content and verify everything in seconds.",
        icon: "⚡️"
    },
    {
        title: "For Security Teams",
        description: "Audit codebases and logs for leaked credentials. Instantly check if exposed keys are still active.",
        icon: "🔒"
    },
    {
        title: "For DevOps",
        description: "Verify API secrets before deploying to production. Ensure your CI/CD pipelines never fail due to bad keys.",
        icon: "⚙️"
    },
    {
        title: "Client-Side Safety",
        description: "Your keys are processed securely. We verify against provider endpoints without storing your secrets.",
        icon: "🛡️"
    }
];

export default function Solutions() {
    return (
        <div className={styles.dashboardContainer}>
            <StaggeredMenu
                items={menuItems}
                socialItems={socialItems}
                logo="Solutions"
                position="left"
                isFixed={true}
            />
            <Head>
                <title>Solutions - Oracle</title>
            </Head>

            <div className={styles.backgroundGlow} />

            <div className={styles.centeredContent} style={{ paddingTop: '120px', maxWidth: '1000px' }}>
                <div className={styles.pillBadge}>
                    <span>Use Cases</span> Why Oracle?
                </div>

                <h1 className={styles.heroTitle}>
                    Security made <span>Simple</span>
                </h1>

                <p className={styles.heroSubtitle}>
                    From individual developers to enterprise security teams, Oracle provides the fastest way to validate credentials.
                </p>

                <div className={styles.resultsGrid} style={{ marginTop: '4rem' }}>
                    {features.map((f, i) => (
                        <div key={i} className={styles.resultCard} style={{ padding: '2rem', height: '100%', alignItems: 'flex-start', gap: '1rem' }}>
                            <div style={{ fontSize: '2rem' }}>{f.icon}</div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: '#fff' }}>{f.title}</h3>
                            <p style={{ color: '#888', lineHeight: '1.6' }}>{f.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
