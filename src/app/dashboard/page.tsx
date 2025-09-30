import { UserDashboard } from '@/components/dashboard/user-dashboard'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard | RoastMyLanding',
  description: 'Manage your landing page roasts and subscription',
}

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <UserDashboard />
    </div>
  )
}