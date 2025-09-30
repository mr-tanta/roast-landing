import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/contexts/auth-context'
import './globals.css'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'RoastMyLanding - Get brutally honest landing page feedback',
  description:
    'AI-powered landing page roasting that actually helps you convert better. Get actionable insights in 10 seconds.',
  keywords: [
    'landing page feedback',
    'conversion optimization',
    'landing page analyzer',
    'CRO tool',
    'landing page review',
  ],
  openGraph: {
    title: 'RoastMyLanding - Get brutally honest landing page feedback',
    description:
      'AI-powered landing page roasting that actually helps you convert better. Get actionable insights in 10 seconds.',
    type: 'website',
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://roastmylanding.com',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RoastMyLanding - Get brutally honest landing page feedback',
    description:
      'AI-powered landing page roasting that actually helps you convert better. Get actionable insights in 10 seconds.',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased font-sans`}>
        <AuthProvider>
          {children}
          <Toaster position="top-center" />
        </AuthProvider>
      </body>
    </html>
  )
}
