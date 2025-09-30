import { UserDashboard } from '@/components/dashboard/user-dashboard'
import { Header } from '@/components/layout/header'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard | RoastMyLanding',
  description: 'Manage your landing page roasts and subscription',
}

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto py-8 px-4">
        <UserDashboard />
      </div>
    </div>
  )
}
