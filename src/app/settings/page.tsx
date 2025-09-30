import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Header } from '@/components/layout/header'
import { User, Mail, Building2, Globe, Trash2 } from 'lucide-react'

export default async function SettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signin')
  }

  // Get user profile
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
            Account Settings
          </h1>
          <p className="text-gray-600">
            Manage your account information and preferences
          </p>
        </div>

        <div className="grid gap-6">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Update your personal information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={userProfile?.name || ''}
                      placeholder="Your name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="company">
                      <Building2 className="inline h-4 w-4 mr-1" />
                      Company
                    </Label>
                    <Input
                      id="company"
                      name="company"
                      defaultValue={userProfile?.company || ''}
                      placeholder="Your company"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="website">
                    <Globe className="inline h-4 w-4 mr-1" />
                    Website
                  </Label>
                  <Input
                    id="website"
                    name="website"
                    type="url"
                    defaultValue={userProfile?.website || ''}
                    placeholder="https://yourwebsite.com"
                  />
                </div>

                <Button type="submit" disabled>
                  Save Changes
                </Button>
                <p className="text-sm text-muted-foreground">
                  Profile updates coming soon
                </p>
              </form>
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Account Information
              </CardTitle>
              <CardDescription>
                View your account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Email Address</Label>
                <Input
                  type="email"
                  value={user.email || ''}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Contact support to change your email address
                </p>
              </div>

              <div>
                <Label>User ID</Label>
                <Input
                  value={user.id}
                  disabled
                  className="bg-gray-50 font-mono text-sm"
                />
              </div>

              <div>
                <Label>Member Since</Label>
                <Input
                  value={new Date(user.created_at!).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                  disabled
                  className="bg-gray-50"
                />
              </div>
            </CardContent>
          </Card>

          {/* Password */}
          <Card>
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>
                Change your password
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" disabled>
                Change Password
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                Password reset coming soon
              </p>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600 flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                Irreversible actions for your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Delete Account</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                  <Button variant="destructive" disabled>
                    Delete Account
                  </Button>
                  <p className="text-sm text-muted-foreground mt-2">
                    Account deletion coming soon
                  </p>
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
