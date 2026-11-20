import { describe, it, expect } from 'vitest'
import { compileSeed, parseBall } from '../compile'
import { seedScoresheets, seedSetup } from '@/data/seed'
import type { Scoresheet, SeedSetup } from '../types'
import { calculateInningsState } from '../../engine/scoring-engine'
import type { BallEvent } from '../../engine/types'

// Minimal 4-a-side, 2-over fixture used to probe each rule in isolation
const mini: SeedSetup = {
  version: 1,
  players: ['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4'].map(k => ({ key: k, name: `Player ${k}` })),
  tournaments: [],
  oneOffs: [{
    key: 'T', label: 'Test', date: '2026-10-01T16:00:00+05:30', venue: 'Ground', oversLimit: 2, maxOversPerBowler: 1,
    teamA: { name: 'Alpha', players: ['A1', 'A2', 'A3', 'A4'] },
    teamB: { name: 'Beta', players: ['B1', 'B2', 'B3', 'B4'] },
  }],
}
const sheet = (o1: [string, string][], o2: [string, string][], toss: 'A' | 'B' = 'A'): Scoresheet => ({
  fixture: 'T',
  toss: { winner: toss, decision: 'BAT' },
  innings: [
    { battingOrder: toss === 'A' ? ['A1', 'A2', 'A3', 'A4'] : ['B1', 'B2', 'B3', 'B4'], overs: o1.map(([bowler, balls]) => ({ bowler, balls })) },
    { battingOrder: toss === 'A' ? ['B1', 'B2', 'B3', 'B4'] : ['A1', 'A2', 'A3', 'A4'], overs: o2.map(([bowler, balls]) => ({ bowler, balls })) },
  ],
})
const errors = (s: Scoresheet) => compileSeed(mini, [s]).issues.filter(i => i.level === 'error').map(i => i.message)

describe('ball grammar', () => {
  it('parses runs, extras and dismissals', () => {
    expect(parseBall('4')).toMatchObject({ kind: 'RUNS', runsOffBat: 4 })
    expect(parseBall('wd+2')).toMatchObject({ kind: 'WIDE', extras: 2 })
    expect(parseBall('nb+6')).toMatchObject({ kind: 'NO_BALL', runsOffBat: 6 })
    expect(parseBall('lb1')).toMatchObject({ kind: 'LEG_BYE', extras: 1 })
    expect(parseBall('W:c:P12')).toMatchObject({ wicket: { type: 'CAUGHT', fielder: 'P12', nonStriker: false } })
    expect(parseBall('W:ro:P3:1:ns')).toMatchObject({ runsOffBat: 1, wicket: { type: 'RUN_OUT', fielder: 'P3', nonStriker: true } })
    expect(parseBall('6@LONG_ON')).toMatchObject({ runsOffBat: 6, zone: 'LONG_ON' })
  })
  it('rejects impossible deliveries', () => {
    expect(typeof parseBall('5')).toBe('string')
    expect(typeof parseBall('wd+W:c:P1')).toBe('string') // caught off a wide
    expect(typeof parseBall('nb+W:b')).toBe('string') // bowled off a no-ball
    expect(typeof parseBall('W:c')).toBe('string') // caught without fielder
    expect(typeof parseBall('7')).toBe('string')
  })
})

describe('scoresheet validation', () => {
  const okFirst: [string, string][] = [['B1', '1 . 4 2 . 1'], ['B2', '. 1 1 6 . 2']] // 18 runs
  it('accepts a clean match and computes the result', () => {
    const out = compileSeed(mini, [sheet(okFirst, [['A1', '1 1 . 4 . 1'], ['A2', '2 . 1 W:b . 1']])])
    expect(out.issues.filter(i => i.level === 'error')).toHaveLength(0)
    const m = out.matches[0]
    expect(m.status).toBe('COMPLETED')
    expect(m.resultText).toBe('Alpha won by 7 runs') // 18 v 11
  })
  it('flags an over without six legal balls', () => {
    expect(errors(sheet([['B1', '1 . 4 2 wd 1'], ['B2', '. 1 1 6 . 2']], okFirst)).join()).toMatch(/5 legal balls/)
  })
  it('flags consecutive overs and bowler quota', () => {
    expect(errors(sheet([['B1', '1 . 4 2 . 1'], ['B1', '. 1 1 6 . 2']], okFirst)).join()).toMatch(/consecutive overs/)
  })
  it('flags a fielder from the batting side', () => {
    expect(errors(sheet([['B1', '1 . W:c:A3 2 . 1'], ['B2', '. 1 1 6 . 2']], okFirst)).join()).toMatch(/not in the fielding side/)
  })
  it('flags balls bowled after the target is reached', () => {
    const chase: [string, string][] = [['A1', '6 6 6 1 . .'], ['A2', '1 . . . . .']] // 19 by ball 4 of over 1
    expect(errors(sheet(okFirst, chase)).join()).toMatch(/innings already ended/)
  })
  it('flags a 1st innings that stops early', () => {
    expect(errors(sheet([['B1', '1 . 4 2 . 1']], okFirst)).join()).toMatch(/must last all 2 overs/)
  })
  it('only allows run outs on a free hit', () => {
    expect(errors(sheet([['B1', 'nb W:b . 4 2 . 1'], ['B2', '. 1 1 6 . 2']], okFirst)).join()).toMatch(/free hit/)
  })
  it('ends the innings at all out (n-1 wickets)', () => {
    const out = compileSeed(mini, [sheet([['B1', 'W:b W:b W:b']], [['A1', '1 1 . . . .'], ['A2', '. . . . . .']])])
    expect(out.issues.filter(i => i.level === 'error').map(i => i.message).join()).toMatch(/innings already ended|chase stopped/)
  })
})

describe('derived ball events agree with the live scoring engine', () => {
  it('strike rotation and totals match calculateInningsState', () => {
    const out = compileSeed(mini, [sheet([['B1', '1 . 4 W:c:B2 3 1'], ['B2', 'wd+1 2 lb1 . 6 1 .']], [['A1', '. . 1 . . .'], ['A2', '1 . W:b . . 1']])])
    const m = out.matches[0]
    const ev = out.events[m.id] as BallEvent[]
    const inn1 = calculateInningsState(ev.filter(e => e.inningsNo === 1), 1, 2, null, 4)
    expect(inn1.totalRuns).toBe(1 + 4 + 3 + 1 + 2 + 2 + 1 + 6 + 1)
    expect(inn1.totalWickets).toBe(1)
    // striker of every ball must be one of the two batters at the crease
    for (const e of ev) expect(e.strikerId).not.toBe(e.nonStrikerId)
    // Over 1: A1 1 (swap) · A2 . 4 · A2 caught → A3 in on strike · A3 3 (swap) · A1 1 (swap) → A3 on strike,
    // then the end-of-over swap puts A1 on strike for over 2 with A3 at the other end.
    const id = (k: string) => out.players.find(p => p.key === k)!.id
    const o2first = ev.find(e => e.inningsNo === 1 && e.overNumber === 1)!
    expect(o2first.strikerId).toBe(id('A1'))
    expect(o2first.nonStrikerId).toBe(id('A3'))
    const wicketBall = ev.find(e => e.isWicket && e.inningsNo === 1)!
    expect(wicketBall.dismissedPlayerId).toBe(id('A2'))
  })
})

describe('committed seed data (Hall 12 Phatta League + one-offs)', () => {
  const out = compileSeed(seedSetup, seedScoresheets)

  it('compiles with zero errors', () => {
    const errs = out.issues.filter(i => i.level === 'error')
    if (errs.length) console.log(errs.map(e => `[${e.where}] ${e.message}`).join('\n'))
    expect(errs).toHaveLength(0)
  })
  it('has 8 teams of at most 7 in two groups of four', () => {
    const t = seedSetup.tournaments[0]
    expect(t.teams).toHaveLength(8)
    expect(t.teams.filter(x => x.group === 'A')).toHaveLength(4)
    expect(t.teams.every(x => x.players.length <= 7)).toBe(true)
    expect(t.oversPerMatch).toBe(10)
  })
  it('one-off fixtures are 4–6 overs with 4–5 players a side', () => {
    for (const o of seedSetup.oneOffs) {
      expect(o.oversLimit >= 4 && o.oversLimit <= 6).toBe(true)
      expect(o.teamA.players.length >= 4 && o.teamA.players.length <= 5).toBe(true)
      expect(o.teamB.players.length).toBe(o.teamA.players.length)
    }
  })
  it('every played match obeys over limits and produces a result', () => {
    for (const m of out.matches.filter(x => x.status === 'COMPLETED')) {
      const s = out.summaries[m.id]
      expect(s.result).not.toBeNull()
      for (const inn of s.innings) expect(inn.legalBalls <= m.oversLimit * 6).toBe(true)
    }
  })
  it('semi-finals (when present) are A1 v B2 and B1 v A2 from the computed table', () => {
    const st = out.standings.H12PL
    const sf1 = out.matches.find(m => m.key === 'H12-SF1')
    const sf2 = out.matches.find(m => m.key === 'H12-SF2')
    if (sf1) expect([sf1.teamAName, sf1.teamBName]).toEqual([st.A[0].teamName, st.B[1].teamName])
    if (sf2) expect([sf2.teamAName, sf2.teamBName]).toEqual([st.B[0].teamName, st.A[1].teamName])
  })
})
