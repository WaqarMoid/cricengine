import { describe, it, expect } from 'vitest'
import { computeKnockoutBracket, computeStandings, TeamRef, TournamentMatchInput } from '../standings'
import type { MatchSummary } from '../../engine/match-summary'

const teams: TeamRef[] = [
  { id: 'a1', name: 'Alpha', groupName: 'A' }, { id: 'a2', name: 'Bravo', groupName: 'A' },
  { id: 'b1', name: 'Charlie', groupName: 'B' }, { id: 'b2', name: 'Delta', groupName: 'B' },
]

// Builds a completed 10-over match. first = side batting first.
function match(id: string, aId: string, bId: string, first: 'A' | 'B',
  r1: number, w1: number, b1: number, r2: number, w2: number, b2: number, stage = 'GROUP', allOut2 = false): TournamentMatchInput {
  const second = first === 'A' ? 'B' : 'A'
  const firstWins = r1 > r2
  const tie = r1 === r2
  const summary: MatchSummary = {
    battingFirst: first,
    innings: [
      { side: first, teamName: '', runs: r1, wickets: w1, overs: '', legalBalls: b1, allOut: false, complete: true },
      { side: second, teamName: '', runs: r2, wickets: w2, overs: '', legalBalls: b2, allOut: allOut2, complete: true },
    ],
    result: { winner: tie ? null : firstWins ? first : second, isTie: tie, isNoResult: false, text: tie ? 'Match tied' : 'x', marginRuns: null, marginWickets: null, ballsRemaining: null },
    isComplete: true,
    states: [],
  }
  return { id, stage, groupName: null, matchNumber: Number(id.replace(/\D/g, '')) || 1, teamAId: aId, teamBId: bId, oversLimit: 10, summary }
}

describe('points table', () => {
  it('awards 2 for a win and computes NRR', () => {
    // Alpha 100/4 (10) beat Bravo 80/6 (10)
    const st = computeStandings(teams, [match('m1', 'a1', 'a2', 'A', 100, 4, 60, 80, 6, 60)])
    expect(st.A[0].teamName).toBe('Alpha')
    expect(st.A[0].points).toBe(2)
    expect(st.A[0].nrr).toBe(2) // 10.0 - 8.0
    expect(st.A[1].nrr).toBe(-2)
  })
  it('charges full overs to a side bowled out (ICC rule)', () => {
    // Alpha 90 (10) ; Bravo 45 all out in 5 overs → Bravo faced 10 overs for NRR
    const st = computeStandings(teams, [match('m1', 'a1', 'a2', 'A', 90, 5, 60, 45, 6, 30, 'GROUP', true)])
    expect(st.A[0].nrr).toBe(4.5) // 9.0 - 4.5
  })
  it('a tie gives a point each', () => {
    const st = computeStandings(teams, [match('m1', 'a1', 'a2', 'A', 70, 5, 60, 70, 6, 60)])
    expect(st.A.map(r => r.points)).toEqual([1, 1])
  })
  it('chasing side that wins early is credited only the balls it faced', () => {
    // Bravo 60 (10 ov); Alpha 61/2 in 6 overs
    const st = computeStandings(teams, [match('m1', 'a1', 'a2', 'B', 60, 6, 60, 61, 2, 36)])
    const alpha = st.A.find(r => r.teamName === 'Alpha')!
    expect(alpha.ballsFaced).toBe(36)
    expect(alpha.nrr).toBe(Math.round((61 / 6 - 60 / 10) * 1000) / 1000)
  })
  it('only marks Q once the group is complete', () => {
    const st = computeStandings(teams, [])
    expect(st.A.some(r => r.qualified)).toBe(false)
  })
})

describe('knockout bracket', () => {
  it('crosses over A1 v B2 and B1 v A2, final from SF winners', () => {
    const group = [
      match('m1', 'a1', 'a2', 'A', 100, 4, 60, 80, 6, 60), // Alpha tops A
      match('m2', 'b1', 'b2', 'A', 70, 4, 60, 90, 6, 50), // Delta tops B
    ]
    const st = computeStandings(teams, group, 2)
    const br = computeKnockoutBracket(teams, group, st)
    expect(br[0].teamA?.name).toBe('Alpha')
    expect(br[0].teamB?.name).toBe('Charlie') // B2
    expect(br[1].teamA?.name).toBe('Delta')
    expect(br[1].teamB?.name).toBe('Bravo') // A2
    expect(br[2].teamA).toBeNull()

    const ko = [
      ...group,
      match('m13', 'a1', 'b1', 'A', 90, 5, 60, 70, 6, 60, 'SEMI_FINAL'), // Alpha wins
      match('m14', 'b2', 'a2', 'B', 88, 5, 60, 89, 4, 55, 'SEMI_FINAL'), // Delta (side A) chases → wins
      match('m15', 'a1', 'b2', 'A', 75, 7, 60, 76, 3, 50, 'FINAL'), // Delta chases → wins
    ]
    const br2 = computeKnockoutBracket(teams, ko, computeStandings(teams, ko, 2))
    expect(br2[0].winnerId).toBe('a1')
    expect(br2[1].winnerId).toBe('b2')
    expect(br2[2].winnerId).toBe('b2')
    expect(br2[2].projected).toBe(false)
  })
})
