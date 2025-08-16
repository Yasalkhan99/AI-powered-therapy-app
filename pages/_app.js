import '../styles/global.css';
import { SessionProvider } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Circles } from 'react-loader-spinner';
import Head from 'next/head';

function LoadingComponent() {
  return (
    <div style={{
      minHeight: '100dvh',
      height: '100dvh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#fff',
      zIndex: 9999,
      position: 'fixed',
      inset: 0,
    }}>
      <Circles color="#7c3aed" height={80} width={80} />
    </div>
  );
}

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const MINIMUM_LOADING_TIME = 400; // ms

  useEffect(() => {
    let maxTimer;
    const handleStart = () => {
      setLoading(true);
      clearTimeout(maxTimer);
      // Hide loader after 3 seconds max (safety net)
      maxTimer = setTimeout(() => setLoading(false), 3000);
    };
    const handleStop = () => {
      clearTimeout(maxTimer);
      setLoading(false);
    };
    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleStop);
    router.events.on('routeChangeError', handleStop);
    return () => {
      clearTimeout(maxTimer);
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleStop);
      router.events.off('routeChangeError', handleStop);
    };
  }, [router]);

  // Fallback: always hide loader after mount
  useEffect(() => {
    setLoading(false);
  }, []);

  return (
    <SessionProvider session={pageProps.session}>
      <Head>
        <title>EchoNest | AI-Powered Therapy Platform – 24/7 Mental Health Support</title>
        <meta name="description" content="Start your personalized mental health journey with EchoNest. Experience 24/7 AI therapy sessions tailored to your needs. Chat or talk anytime. No commitment. Free to start." />
      </Head>
      {loading && router.pathname !== '/profile-setup' && router.pathname !== '/login' && router.pathname !== '/register' && <LoadingComponent />}
      <Component {...pageProps} />
    </SessionProvider>
  );
} 