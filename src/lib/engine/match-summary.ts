import { calculateInningsState } from './scoring-engine'
import { BallEvent, InningsState } from './types'

/**
 * Pure, framework-free match summariser.
 * Turns a match header + its ball events into innings totals and a result line.
 * Used by the match list, the tournament points table and the seed validator,
 * so all three always agree on who won and by how much.
 */

export interface MatchHeader {
  teamAName: string
  teamBName: string
  oversLimit: number
  tossWinner: string | null
  tossDecision: 'BAT' | 'BOWL' | null | string
  teamAPlayerIds: string[]
  teamBPlayerIds: string[]
  status?: string
  currentInnings?: number
}

export interface InningsTotal {
  side: 'A' | 'B'
  teamName: string
  runs: number
  wickets: number
  overs: string
  legalBalls: number
  allOut: boolean
  complete: boolean
}

export interface MatchResult {
  winner: 'A' | 'B' | null
  isTie: boolean
  isNoResult: boolean
  text: string
  marginRuns: number | null
  marginWickets: number | null
  ballsRemaining: number | null
}

export interface MatchSummary {
  battingFirst: 'A' | 'B'
  innings: InningsTotal[]
  result: MatchResult | null
  isComplete: boolean
  /** Engine states, kept for stat aggregation (not serialised to clients). */
  states: InningsState[]
}

export function isTeamABattingFirst(h: Pick<MatchHeader, 'teamAName' | 'teamBName' | 'tossWinner' | 'tossDecision'>): boolean {
  if (!h.tossWinner || !h.tossDecision) return true
  return (h.tossWinner === h.teamAName && h.tossDecision === 'BAT') ||
    (h.tossWinner === h.teamBName && h.tossDecision === 'BOWL')
}

export function formatOvers(legalBalls: number): string {
  return `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`
}

export function summarizeMatch(header: MatchHeader, events: BallEvent[]): MatchSummary {
  const aFirst = isTeamABattingFirst(header)
  const firstSide: 'A' | 'B' = aFirst ? 'A' : 'B'
  const secondSide: 'A' | 'B' = aFirst ? 'B' : 'A'
  const nameOf = (s: 'A' | 'B') => (s === 'A' ? header.teamAName : header.teamBName)
  const countOf = (s: 'A' | 'B') => (s === 'A' ? header.teamAPlayerIds.length : header.teamBPlayerIds.length)

  const active = events.filter(e => !e.isUndone)
  const inn1Events = active.filter(e => e.inningsNo === 1)
  const inn2Events = active.filter(e => e.inningsNo === 2)

  const s1 = calculateInningsState(inn1Events, 1, header.oversLimit, null, countOf(firstSide))
  const target = s1.isInningsComplete ? s1.totalRuns + 1 : null
  const s2 = inn2Events.length > 0
    ? calculateInningsState(inn2Events, 2, header.oversLimit, target ?? s1.totalRuns + 1, countOf(secondSide))
    : null

  const toTotal = (s: InningsState, side: 'A' | 'B'): InningsTotal => ({
    side,
    teamName: nameOf(side),
    runs: s.totalRuns,
    wickets: s.totalWickets,
    overs: formatOvers(s.totalLegalBalls),
    legalBalls: s.totalLegalBalls,
    allOut: s.inningsCompleteReason === 'ALL_OUT',
    complete: s.isInningsComplete,
  })

  const innings: InningsTotal[] = []
  if (inn1Events.length > 0) innings.push(toTotal(s1, firstSide))
  if (s2) innings.push(toTotal(s2, secondSide))

  let result: MatchResult | null = null
  const statusCompleted = header.status === 'COMPLETED'

  if (s2 && s1.isInningsComplete && (s2.isInningsComplete || statusCompleted)) {
    const r1 = s1.totalRuns
    const r2 = s2.totalRuns
    const maxWkts = Math.max(1, countOf(secondSide) - 1)
    if (r2 > r1) {
      const wktsLeft = maxWkts - s2.totalWickets
      const ballsLeft = header.oversLimit * 6 - s2.totalLegalBalls
      result = {
        winner: secondSide,
        isTie: false,
        isNoResult: false,
        marginRuns: null,
        marginWickets: wktsLeft,
        ballsRemaining: ballsLeft,
        text: `${nameOf(secondSide)} won by ${wktsLeft} wicket${wktsLeft === 1 ? '' : 's'}${ballsLeft > 0 ? ` (${ballsLeft} ball${ballsLeft === 1 ? '' : 's'} left)` : ''}`,
      }
    } else if (r2 === r1 && s2.isInningsComplete) {
      result = { winner: null, isTie: true, isNoResult: false, marginRuns: 0, marginWickets: null, ballsRemaining: null, text: 'Match tied' }
    } else if (s2.isInningsComplete) {
      const margin = r1 - r2
      result = {
        winner: firstSide,
        isTie: false,
        isNoResult: false,
        marginRuns: margin,
        marginWickets: null,
        ballsRemaining: null,
        text: `${nameOf(firstSide)} won by ${margin} run${margin === 1 ? '' : 's'}`,
      }
    } else {
      result = { winner: null, isTie: false, isNoResult: true, marginRuns: null, marginWickets: null, ballsRemaining: null, text: 'No result' }
    }
  } else if (statusCompleted || header.status === 'ABANDONED') {
    result = { winner: null, isTie: false, isNoResult: true, marginRuns: null, marginWickets: null, ballsRemaining: null, text: header.status === 'ABANDONED' ? 'Match abandoned' : 'No result' }
  }

  return {
    battingFirst: firstSide,
    innings,
    result,
    isComplete: result !== null,
    states: s2 ? [s1, s2] : [s1],
  }
}

/** JSON-safe version of a summary (drops engine Maps). */
export function publicSummary(s: MatchSummary) {
  return { battingFirst: s.battingFirst, innings: s.innings, result: s.result, isComplete: s.isComplete }
}

/** Maps a Prisma/DB ball_events row (camelCase) into the engine type. */
export function toEngineEvent(e: any): BallEvent {
  return {
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
    extraType: e.extraType,
    isLegalDelivery: e.isLegalDelivery,
    isWicket: e.isWicket,
    wicketType: e.wicketType,
    dismissedPlayerId: e.dismissedPlayerId ?? null,
    fielderId: e.fielderId ?? null,
    shotX: e.shotX ?? null,
    shotY: e.shotY ?? null,
    shotZone: e.shotZone ?? null,
    pitchLine: e.pitchLine ?? null,
    pitchLength: e.pitchLength ?? null,
    isUndone: !!e.isUndone,
    createdAt: e.createdAt instanceof Date ? e.createdAt.toISOString() : String(e.createdAt ?? ''),
  }
}
