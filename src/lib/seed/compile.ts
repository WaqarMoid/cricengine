/**
 * Scoresheet compiler + validator for historical match records.
 *
 * BALL GRAMMAR (one token per delivery, tokens separated by spaces)
 *   .            dot ball                     (0 is accepted too)
 *   1 2 3 4 6    runs off the bat             (5 is rejected)
 *   wd           wide, 1 run                  wd+1 .. wd+4  wide + extra runs (wd+4 = 5 wides)
 *   nb           no-ball, nothing off the bat nb+1 .. nb+6  no-ball + runs off the bat
 *   b1..b4       byes                         lb1..lb4      leg byes
 *   W:b          bowled                       W:lbw         leg before wicket
 *   W:c:P12      caught by P12 (bowler's own key = caught & bowled)
 *   W:st:P12     stumped by P12 (the keeper)   W:hw          hit wicket
 *   W:ro:P12[:r][:ns]  run out by P12; r = runs completed before the run out (0-3),
 *                      ":ns" = the NON-striker was run out (default: striker)
 *   wd+W:st:P12  stumped off a wide           wd+W:ro:P12[:ns]  run out off a wide
 *   nb+W:ro:P12[:r][:ns] run out off a no-ball
 *   Any scoring token may end with @ZONE (e.g. 4@COVER) to pin the wagon-wheel zone:
 *   FINE_LEG SQUARE_LEG MID_WICKET LONG_ON LONG_OFF COVER POINT THIRD_MAN
 *
 * The compiler derives striker / non-striker (strike rotates on odd runs and at
 * the end of every over, new batter replaces the dismissed one), over and ball
 * numbers, timestamps and shot coordinates, then validates everything against
 * the Laws used by the live scorer (Law 21.7 consecutive overs, Law 25 dismissed
 * batters, free-hit dismissals, bowler quotas, innings termination).
 */
import { BallEvent, ShotZone } from '../engine/types'
import { summarizeMatch, MatchSummary } from '../engine/match-summary'
import { computeStandings, StandingRow, TournamentMatchInput } from '../tournament/standings'
import { uuidFromKey, pinFromKey, rng, seedFromKey } from './ids'
import { Scoresheet, SeedOneOff, SeedSetup, SeedTournament, ScoresheetInnings } from './types'

export interface Issue {
  level: 'error' | 'warning'
  where: string
  message: string
}

export interface CompiledPlayer {
  id: string
  key: string
  name: string
  battingStyle: string
  bowlingStyle: string
}

export interface CompiledTeam {
  id: string
  key: string
  tournamentId: string
  name: string
  shortName: string
  groupName: string
  captainId: string | null
  keeperId: string | null
  color: string | null
  playerIds: string[]
}

export interface CompiledTournament {
  id: string
  key: string
  name: string
  shortName: string
  season: string
  venue: string
  description: string
  oversPerMatch: number
  maxPlayersPerTeam: number
  maxOversPerBowler: number
  qualifyPerGroup: number
  startDate: string
  endDate: string
  teams: CompiledTeam[]
}

export interface CompiledMatch {
  id: string
  key: string
  tournamentId: string | null
  stage: string
  groupName: string | null
  matchNumber: number | null
  label: string
  teamAId: string | null
  teamBId: string | null
  teamAName: string
  teamBName: string
  teamAPlayerIds: string[]
  teamBPlayerIds: string[]
  oversLimit: number
  status: 'SCHEDULED' | 'COMPLETED'
  tossWinner: string | null
  tossDecision: 'BAT' | 'BOWL' | null
  currentInnings: number
  scorerPin: string
  scheduledAt: string
  venue: string
  resultText: string | null
}

export type CompiledEvent = Omit<BallEvent, 'sequenceNo'> & { sequenceNo: number }

export interface CompileOutput {
  players: CompiledPlayer[]
  tournaments: CompiledTournament[]
  matches: CompiledMatch[]
  events: Record<string, CompiledEvent[]> // by match id
  summaries: Record<string, MatchSummary> // by match id
  standings: Record<string, Record<string, StandingRow[]>> // by tournament key
  issues: Issue[]
}

const ZONES: Array<{ name: ShotZone; angle: number }> = [
  { name: 'THIRD_MAN', angle: -67.5 },
  { name: 'POINT', angle: -22.5 },
  { name: 'COVER', angle: 22.5 },
  { name: 'LONG_OFF', angle: 67.5 },
  { name: 'LONG_ON', angle: 112.5 },
  { name: 'MID_WICKET', angle: 157.5 },
  { name: 'SQUARE_LEG', angle: 202.5 },
  { name: 'FINE_LEG', angle: 247.5 },
]
const ZONE_NAMES = new Set(ZONES.map(z => z.name))

// rough shot distribution for a right-hander: [zone, weight]
const RH_WEIGHTS: Array<[ShotZone, number]> = [
  ['MID_WICKET', 22], ['LONG_ON', 16], ['SQUARE_LEG', 14], ['COVER', 13],
  ['LONG_OFF', 12], ['POINT', 10], ['FINE_LEG', 7], ['THIRD_MAN', 6],
]
const MIRROR: Record<ShotZone, ShotZone> = {
  MID_WICKET: 'COVER', COVER: 'MID_WICKET', LONG_ON: 'LONG_OFF', LONG_OFF: 'LONG_ON',
  SQUARE_LEG: 'POINT', POINT: 'SQUARE_LEG', FINE_LEG: 'THIRD_MAN', THIRD_MAN: 'FINE_LEG',
}

interface ParsedBall {
  raw: string
  kind: 'RUNS' | 'WIDE' | 'NO_BALL' | 'BYE' | 'LEG_BYE'
  runsOffBat: number
  extras: number // engine semantics: wide/no-ball = ADDITIONAL runs beyond the 1 penalty
  wicket: null | {
    type: 'BOWLED' | 'CAUGHT' | 'LBW' | 'RUN_OUT' | 'STUMPED' | 'HIT_WICKET'
    fielder: string | null
    nonStriker: boolean
  }
  zone: ShotZone | null
}

export function parseBall(token: string): ParsedBall | string {
  let t = token.trim()
  let zone: ShotZone | null = null
  const at = t.indexOf('@')
  if (at >= 0) {
    const z = t.slice(at + 1).toUpperCase() as ShotZone
    if (!ZONE_NAMES.has(z)) return `unknown wagon-wheel zone "${t.slice(at + 1)}"`
    zone = z
    t = t.slice(0, at)
  }
  const base: ParsedBall = { raw: token, kind: 'RUNS', runsOffBat: 0, extras: 0, wicket: null, zone }

  if (t === '.' || t === '0') return base
  if (/^[1-6]$/.test(t)) {
    if (t === '5') return '"5" off the bat is not allowed (use 4 + overthrow as separate thinking, or 4/6)'
    return { ...base, runsOffBat: Number(t) }
  }
  let m = t.match(/^wd(?:\+([1-4]))?$/)
  if (m) return { ...base, kind: 'WIDE', extras: m[1] ? Number(m[1]) : 0 }
  m = t.match(/^nb(?:\+([1-6]))?$/)
  if (m) {
    if (m[1] === '5') return 'nb+5 is not allowed'
    return { ...base, kind: 'NO_BALL', runsOffBat: m[1] ? Number(m[1]) : 0 }
  }
  m = t.match(/^(lb|b)([1-4])$/)
  if (m) return { ...base, kind: m[1] === 'b' ? 'BYE' : 'LEG_BYE', extras: Number(m[2]) }

  // wickets, optionally on a wide / no-ball
  m = t.match(/^(wd\+|nb\+)?W:(.+)$/)
  if (m) {
    const pre = m[1]
    const parts = m[2].split(':')
    const kindCode = parts[0]
    const out: ParsedBall = { ...base }
    if (pre === 'wd+') out.kind = 'WIDE'
    if (pre === 'nb+') out.kind = 'NO_BALL'
    const needFielder = (p: string | undefined) => (p && /^[A-Za-z0-9_-]+$/.test(p) ? p : null)
    switch (kindCode) {
      case 'b': case 'bowled':
        if (pre) return `${t}: bowled cannot happen on a ${pre === 'wd+' ? 'wide' : 'no-ball'}`
        out.wicket = { type: 'BOWLED', fielder: null, nonStriker: false }; break
      case 'lbw':
        if (pre) return `${t}: lbw cannot happen on a ${pre === 'wd+' ? 'wide' : 'no-ball'}`
        out.wicket = { type: 'LBW', fielder: null, nonStriker: false }; break
      case 'hw':
        if (pre === 'nb+') return `${t}: hit wicket cannot happen on a no-ball`
        out.wicket = { type: 'HIT_WICKET', fielder: null, nonStriker: false }; break
      case 'c': {
        if (pre) return `${t}: caught cannot happen on a ${pre === 'wd+' ? 'wide' : 'no-ball'}`
        const f = needFielder(parts[1]); if (!f) return `${t}: caught needs a fielder key, e.g. W:c:P12`
        out.wicket = { type: 'CAUGHT', fielder: f, nonStriker: false }; break
      }
      case 'st': {
        if (pre === 'nb+') return `${t}: stumped cannot happen on a no-ball`
        const f = needFielder(parts[1]); if (!f) return `${t}: stumped needs the keeper key, e.g. W:st:P12`
        out.wicket = { type: 'STUMPED', fielder: f, nonStriker: false }; break
      }
      case 'ro': {
        const f = needFielder(parts[1]); if (!f) return `${t}: run out needs a fielder key, e.g. W:ro:P12`
        let completed = 0; let ns = false
        for (const p of parts.slice(2)) {
          if (p === 'ns') ns = true
          else if (/^[0-3]$/.test(p)) completed = Number(p)
          else return `${t}: unexpected run-out part "${p}"`
        }
        if (pre === 'wd+') out.extras = completed
        else out.runsOffBat = completed
        out.wicket = { type: 'RUN_OUT', fielder: f, nonStriker: ns }; break
      }
      default:
        return `${t}: unknown dismissal "${kindCode}"`
    }
    return out
  }
  return `unrecognised ball token "${token}"`
}

function pickZone(r: () => number, leftHanded: boolean, runs: number): ShotZone {
  let weights = RH_WEIGHTS
  if (runs === 6) weights = [['LONG_ON', 30], ['MID_WICKET', 28], ['LONG_OFF', 18], ['SQUARE_LEG', 14], ['COVER', 6], ['FINE_LEG', 4]]
  const total = weights.reduce((s, w) => s + w[1], 0)
  let x = r() * total
  let z: ShotZone = weights[0][0]
  for (const [name, w] of weights) { if ((x -= w) <= 0) { z = name; break } }
  return leftHanded ? MIRROR[z] : z
}

function shotCoords(r: () => number, zone: ShotZone, runs: number) {
  const base = ZONES.find(z => z.name === zone)!.angle
  const angle = ((base + (r() - 0.5) * 40) * Math.PI) / 180
  const dist = runs >= 4 ? 0.93 + r() * 0.06 : runs === 3 ? 0.72 + r() * 0.12 : runs === 2 ? 0.55 + r() * 0.15 : 0.25 + r() * 0.25
  const round = (v: number) => Math.max(-1, Math.min(1, Math.round(v * 1000) / 1000))
  return { x: round(Math.cos(angle) * dist), y: round(Math.sin(angle) * dist) }
}

interface InningsContext {
  where: string
  inningsNo: 1 | 2
  matchId: string
  battingKeys: string[]
  fieldingKeys: string[]
  keeperKey: string | null
  oversLimit: number
  maxOversPerBowler: number
  target: number | null
  startMs: number
  playersByKey: Map<string, CompiledPlayer>
  rand: () => number
}

interface InningsOut {
  events: CompiledEvent[]
  runs: number
  wickets: number
  legalBalls: number
  endMs: number
}

function compileInnings(sheet: ScoresheetInnings, ctx: InningsContext, issues: Issue[], seqStart: number): InningsOut | null {
  const err = (message: string) => issues.push({ level: 'error', where: ctx.where, message })
  const warn = (message: string) => issues.push({ level: 'warning', where: ctx.where, message })
  const errorsBefore = issues.filter(i => i.level === 'error').length
  const name = (k: string) => ctx.playersByKey.get(k)?.name ?? k

  // batting order must be exactly the batting side
  const order = sheet.battingOrder || []
  const orderSet = new Set(order)
  if (orderSet.size !== order.length) err(`battingOrder has duplicate players`)
  const missing = ctx.battingKeys.filter(k => !orderSet.has(k))
  const extra = order.filter(k => !ctx.battingKeys.includes(k))
  if (missing.length || extra.length) {
    err(`battingOrder must list exactly the ${ctx.battingKeys.length} players of the batting side` +
      (missing.length ? `; missing ${missing.join(', ')}` : '') +
      (extra.length ? `; not in this side: ${extra.join(', ')}` : ''))
    return null
  }
  const unknown = [...order, ...ctx.fieldingKeys].filter(k => !ctx.playersByKey.has(k))
  if (unknown.length) { err(`unknown player keys: ${unknown.join(', ')}`); return null }
  if (!Array.isArray(sheet.overs) || sheet.overs.length === 0) { err('innings has no overs'); return null }
  if (sheet.overs.length > ctx.oversLimit) err(`innings has ${sheet.overs.length} overs but the limit is ${ctx.oversLimit}`)

  const maxWickets = order.length - 1
  let striker = order[0]
  let nonStriker = order[1]
  let nextIdx = 2
  const out = new Set<string>()
  let runs = 0, wickets = 0, legal = 0
  let freeHit = false
  let ended: null | 'ALL_OUT' | 'TARGET' | 'OVERS' = null
  let prevBowler: string | null = null
  const oversBy = new Map<string, number>()
  const events: CompiledEvent[] = []
  let t = ctx.startMs
  const stumpers = new Set<string>()

  for (let o = 0; o < sheet.overs.length; o++) {
    const over = sheet.overs[o]
    const ow = `over ${o + 1}`
    if (ended) { err(`${ow}: innings already ended (${ended === 'TARGET' ? 'target reached' : ended === 'ALL_OUT' ? 'all out' : 'overs complete'}) — delete this over`); break }
    const bowler = over.bowler
    if (!ctx.fieldingKeys.includes(bowler)) { err(`${ow}: bowler ${bowler} is not in the fielding side`); return null }
    if (prevBowler === bowler) err(`${ow}: ${bowler} (${name(bowler)}) bowls consecutive overs (Law 21.7)`)
    const bowled = (oversBy.get(bowler) || 0) + 1
    oversBy.set(bowler, bowled)
    if (bowled > ctx.maxOversPerBowler) err(`${ow}: ${bowler} (${name(bowler)}) bowls over number ${bowled} — max ${ctx.maxOversPerBowler} per bowler`)
    prevBowler = bowler

    const tokens = String(over.balls || '').trim().split(/\s+/).filter(Boolean)
    let legalInOver = 0
    let illegalInOver = 0
    for (let bi = 0; bi < tokens.length; bi++) {
      const bw = `${ow} ball "${tokens[bi]}" (#${bi + 1})`
      if (ended) { err(`${bw}: innings already ended (${ended === 'TARGET' ? 'target reached' : 'all out'}) — remove the remaining balls`); break }
      if (legalInOver === 6) { err(`${ow}: more than 6 legal balls`); break }
      const p = parseBall(tokens[bi])
      if (typeof p === 'string') { err(`${bw}: ${p}`); return null }

      const isLegal = p.kind !== 'WIDE' && p.kind !== 'NO_BALL'
      if (p.wicket) {
        if (freeHit && p.wicket.type !== 'RUN_OUT') err(`${bw}: only a run out is possible on a free hit (previous ball was a no-ball)`)
        if (p.wicket.fielder && !ctx.fieldingKeys.includes(p.wicket.fielder)) err(`${bw}: fielder ${p.wicket.fielder} is not in the fielding side`)
        if (p.wicket.type === 'STUMPED') {
          stumpers.add(p.wicket.fielder!)
          if (ctx.keeperKey && p.wicket.fielder !== ctx.keeperKey) warn(`${bw}: stumped by ${p.wicket.fielder} but the side's keeper is ${ctx.keeperKey}`)
          if (p.wicket.fielder === bowler) err(`${bw}: the bowler cannot stump the batter`)
        }
        if (p.wicket.type === 'CAUGHT' && ctx.keeperKey && p.wicket.fielder === ctx.keeperKey && bowler === ctx.keeperKey) err(`${bw}: keeper cannot be bowling`)
      }

      const dismissed = p.wicket ? (p.wicket.nonStriker ? nonStriker : striker) : null
      const ballRuns = (p.kind === 'WIDE' ? 1 + p.extras : p.kind === 'NO_BALL' ? 1 + p.runsOffBat : p.kind === 'RUNS' ? p.runsOffBat : p.extras)

      // shot telemetry for runs off the bat
      let shotX: number | null = null, shotY: number | null = null, shotZone: ShotZone | null = null
      const batRuns = p.kind === 'RUNS' || p.kind === 'NO_BALL' ? p.runsOffBat : 0
      if (batRuns > 0) {
        const lefty = ctx.playersByKey.get(striker)?.battingStyle === 'LEFT_HAND'
        shotZone = p.zone ?? pickZone(ctx.rand, lefty, batRuns)
        const c = shotCoords(ctx.rand, shotZone, batRuns)
        shotX = c.x; shotY = c.y
      }

      const ballNo = isLegal ? legalInOver + 1 : legalInOver
      events.push({
        id: uuidFromKey(`ball:${ctx.matchId}:${ctx.inningsNo}:${events.length}`),
        matchId: ctx.matchId,
        inningsNo: ctx.inningsNo,
        overNumber: o,
        ballInOver: ballNo,
        sequenceNo: seqStart + events.length,
        strikerId: ctx.playersByKey.get(striker)!.id,
        nonStrikerId: ctx.playersByKey.get(nonStriker)!.id,
        bowlerId: ctx.playersByKey.get(bowler)!.id,
        runsOffBat: p.kind === 'BYE' || p.kind === 'LEG_BYE' || p.kind === 'WIDE' ? 0 : p.runsOffBat,
        extras: p.kind === 'RUNS' ? 0 : p.kind === 'NO_BALL' ? 0 : p.extras,
        extraType: p.kind === 'RUNS' ? 'NONE' : p.kind,
        isLegalDelivery: isLegal,
        isWicket: !!p.wicket,
        wicketType: p.wicket ? p.wicket.type : 'NONE',
        dismissedPlayerId: dismissed ? ctx.playersByKey.get(dismissed)!.id : null,
        fielderId: p.wicket?.fielder ? ctx.playersByKey.get(p.wicket.fielder)?.id ?? null : null,
        shotX, shotY, shotZone,
        pitchLine: null,
        pitchLength: null,
        isUndone: false,
        createdAt: new Date(t).toISOString(),
      })
      t += isLegal ? 36_000 + Math.floor(ctx.rand() * 14_000) : 25_000

      runs += ballRuns
      if (isLegal) { legal++; legalInOver++ } else illegalInOver++

      // strike rotation (same rule as the engine)
      const rotateRuns = p.kind === 'BYE' || p.kind === 'LEG_BYE' || p.kind === 'WIDE' ? p.extras : p.runsOffBat
      if (rotateRuns % 2 === 1) { const s = striker; striker = nonStriker; nonStriker = s }

      if (p.wicket && dismissed) {
        wickets++
        out.add(dismissed)
        const replacement = nextIdx < order.length ? order[nextIdx++] : null
        if (wickets >= maxWickets || !replacement) {
          ended = 'ALL_OUT'
        } else {
          if (striker === dismissed) striker = replacement
          else nonStriker = replacement
        }
      }

      freeHit = p.kind === 'NO_BALL' ? true : (isLegal ? false : freeHit)

      if (ctx.target !== null && runs >= ctx.target) {
        if (ended === 'ALL_OUT') err(`${bw}: the winning run and the last wicket fall on the same ball — make the last ball a clean scoring shot`)
        ended = 'TARGET'
      }
      if (!ended && legal >= ctx.oversLimit * 6) ended = 'OVERS'
      if (legalInOver === 6) {
        const s = striker; striker = nonStriker; nonStriker = s
        t += 60_000 + Math.floor(ctx.rand() * 30_000)
      }
    }
    const isLastOver = o === sheet.overs.length - 1
    if (legalInOver < 6 && !(isLastOver && ended && ended !== 'OVERS')) {
      err(`${ow}: has ${legalInOver} legal balls — every over needs exactly 6 legal deliveries (wides and no-balls are re-bowled)`)
    }
    if (illegalInOver > 4) warn(`${ow}: ${illegalInOver} wides/no-balls in one over looks unrealistic`)
    if (ctx.keeperKey && bowler === ctx.keeperKey && ctx.fieldingKeys.length >= 6) warn(`${ow}: the designated keeper ${ctx.keeperKey} is bowling`)
  }

  if (!ended) {
    if (ctx.inningsNo === 1) err(`innings ended after ${Math.floor(legal / 6)}.${legal % 6} overs with ${wickets} wickets — 1st innings must last all ${ctx.oversLimit} overs or until all out`)
    else err(`chase stopped at ${runs}/${wickets} after ${Math.floor(legal / 6)}.${legal % 6} overs — it must continue until target (${ctx.target}), all out, or ${ctx.oversLimit} overs`)
  }
  if (stumpers.size > 1) warn(`stumpings by more than one fielder (${[...stumpers].join(', ')}) — only the keeper stumps`)

  if (issues.filter(i => i.level === 'error').length > errorsBefore) return null
  return { events, runs, wickets, legalBalls: legal, endMs: t }
}

interface SideSpec {
  name: string
  keys: string[]
  keeper: string | null
  teamId: string | null
  teamKey: string // "A" / "B" for one-offs or team key
}

function compileMatch(
  where: string,
  matchId: string,
  sheet: Scoresheet,
  sideA: SideSpec,
  sideB: SideSpec,
  oversLimit: number,
  maxOversPerBowler: number,
  startIso: string,
  playersByKey: Map<string, CompiledPlayer>,
  issues: Issue[],
): { events: CompiledEvent[]; tossWinner: string; tossDecision: 'BAT' | 'BOWL'; aBatsFirst: boolean; orderA: string[]; orderB: string[] } | null {
  const err = (message: string) => issues.push({ level: 'error', where, message })
  if (!sheet.toss || !sheet.toss.winner || !['BAT', 'BOWL'].includes(sheet.toss.decision)) {
    err('toss must be { "winner": <team key>, "decision": "BAT" | "BOWL" }'); return null
  }
  const tw = sheet.toss.winner
  if (tw !== sideA.teamKey && tw !== sideB.teamKey) {
    err(`toss winner "${tw}" must be "${sideA.teamKey}" or "${sideB.teamKey}"`); return null
  }
  if (!Array.isArray(sheet.innings) || sheet.innings.length !== 2) { err('scoresheet needs exactly 2 innings'); return null }
  const aWonToss = tw === sideA.teamKey
  const aBatsFirst = (aWonToss && sheet.toss.decision === 'BAT') || (!aWonToss && sheet.toss.decision === 'BOWL')
  const first = aBatsFirst ? sideA : sideB
  const second = aBatsFirst ? sideB : sideA
  const rand = rng(seedFromKey(matchId))
  const start = Date.parse(startIso)
  if (Number.isNaN(start)) { err(`bad date "${startIso}"`); return null }

  const base = { matchId, oversLimit, maxOversPerBowler, playersByKey, rand }
  const i1 = compileInnings(sheet.innings[0], {
    ...base, where: `${where} · 1st innings (${first.name} batting)`, inningsNo: 1,
    battingKeys: first.keys, fieldingKeys: second.keys, keeperKey: second.keeper, target: null, startMs: start,
  }, issues, 1)
  if (!i1) return null
  const i2 = compileInnings(sheet.innings[1], {
    ...base, where: `${where} · 2nd innings (${second.name} chasing ${i1.runs + 1})`, inningsNo: 2,
    battingKeys: second.keys, fieldingKeys: first.keys, keeperKey: first.keeper, target: i1.runs + 1,
    startMs: i1.endMs + 12 * 60_000,
  }, issues, i1.events.length + 1)
  if (!i2) return null

  const orderFirst = sheet.innings[0].battingOrder
  const orderSecond = sheet.innings[1].battingOrder
  return {
    events: [...i1.events, ...i2.events],
    tossWinner: aWonToss ? sideA.name : sideB.name,
    tossDecision: sheet.toss.decision,
    aBatsFirst,
    orderA: aBatsFirst ? orderFirst : orderSecond,
    orderB: aBatsFirst ? orderSecond : orderFirst,
  }
}

function realismChecks(where: string, summary: MatchSummary, oversLimit: number, events: CompiledEvent[], issues: Issue[]) {
  const warn = (message: string) => issues.push({ level: 'warning', where, message })
  for (const [idx, st] of summary.states.entries()) {
    const balls = st.totalLegalBalls
    const rpo = balls ? st.totalRuns / (balls / 6) : 0
    const fullInnings = idx === 0 || st.inningsCompleteReason !== 'TARGET_CHASED'
    if (fullInnings && balls >= 12 && (rpo < 4 || rpo > 15)) warn(`innings ${idx + 1}: run rate ${rpo.toFixed(2)} is outside a realistic 4–15 range`)
    if (st.extras.total > Math.max(8, oversLimit * 1.6)) warn(`innings ${idx + 1}: ${st.extras.total} extras is a lot for ${oversLimit} overs`)
    for (const b of st.batterStats.values()) {
      if (b.ballsFaced >= 6 && b.strikeRate > 320) warn(`innings ${idx + 1}: a batter strikes at ${b.strikeRate.toFixed(0)}`)
      if (b.runs > oversLimit * 9) warn(`innings ${idx + 1}: a batter scored ${b.runs} in a ${oversLimit}-over game`)
    }
  }
  const sixes = events.filter(e => e.runsOffBat === 6).length
  if (sixes > oversLimit * 2.2) warn(`${sixes} sixes in the match is unrealistic for ${oversLimit} overs a side`)
}

function checkExpected(where: string, sheet: Scoresheet, summary: MatchSummary, keyOf: (side: 'A' | 'B') => string, issues: Issue[]) {
  if (!sheet.expected || !summary.result) return
  const actualWinner = summary.result.winner ? keyOf(summary.result.winner) : null
  const m = summary.result.marginRuns !== null && summary.result.winner
    ? `${summary.result.marginRuns} runs`
    : summary.result.marginWickets !== null ? `${summary.result.marginWickets} wickets` : 'tie'
  const norm = (s: string) => s.toLowerCase().replace(/\bruns?\b/, 'runs').replace(/\bwickets?\b/, 'wickets').replace(/\s+/g, ' ').trim()
  if ((sheet.expected.winner ?? null) !== actualWinner || norm(sheet.expected.margin || '') !== norm(m)) {
    issues.push({ level: 'warning', where, message: `expected says ${sheet.expected.winner ?? 'tie'} by ${sheet.expected.margin}, but the balls add up to: ${summary.result.text}` })
  }
}

/** Compile setup + scoresheets. Never throws for bad data; problems are returned as issues. */
export function compileSeed(setup: SeedSetup, sheets: Scoresheet[]): CompileOutput {
  const issues: Issue[] = []
  const players: CompiledPlayer[] = []
  const playersByKey = new Map<string, CompiledPlayer>()
  for (const p of setup.players || []) {
    if (playersByKey.has(p.key)) { issues.push({ level: 'error', where: 'setup.players', message: `duplicate player key ${p.key}` }); continue }
    const cp: CompiledPlayer = {
      id: uuidFromKey(`player:${p.key}`), key: p.key, name: p.name,
      battingStyle: p.bat || 'RIGHT_HAND', bowlingStyle: p.bowl || 'NONE',
    }
    players.push(cp); playersByKey.set(p.key, cp)
  }

  const sheetsByFixture = new Map<string, Scoresheet>()
  for (const s of sheets) {
    if (!s || !s.fixture) { issues.push({ level: 'error', where: 'scoresheets', message: 'a scoresheet is missing its "fixture" key' }); continue }
    if (sheetsByFixture.has(s.fixture)) issues.push({ level: 'error', where: s.fixture, message: 'two scoresheets for the same fixture' })
    sheetsByFixture.set(s.fixture, s)
  }
  const usedSheets = new Set<string>()

  const tournaments: CompiledTournament[] = []
  const matches: CompiledMatch[] = []
  const events: Record<string, CompiledEvent[]> = {}
  const summaries: Record<string, MatchSummary> = {}
  const standingsOut: Record<string, Record<string, StandingRow[]>> = {}

  const checkKeys = (where: string, keys: string[]) => {
    for (const k of keys) if (!playersByKey.has(k)) issues.push({ level: 'error', where, message: `unknown player key ${k}` })
  }

  // ---------- tournaments ----------
  for (const t of setup.tournaments || []) {
    const tId = uuidFromKey(`tournament:${t.key}`)
    const teams: CompiledTeam[] = []
    const teamByKey = new Map<string, CompiledTeam & { keys: string[]; keeperKey: string | null }>()
    const seenPlayers = new Map<string, string>()
    for (const tm of t.teams) {
      const where = `${t.key} · team ${tm.key}`
      checkKeys(where, tm.players)
      if (tm.players.length > t.maxPlayersPerTeam) issues.push({ level: 'error', where, message: `${tm.players.length} players, max is ${t.maxPlayersPerTeam}` })
      if (!tm.players.includes(tm.captain)) issues.push({ level: 'error', where, message: `captain ${tm.captain} is not in the squad` })
      for (const k of tm.players) {
        if (seenPlayers.has(k)) issues.push({ level: 'error', where, message: `${k} also plays for ${seenPlayers.get(k)}` })
        seenPlayers.set(k, tm.key)
      }
      const ct = {
        id: uuidFromKey(`team:${t.key}:${tm.key}`), key: tm.key, tournamentId: tId, name: tm.name,
        shortName: tm.shortName, groupName: tm.group, captainId: playersByKey.get(tm.captain)?.id ?? null,
        keeperId: tm.keeper ? playersByKey.get(tm.keeper)?.id ?? null : null, color: tm.color ?? null,
        playerIds: tm.players.filter(k => playersByKey.has(k)).map(k => playersByKey.get(k)!.id),
        keys: tm.players, keeperKey: tm.keeper ?? null,
      }
      teams.push(ct); teamByKey.set(tm.key, ct)
    }
    tournaments.push({
      id: tId, key: t.key, name: t.name, shortName: t.shortName, season: t.season, venue: t.venue,
      description: t.description ?? '', oversPerMatch: t.oversPerMatch, maxPlayersPerTeam: t.maxPlayersPerTeam,
      maxOversPerBowler: t.maxOversPerBowler, qualifyPerGroup: t.qualifyPerGroup, startDate: t.startDate,
      endDate: t.endDate,
      teams: teams.map(x => {
        const { keys: _k, keeperKey: _kk, ...rest } = x as CompiledTeam & { keys: string[]; keeperKey: string | null }
        void _k; void _kk
        return rest
      }),
    })

    const tMatches: TournamentMatchInput[] = []
    const fixtureWinner = new Map<string, string>() // fixture key -> team key
    let standings: Record<string, StandingRow[]> = {}
    const stageOrder = { GROUP: 0, SEMI_FINAL: 1, FINAL: 2 } as const
    const fixtures = [...t.fixtures].sort((a, b) => stageOrder[a.stage] - stageOrder[b.stage] || a.matchNo - b.matchNo)
    let groupsComputed = false

    for (const fx of fixtures) {
      const where = `${t.key} · ${fx.key} (${fx.label})`
      if (fx.stage !== 'GROUP' && !groupsComputed) {
        standings = computeStandings(teams, tMatches, t.qualifyPerGroup)
        groupsComputed = true
      }
      // resolve seeds
      const groupDone = (() => {
        const n = new Map<string, number>()
        t.teams.forEach(x => n.set(x.group, (n.get(x.group) || 0) + 1))
        let exp = 0; n.forEach(v => { exp += (v * (v - 1)) / 2 })
        return tMatches.filter(m => m.stage === 'GROUP' && m.summary.isComplete).length >= exp
      })()
      const resolve = (seed: string): string | null => {
        if (teamByKey.has(seed)) return seed
        const g = seed.match(/^([A-Z])(\d)$/)
        if (g) {
          if (!groupDone) return null
          const row = standings[g[1]]?.[Number(g[2]) - 1]
          return row ? teams.find(x => x.id === row.teamId)!.key : null
        }
        const w = seed.match(/^W:(.+)$/)
        if (w) return fixtureWinner.get(w[1]) ?? null
        issues.push({ level: 'error', where, message: `cannot resolve team "${seed}"` })
        return null
      }
      const aKey = resolve(fx.teamA)
      const bKey = resolve(fx.teamB)
      const sheet = sheetsByFixture.get(fx.key)
      if (sheet) usedSheets.add(fx.key)
      if (!aKey || !bKey) {
        if (sheet) issues.push({ level: 'warning', where, message: `scoresheet ignored: teams for ${fx.teamA} v ${fx.teamB} are not decided yet (finish the earlier stage first)` })
        continue // knockout not yet decided: not inserted, shown as projected bracket
      }
      const A = teamByKey.get(aKey)!
      const B = teamByKey.get(bKey)!
      const matchId = uuidFromKey(`match:${fx.key}`)
      const cm: CompiledMatch = {
        id: matchId, key: fx.key, tournamentId: tId, stage: fx.stage, groupName: fx.stage === 'GROUP' ? (fx.group ?? A.groupName) : null,
        matchNumber: fx.matchNo, label: fx.label, teamAId: A.id, teamBId: B.id, teamAName: A.name, teamBName: B.name,
        teamAPlayerIds: A.playerIds, teamBPlayerIds: B.playerIds, oversLimit: t.oversPerMatch, status: 'SCHEDULED',
        tossWinner: null, tossDecision: null, currentInnings: 1, scorerPin: pinFromKey(fx.key), scheduledAt: fx.date,
        venue: t.venue, resultText: null,
      }
      if (fx.stage === 'GROUP' && A.groupName !== B.groupName) issues.push({ level: 'error', where, message: `${A.key} and ${B.key} are in different groups` })

      let summary: MatchSummary | null = null
      if (sheet) {
        const res = compileMatch(where, matchId, sheet,
          { name: A.name, keys: A.keys, keeper: A.keeperKey, teamId: A.id, teamKey: A.key },
          { name: B.name, keys: B.keys, keeper: B.keeperKey, teamId: B.id, teamKey: B.key },
          t.oversPerMatch, t.maxOversPerBowler, fx.date, playersByKey, issues)
        if (res) {
          cm.status = 'COMPLETED'
          cm.tossWinner = res.tossWinner
          cm.tossDecision = res.tossDecision
          cm.currentInnings = 2
          cm.teamAPlayerIds = res.orderA.map(k => playersByKey.get(k)!.id)
          cm.teamBPlayerIds = res.orderB.map(k => playersByKey.get(k)!.id)
          events[matchId] = res.events
          summary = summarizeMatch({ ...cm }, res.events as BallEvent[])
          cm.resultText = summary.result?.text ?? null
          if (fx.stage !== 'GROUP' && summary.result?.isTie) issues.push({ level: 'error', where, message: 'knockout matches cannot end in a tie (no super-over support) — change the last over' })
          if (summary.result?.winner) fixtureWinner.set(fx.key, summary.result.winner === 'A' ? A.key : B.key)
          realismChecks(where, summary, t.oversPerMatch, res.events, issues)
          checkExpected(where, sheet, summary, s => (s === 'A' ? A.key : B.key), issues)
        }
      }
      if (!summary) summary = summarizeMatch({ ...cm }, [])
      summaries[matchId] = summary
      matches.push(cm)
      tMatches.push({ id: matchId, stage: fx.stage, groupName: cm.groupName, matchNumber: fx.matchNo, teamAId: A.id, teamBId: B.id, oversLimit: t.oversPerMatch, summary })
    }
    if (!groupsComputed) standings = computeStandings(teams, tMatches, t.qualifyPerGroup)
    standingsOut[t.key] = standings
  }

  // ---------- one-off matches ----------
  for (const oo of setup.oneOffs || []) {
    const where = `one-off ${oo.key} (${oo.teamA.name} v ${oo.teamB.name})`
    checkKeys(where, [...oo.teamA.players, ...oo.teamB.players])
    const overlap = oo.teamA.players.filter(k => oo.teamB.players.includes(k))
    if (overlap.length) issues.push({ level: 'error', where, message: `players on both sides: ${overlap.join(', ')}` })
    const matchId = uuidFromKey(`match:${oo.key}`)
    const ids = (keys: string[]) => keys.filter(k => playersByKey.has(k)).map(k => playersByKey.get(k)!.id)
    const cm: CompiledMatch = {
      id: matchId, key: oo.key, tournamentId: null, stage: 'ONE_OFF', groupName: null, matchNumber: null, label: oo.label,
      teamAId: null, teamBId: null, teamAName: oo.teamA.name, teamBName: oo.teamB.name,
      teamAPlayerIds: ids(oo.teamA.players), teamBPlayerIds: ids(oo.teamB.players), oversLimit: oo.oversLimit,
      status: 'SCHEDULED', tossWinner: null, tossDecision: null, currentInnings: 1, scorerPin: pinFromKey(oo.key),
      scheduledAt: oo.date, venue: oo.venue, resultText: null,
    }
    const sheet = sheetsByFixture.get(oo.key)
    let summary: MatchSummary | null = null
    if (sheet) {
      usedSheets.add(oo.key)
      const res = compileMatch(where, matchId, sheet,
        { name: oo.teamA.name, keys: oo.teamA.players, keeper: oo.teamA.keeper ?? null, teamId: null, teamKey: 'A' },
        { name: oo.teamB.name, keys: oo.teamB.players, keeper: oo.teamB.keeper ?? null, teamId: null, teamKey: 'B' },
        oo.oversLimit, oo.maxOversPerBowler, oo.date, playersByKey, issues)
      if (res) {
        cm.status = 'COMPLETED'; cm.tossWinner = res.tossWinner; cm.tossDecision = res.tossDecision; cm.currentInnings = 2
        cm.teamAPlayerIds = res.orderA.map(k => playersByKey.get(k)!.id)
        cm.teamBPlayerIds = res.orderB.map(k => playersByKey.get(k)!.id)
        events[matchId] = res.events
        summary = summarizeMatch({ ...cm }, res.events as BallEvent[])
        cm.resultText = summary.result?.text ?? null
        realismChecks(where, summary, oo.oversLimit, res.events, issues)
        checkExpected(where, sheet, summary, s => s, issues)
      }
    }
    if (!summary) continue // a one-off only exists as a record once it has a valid scoresheet
    summaries[matchId] = summary
    matches.push(cm)
  }

  for (const k of sheetsByFixture.keys()) {
    if (!usedSheets.has(k)) issues.push({ level: 'error', where: k, message: 'scoresheet does not match any fixture or one-off key' })
  }

  return { players, tournaments, matches, events, summaries, standings: standingsOut, issues }
}
