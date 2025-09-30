'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { 
  User, 
  CreditCard, 
  BarChart3, 
  Settings, 
  Crown,
  Zap,
  TrendingUp,
  Calendar,
  ExternalLink
} from 'lucide-react'

interface UserStats {
  total_roasts: number
  daily_roasts: number
  daily_limit: number
  subscription_tier: 'free' | 'trial' | 'pro'
  subscription_status: string
  trial_ends_at?: string
  recent_roasts: any[]
}

export function UserDashboard() {
  const { user, signOut } = useAuth()
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchUserStats()
    }
  }, [user])

  const fetchUserStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/user/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = () => {
    // Navigate to pricing/upgrade page
    window.location.href = '/pricing'
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please sign in to access your dashboard.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const isTrialUser = stats?.subscription_tier === 'trial'
  const isProUser = stats?.subscription_tier === 'pro'
  const isFreeUser = stats?.subscription_tier === 'free'

  const usagePercentage = stats ? (stats.daily_roasts / stats.daily_limit) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user.user_metadata?.name || user.email}
          </p>
        </div>
        <Button onClick={signOut} variant="outline">
          Sign Out
        </Button>
      </div>

      {/* Subscription Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Subscription Status</CardTitle>
          <div className="flex items-center gap-2">
            {isProUser && <Crown className="h-4 w-4 text-yellow-500" />}
            {isTrialUser && <Zap className="h-4 w-4 text-blue-500" />}
            <Badge variant={isProUser ? 'default' : isTrialUser ? 'secondary' : 'outline'}>
              {stats?.subscription_tier?.toUpperCase() || 'FREE'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isFreeUser && (
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Unlock unlimited roasts</p>
                  <p className="text-sm text-muted-foreground">
                    Get full AI analysis, screenshots, and more
                  </p>
                </div>
                <Button onClick={handleUpgrade}>
                  Upgrade Now
                </Button>
              </div>
            )}

            {isTrialUser && stats?.trial_ends_at && (
              <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div>
                  <p className="font-medium text-blue-900">Trial Active</p>
                  <p className="text-sm text-blue-700">
                    Ends {new Date(stats.trial_ends_at).toLocaleDateString()}
                  </p>
                </div>
                <Button onClick={handleUpgrade} variant="outline">
                  Upgrade to Pro
                </Button>
              </div>
            )}

            {isProUser && (
              <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                <Crown className="h-4 w-4 text-green-600" />
                <p className="font-medium text-green-900">Pro Member</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Usage Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Usage</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.daily_roasts || 0}</div>
            <p className="text-xs text-muted-foreground">
              of {stats?.daily_limit || 3} roasts today
            </p>
            <Progress value={usagePercentage} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Roasts</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_roasts || 0}</div>
            <p className="text-xs text-muted-foreground">
              All-time roasts generated
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Account</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Date(user.created_at!).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric'
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Member since
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Roasts */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Roasts</CardTitle>
          <CardDescription>
            Your latest landing page analyses
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.recent_roasts && stats.recent_roasts.length > 0 ? (
            <div className="space-y-4">
              {stats.recent_roasts.map((roast, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{roast.domain || new URL(roast.url).hostname}</p>
                    <p className="text-sm text-muted-foreground">
                      Score: {roast.score}/10 • {new Date(roast.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/roast/${roast.id}`} target="_blank" rel="noopener noreferrer">
                      View <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-muted-foreground">No roasts yet</p>
              <Button className="mt-2" asChild>
                <a href="/">Create Your First Roast</a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Button variant="outline" className="h-auto p-4 justify-start" asChild>
          <a href="/settings">
            <Settings className="mr-2 h-4 w-4" />
            <div className="text-left">
              <p className="font-medium">Account Settings</p>
              <p className="text-sm text-muted-foreground">Manage your profile</p>
            </div>
          </a>
        </Button>

        <Button variant="outline" className="h-auto p-4 justify-start" asChild>
          <a href="/billing">
            <CreditCard className="mr-2 h-4 w-4" />
            <div className="text-left">
              <p className="font-medium">Billing & Usage</p>
              <p className="text-sm text-muted-foreground">Manage subscription</p>
            </div>
          </a>
        </Button>
      </div>
    </div>
  )
}