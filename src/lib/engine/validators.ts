import { z } from 'zod'

export const deliveryInputSchema = z.object({
  matchId: z.string().uuid(),
  inningsNo: z.number().int().min(1).max(4),
  strikerId: z.string().uuid(),
  nonStrikerId: z.string().uuid(),
  bowlerId: z.string().uuid(),
  runsOffBat: z.number().int().min(0).max(7),
  extraType: z.enum(['NONE', 'WIDE', 'NO_BALL', 'BYE', 'LEG_BYE', 'PENALTY']),
  extras: z.number().int().min(0),
  isWicket: z.boolean(),
  wicketType: z.enum(['NONE', 'BOWLED', 'CAUGHT', 'LBW', 'RUN_OUT', 'STUMPED', 'HIT_WICKET', 'RETIRED']),
  dismissedPlayerId: z.string().uuid().nullable(),
  fielderId: z.string().uuid().nullable(),
  shotX: z.number().min(-1).max(1).nullable(),
  shotY: z.number().min(-1).max(1).nullable(),
  shotZone: z.enum(['FINE_LEG', 'SQUARE_LEG', 'MID_WICKET', 'LONG_ON', 'LONG_OFF', 'COVER', 'POINT', 'THIRD_MAN']).nullable(),
}).refine(data => {
  // Striker and non-striker must be distinct
  if (data.strikerId === data.nonStrikerId) return false
  // Bowler cannot be striker or non-striker
  if (data.bowlerId === data.strikerId || data.bowlerId === data.nonStrikerId) return false
  // If wicket, must have wicket type
  if (data.isWicket && data.wicketType === 'NONE') return false
  // If not wicket, wicket type must be NONE
  if (!data.isWicket && data.wicketType !== 'NONE') return false
  // If caught/run_out/stumped, must have fielder
  if (['CAUGHT', 'RUN_OUT', 'STUMPED'].includes(data.wicketType) && !data.fielderId) return false
  // If wicket (except retired), must have dismissed player
  if (data.isWicket && data.wicketType !== 'RETIRED' && !data.dismissedPlayerId) return false
  // Dismissed player must be either striker or non-striker
  if (data.isWicket && data.dismissedPlayerId && data.dismissedPlayerId !== data.strikerId && data.dismissedPlayerId !== data.nonStrikerId) return false
  // Law 21: Only Run Out / Retired allowed on No Ball
  if (data.extraType === 'NO_BALL' && data.isWicket && !['RUN_OUT', 'RETIRED'].includes(data.wicketType)) return false
  // Law 22: Cannot be Bowled, Caught, LBW on Wide
  if (data.extraType === 'WIDE' && data.isWicket && ['BOWLED', 'CAUGHT', 'LBW'].includes(data.wicketType)) return false
  return true
}, { message: 'Invalid cricket delivery configuration (check distinct batsmen, bowler, dismissal or extras according to cricket laws)' })

export const createMatchSchema = z.object({
  teamAName: z.string().min(1).max(100),
  teamBName: z.string().min(1).max(100),
  oversLimit: z.number().int().min(1).max(50),
  teamAPlayerIds: z.array(z.string().uuid()).min(2).max(11),
  teamBPlayerIds: z.array(z.string().uuid()).min(2).max(11),
  tossWinner: z.string().optional(),
  tossDecision: z.enum(['BAT', 'BOWL']).optional(),
  leagueId: z.string().uuid().optional(),
  // Tournament context (optional)
  tournamentId: z.string().uuid().optional(),
  stage: z.enum(['GROUP', 'LEAGUE', 'SEMI_FINAL', 'FINAL', 'ONE_OFF']).optional(),
  groupName: z.string().max(20).optional(),
  matchNumber: z.number().int().min(1).max(500).optional(),
  matchLabel: z.string().max(60).optional(),
  teamAId: z.string().uuid().optional(),
  teamBId: z.string().uuid().optional(),
  venue: z.string().max(120).optional(),
  scheduledAt: z.string().datetime({ offset: true }).optional(),
})

export const createTournamentSchema = z.object({
  name: z.string().min(2).max(120),
  shortName: z.string().max(12).optional(),
  season: z.string().max(20).optional(),
  venue: z.string().max(120).optional(),
  description: z.string().max(500).optional(),
  oversPerMatch: z.number().int().min(1).max(50),
  maxPlayersPerTeam: z.number().int().min(2).max(15),
  maxOversPerBowler: z.number().int().min(1).max(10).optional(),
  qualifyPerGroup: z.number().int().min(1).max(4).default(2),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  teams: z.array(z.object({
    name: z.string().min(1).max(60),
    shortName: z.string().max(6).optional(),
    groupName: z.string().max(10).optional(),
    captainId: z.string().uuid().optional(),
    playerIds: z.array(z.string().uuid()).min(2).max(15),
  })).min(2).max(32),
}).superRefine((d, ctx) => {
  const seen = new Set<string>()
  d.teams.forEach((t, i) => {
    if (t.playerIds.length > d.maxPlayersPerTeam) {
      ctx.addIssue({ code: 'custom', path: ['teams', i, 'playerIds'], message: `${t.name}: max ${d.maxPlayersPerTeam} players` })
    }
    for (const p of t.playerIds) {
      if (seen.has(p)) ctx.addIssue({ code: 'custom', path: ['teams', i, 'playerIds'], message: `${t.name}: a player is already in another team` })
      seen.add(p)
    }
    if (t.captainId && !t.playerIds.includes(t.captainId)) {
      ctx.addIssue({ code: 'custom', path: ['teams', i, 'captainId'], message: `${t.name}: captain must be in the squad` })
    }
  })
  const names = new Set(d.teams.map(t => t.name.toLowerCase()))
  if (names.size !== d.teams.length) ctx.addIssue({ code: 'custom', path: ['teams'], message: 'Team names must be unique' })
})

export const createPlayerSchema = z.object({
  name: z.string().min(1).max(255),
  battingStyle: z.enum(['RIGHT_HAND', 'LEFT_HAND']).optional(),
  bowlingStyle: z.enum(['RIGHT_ARM_FAST', 'RIGHT_ARM_SPIN', 'LEFT_ARM_FAST', 'LEFT_ARM_SPIN', 'NONE']).optional(),
})
