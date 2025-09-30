import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '10')
  const type = searchParams.get('type') || 'top' // 'top' or 'bottom'

  try {
    const supabase = await createAdminClient()

    // Refresh materialized view (consider doing this on a schedule instead)
    await supabase.rpc('refresh_leaderboard')

    // Get leaderboard data
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .order('avg_score', { ascending: type === 'bottom' })
      .limit(limit)

    if (error) {
      throw error
    }

    return NextResponse.json({
      leaderboard: data || [],
      type,
    })
  } catch (error) {
    console.error('Leaderboard error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    )
  }
}