import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createMatchSchema } from '@/lib/engine/validators'
import { publicSummary, summarizeMatch, toEngineEvent } from '@/lib/engine/match-summary'

export const dynamic = 'force-dynamic'

// GET /api/matches - List matches with innings totals, result and tournament context
export async function GET() {
  try {
    const matches = await prisma.match.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        ballEvents: { where: { isUndone: false }, orderBy: { sequenceNo: 'asc' } },
        tournament: { select: { id: true, name: true, shortName: true } },
      },
    })
    const out = matches.map((m: any) => {
      const { ballEvents, scorerPin: _pin, ...rest } = m
      void _pin
      const summary = summarizeMatch(m, ballEvents.map(toEngineEvent))
      return {
        ...rest,
        _count: { ballEvents: ballEvents.length },
        summary: publicSummary(summary),
      }
    })
    return NextResponse.json(out)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch matches' }, { status: 500 })
  }
}

// POST /api/matches - Create match (optionally as a tournament fixture)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = createMatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const data = { ...parsed.data } as any

    if (data.tournamentId) {
      const t = await prisma.tournament.findUnique({ where: { id: data.tournamentId }, include: { teams: true } })
      if (!t) return NextResponse.json({ error: 'Tournament not found' }, { status: 400 })
      const ta = t.teams.find((x: any) => x.id === data.teamAId)
      const tb = t.teams.find((x: any) => x.id === data.teamBId)
      if (!ta || !tb || ta.id === tb.id) {
        return NextResponse.json({ error: 'Pick two different teams from this tournament' }, { status: 400 })
      }
      const stage = data.stage || 'GROUP'
      if (stage === 'GROUP' && ta.groupName && tb.groupName && ta.groupName !== tb.groupName) {
        return NextResponse.json({ error: `${ta.name} and ${tb.name} are in different groups` }, { status: 400 })
      }
      // Lineups must come from the registered squads
      const badA = data.teamAPlayerIds.filter((p: string) => !ta.playerIds.includes(p))
      const badB = data.teamBPlayerIds.filter((p: string) => !tb.playerIds.includes(p))
      if (badA.length || badB.length) {
        return NextResponse.json({ error: 'Lineups can only use players registered in each team squad' }, { status: 400 })
      }
      const count = await prisma.match.count({ where: { tournamentId: t.id } })
      data.stage = stage
      data.groupName = stage === 'GROUP' ? (data.groupName || ta.groupName) : null
      data.matchNumber = data.matchNumber || count + 1
      data.matchLabel = data.matchLabel || (stage === 'GROUP' || stage === 'LEAGUE' ? `Match ${data.matchNumber}` : stage === 'FINAL' ? 'Final' : `Semi-final`)
      data.teamAName = ta.name
      data.teamBName = tb.name
      data.oversLimit = data.oversLimit || t.oversPerMatch
      data.venue = data.venue || t.venue
    } else {
      data.stage = data.stage || 'ONE_OFF'
      delete data.teamAId
      delete data.teamBId
    }
    if (data.scheduledAt) data.scheduledAt = new Date(data.scheduledAt)

    // Generate 6-digit scorer PIN
    const scorerPin = Math.floor(100000 + Math.random() * 900000).toString()

    const match = await prisma.match.create({
      data: {
        ...data,
        scorerPin,
      },
    })
    // Return with PIN visible (only on create)
    return NextResponse.json(match, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create match' }, { status: 500 })
  }
}
