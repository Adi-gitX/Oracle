import type { NextPage } from 'next'
import Head from 'next/head'
import styles from '../styles/Home.module.css'
import Script from 'next/script'
import { useRouter } from 'next/router'

// Add type for web component
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'spline-viewer': any
    }
  }
}

const Home: NextPage = () => {
  const router = useRouter()

  const handleStartFree = () => {
    router.push('/dashboard')
  }

  return (
    <div style={{ background: '#000', minHeight: '100vh' }}>
      <Head>
        <title>Oracle - Intelligence in Motion</title>
        <meta name="description" content="Premium API Key Manager" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Script
        type="module"
        src="https://unpkg.com/@splinetool/viewer@1.12.6/build/spline-viewer.js"
        strategy="lazyOnload"
      />

      {/* Navigation */}
      <nav className={styles.nav}>
        <div className={styles.logo}>Oracle</div>
        <div className={styles.navLinks}>
          <a href="#" className={styles.navLink}>Solutions</a>
          <a href="#" className={styles.navLink}>Pricing</a>
          <a href="#" className={styles.navLink}>Docs</a>
          <button className={styles.ctaButton} onClick={handleStartFree}>Start Free</button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.splineContainer}>
          <spline-viewer url="https://prod.spline.design/f7t3AZjdewBu95hf/scene.splinecode"></spline-viewer>
        </div>

        <div className={styles.heroContent}>
          {/* Content is mostly likely inside the spline or intended to be minimal. */}
        </div>
      </section>
    </div>
  )
}

export default Home
