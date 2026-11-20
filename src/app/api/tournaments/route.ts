import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createTournamentSchema } from '@/lib/engine/validators'
import { listTournaments } from '@/lib/tournament/service'

export const dynamic = 'force-dynamic'

// GET /api/tournaments - list tournaments with progress + champion
export async function GET() {
  try {
    return NextResponse.json(await listTournaments())
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch tournaments' }, { status: 500 })
  }
}

// POST /api/tournaments - create a tournament with its teams (groups optional)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = createTournamentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const d = parsed.data

    // Every squad player must exist
    const allIds = d.teams.flatMap(t => t.playerIds)
    const found = await prisma.player.count({ where: { id: { in: allIds } } })
    if (found !== new Set(allIds).size) {
      return NextResponse.json({ error: 'One or more players do not exist' }, { status: 400 })
    }

    const tournament = await prisma.tournament.create({
      data: {
        name: d.name,
        shortName: d.shortName ?? null,
        season: d.season ?? null,
        venue: d.venue ?? null,
        description: d.description ?? null,
        format: d.teams.some(t => t.groupName) ? 'GROUPS_KNOCKOUT' : 'LEAGUE',
        oversPerMatch: d.oversPerMatch,
        maxPlayersPerTeam: d.maxPlayersPerTeam,
        maxOversPerBowler: d.maxOversPerBowler ?? null,
        qualifyPerGroup: d.qualifyPerGroup,
        startDate: d.startDate ? new Date(d.startDate) : null,
        endDate: d.endDate ? new Date(d.endDate) : null,
      },
    })
    for (const t of d.teams) {
      await prisma.tournamentTeam.create({
        data: {
          tournamentId: tournament.id,
          name: t.name,
          shortName: t.shortName ?? null,
          groupName: t.groupName ?? 'A',
          captainId: t.captainId ?? null,
          playerIds: t.playerIds,
        },
      })
    }
    return NextResponse.json(tournament, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create tournament' }, { status: 500 })
  }
}
