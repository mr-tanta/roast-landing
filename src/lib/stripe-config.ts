/**
 * Stripe Configuration for RoastMyLanding
 * Contains product and price IDs for subscription plans
 */

export const STRIPE_CONFIG = {
  products: {
    trial: 'prod_T9OsK75Kt06Zkm',
    monthly: 'prod_T9Otomcn3rkdph', 
    annual: 'prod_T9OtpgxohFOVwL',
  },
  prices: {
    trial: 'price_1SD65rJ6OiwDDp6nAy5oXFjq',      // $4.99 one-time
    monthly: 'price_1SD666J6OiwDDp6nMEprEyAK',    // $29.00/month
    annual: 'price_1SD66IJ6OiwDDp6nN6m4KJ5e',     // $290.00/year
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
      name: 'Free Trial',
      description: 'Get started with 5 premium roasts',
      price: '$4.99',
      priceId: 'price_1SD65rJ6OiwDDp6nAy5oXFjq',
      features: [
        '5 premium roasts',
        'Full AI analysis',
        'Screenshots included',
        'No watermarks',
        'Priority processing'
      ],
      limits: {
        roastsTotal: 5, // total roasts allowed
        screenshots: true,
        watermark: false
      }
    },
    monthly: {
      name: 'Pro Monthly',
      description: 'Unlimited roasts every month',
      price: '$29',
      priceId: 'price_1SD666J6OiwDDp6nMEprEyAK',
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
      price: '$290',
      originalPrice: '$348',
      priceId: 'price_1SD66IJ6OiwDDp6nN6m4KJ5e',
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