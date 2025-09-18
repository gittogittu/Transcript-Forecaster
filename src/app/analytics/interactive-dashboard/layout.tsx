import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Interactive Dashboard - Analytics Platform',
  description: 'Real-time analytics with dynamic visualizations and instant insights',
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  )
}