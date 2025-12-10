import '../styles/globals.css'
import '../components/StaggeredMenu/StaggeredMenu.css'
import type { AppProps } from 'next/app'
// import Aurora from '../components/Aurora'

import Head from 'next/head'

function MyApp({ Component, pageProps }: AppProps) {
  return <>
    <Head>
      <title>Oracle - Intelligent API Key Manager</title>
      <meta name="description" content="Verify, debug, and audit your API keys securely with Oracle. context-aware checks for OpenAI, Anthropic, Google Gemini, and more." />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta property="og:title" content="Oracle - Intelligent API Key Manager" />
      <meta property="og:description" content="Securely verify and manage your API keys." />
      <meta property="og:type" content="website" />
      <link rel="icon" href="/favicon.ico" />
    </Head>
    {/* <Aurora /> */}
    <Component {...pageProps} />
  </>
}

export default MyApp
