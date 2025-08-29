import { AnalyticsDashboard } from '@/components/analytics'
import { MainLayout } from '@/components/layout/main-layout'

export default function AnalyticsPage() {
  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <AnalyticsDashboard />
      </div>
    </MainLayout>
  )
}