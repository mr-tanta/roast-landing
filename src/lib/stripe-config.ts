/**
 * Stripe Configuration for RoastMyLanding
 * Contains product and price IDs for subscription plans
 */

export const STRIPE_CONFIG = {
  products: {
    trial: 'prod_T9K6Va5thzIWW3',
    monthly: 'prod_T9K6WZ2BUFIdhc', 
    annual: 'prod_T9K6cROzP3B73e',
  },
  prices: {
    trial: 'price_1SD1SCJ6OiwDDp6nfXpjEtr3',      // $1.00 one-time
    monthly: 'price_1SD1SYJ6OiwDDp6nu5mdeXGI',    // $19.00/month
    annual: 'price_1SD1SfJ6OiwDDp6ncJYPspxs',     // $190.00/year
  },
  plans: {
    free: {
      name: 'Free',
      description: '3 roasts per day',
      price: '$0',
      features: [
        '3 roasts per day',
        'Basic analysis',
        'No screenshots',
        'Watermarked results'
      ],
      limits: {
        roastsPerDay: 3,
        screenshots: false,
        watermark: true
      }
    },
    trial: {
      name: '3-Day Trial',
      description: 'Unlimited access for 3 days',
      price: '$1',
      priceId: 'price_1SD1SCJ6OiwDDp6nfXpjEtr3',
      features: [
        'Unlimited roasts for 3 days',
        'Full AI analysis',
        'Screenshots included',
        'No watermarks',
        'Priority processing'
      ],
      limits: {
        roastsPerDay: -1, // unlimited
        screenshots: true,
        watermark: false,
        duration: 3 * 24 * 60 * 60 * 1000 // 3 days in milliseconds
      }
    },
    monthly: {
      name: 'Pro Monthly',
      description: 'Unlimited roasts every month',
      price: '$19',
      priceId: 'price_1SD1SYJ6OiwDDp6nu5mdeXGI',
      features: [
        'Unlimited roasts',
        'Full AI analysis',
        'High-quality screenshots',
        'Export features',
        'Priority support',
        'No watermarks'
      ],
      limits: {
        roastsPerDay: -1, // unlimited
        screenshots: true,
        watermark: false,
        exports: true
      }
    },
    annual: {
      name: 'Pro Annual',
      description: 'Best value - 17% savings!',
      price: '$190',
      originalPrice: '$228',
      priceId: 'price_1SD1SfJ6OiwDDp6ncJYPspxs',
      badge: 'BEST VALUE',
      features: [
        'Unlimited roasts',
        'Full AI analysis', 
        'High-quality screenshots',
        'Export features',
        'Priority support',
        'No watermarks',
        '17% annual discount'
      ],
      limits: {
        roastsPerDay: -1, // unlimited
        screenshots: true,
        watermark: false,
        exports: true
      }
    }
  }
} as const

export type PlanType = keyof typeof STRIPE_CONFIG.plans
export type PlanLimits = typeof STRIPE_CONFIG.plans.free.limits