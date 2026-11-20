/**
 * Input formats for historical match records.
 *
 *  setup.json        -> players, tournaments (teams + fixtures), one-off fixtures   (hand-written)
 *  scoresheets/*.json -> one compact scoresheet per played fixture                  (LLM-generated)
 *
 * The compiler (compile.ts) turns these into fully-specified ball_events rows,
 * deriving striker / non-striker, over numbers and shot telemetry itself, so the
 * scoresheet author only has to describe what happened on each ball.
 */

export type BattingStyleIn = 'RIGHT_HAND' | 'LEFT_HAND'
export type BowlingStyleIn = 'RIGHT_ARM_FAST' | 'RIGHT_ARM_SPIN' | 'LEFT_ARM_FAST' | 'LEFT_ARM_SPIN' | 'NONE'

export interface SeedPlayer {
  key: string // "P01"
  name: string
  bat?: BattingStyleIn
  bowl?: BowlingStyleIn
}

export interface SeedTeam {
  key: string // "PPK"
  name: string
  shortName: string
  group: string // "A"
  captain: string // player key
  keeper?: string // player key
  color?: string
  players: string[] // player keys, max = tournament.maxPlayersPerTeam
}

export interface SeedFixture {
  key: string // "H12-M01"
  stage: 'GROUP' | 'SEMI_FINAL' | 'FINAL'
  group?: string
  matchNo: number
  label: string
  date: string // ISO with offset
  /** team key, or a seed: "A1" / "B2" (group position) or "W:<fixtureKey>" */
  teamA: string
  teamB: string
}

export interface SeedTournament {
  key: string
  name: string
  shortName: string
  season: string
  venue: string
  description?: string
  oversPerMatch: number
  maxPlayersPerTeam: number
  maxOversPerBowler: number
  qualifyPerGroup: number
  startDate: string
  endDate: string
  teams: SeedTeam[]
  fixtures: SeedFixture[]
}

export interface SeedOneOff {
  key: string
  label: string
  date: string
  venue: string
  oversLimit: number
  maxOversPerBowler: number
  teamA: { name: string; players: string[]; keeper?: string }
  teamB: { name: string; players: string[]; keeper?: string }
}

export interface SeedSetup {
  version: number
  players: SeedPlayer[]
  tournaments: SeedTournament[]
  oneOffs: SeedOneOff[]
}

export interface ScoresheetOver {
  bowler: string // player key
  /** space separated ball tokens, see BALL GRAMMAR in compile.ts */
  balls: string
}

export interface ScoresheetInnings {
  battingOrder: string[] // every player of the batting side, in batting order
  overs: ScoresheetOver[]
}

export interface Scoresheet {
  fixture: string // fixture key or one-off key
  toss: { winner: string; decision: 'BAT' | 'BOWL' } // winner = team key (tournament) or "A"/"B" (one-off)
  innings: [ScoresheetInnings, ScoresheetInnings]
  /** what the author believes happened; checked against the computed result */
  expected?: { winner: string | null; margin: string }
  notes?: string
}
