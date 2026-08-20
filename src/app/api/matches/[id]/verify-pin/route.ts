import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST /api/matches/[id]/verify-pin - Verify scorer PIN
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { pin } = await req.json()
    
    const match = await prisma.match.findUnique({
      where: { id },
      select: { scorerPin: true },
    })
    
    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    
    const valid = match.scorerPin === pin
    return NextResponse.json({ valid })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Verification failed' }, { status: 500 })
  }
}
