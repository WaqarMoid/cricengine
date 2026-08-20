import { BallEvent, InningsState, BatterStats, BowlerFigures, PartnershipInfo, ExtraType } from './types';

function initializeBatter(playerId: string): BatterStats {
  return {
    playerId,
    runs: 0,
    ballsFaced: 0,
    fours: 0,
    sixes: 0,
    strikeRate: 0,
    isOut: false,
    wicketType: null,
    bowlerIdWhoGotOut: null,
    fielderIdWhoCaught: null,
  };
}

function initializeBowler(playerId: string): BowlerFigures {
  return {
    playerId,
    overs: '0.0',
    oversBowled: 0,
    ballsBowled: 0,
    totalBallsBowled: 0,
    maidens: 0,
    runsConceded: 0,
    wickets: 0,
    economy: 0,
    dotBalls: 0,
    wides: 0,
    noBalls: 0,
  };
}

export function calculateInningsState(
  events: BallEvent[],
  inningsNo: number,
  oversLimit: number,
  target: number | null,
  totalBattersCount: number = 11
): InningsState {
  const activeEvents = events.filter(e => !e.isUndone).sort((a, b) => a.sequenceNo - b.sequenceNo);

  const state: InningsState = {
    inningsNo,
    battingTeam: inningsNo % 2 === 1 ? 'A' : 'B',
    totalRuns: 0,
    totalWickets: 0,
    totalOvers: '0.0',
    completedOvers: 0,
    ballsInCurrentOver: 0,
    totalLegalBalls: 0,
    
    currentRunRate: 0,
    requiredRunRate: target !== null ? (target / oversLimit) : null,
    target,
    
    strikerId: null,
    nonStrikerId: null,
    currentBowlerId: null,
    lastCompletedOverBowlerId: null,
    
    batterStats: new Map<string, BatterStats>(),
    bowlerFigures: new Map<string, BowlerFigures>(),
    
    currentPartnership: null,
    partnerships: [],
    
    overSummaries: [],
    currentOverBalls: [],
    
    extras: {
      wides: 0,
      noBalls: 0,
      byes: 0,
      legByes: 0,
      penalties: 0,
      total: 0
    },
    
    fallOfWickets: [],
    
    isFreeHit: false,
    isOverComplete: false,
    dismissedBatterIds: [],
    notOutBatterIds: [],
    
    isInningsComplete: false,
    inningsCompleteReason: null
  };

  if (activeEvents.length === 0) {
    return state;
  }

  let runsInCurrentOverByBowler = 0;
  let extrasInCurrentOverThatCountAgainstBowler = 0;

  for (const event of activeEvents) {
    if (state.isInningsComplete) {
      break;
    }

    if (!state.batterStats.has(event.strikerId)) state.batterStats.set(event.strikerId, initializeBatter(event.strikerId));
    if (!state.batterStats.has(event.nonStrikerId)) state.batterStats.set(event.nonStrikerId, initializeBatter(event.nonStrikerId));
    if (!state.bowlerFigures.has(event.bowlerId)) state.bowlerFigures.set(event.bowlerId, initializeBowler(event.bowlerId));

    state.strikerId = event.strikerId;
    state.nonStrikerId = event.nonStrikerId;
    state.currentBowlerId = event.bowlerId;

    if (!state.currentPartnership) {
      state.currentPartnership = {
        runs: 0,
        balls: 0,
        batter1Id: state.strikerId,
        batter2Id: state.nonStrikerId,
        batter1Runs: 0,
        batter2Runs: 0
      };
    }

    const striker = state.batterStats.get(state.strikerId)!;
    const nonStriker = state.batterStats.get(state.nonStrikerId)!;
    const bowler = state.bowlerFigures.get(state.currentBowlerId)!;

    let ballDisplay = '';
    let deliveryRuns = event.runsOffBat;
    let deliveryExtras = 0;
    
    if (event.extraType === 'WIDE') {
      deliveryExtras = 1 + event.extras; 
      state.extras.wides += deliveryExtras;
      state.extras.total += deliveryExtras;
      
      bowler.runsConceded += deliveryExtras;
      bowler.wides += deliveryExtras;
      
      runsInCurrentOverByBowler += deliveryExtras;
      extrasInCurrentOverThatCountAgainstBowler += deliveryExtras;
      
      ballDisplay = `${deliveryExtras}Wd`;
    } else if (event.extraType === 'NO_BALL') {
      deliveryExtras = 1 + event.extras;
      state.extras.noBalls += 1;
      state.extras.total += deliveryExtras;
      
      bowler.runsConceded += 1 + event.runsOffBat;
      bowler.noBalls += 1;
      
      runsInCurrentOverByBowler += (1 + event.runsOffBat);
      extrasInCurrentOverThatCountAgainstBowler += 1;
      
      if (event.extras > 0) {
        state.extras.byes += event.extras;
        state.extras.total += event.extras;
      }
      
      ballDisplay = `${event.runsOffBat + 1}Nb`; 
      
      striker.runs += event.runsOffBat;
      striker.ballsFaced += 1;
      if (event.runsOffBat === 4) striker.fours += 1;
      if (event.runsOffBat === 6) striker.sixes += 1;
      
      state.currentPartnership.runs += (1 + event.runsOffBat + event.extras);
      state.currentPartnership.balls += 1;
      if (state.currentPartnership.batter1Id === striker.playerId) state.currentPartnership.batter1Runs += event.runsOffBat;
      else state.currentPartnership.batter2Runs += event.runsOffBat;
    } else if (event.extraType === 'BYE' || event.extraType === 'LEG_BYE') {
      deliveryExtras = event.extras;
      state.extras.total += deliveryExtras;
      if (event.extraType === 'BYE') state.extras.byes += deliveryExtras;
      else state.extras.legByes += deliveryExtras;
      
      ballDisplay = `${deliveryExtras}${event.extraType === 'BYE' ? 'B' : 'Lb'}`;
      
      striker.ballsFaced += 1;
      state.currentPartnership.balls += 1;
      state.currentPartnership.runs += deliveryExtras;
      
      if (deliveryExtras === 0 && event.runsOffBat === 0) bowler.dotBalls += 1;
    } else if (event.extraType === 'PENALTY') {
      state.extras.penalties += event.extras;
      state.extras.total += event.extras;
    } else {
      striker.runs += event.runsOffBat;
      striker.ballsFaced += 1;
      if (event.runsOffBat === 4) striker.fours += 1;
      if (event.runsOffBat === 6) striker.sixes += 1;
      
      bowler.runsConceded += event.runsOffBat;
      runsInCurrentOverByBowler += event.runsOffBat;
      
      if (event.runsOffBat === 0 && !event.isWicket) {
        bowler.dotBalls += 1;
        ballDisplay = '.';
      } else {
        ballDisplay = `${event.runsOffBat}`;
      }
      
      state.currentPartnership.runs += event.runsOffBat;
      state.currentPartnership.balls += 1;
      if (state.currentPartnership.batter1Id === striker.playerId) state.currentPartnership.batter1Runs += event.runsOffBat;
      else state.currentPartnership.batter2Runs += event.runsOffBat;
    }

    state.totalRuns += deliveryRuns + deliveryExtras;

    if (event.isWicket) {
      state.totalWickets += 1;
      
      if (event.wicketType !== 'RUN_OUT' && event.wicketType !== 'RETIRED') {
        bowler.wickets += 1;
      }
      
      ballDisplay = ballDisplay === '' || ballDisplay === '.' ? 'W' : `${ballDisplay}+W`;

      if (event.dismissedPlayerId) {
        const dismissedBatter = state.batterStats.get(event.dismissedPlayerId);
        if (dismissedBatter) {
          dismissedBatter.isOut = true;
          dismissedBatter.wicketType = event.wicketType;
          dismissedBatter.bowlerIdWhoGotOut = event.bowlerId;
          dismissedBatter.fielderIdWhoCaught = event.fielderId;
        }

        state.fallOfWickets.push({
          wicketNumber: state.totalWickets,
          runs: state.totalRuns,
          overs: state.totalOvers,
          playerId: event.dismissedPlayerId
        });
        
        state.partnerships.push({ ...state.currentPartnership });
        state.currentPartnership = null; 
      }
    }

    if (event.extraType !== 'WIDE' && event.extraType !== 'NO_BALL') { 
      state.totalLegalBalls += 1;
      state.ballsInCurrentOver += 1;
      
      bowler.totalBallsBowled += 1;
      bowler.ballsBowled += 1;
      bowler.overs = `${bowler.oversBowled}.${bowler.ballsBowled}`;
      
      state.totalOvers = `${state.completedOvers}.${state.ballsInCurrentOver}`;
    }

    state.currentOverBalls.push(ballDisplay);
    
    let totalRunsForRotation = event.runsOffBat;
    if (event.extraType === 'BYE' || event.extraType === 'LEG_BYE' || (event.extraType === 'WIDE' && event.extras > 0)) {
      totalRunsForRotation = event.extraType === 'WIDE' ? event.extras : event.extras;
    }

    let shouldSwapStrike = totalRunsForRotation % 2 !== 0;

    if (state.ballsInCurrentOver === 6) {
      state.completedOvers += 1;
      state.ballsInCurrentOver = 0;
      state.totalOvers = `${state.completedOvers}.0`;
      
      bowler.oversBowled += 1;
      bowler.ballsBowled = 0;
      bowler.overs = `${bowler.oversBowled}.0`;
      
      if (runsInCurrentOverByBowler === 0 && extrasInCurrentOverThatCountAgainstBowler === 0) {
        bowler.maidens += 1;
      }
      
      state.overSummaries.push({
        overNumber: state.completedOvers,
        bowlerId: event.bowlerId,
        runs: runsInCurrentOverByBowler,
        wickets: state.currentOverBalls.filter(b => b.includes('W')).length,
        balls: [...state.currentOverBalls]
      });
      
      state.currentOverBalls = [];
      state.lastCompletedOverBowlerId = event.bowlerId;
      state.currentBowlerId = null; 
      
      runsInCurrentOverByBowler = 0;
      extrasInCurrentOverThatCountAgainstBowler = 0;
      
      shouldSwapStrike = !shouldSwapStrike;
    }

    if (shouldSwapStrike && state.currentPartnership) {
       const temp = state.strikerId;
       state.strikerId = state.nonStrikerId;
       state.nonStrikerId = temp;
    }

    if (striker.ballsFaced > 0) striker.strikeRate = (striker.runs / striker.ballsFaced) * 100;
    if (bowler.totalBallsBowled > 0) bowler.economy = bowler.runsConceded / (bowler.totalBallsBowled / 6);

    if (state.totalLegalBalls > 0) {
      state.currentRunRate = state.totalRuns / (state.totalLegalBalls / 6);
    }
    
    if (target !== null && oversLimit * 6 > state.totalLegalBalls) {
      state.requiredRunRate = (target - state.totalRuns) / ((oversLimit * 6 - state.totalLegalBalls) / 6);
    }

    const maxWickets = Math.max(1, totalBattersCount - 1);
    if (state.totalWickets >= maxWickets) {
      state.isInningsComplete = true;
      state.inningsCompleteReason = 'ALL_OUT';
    } else if (state.completedOvers >= oversLimit) {
      state.isInningsComplete = true;
      state.inningsCompleteReason = 'OVERS_COMPLETE';
    } else if (target !== null && state.totalRuns >= target) {
      state.isInningsComplete = true;
      state.inningsCompleteReason = 'TARGET_CHASED';
    }
  }

  // Populate dismissed and not-out batter IDs
  state.dismissedBatterIds = Array.from(state.batterStats.values()).filter(b => b.isOut).map(b => b.playerId);
  state.notOutBatterIds = Array.from(state.batterStats.values()).filter(b => !b.isOut).map(b => b.playerId);

  // If the last ball dismissed the striker or non-striker, vacate that slot to demand incoming batter
  if (activeEvents.length > 0) {
    const lastEvent = activeEvents[activeEvents.length - 1];
    if (lastEvent.isWicket && lastEvent.dismissedPlayerId) {
      if (state.strikerId === lastEvent.dismissedPlayerId) {
        state.strikerId = null;
      }
      if (state.nonStrikerId === lastEvent.dismissedPlayerId) {
        state.nonStrikerId = null;
      }
    }
    // Check if free hit is active on the next ball (after No Ball)
    state.isFreeHit = lastEvent.extraType === 'NO_BALL';
  }

  // Check if over is completed and a new bowler must be chosen
  state.isOverComplete = state.ballsInCurrentOver === 0 && state.completedOvers > 0 && activeEvents.length > 0 && !state.isInningsComplete;

  if (target !== null && !state.isInningsComplete && oversLimit * 6 > state.totalLegalBalls) {
    state.requiredRunRate = (target - state.totalRuns) / ((oversLimit * 6 - state.totalLegalBalls) / 6);
  }

  return state;
}
