import type { Metadata } from 'next'
import './globals.css'
import { Navigation } from '@/components/Navigation'

export const metadata: Metadata = {
  title: 'Predictive Analytics Platform',
  description: 'Enterprise-grade analytics with AI-powered insights, real-time forecasting, and advanced data visualization',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50">
        <Navigation />
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  )
}