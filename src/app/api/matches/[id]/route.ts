import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateInningsState } from '@/lib/engine/scoring-engine'
import { BallEvent } from '@/lib/engine/types'
import { publicSummary, summarizeMatch } from '@/lib/engine/match-summary'

// GET /api/matches/[id] - Full match state computed from events
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        ballEvents: { orderBy: { sequenceNo: 'asc' } },
        tournament: { select: { id: true, name: true, shortName: true } },
      },
    })
    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

    // Fetch player names for display
    const playerIds = [...match.teamAPlayerIds, ...match.teamBPlayerIds]
    const players = await prisma.player.findMany({
      where: { id: { in: playerIds } },
      select: { id: true, name: true, battingStyle: true, bowlingStyle: true },
    })
    const playerMap = Object.fromEntries(players.map((p: any) => [p.id, p]))

    // Convert Prisma events to engine BallEvent type
    const events: BallEvent[] = match.ballEvents.map((e: any) => ({
      id: e.id,
      matchId: e.matchId,
      inningsNo: e.inningsNo,
      overNumber: e.overNumber,
      ballInOver: e.ballInOver,
      sequenceNo: e.sequenceNo,
      strikerId: e.strikerId,
      nonStrikerId: e.nonStrikerId,
      bowlerId: e.bowlerId,
      runsOffBat: e.runsOffBat,
      extras: e.extras,
      extraType: e.extraType as BallEvent['extraType'],
      isLegalDelivery: e.isLegalDelivery,
      isWicket: e.isWicket,
      wicketType: e.wicketType as BallEvent['wicketType'],
      dismissedPlayerId: e.dismissedPlayerId,
      fielderId: e.fielderId,
      shotX: e.shotX,
      shotY: e.shotY,
      shotZone: e.shotZone as BallEvent['shotZone'],
      pitchLine: e.pitchLine as BallEvent['pitchLine'],
      pitchLength: e.pitchLength as BallEvent['pitchLength'],
      isUndone: e.isUndone,
      createdAt: e.createdAt.toISOString(),
    }))

    // Compute innings states
    const innings1Events = events.filter(e => e.inningsNo === 1)
    const innings2Events = events.filter(e => e.inningsNo === 2)
    
    const isTeamABattingFirst = (match.tossWinner === match.teamAName && match.tossDecision === 'BAT') ||
                                (match.tossWinner === match.teamBName && match.tossDecision === 'BOWL')
    const inn1BattersCount = isTeamABattingFirst ? match.teamAPlayerIds.length : match.teamBPlayerIds.length
    const inn2BattersCount = isTeamABattingFirst ? match.teamBPlayerIds.length : match.teamAPlayerIds.length

    const innings1State = calculateInningsState(innings1Events, 1, match.oversLimit, null, inn1BattersCount)
    
    const target = innings1State.isInningsComplete ? innings1State.totalRuns + 1 : null
    const innings2State = innings2Events.length > 0 || match.currentInnings >= 2
      ? calculateInningsState(innings2Events, 2, match.oversLimit, target, inn2BattersCount)
      : null

    // Serialize Map objects to plain objects for JSON
    const serializeInnings = (state: ReturnType<typeof calculateInningsState>) => ({
      ...state,
      batterStats: Object.fromEntries(state.batterStats),
      bowlerFigures: Object.fromEntries(state.bowlerFigures),
    })

    return NextResponse.json({
      match: {
        id: match.id,
        teamAName: match.teamAName,
        teamBName: match.teamBName,
        oversLimit: match.oversLimit,
        status: match.status,
        currentInnings: match.currentInnings,
        tossWinner: match.tossWinner,
        tossDecision: match.tossDecision,
        teamAPlayerIds: match.teamAPlayerIds,
        teamBPlayerIds: match.teamBPlayerIds,
        createdAt: match.createdAt,
        tournament: (match as any).tournament ?? null,
        stage: (match as any).stage ?? null,
        groupName: (match as any).groupName ?? null,
        matchLabel: (match as any).matchLabel ?? null,
        venue: (match as any).venue ?? null,
        scheduledAt: (match as any).scheduledAt ?? null,
      },
      summary: publicSummary(summarizeMatch(match as any, events)),
      players: playerMap,
      innings1: serializeInnings(innings1State),
      innings2: innings2State ? serializeInnings(innings2State) : null,
      rawEvents: events,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch match details' }, { status: 500 })
  }
}

// PATCH /api/matches/[id] - Update match status (toss, innings break, etc.)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    
    // Verify scorer PIN
    const pin = req.headers.get('x-scorer-pin')
    const match = await prisma.match.findUnique({ where: { id } })
    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    if (match.scorerPin && pin !== match.scorerPin) {
      return NextResponse.json({ error: 'Invalid scorer PIN' }, { status: 403 })
    }

    const updated = await prisma.match.update({
      where: { id },
      data: body,
    })
    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update match' }, { status: 500 })
  }
}

// DELETE /api/matches/[id] - Delete match (PIN protected)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const pin = req.headers.get('x-scorer-pin')
    
    const match = await prisma.match.findUnique({ where: { id } })
    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    
    if (match.scorerPin && pin !== match.scorerPin) {
      return NextResponse.json({ error: 'Invalid scorer PIN' }, { status: 403 })
    }

    // Delete associated ball events first, then the match
    await prisma.ballEvent.deleteMany({ where: { matchId: id } })
    await prisma.match.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'Match deleted successfully' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete match' }, { status: 500 })
  }
}


