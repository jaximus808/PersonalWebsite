import '../styles/globals.css'
import type { AppProps } from 'next/app'
import localFont from 'next/font/local'
import { Montserrat, Cormorant } from 'next/font/google'
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

// Add Montserrat (Google font) and expose as a CSS variable and a className.
// Usage examples:
// 1) Apply globally via the variable: <main className={`${montserrat.variable} ...`} />
//    then in CSS: font-family: var(--font-montserrat);
// 2) Apply to a single element using the provided className:
//    <h1 className={montserrat.className}>Hello</h1>
const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['300','400','500','700'],
  variable: '--font-montserrat',
  display: 'swap'
})

// Elegant, low-key display serif for the "Jaxon Poentis" wordmark and major
// section headings. Light weight (300) is the primary voice; see CLAUDE.md
// "Design Language" for how this is meant to be used.
const cormorant = Cormorant({
  subsets: ['latin'],
  weight: ['300','400','500'],
  variable: '--font-cormorant',
  display: 'swap'
})

function MyApp({ Component, pageProps }: AppProps) {
  return (
    // Include the montserrat variable so you can use var(--font-montserrat) in CSS
    <main className={`${titleFont.variable} ${textFont.variable} ${montserrat.variable} ${cormorant.variable}`}>
      <Component {...pageProps} />
      <Analytics />
      <SpeedInsights />
    </main>
  )
}

export default MyApp
