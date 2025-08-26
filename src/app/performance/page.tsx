import { Metadata } from 'next'
import { PerformanceDashboard } from '@/components/monitoring/performance-dashboard'

export const metadata: Metadata = {
  title: 'Performance Dashboard - Transcript Analytics Platform',
  description: 'Monitor application performance metrics and optimization status',
}

export default function PerformancePage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Performance Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor Core Web Vitals, bundle size, and application performance metrics
        </p>
      </div>
      
      <PerformanceDashboard />
    </div>
  )
}