import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Favicons */}
        <link rel="icon" type="image/png" sizes="32x32" href="/32x32.png" />
        <link rel="icon" type="image/png" sizes="256x256" href="/256x256.png" />
        {/* Open Graph Image */}
        <meta property="og:image" content="https://cdn.prod.website-files.com/6846fdc25de73b0e19544b07/6873d1005da735d72bd3cd03_echonest-web.png" />
        <meta property="og:title" content="EchoNest | AI-Powered Therapy Platform – 24/7 Mental Health Support" />
        <meta property="og:description" content="Start your personalized mental health journey with EchoNest. Experience 24/7 AI therapy sessions tailored to your needs. Chat or talk anytime. No commitment. Free to start." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://platform.echonest.co.uk/" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
} 