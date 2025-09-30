'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { AuthModal } from '@/components/auth/auth-modal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Check, Zap, Crown, Loader2 } from 'lucide-react'
import { STRIPE_CONFIG } from '@/lib/stripe-config'

export function PricingPlans() {
  const { user } = useAuth()
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  const handlePlanSelect = async (planType: keyof typeof STRIPE_CONFIG.plans) => {
    if (!user) {
      setIsAuthModalOpen(true)
      return
    }

    if (planType === 'free') {
      toast.info('You are already on the free plan!')
      return
    }

    setLoadingPlan(planType)

    try {
      const plan = STRIPE_CONFIG.plans[planType]
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: plan.priceId,
          planType: planType,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong')
      setLoadingPlan(null)
    }
  }

  const plans = [
    {
      key: 'free' as const,
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for trying out RoastMyLanding',
      icon: null,
      badge: null,
      features: [
        '3 roasts per day',
        'Basic AI analysis',
        'No screenshots',
        'Watermarked results',
        'Public roast sharing',
      ],
      buttonText: 'Current Plan',
      buttonVariant: 'outline' as const,
    },
    {
      key: 'trial' as const,
      name: '3-Day Trial',
      price: '$1',
      period: 'for 3 days',
      description: 'Test all premium features risk-free',
      icon: <Zap className="h-5 w-5 text-blue-500" />,
      badge: 'POPULAR',
      features: [
        'Unlimited roasts for 3 days',
        'Full AI analysis with GPT-4 & Claude',
        'Desktop & mobile screenshots',
        'No watermarks',
        'Priority processing',
        'Download reports',
      ],
      buttonText: 'Start Trial',
      buttonVariant: 'default' as const,
    },
    {
      key: 'monthly' as const,
      name: 'Pro Monthly',
      price: '$19',
      period: 'per month',
      description: 'For regular landing page optimization',
      icon: <Crown className="h-5 w-5 text-yellow-500" />,
      badge: null,
      features: [
        'Unlimited roasts',
        'Full AI analysis with GPT-4 & Claude',
        'High-quality screenshots',
        'Export to PDF/PNG',
        'Priority support',
        'No watermarks',
        'Advanced analytics',
        'A/B test suggestions',
      ],
      buttonText: 'Get Pro',
      buttonVariant: 'default' as const,
    },
    {
      key: 'annual' as const,
      name: 'Pro Annual',
      price: '$190',
      period: 'per year',
      description: 'Best value - save 17%',
      icon: <Crown className="h-5 w-5 text-yellow-500" />,
      badge: 'BEST VALUE',
      features: [
        'Everything in Pro Monthly',
        '17% discount ($228 → $190)',
        'Priority feature requests',
        'Dedicated support channel',
        'Early access to new features',
        'Custom integrations (coming soon)',
      ],
      buttonText: 'Get Annual Pro',
      buttonVariant: 'default' as const,
    },
  ]

  return (
    <>
      <div className="py-24 bg-gradient-to-b from-background to-background/50">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold tracking-tight mb-4">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that fits your needs. Start free, upgrade anytime.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {plans.map((plan) => (
              <Card 
                key={plan.key} 
                className={`relative ${plan.badge ? 'ring-2 ring-primary shadow-lg scale-105' : ''}`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-3 py-1">
                      {plan.badge}
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-4">
                  <div className="flex items-center justify-center mb-2">
                    {plan.icon}
                    <CardTitle className={`${plan.icon ? 'ml-2' : ''} text-xl`}>
                      {plan.name}
                    </CardTitle>
                  </div>
                  
                  <div className="mb-2">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground ml-1">
                      {plan.period}
                    </span>
                  </div>
                  
                  <CardDescription>
                    {plan.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <Check className="h-4 w-4 text-primary mt-0.5 mr-3 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant={plan.buttonVariant}
                    className="w-full"
                    onClick={() => handlePlanSelect(plan.key)}
                    disabled={loadingPlan === plan.key}
                  >
                    {loadingPlan === plan.key && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {plan.buttonText}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* FAQ Section */}
          <div className="mt-24 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-12">
              Frequently Asked Questions
            </h2>
            
            <div className="space-y-8">
              <div>
                <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
                <p className="text-muted-foreground">
                  Yes, you can cancel your subscription at any time. You'll continue to have access 
                  to Pro features until the end of your billing period.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">What happens after the trial?</h3>
                <p className="text-muted-foreground">
                  After your 3-day trial ends, you'll be charged $1. You can cancel before the trial 
                  ends to avoid any charges.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Do you offer refunds?</h3>
                <p className="text-muted-foreground">
                  Yes, we offer a 30-day money-back guarantee on all paid plans. If you're not 
                  satisfied, contact us for a full refund.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Can I upgrade or downgrade?</h3>
                <p className="text-muted-foreground">
                  You can upgrade or downgrade your plan at any time from your dashboard. Changes 
                  take effect immediately with prorated billing.
                </p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="mt-24 text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to improve your landing page?</h2>
            <p className="text-muted-foreground mb-8">
              Join thousands of developers and marketers who use RoastMyLanding to optimize their conversions.
            </p>
            <Button 
              size="lg"
              onClick={() => !user ? setIsAuthModalOpen(true) : handlePlanSelect('trial')}
              disabled={loadingPlan === 'trial'}
            >
              {loadingPlan === 'trial' && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Start Free Trial
            </Button>
          </div>
        </div>
      </div>

      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultTab="signup"
      />
    </>
  )
}