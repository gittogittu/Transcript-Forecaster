import { DashboardLayout, MetricsCards } from "@/components/dashboard"
import { ViewerOrHigher } from "@/components/auth/RoleGuard"

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome to your transcript analytics dashboard
          </p>
        </div>
        
        <ViewerOrHigher>
          <MetricsCards />
        </ViewerOrHigher>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <div className="col-span-4">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
              <p className="text-muted-foreground">
                Your recent transcript analytics activity will appear here.
              </p>
            </div>
          </div>
          
          <div className="col-span-3">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button className="w-full text-left p-2 rounded hover:bg-accent">
                  Upload new data
                </button>
                <button className="w-full text-left p-2 rounded hover:bg-accent">
                  Generate report
                </button>
                <button className="w-full text-left p-2 rounded hover:bg-accent">
                  View predictions
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}