import type { Metadata, Viewport } from 'next'
import { Montserrat, Raleway } from 'next/font/google'
import './globals.css'

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
})

const raleway = Raleway({
  subsets: ['latin'],
  variable: '--font-raleway',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'CricEngine — Cricket Match Scorer Tool',
  description: 'Digital live scoring, wagon wheels, worm charts, and player statistics for cricket matches.',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#001838',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`light ${montserrat.variable} ${raleway.variable}`}>
      <body className="antialiased min-h-screen bg-[#F8FAFC] text-[#0F172A] selection:bg-[#0066CC] selection:text-white">
        {children}
      </body>
    </html>
  )
}



