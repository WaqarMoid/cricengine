import { prisma } from '@/lib/db'
import { publicSummary, summarizeMatch, toEngineEvent } from '@/lib/engine/match-summary'
import {
  computeKnockoutBracket, computeLeaders, computeStandings, isGroupStageComplete,
  TeamRef, TournamentMatchInput,
} from './standings'

export const STAGE_LABEL: Record<string, string> = {
  GROUP: 'Group stage',
  LEAGUE: 'League',
  SEMI_FINAL: 'Semi-final',
  FINAL: 'Final',
  ONE_OFF: 'One-off',
}

/** Everything the tournament page needs, computed from raw ball events. */
export async function getTournamentDetail(id: string) {
  const t = await prisma.tournament.findUnique({
    where: { id },
    include: { teams: { orderBy: [{ groupName: 'asc' }, { name: 'asc' }] } },
  })
  if (!t) return null

  const rows = await prisma.match.findMany({
    where: { tournamentId: id },
    include: { ballEvents: { where: { isUndone: false }, orderBy: { sequenceNo: 'asc' } } },
    orderBy: [{ matchNumber: 'asc' }, { createdAt: 'asc' }],
  })

  const playerIds = new Set<string>()
  t.teams.forEach((tm: any) => tm.playerIds.forEach((p: string) => playerIds.add(p)))
  rows.forEach((m: any) => [...m.teamAPlayerIds, ...m.teamBPlayerIds].forEach((p: string) => playerIds.add(p)))
  const players = await prisma.player.findMany({
    where: { id: { in: [...playerIds] } },
    select: { id: true, name: true, battingStyle: true, bowlingStyle: true },
  })
  const playerMap = Object.fromEntries(players.map((p: any) => [p.id, p]))

  const teams: TeamRef[] = t.teams.map((tm: any) => ({ id: tm.id, name: tm.name, shortName: tm.shortName, groupName: tm.groupName }))

  const inputs = rows.map((m: any) => {
    const summary = summarizeMatch(m, m.ballEvents.map(toEngineEvent))
    return {
      id: m.id,
      stage: m.stage,
      groupName: m.groupName,
      matchNumber: m.matchNumber,
      teamAId: m.teamAId,
      teamBId: m.teamBId,
      oversLimit: m.oversLimit,
      teamAPlayerIds: m.teamAPlayerIds as string[],
      teamBPlayerIds: m.teamBPlayerIds as string[],
      summary,
    }
  })

  const standings = computeStandings(teams, inputs as TournamentMatchInput[], t.qualifyPerGroup)
  const bracket = computeKnockoutBracket(teams, inputs as TournamentMatchInput[], standings)
  const leaders = computeLeaders(inputs)
  const groupStageComplete = isGroupStageComplete(teams, inputs as TournamentMatchInput[])
  const final = bracket.find(b => b.stage === 'FINAL')
  const championId = final && !final.projected ? final.winnerId : null

  // Player of the tournament: simple impact score = runs + 20*wickets (+ SR bonus)
  const impact = new Map<string, number>()
  for (const m of inputs) {
    for (const st of m.summary.states) {
      for (const b of st.batterStats.values()) impact.set(b.playerId, (impact.get(b.playerId) || 0) + b.runs + (b.ballsFaced >= 6 ? (b.strikeRate - 120) / 20 : 0))
      for (const f of st.bowlerFigures.values()) impact.set(f.playerId, (impact.get(f.playerId) || 0) + f.wickets * 20 + f.dotBalls * 1 - Math.max(0, f.economy - 8) * 2)
    }
  }
  const potId = [...impact.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  const playedCount = inputs.filter(m => m.summary.isComplete).length

  const matches = rows.map((m: any, i: number) => ({
    id: m.id,
    label: m.matchLabel || (m.matchNumber ? `Match ${m.matchNumber}` : 'Match'),
    stage: m.stage || 'GROUP',
    stageLabel: STAGE_LABEL[m.stage || 'GROUP'] || m.stage,
    groupName: m.groupName,
    matchNumber: m.matchNumber,
    status: m.status,
    scheduledAt: (m.scheduledAt || m.createdAt)?.toISOString?.() ?? null,
    venue: m.venue,
    teamAId: m.teamAId,
    teamBId: m.teamBId,
    teamAName: m.teamAName,
    teamBName: m.teamBName,
    oversLimit: m.oversLimit,
    ballsBowled: m.ballEvents.length,
    ...publicSummary(inputs[i].summary),
  }))

  return {
    tournament: {
      id: t.id,
      name: t.name,
      shortName: t.shortName,
      season: t.season,
      venue: t.venue,
      description: t.description,
      format: t.format,
      oversPerMatch: t.oversPerMatch,
      maxPlayersPerTeam: t.maxPlayersPerTeam,
      maxOversPerBowler: t.maxOversPerBowler,
      qualifyPerGroup: t.qualifyPerGroup,
      startDate: t.startDate?.toISOString() ?? null,
      endDate: t.endDate?.toISOString() ?? null,
    },
    teams: t.teams.map((tm: any) => ({
      id: tm.id, name: tm.name, shortName: tm.shortName, groupName: tm.groupName, color: tm.color,
      captainId: tm.captainId, keeperId: tm.keeperId, playerIds: tm.playerIds,
    })),
    players: playerMap,
    matches,
    standings,
    bracket,
    leaders,
    groupStageComplete,
    championId,
    playerOfTournamentId: playedCount >= 3 ? potId : null,
    playedCount,
    totalMatches: expectedMatchCount(teams),
  }
}

export type TournamentDetail = NonNullable<Awaited<ReturnType<typeof getTournamentDetail>>>

function expectedMatchCount(teams: TeamRef[]) {
  const g = new Map<string, number>()
  teams.forEach(t => g.set(t.groupName || 'League', (g.get(t.groupName || 'League') || 0) + 1))
  let n = 0
  g.forEach(v => { n += (v * (v - 1)) / 2 })
  return n + (g.size >= 2 ? 3 : 0)
}

/** Compact list for /tournaments and the home page. */
export async function listTournaments() {
  const ts = await prisma.tournament.findMany({
    orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    include: { teams: { select: { id: true, name: true } } },
  })
  const out = []
  for (const t of ts) {
    const rows = await prisma.match.findMany({
      where: { tournamentId: t.id },
      include: { ballEvents: { where: { isUndone: false }, orderBy: { sequenceNo: 'asc' } } },
    })
    const sums = rows.map((m: any) => ({ m, s: summarizeMatch(m, m.ballEvents.map(toEngineEvent)) }))
    const fin = sums.find(x => x.m.stage === 'FINAL' && x.s.result?.winner)
    const championTeamId = fin ? (fin.s.result!.winner === 'A' ? fin.m.teamAId : fin.m.teamBId) : null
    const champion = championTeamId ? t.teams.find((tm: any) => tm.id === championTeamId)?.name ?? null : null
    const live = rows.some((m: any) => m.status === 'IN_PROGRESS' || m.status === 'INNINGS_BREAK')
    out.push({
      id: t.id,
      name: t.name,
      shortName: t.shortName,
      season: t.season,
      venue: t.venue,
      oversPerMatch: t.oversPerMatch,
      maxPlayersPerTeam: t.maxPlayersPerTeam,
      startDate: t.startDate?.toISOString() ?? null,
      endDate: t.endDate?.toISOString() ?? null,
      teamCount: t.teams.length,
      matchCount: rows.length,
      played: sums.filter(x => x.s.isComplete).length,
      champion,
      runnerUp: fin ? (fin.s.result!.winner === 'A' ? fin.m.teamBName : fin.m.teamAName) : null,
      finalResult: fin ? fin.s.result!.text : null,
      status: champion ? 'COMPLETED' : live ? 'LIVE' : rows.some((m: any) => m.status === 'COMPLETED') ? 'IN_PROGRESS' : 'UPCOMING',
    })
  }
  return out
}
