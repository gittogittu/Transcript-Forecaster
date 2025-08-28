import { Metadata } from 'next'
import { AHTDashboard } from '@/components/analytics/aht-dashboard'

export const metadata: Metadata = {
  title: 'AHT Analytics | Transcript Analytics Platform',
  description: 'Average Handling Time analytics and performance insights',
}

export default function AHTAnalyticsPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AHT Analytics</h1>
          <p className="text-muted-foreground">
            Average Handling Time performance insights and client analytics
          </p>
        </div>
        
        <AHTDashboard />
      </div>
    </div>
  )
}