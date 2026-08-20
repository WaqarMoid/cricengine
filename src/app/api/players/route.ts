import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createPlayerSchema } from '@/lib/engine/validators'

// GET /api/players - List all players
export async function GET() {
  try {
    const players = await prisma.player.findMany({
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(players)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch players' }, { status: 500 })
  }
}

// POST /api/players - Create a player
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = createPlayerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const player = await prisma.player.create({ data: parsed.data })
    return NextResponse.json(player, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create player' }, { status: 500 })
  }
}
