import { PricingPlans } from '@/components/pricing/pricing-plans'
import { Header } from '@/components/layout/header'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pricing | RoastMyLanding',
  description: 'Choose the perfect plan for your landing page optimization needs. Start free, upgrade anytime.',
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PricingPlans />
    </div>
  )
}