import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
})

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = (await headers()).get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret)
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error(`Webhook signature verification failed.`, errorMessage)
    return NextResponse.json(
      { error: `Webhook Error: ${errorMessage}` },
      { status: 400 }
    )
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role for admin operations
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set() {},
        remove() {},
      },
    }
  )

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        
        // Get the customer
        const customer = await stripe.customers.retrieve(subscription.customer as string)
        if (!customer || customer.deleted) {
          throw new Error('Customer not found')
        }

        const customerEmail = (customer as Stripe.Customer).email
        if (!customerEmail) {
          throw new Error('Customer email not found')
        }

        // Find user by email
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('email', customerEmail)
          .single()

        if (userError || !user) {
          console.error('User not found for email:', customerEmail)
          return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Determine subscription tier based on price ID
        const priceId = subscription.items.data[0]?.price.id
        let subscriptionTier = 'free'
        
        if (priceId === 'price_1SD65rJ6OiwDDp6nAy5oXFjq') { // Trial - $4.99
          subscriptionTier = 'trial'
        } else if (priceId === 'price_1SD666J6OiwDDp6nMEprEyAK') { // Monthly - $29
          subscriptionTier = 'pro'
        } else if (priceId === 'price_1SD66IJ6OiwDDp6nN6m4KJ5e') { // Annual - $290
          subscriptionTier = 'pro'
        }

        // Update user subscription
        const { error: updateError } = await supabase
          .from('users')
          .update({
            subscription_tier: subscriptionTier,
            subscription_status: subscription.status,
            stripe_customer_id: subscription.customer,
            stripe_subscription_id: subscription.id,
            trial_ends_at: subscriptionTier === 'trial' && subscription.trial_end 
              ? new Date(subscription.trial_end * 1000).toISOString()
              : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id)

        if (updateError) {
          console.error('Failed to update user subscription:', updateError)
          return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
        }

        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        
        // Reset user to free tier
        const { error: updateError } = await supabase
          .from('users')
          .update({
            subscription_tier: 'free',
            subscription_status: 'inactive',
            stripe_subscription_id: null,
            trial_ends_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id)

        if (updateError) {
          console.error('Failed to update user subscription on cancellation:', updateError)
        }

        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object
        const subscriptionId = (invoice as { subscription?: string | { id: string } }).subscription

        if (subscriptionId) {
          const subId = typeof subscriptionId === 'string' ? subscriptionId : subscriptionId.id

          // Update subscription status to active
          const { error: updateError } = await supabase
            .from('users')
            .update({
              subscription_status: 'active',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', subId)

          if (updateError) {
            console.error('Failed to update subscription status:', updateError)
          }
        }

        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        const subscriptionId = (invoice as { subscription?: string | { id: string } }).subscription

        if (subscriptionId) {
          const subId = typeof subscriptionId === 'string' ? subscriptionId : subscriptionId.id

          // Update subscription status to past_due
          const { error: updateError } = await supabase
            .from('users')
            .update({
              subscription_status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', subId)

          if (updateError) {
            console.error('Failed to update subscription status:', updateError)
          }
        }

        break
      }

      default:
        console.log(`Unhandled event type ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}