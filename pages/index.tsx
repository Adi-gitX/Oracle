
import type { NextPage } from 'next'
import Head from 'next/head'
import { useState, useRef } from 'react'
import styles from '../styles/Home.module.css'
import Script from 'next/script'

interface KeyResult {
  key: string
  provider: string
  status: 'valid' | 'invalid' | 'unchecked'
  details?: string
  premium?: boolean
}

// Add type for web component
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'spline-viewer': any
    }
  }
}

const Home: NextPage = () => {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<KeyResult[]>([])
  const dashboardRef = useRef<HTMLDivElement>(null)

  const stats = {
    total: results.length,
    working: results.filter(r => r.status === 'valid').length,
    premium: results.filter(r => r.premium).length,
    dead: results.filter(r => r.status === 'invalid').length
  }

  const handleCheck = async () => {
    if (!input.trim()) return
    setLoading(true)
    setResults([]) // Reset results for new check

    const keys = input.split('\n').map(k => k.trim()).filter(k => k)

    // Parallel execution for speed
    const resultsPromises = keys.map(async (key) => {
      try {
        const res = await fetch('/api/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key })
        })
        const data = await res.json()
        return {
          key,
          provider: data.provider || 'Unknown',
          status: (data.valid ? 'valid' : 'invalid') as 'valid' | 'invalid',
          details: data.message || (data.valid ? 'Active' : 'Error'),
          premium: data.premium
        }
      } catch (e) {
        return {
          key,
          provider: 'Unknown',
          status: 'invalid' as 'valid' | 'invalid',
          details: 'Network Error'
        }
      }
    })

    const newResults = await Promise.all(resultsPromises)
    setResults(newResults)
    setLoading(false)
  }

  const maskKey = (key: string) => {
    if (key.length <= 8) return key
    return `${key.slice(0, 4)}...${key.slice(-4)} `
  }

  const scrollToDashboard = () => {
    dashboardRef.current?.scrollIntoView({ behavior: 'smooth' })
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
          <button className={styles.ctaButton} onClick={scrollToDashboard}>Start Free</button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Intelligence<br />in Motion</h1>
          <p className={styles.heroSubtitle}>
            Experience AI that evolves with every interaction—learning, adapting, and flowing like the world around you.
          </p>
          <div className={styles.heroButtons}>
            <button className={styles.ctaButton} onClick={scrollToDashboard}>Get Started</button>
            <button
              className={styles.ctaButton}
              style={{ background: 'transparent', border: '1px solid #333', color: '#fff' }}
            >
              Try Demo
            </button>
          </div>
        </div>

        <div className={styles.splineContainer}>
          <spline-viewer url="https://prod.spline.design/f7t3AZjdewBu95hf/scene.splinecode"></spline-viewer>
        </div>
      </section>

      {/* Main Dashboard */}
      <main className={styles.dashboard} ref={dashboardRef}>
        <h2 className={styles.sectionTitle}>API Dashboard</h2>

        <div className={styles.inputGroup}>
          <textarea
            className={styles.textarea}
            placeholder="Paste OpenAI, Anthropic, or Google Gemini keys here (one per line)..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button
            className={styles.checkButton}
            onClick={handleCheck}
            disabled={loading || !input.trim()}
          >
            {loading ? 'Verifying Credentials...' : 'Check Status'}
          </button>
        </div>

        {results.length > 0 && (
          <>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{stats.total}</span>
                <span className={styles.statLabel}>Total</span>
              </div>
              <div className={styles.statCard} style={{ borderColor: 'var(--geist-success)' }}>
                <span className={styles.statValue} style={{ color: 'var(--geist-success)' }}>
                  {stats.working}
                </span>
                <span className={styles.statLabel}>Active</span>
              </div>
              <div className={styles.statCard} style={{ borderColor: '#7928ca' }}>
                <span className={styles.statValue} style={{ color: '#7928ca' }}>
                  {stats.premium}
                </span>
                <span className={styles.statLabel}>Premium</span>
              </div>
              <div className={styles.statCard} style={{ borderColor: 'var(--geist-error)' }}>
                <span className={styles.statValue} style={{ color: 'var(--geist-error)' }}>
                  {stats.dead}
                </span>
                <span className={styles.statLabel}>Revoked</span>
              </div>
            </div>

            <div className={styles.resultsSection}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Provider</th>
                    <th>Key</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i}>
                      <td>
                        <span className={`${styles.statusDot} ${styles[r.status]} ${r.premium ? styles.premium : ''} ${r.provider === 'Google Gemini' ? styles.gemini : ''} `} />
                        {r.status === 'valid'
                          ? (r.premium ? 'Premium' : 'Standard')
                          : 'Invalid'}
                      </td>
                      <td>{r.provider}</td>
                      <td className={styles.keyMask}>{maskKey(r.key)}</td>
                      <td>{r.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default Home
