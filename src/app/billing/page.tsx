import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Header } from '@/components/layout/header'

export default async function BillingPage() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signin')
  }

  // Get user profile and subscription info
  const { data: userProfile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Billing & Subscription
          </h1>
          <p className="text-gray-600">
            Manage your subscription and billing information
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Current Plan */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Current Plan
                <Badge variant={userProfile?.subscription_tier === 'pro' ? 'default' : 'secondary'}>
                  {userProfile?.subscription_tier?.toUpperCase() || 'FREE'}
                </Badge>
              </CardTitle>
              <CardDescription>
                Your current subscription tier
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-600">Status</div>
                  <div className="font-medium">
                    {userProfile?.subscription_status === 'active' ? '✅ Active' : '⏸️ Inactive'}
                  </div>
                </div>
                
                {userProfile?.subscription_tier !== 'free' && (
                  <div>
                    <div className="text-sm text-gray-600">Billing</div>
                    <div className="font-medium">
                      {userProfile?.subscription_tier === 'trial' && 'Trial Period'}
                      {userProfile?.subscription_tier === 'pro' && 'Monthly/Annual'}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <Button variant="outline" className="w-full">
                    View Usage
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upgrade/Manage */}
          <Card>
            <CardHeader>
              <CardTitle>Manage Subscription</CardTitle>
              <CardDescription>
                Upgrade or manage your current plan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {userProfile?.subscription_tier === 'free' ? (
                  <>
                    <Button className="w-full" asChild>
                      <a href="/pricing">
                        Upgrade to Pro
                      </a>
                    </Button>
                    <Button variant="outline" className="w-full" asChild>
                      <a href="/pricing">
                        View Plans
                      </a>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" className="w-full">
                      Manage Billing
                    </Button>
                    <Button variant="outline" className="w-full">
                      Download Invoices
                    </Button>
                    <Button variant="destructive" className="w-full">
                      Cancel Subscription
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Usage Summary */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Usage This Month</CardTitle>
              <CardDescription>
                Track your roast usage and limits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {userProfile?.total_roasts_count || 0}
                  </div>
                  <div className="text-sm text-gray-600">Total Roasts</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {userProfile?.daily_roasts_count || 0}
                  </div>
                  <div className="text-sm text-gray-600">Today</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {userProfile?.subscription_tier === 'free' ? '3/day' : '∞'}
                  </div>
                  <div className="text-sm text-gray-600">Daily Limit</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Back to Dashboard */}
        <div className="mt-8 text-center">
          <Button variant="ghost" asChild>
            <a href="/dashboard">
              ← Back to Dashboard
            </a>
          </Button>
        </div>
      </main>
    </div>
  )
}