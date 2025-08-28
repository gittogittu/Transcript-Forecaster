import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AdminDashboard } from '@/components/monitoring/admin-dashboard'

export const metadata: Metadata = {
  title: 'Admin Dashboard - Transcript Analytics Platform',
  description: 'Monitor system performance and health indicators',
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/auth/signin')
  }

  if (session.user.role !== 'admin') {
    redirect('/unauthorized')
  }

  return (
    <div className="container mx-auto py-6">
      <AdminDashboard />
    </div>
  )
}