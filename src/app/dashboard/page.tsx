import { ProtectedRoute } from "@/components/auth/protected-route"
import { DashboardLayout, MetricsCards } from "@/components/dashboard"
import { PageTransition } from "@/components/animations/page-transition"

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <PageTransition>
          <div className="space-y-6">
            {/* Welcome Section */}
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                Welcome to your Dashboard
              </h2>
              <p className="text-lg text-muted-foreground">
                Monitor your transcript analytics and insights
              </p>
            </div>
            
            {/* Metrics Cards */}
            <MetricsCards />
            
            {/* Quick Actions Section */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="col-span-full">
                <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
              </div>
              
              {/* Placeholder for future dashboard widgets */}
              <div className="bg-white rounded-lg border p-6 text-center">
                <h4 className="font-medium mb-2">Recent Activity</h4>
                <p className="text-sm text-muted-foreground">
                  View your latest transcript uploads and updates
                </p>
              </div>
              
              <div className="bg-white rounded-lg border p-6 text-center">
                <h4 className="font-medium mb-2">Trending Clients</h4>
                <p className="text-sm text-muted-foreground">
                  See which clients have the most activity
                </p>
              </div>
              
              <div className="bg-white rounded-lg border p-6 text-center">
                <h4 className="font-medium mb-2">Predictions</h4>
                <p className="text-sm text-muted-foreground">
                  View upcoming forecast predictions
                </p>
              </div>
            </div>
          </div>
        </PageTransition>
      </DashboardLayout>
    </ProtectedRoute>
  )
}