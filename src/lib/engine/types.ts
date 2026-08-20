// === Enums ===
export type ExtraType = 'NONE' | 'WIDE' | 'NO_BALL' | 'BYE' | 'LEG_BYE' | 'PENALTY'
export type WicketType = 'NONE' | 'BOWLED' | 'CAUGHT' | 'LBW' | 'RUN_OUT' | 'STUMPED' | 'HIT_WICKET' | 'RETIRED'
export type ShotZone = 'FINE_LEG' | 'SQUARE_LEG' | 'MID_WICKET' | 'LONG_ON' | 'LONG_OFF' | 'COVER' | 'POINT' | 'THIRD_MAN'
export type PitchLine = 'OUTSIDE_OFF' | 'OFF_STUMP' | 'MIDDLE' | 'LEG_STUMP' | 'DOWN_LEG'
export type PitchLength = 'YORKER' | 'FULL' | 'GOOD_LENGTH' | 'SHORT' | 'BOUNCER'

// === Core Event ===
export interface BallEvent {
  id: string
  matchId: string
  inningsNo: number // 1-4
  overNumber: number // 0-indexed
  ballInOver: number // 1-6 for legal deliveries
  sequenceNo: number
  
  strikerId: string
  nonStrikerId: string
  bowlerId: string
  
  runsOffBat: number
  extras: number
  extraType: ExtraType
  isLegalDelivery: boolean
  
  isWicket: boolean
  wicketType: WicketType
  dismissedPlayerId: string | null
  fielderId: string | null
  
  shotX: number | null
  shotY: number | null
  shotZone: ShotZone | null
  pitchLine: PitchLine | null
  pitchLength: PitchLength | null
  
  isUndone: boolean
  createdAt: string
}

// === Computed State ===
export interface BatterStats {
  playerId: string
  playerName?: string
  runs: number
  ballsFaced: number
  fours: number
  sixes: number
  strikeRate: number
  isOut: boolean
  wicketType: WicketType | null
  bowlerIdWhoGotOut: string | null
  fielderIdWhoCaught: string | null
}

export interface BowlerFigures {
  playerId: string
  playerName?: string
  overs: string // e.g., "3.4"
  oversBowled: number // completed overs
  ballsBowled: number // legal deliveries in current incomplete over
  totalBallsBowled: number // total legal deliveries
  maidens: number
  runsConceded: number
  wickets: number
  economy: number
  dotBalls: number
  wides: number
  noBalls: number
}

export interface PartnershipInfo {
  runs: number
  balls: number
  batter1Id: string
  batter2Id: string
  batter1Runs: number
  batter2Runs: number
}

export interface OverSummary {
  overNumber: number
  bowlerId: string
  runs: number
  wickets: number
  balls: string[] // e.g., ['1', '0', '4', 'W', '.', '6']
}

export interface InningsState {
  inningsNo: number
  battingTeam: 'A' | 'B'
  totalRuns: number
  totalWickets: number
  totalOvers: string // e.g., "9.3"
  completedOvers: number
  ballsInCurrentOver: number
  totalLegalBalls: number
  
  currentRunRate: number
  requiredRunRate: number | null // only for 2nd innings
  target: number | null // only for 2nd innings
  
  strikerId: string | null
  nonStrikerId: string | null
  currentBowlerId: string | null
  lastCompletedOverBowlerId: string | null
  
  batterStats: Map<string, BatterStats>
  bowlerFigures: Map<string, BowlerFigures>
  
  currentPartnership: PartnershipInfo | null
  partnerships: PartnershipInfo[]
  
  overSummaries: OverSummary[]
  currentOverBalls: string[] // balls in current over for display
  
  extras: {
    wides: number
    noBalls: number
    byes: number
    legByes: number
    penalties: number
    total: number
  }
  
  fallOfWickets: Array<{
    wicketNumber: number
    runs: number
    overs: string
    playerId: string
  }>
  
  isFreeHit: boolean
  isOverComplete: boolean
  dismissedBatterIds: string[]
  notOutBatterIds: string[]
  
  isInningsComplete: boolean
  inningsCompleteReason: 'ALL_OUT' | 'OVERS_COMPLETE' | 'TARGET_CHASED' | null
}

export interface MatchState {
  matchId: string
  teamAName: string
  teamBName: string
  oversLimit: number
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'INNINGS_BREAK' | 'COMPLETED' | 'ABANDONED'
  currentInnings: number
  tossWinner: string | null
  tossDecision: 'BAT' | 'BOWL' | null
  
  innings: InningsState[]
  
  result: string | null // e.g., "Team A won by 5 wickets"
}

// === Delivery Input (from Scorer UI) ===
export interface DeliveryInput {
  matchId: string
  inningsNo: number
  strikerId: string
  nonStrikerId: string
  bowlerId: string
  
  runsOffBat: number
  extraType: ExtraType
  extras: number
  
  isWicket: boolean
  wicketType: WicketType
  dismissedPlayerId: string | null
  fielderId: string | null
  
  shotX: number | null
  shotY: number | null
  shotZone: ShotZone | null
}

export interface PlayerInfo {
  id: string
  name: string
  battingStyle?: string
  bowlingStyle?: string
}
