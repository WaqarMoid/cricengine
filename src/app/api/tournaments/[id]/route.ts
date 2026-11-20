import { NextRequest, NextResponse } from 'next/server'
import { getTournamentDetail } from '@/lib/tournament/service'

export const dynamic = 'force-dynamic'

// GET /api/tournaments/[id] - points table, fixtures, knockout bracket, stat leaders
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const detail = await getTournamentDetail(id)
    if (!detail) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    return NextResponse.json(detail)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch tournament' }, { status: 500 })
  }
}
