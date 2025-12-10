
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

    // Extract keys using regex to handle various formats (e.g., "- [ ] key", "key", " key ")
    const extractKey = (line: string) => {
      // Match Google (AIza...), Anthropic (sk-ant-...), or OpenAI (sk-...)
      const match = line.match(/(AIza[a-zA-Z0-9-_]+|sk-ant-[a-zA-Z0-9-_]+|sk-[a-zA-Z0-9-]+)/);
      return match ? match[0] : null;
    }

    const keys = input.split('\n')
      .map(extractKey)
      .filter((k): k is string => !!k);

    // Remove duplicates
    const uniqueKeys = Array.from(new Set(keys));

    // Parallel execution for speed
    const resultsPromises = uniqueKeys.map(async (key) => {
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
          <div
            className={styles.categorizedGrid}
            style={{ gridTemplateColumns: results.some(r => r.premium) ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)' }}
          >

            {/* Working Keys */}
            <div className={`${styles.categoryCard} ${styles.working}`}>
              <div className={styles.categoryHeader}>
                <div className={styles.categoryTitle}>
                  <div className={`${styles.statusIndicator} ${styles.working}`} />
                  Working
                </div>
                <div className={styles.countBadge}>{results.filter(r => r.status === 'valid' && !r.premium).length}</div>
              </div>
              <div className={styles.listHeader}>
                <span>Provider</span>
                <span>API Key</span>
                <span style={{ textAlign: 'right' }}>Details</span>
                <span></span>
              </div>
              <ul className={styles.categoryList}>
                {results.filter(r => r.status === 'valid' && !r.premium).map((r, i) => (
                  <li key={i} className={styles.resultItem} style={{ animationDelay: `${i * 0.05}s` }}>
                    <div className={styles.providerCell}>{r.provider}</div>
                    <div className={styles.keyCell}>
                      {r.key}
                    </div>
                    <div className={styles.detailsCell}>{r.details}</div>
                    <div className={styles.actionCell}>
                      <button
                        className={styles.iconButton}
                        onClick={() => navigator.clipboard.writeText(r.key)}
                        title="Copy Key"
                      >
                        {/* Simple Copy Icon SVG */}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Invalid Keys */}
            <div className={`${styles.categoryCard} ${styles.invalid}`}>
              <div className={styles.categoryHeader}>
                <div className={styles.categoryTitle}>
                  <div className={`${styles.statusIndicator} ${styles.invalid}`} />
                  Invalid
                </div>
                <div className={styles.countBadge}>{results.filter(r => r.status === 'invalid').length}</div>
              </div>
              <div className={styles.listHeader}>
                <span>Provider</span>
                <span>API Key</span>
                <span style={{ textAlign: 'right' }}>Details</span>
                <span></span>
              </div>
              <ul className={styles.categoryList}>
                {results.filter(r => r.status === 'invalid').map((r, i) => (
                  <li key={i} className={styles.resultItem} style={{ animationDelay: `${i * 0.05}s` }}>
                    <div className={styles.providerCell}>{r.provider}</div>
                    <div className={styles.keyCell}>
                      {r.key}
                    </div>
                    <div className={styles.detailsCell}>{r.details}</div>
                    <div className={styles.actionCell}>
                      <button
                        className={styles.iconButton}
                        onClick={() => navigator.clipboard.writeText(r.key)}
                        title="Copy Key"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pro Keys - Only rendered if present */}
            {results.some(r => r.premium) && (
              <div className={`${styles.categoryCard} ${styles.pro}`}>
                <div className={styles.categoryHeader}>
                  <div className={styles.categoryTitle}>
                    <div className={`${styles.statusIndicator} ${styles.pro}`} />
                    Pro
                  </div>
                  <div className={styles.countBadge}>{results.filter(r => r.premium).length}</div>
                </div>
                <div className={styles.listHeader}>
                  <span>Provider</span>
                  <span>API Key</span>
                  <span style={{ textAlign: 'right' }}>Details</span>
                  <span></span>
                </div>
                <ul className={styles.categoryList}>
                  {results.filter(r => r.premium).map((r, i) => (
                    <li key={i} className={styles.resultItem} style={{ animationDelay: `${i * 0.05}s` }}>
                      <div className={styles.providerCell}>{r.provider}</div>
                      <div className={styles.keyCell}>
                        {r.key}
                      </div>
                      <div className={styles.detailsCell}>{r.details}</div>
                      <div className={styles.actionCell}>
                        <button
                          className={styles.iconButton}
                          onClick={() => navigator.clipboard.writeText(r.key)}
                          title="Copy Key"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  )
}

export default Home
