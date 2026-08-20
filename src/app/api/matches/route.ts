import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createMatchSchema } from '@/lib/engine/validators'

// GET /api/matches - List matches
export async function GET() {
  try {
    const matches = await prisma.match.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { ballEvents: true } } },
    })
    return NextResponse.json(matches)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch matches' }, { status: 500 })
  }
}

// POST /api/matches - Create match
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = createMatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    // Generate 6-digit scorer PIN
    const scorerPin = Math.floor(100000 + Math.random() * 900000).toString()

    const match = await prisma.match.create({
      data: {
        ...parsed.data,
        scorerPin,
      },
    })
    // Return with PIN visible (only on create)
    return NextResponse.json(match, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create match' }, { status: 500 })
  }
}
