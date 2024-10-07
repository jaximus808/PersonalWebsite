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



function MyApp({ Component, pageProps }: AppProps) {
  return (
    <main className={`${titleFont.variable} ${textFont.className}` }>
     
      <Component {...pageProps} />
      <Analytics />
      <SpeedInsights />
    </main>
  )
}

export default MyApp
