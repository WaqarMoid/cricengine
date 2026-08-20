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
})

export const createPlayerSchema = z.object({
  name: z.string().min(1).max(255),
  battingStyle: z.enum(['RIGHT_HAND', 'LEFT_HAND']).optional(),
  bowlingStyle: z.enum(['RIGHT_ARM_FAST', 'RIGHT_ARM_SPIN', 'LEFT_ARM_FAST', 'LEFT_ARM_SPIN', 'NONE']).optional(),
})
