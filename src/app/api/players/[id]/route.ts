import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/players/[id] - Player details + career stats
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const player = await prisma.player.findUnique({ where: { id } })
    if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

    // Compute career stats from ball events
    const battingEvents = await prisma.ballEvent.findMany({
      where: { strikerId: id, isUndone: false },
    })
    const bowlingEvents = await prisma.ballEvent.findMany({
      where: { bowlerId: id, isUndone: false },
    })

    const totalRuns = battingEvents.reduce((sum, e) => sum + e.runsOffBat, 0)
    const ballsFaced = battingEvents.filter(e => e.extraType !== 'WIDE').length
    const fours = battingEvents.filter(e => e.runsOffBat === 4).length
    const sixes = battingEvents.filter(e => e.runsOffBat === 6).length
    const strikeRate = ballsFaced > 0 ? (totalRuns / ballsFaced) * 100 : 0

    const wicketsTaken = bowlingEvents.filter(
      e => e.isWicket && e.wicketType !== 'RUN_OUT' && e.wicketType !== 'RETIRED'
    ).length
    const legalBowlingBalls = bowlingEvents.filter(
      e => e.extraType !== 'WIDE' && e.extraType !== 'NO_BALL'
    ).length
    const runsConceded = bowlingEvents.reduce((sum, e) => {
      if (e.extraType === 'WIDE') return sum + 1 + e.extras
      if (e.extraType === 'NO_BALL') return sum + 1 + e.runsOffBat
      if (e.extraType === 'BYE' || e.extraType === 'LEG_BYE') return sum
      return sum + e.runsOffBat
    }, 0)
    const bowlingEconomy = legalBowlingBalls > 0 ? runsConceded / (legalBowlingBalls / 6) : 0

    // Wagon wheel data (all shots with coordinates)
    const shots = battingEvents
      .filter(e => e.shotX !== null && e.shotY !== null)
      .map(e => ({ x: e.shotX!, y: e.shotY!, runs: e.runsOffBat, zone: e.shotZone }))

    return NextResponse.json({
      ...player,
      career: {
        totalRuns,
        ballsFaced,
        fours,
        sixes,
        strikeRate: Math.round(strikeRate * 100) / 100,
        wicketsTaken,
        runsConceded,
        bowlingEconomy: Math.round(bowlingEconomy * 100) / 100,
        legalBowlingBalls,
      },
      shots,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch player stats' }, { status: 500 })
  }
}
