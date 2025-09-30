import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    // Get the authenticated user
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession()

    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Get user profile and subscription info
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    // If user profile doesn't exist, create it using service role
    if (profileError && profileError.code === 'PGRST116') {
      // Create admin client with service role for user creation
      const adminSupabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          cookies: {
            get(name: string) {
              return cookieStore.get(name)?.value
            },
          },
        }
      )
      
      const { data: newProfile, error: createError } = await adminSupabase
        .from('users')
        .insert({
          id: userId,
          email: session.user.email!,
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email!.split('@')[0],
          avatar_url: session.user.user_metadata?.avatar_url,
          subscription_tier: 'free',
          subscription_status: 'inactive',
        })
        .select()
        .single()
      
      if (createError) {
        console.error('Failed to create user profile:', createError)
        return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 })
      }
      
      return NextResponse.json({
        total_roasts: 0,
        daily_roasts: 0,
        daily_limit: 3,
        subscription_tier: 'free',
        subscription_status: 'inactive',
        trial_ends_at: null,
        recent_roasts: [],
      })
    } else if (profileError) {
      console.error('Profile error:', profileError)
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 })
    }

    // Get roast counts and recent roasts
    const { data: roastStats, error: roastError } = await supabase
      .from('roasts')
      .select('id, url, domain, score, created_at, status')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (roastError) {
      console.error('Roast stats error:', roastError)
      return NextResponse.json({ error: 'Failed to fetch roast statistics' }, { status: 500 })
    }

    // Calculate daily roasts (reset if needed)
    const today = new Date().toISOString().split('T')[0]
    const lastReset = new Date(userProfile.last_roast_reset).toISOString().split('T')[0]
    
    let dailyRoasts = userProfile.daily_roasts_count
    if (lastReset !== today) {
      // Reset daily count
      dailyRoasts = 0
      await supabase
        .from('users')
        .update({
          daily_roasts_count: 0,
          last_roast_reset: new Date().toISOString(),
        })
        .eq('id', userId)
    }

    // Determine daily limit based on subscription tier
    const getDailyLimit = (tier: string) => {
      switch (tier) {
        case 'trial':
        case 'pro':
          return -1 // unlimited
        case 'free':
        default:
          return 3
      }
    }

    const dailyLimit = getDailyLimit(userProfile.subscription_tier)

    // Get recent roasts (last 5)
    const recentRoasts = roastStats
      ?.filter(roast => roast.status === 'completed')
      .slice(0, 5) || []

    const stats = {
      total_roasts: roastStats?.length || 0,
      daily_roasts: dailyRoasts,
      daily_limit: dailyLimit,
      subscription_tier: userProfile.subscription_tier,
      subscription_status: userProfile.subscription_status,
      trial_ends_at: userProfile.trial_ends_at,
      recent_roasts: recentRoasts,
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Stats API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}