import { describe, it, expect } from 'vitest';
import { calculateInningsState } from '../scoring-engine';
import { BallEvent } from '../types';

function makeBall(overrides: Partial<BallEvent>): BallEvent {
  return {
    id: crypto.randomUUID(),
    matchId: 'test-match',
    inningsNo: 1,
    overNumber: 0,
    ballInOver: 1,
    sequenceNo: 1,
    strikerId: 'batter-1',
    nonStrikerId: 'batter-2',
    bowlerId: 'bowler-1',
    runsOffBat: 0,
    extras: 0,
    extraType: 'NONE',
    isLegalDelivery: true,
    isWicket: false,
    wicketType: 'NONE',
    dismissedPlayerId: null,
    fielderId: null,
    shotX: null,
    shotY: null,
    shotZone: null,
    pitchLine: null,
    pitchLength: null,
    isUndone: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('calculateInningsState', () => {
  it('Empty innings', () => {
    const state = calculateInningsState([], 1, 20, null);
    expect(state.totalRuns).toBe(0);
    expect(state.totalOvers).toBe('0.0');
    expect(state.isInningsComplete).toBe(false);
  });

  it('Single dot ball', () => {
    const events = [makeBall({ runsOffBat: 0 })];
    const state = calculateInningsState(events, 1, 20, null);
    expect(state.totalRuns).toBe(0);
    expect(state.totalOvers).toBe('0.1');
    expect(state.strikerId).toBe('batter-1');
  });

  it('Single with strike rotation', () => {
    const events = [makeBall({ runsOffBat: 1 })];
    const state = calculateInningsState(events, 1, 20, null);
    expect(state.totalRuns).toBe(1);
    expect(state.totalOvers).toBe('0.1');
    expect(state.strikerId).toBe('batter-2'); // Swap
  });

  it('Boundary four', () => {
    const events = [makeBall({ runsOffBat: 4 })];
    const state = calculateInningsState(events, 1, 20, null);
    expect(state.totalRuns).toBe(4);
    expect(state.strikerId).toBe('batter-1'); // No swap
  });

  it('Six', () => {
    const events = [makeBall({ runsOffBat: 6 })];
    const state = calculateInningsState(events, 1, 20, null);
    expect(state.totalRuns).toBe(6);
    expect(state.strikerId).toBe('batter-1'); // No swap
  });

  it('Wide delivery', () => {
    const events = [makeBall({ runsOffBat: 0, extraType: 'WIDE', extras: 0, isLegalDelivery: false })];
    const state = calculateInningsState(events, 1, 20, null);
    expect(state.totalRuns).toBe(1);
    expect(state.totalOvers).toBe('0.0');
    expect(state.extras.wides).toBe(1);
  });

  it('No-ball', () => {
    const events = [makeBall({ runsOffBat: 1, extraType: 'NO_BALL', extras: 0, isLegalDelivery: false })];
    const state = calculateInningsState(events, 1, 20, null);
    expect(state.totalRuns).toBe(2); // 1 for NB + 1 from bat
    expect(state.totalOvers).toBe('0.0');
    expect(state.extras.noBalls).toBe(1);
    expect(state.batterStats.get('batter-1')?.runs).toBe(1);
  });

  it('Over completion', () => {
    const events = Array.from({ length: 6 }, (_, i) => makeBall({ sequenceNo: i + 1 }));
    const state = calculateInningsState(events, 1, 20, null);
    expect(state.totalOvers).toBe('1.0');
    expect(state.strikerId).toBe('batter-2'); // Swap at end of over
  });

  it('Over completion with odd run on last ball', () => {
    const events = [
      ...Array.from({ length: 5 }, (_, i) => makeBall({ sequenceNo: i + 1 })),
      makeBall({ sequenceNo: 6, runsOffBat: 1 })
    ];
    const state = calculateInningsState(events, 1, 20, null);
    expect(state.totalOvers).toBe('1.0');
    expect(state.strikerId).toBe('batter-1'); // Swap from run + Swap from over end = No net swap
  });

  it('Wicket (bowled)', () => {
    const events = [makeBall({ isWicket: true, wicketType: 'BOWLED', dismissedPlayerId: 'batter-1' })];
    const state = calculateInningsState(events, 1, 20, null);
    expect(state.totalWickets).toBe(1);
    expect(state.batterStats.get('batter-1')?.isOut).toBe(true);
    expect(state.bowlerFigures.get('bowler-1')?.wickets).toBe(1);
  });
  
  it('Run-out on non-striker end', () => {
    const events = [makeBall({ isWicket: true, wicketType: 'RUN_OUT', dismissedPlayerId: 'batter-2', runsOffBat: 1 })];
    const state = calculateInningsState(events, 1, 20, null);
    expect(state.totalWickets).toBe(1);
    expect(state.batterStats.get('batter-2')?.isOut).toBe(true);
    expect(state.bowlerFigures.get('bowler-1')?.wickets).toBe(0); // doesn't count for bowler
  });

  it('Batter strike rate calculation', () => {
    const events = [
      makeBall({ sequenceNo: 1, runsOffBat: 4 }),
      makeBall({ sequenceNo: 2, runsOffBat: 0 }),
      makeBall({ sequenceNo: 3, extraType: 'WIDE', extras: 0, isLegalDelivery: false })
    ];
    const state = calculateInningsState(events, 1, 20, null);
    const batter = state.batterStats.get('batter-1');
    expect(batter?.runs).toBe(4);
    expect(batter?.ballsFaced).toBe(2);
    expect(batter?.strikeRate).toBe(200);
  });

  it('Bowler economy', () => {
    const events = [
      makeBall({ sequenceNo: 1, runsOffBat: 4 }),
      makeBall({ sequenceNo: 2, runsOffBat: 0 }),
      makeBall({ sequenceNo: 3, extraType: 'BYE', extras: 4, runsOffBat: 0 })
    ];
    const state = calculateInningsState(events, 1, 20, null);
    const bowler = state.bowlerFigures.get('bowler-1');
    expect(bowler?.runsConceded).toBe(4); // byes don't count
    expect(bowler?.economy).toBe(8); // 4 runs in 3 balls -> 8 runs/over
  });

  it('Maiden over', () => {
    const events = Array.from({ length: 6 }, (_, i) => makeBall({ sequenceNo: i + 1, runsOffBat: 0 }));
    const state = calculateInningsState(events, 1, 20, null);
    const bowler = state.bowlerFigures.get('bowler-1');
    expect(bowler?.maidens).toBe(1);
  });

  it('Undo scenario', () => {
    const events = [
      makeBall({ sequenceNo: 1, runsOffBat: 4 }),
      makeBall({ sequenceNo: 2, runsOffBat: 6, isUndone: true })
    ];
    const state = calculateInningsState(events, 1, 20, null);
    expect(state.totalRuns).toBe(4);
  });

  it('Innings complete - all out', () => {
    const events = Array.from({ length: 10 }, (_, i) => 
      makeBall({ sequenceNo: i + 1, isWicket: true, wicketType: 'BOWLED', dismissedPlayerId: `batter-${i + 1}` })
    );
    const state = calculateInningsState(events, 1, 20, null);
    expect(state.isInningsComplete).toBe(true);
    expect(state.inningsCompleteReason).toBe('ALL_OUT');
  });

  it('Innings complete - overs done', () => {
    const events = Array.from({ length: 12 }, (_, i) => makeBall({ sequenceNo: i + 1 }));
    const state = calculateInningsState(events, 1, 2, null); // 2 overs limit
    expect(state.isInningsComplete).toBe(true);
    expect(state.inningsCompleteReason).toBe('OVERS_COMPLETE');
  });

  it('Innings complete - custom squad all out (e.g. 5 players -> 4 wickets)', () => {
    const events = Array.from({ length: 4 }, (_, i) => 
      makeBall({ sequenceNo: i + 1, isWicket: true, wicketType: 'BOWLED', dismissedPlayerId: `batter-${i + 1}` })
    );
    const state = calculateInningsState(events, 1, 20, null, 5); // 5 player team
    expect(state.isInningsComplete).toBe(true);
    expect(state.inningsCompleteReason).toBe('ALL_OUT');
    expect(state.totalWickets).toBe(4);
  });

  it('Free hit state after No Ball', () => {
    const events = [makeBall({ extraType: 'NO_BALL', runsOffBat: 0 })];
    const state = calculateInningsState(events, 1, 20, null);
    expect(state.isFreeHit).toBe(true);
  });

  it('Dismissed batter tracking', () => {
    const events = [
      makeBall({ sequenceNo: 1, isWicket: true, wicketType: 'CAUGHT', dismissedPlayerId: 'batter-1', fielderId: 'fielder-1' })
    ];
    const state = calculateInningsState(events, 1, 20, null);
    expect(state.dismissedBatterIds).toContain('batter-1');
    expect(state.strikerId).toBeNull(); // Dismissed striker is vacated
  });

  it('Over completion state', () => {
    const events = Array.from({ length: 6 }, (_, i) => makeBall({ sequenceNo: i + 1 }));
    const state = calculateInningsState(events, 1, 20, null);
    expect(state.isOverComplete).toBe(true);
    expect(state.lastCompletedOverBowlerId).toBe('bowler-1');
    expect(state.currentBowlerId).toBeNull();
  });
});
