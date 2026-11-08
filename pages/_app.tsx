import '../styles/globals.css'
import type { AppProps } from 'next/app'
import localFont from 'next/font/local'
import Head from 'next/head'
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

const titleFont = localFont({
  src:'./fonts/Tourner.ttf',
  weight:'400',
  style:'normal',
  variable:'--font-tourner',
  display:'swap'
})

const textFont = localFont({
  src:[{
    path:'./fonts/caviar_dreams/CaviarDreams.ttf',
    weight:'400',
    style:'normal',
  },
  {
    path:'./fonts/caviar_dreams/CaviarDreams_Bold.ttf',
    weight:'500',
    style:'bold',
  }],
  variable:'--font-caviarDreams',
  display:'swap'
})

// Montserrat (body/UI) and Cormorant (display serif for the wordmark and
// section headings) are self-hosted variable fonts, latin subset, so the build
// never has to download them from Google Fonts. See CLAUDE.md "Design Language".
const montserrat = localFont({
  src: './fonts/Montserrat-Variable.woff2',
  weight: '300 700',
  style: 'normal',
  variable: '--font-montserrat',
  display: 'swap'
})

const cormorant = localFont({
  src: './fonts/Cormorant-Variable.woff2',
  weight: '300 500',
  style: 'normal',
  variable: '--font-cormorant',
  display: 'swap'
})

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <main className={`${titleFont.variable} ${textFont.variable} ${montserrat.variable} ${cormorant.variable}`}>
      <Component {...pageProps} />
      <Analytics />
      <SpeedInsights />
    </main>
  )
}

export default MyApp
