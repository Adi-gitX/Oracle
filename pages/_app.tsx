import '../styles/globals.css'
import type { AppProps } from 'next/app'
// import Aurora from '../components/Aurora'

function MyApp({ Component, pageProps }: AppProps) {
  return <>
    {/* <Aurora /> */}
    <Component {...pageProps} />
  </>
}

export default MyApp
