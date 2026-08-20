'use client'
import { useState, use, useTransition } from 'react'
import Link from 'next/link'
import { PinGate } from '@/components/ui/PinGate'
import { ScoringKeypad } from '@/components/scoring/ScoringKeypad'
import { WagonWheelSelector } from '@/components/scoring/WagonWheelSelector'
import { WicketDialog } from '@/components/scoring/WicketDialog'
import { NewBowlerDialog } from '@/components/scoring/NewBowlerDialog'
import { OverHistory } from '@/components/scoring/OverHistory'
import { useMatchState } from '@/hooks/useMatchState'
import { useScoringActions } from '@/hooks/useScoringActions'

interface PageProps {
  params: Promise<{ matchId: string }>
}

export default function ScorerPage({ params }: PageProps) {
  const { matchId } = use(params)

  return (
    <PinGate matchId={matchId}>
      <ScorerConsole matchId={matchId} />
    </PinGate>
  )
}

function ScorerConsole({ matchId }: { matchId: string }) {
  const { data, loading, error, refetch } = useMatchState(matchId, 2500)
  const { submitDelivery, undoLastBall, updateMatchStatus } = useScoringActions(matchId)

  // Local state for modals & selections
  const [pendingShot, setPendingShot] = useState<{
    runsOffBat: number
    extraType: 'NONE' | 'WIDE' | 'NO_BALL' | 'BYE' | 'LEG_BYE' | 'PENALTY'
    extras: number
  } | null>(null)

  const [showWicketModal, setShowWicketModal] = useState(false)
  const [showBowlerModal, setShowBowlerModal] = useState(false)
  
  // Custom manual player pickers if needed
  const [manualStrikerId, setManualStrikerId] = useState<string | null>(null)
  const [manualNonStrikerId, setManualNonStrikerId] = useState<string | null>(null)
  const [manualBowlerId, setManualBowlerId] = useState<string | null>(null)

  const [actionError, setActionError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F17] flex items-center justify-center">
        <div className="text-[#94A3B8] font-mono text-sm animate-pulse">Loading match data...</div>
      </div>
    )
  }

  if (error || !data || !data.match) {
    return (
      <div className="min-h-screen bg-[#0B0F17] flex flex-col items-center justify-center p-4 text-center space-y-4">
        <div className="text-[#EF4444] font-bold text-lg">Error loading match</div>
        <p className="text-sm text-[#94A3B8]">{error || 'Match not found'}</p>
        <Link href="/" className="px-4 py-2 bg-[#161F30] rounded-xl text-xs text-[#38BDF8] border border-[#1E293B]">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  const { match, players, innings1, innings2 } = data
  const currentInningsNo = match.currentInnings
  const activeInnings = currentInningsNo === 1 ? innings1 : (innings2 || innings1)

  // Batting and fielding team determination
  const isTeamABattingFirst = (match.tossWinner === match.teamAName && match.tossDecision === 'BAT') ||
                              (match.tossWinner === match.teamBName && match.tossDecision === 'BOWL')

  const battingTeamIsA = currentInningsNo === 1 ? isTeamABattingFirst : !isTeamABattingFirst
  const battingPlayerIds = battingTeamIsA ? match.teamAPlayerIds : match.teamBPlayerIds
  const fieldingPlayerIds = battingTeamIsA ? match.teamBPlayerIds : match.teamAPlayerIds

  const battingPlayers = battingPlayerIds.map(id => players[id] || { id, name: `Player (${id.slice(0, 4)})` })
  const fieldingPlayers = fieldingPlayerIds.map(id => players[id] || { id, name: `Player (${id.slice(0, 4)})` })

  // Dismissed batter IDs from active innings
  const dismissedBatterIds: string[] = activeInnings.dismissedBatterIds || []
  const availableBatters = battingPlayers.filter(p => !dismissedBatterIds.includes(p.id))

  // Active players resolution
  // If engine or manual ID is already out, fallback to next available not-out batter
  const rawStrikerId = manualStrikerId || activeInnings.strikerId
  const validStrikerId = (rawStrikerId && !dismissedBatterIds.includes(rawStrikerId))
    ? rawStrikerId
    : (availableBatters[0]?.id || null)

  const rawNonStrikerId = manualNonStrikerId || activeInnings.nonStrikerId
  const validNonStrikerId = (rawNonStrikerId && !dismissedBatterIds.includes(rawNonStrikerId) && rawNonStrikerId !== validStrikerId)
    ? rawNonStrikerId
    : (availableBatters.find(p => p.id !== validStrikerId)?.id || null)

  const strikerId = validStrikerId || ''
  const nonStrikerId = validNonStrikerId || ''

  // Bowler resolution & Law 21.7 (Cannot bowl consecutive overs)
  const lastOverBowlerId = activeInnings.lastCompletedOverBowlerId
  const eligibleBowlers = fieldingPlayers.filter(p => p.id !== lastOverBowlerId)

  // If new over just started and current bowler was the last over's bowler, force change
  const isOverComplete = activeInnings.isOverComplete
  const rawBowlerId = manualBowlerId || (isOverComplete ? null : activeInnings.currentBowlerId)
  const validBowlerId = (rawBowlerId && (rawBowlerId !== lastOverBowlerId || !isOverComplete))
    ? rawBowlerId
    : (isOverComplete ? null : (eligibleBowlers[0]?.id || fieldingPlayers[0]?.id))

  const bowlerId = validBowlerId || manualBowlerId || (eligibleBowlers[0]?.id || '')

  const striker = strikerId ? (activeInnings.batterStats?.[strikerId] || { runs: 0, ballsFaced: 0, fours: 0, sixes: 0, strikeRate: 0 }) : null
  const nonStriker = nonStrikerId ? (activeInnings.batterStats?.[nonStrikerId] || { runs: 0, ballsFaced: 0, fours: 0, sixes: 0, strikeRate: 0 }) : null
  const bowler = bowlerId ? (activeInnings.bowlerFigures?.[bowlerId] || { overs: '0.0', maidens: 0, runsConceded: 0, wickets: 0, economy: 0 }) : null

  // Available incoming batters for next wicket
  const availableIncomingBatters = availableBatters.filter(p => p.id !== strikerId && p.id !== nonStrikerId)

  // Max overs per bowler limit in limited-overs matches
  const maxOversPerBowler = Math.ceil(match.oversLimit / 5)

  // Handlers
  const handleScore = (
    runs: number,
    extraType: 'NONE' | 'WIDE' | 'NO_BALL' | 'BYE' | 'LEG_BYE' | 'PENALTY' = 'NONE',
    extras = 0
  ) => {
    setActionError(null)

    // Check if new bowler must be chosen for new over
    if (isOverComplete && !manualBowlerId) {
      setShowBowlerModal(true)
      setActionError('Please select a new bowler for this over (Cricket Law 21.7).')
      return
    }

    if (!strikerId || !nonStrikerId) {
      setActionError('Cannot score without two active batsmen at the crease.')
      return
    }
    
    // For boundaries or runs > 0 off bat, open the wagon wheel selector
    if (runs > 0 && extraType === 'NONE') {
      setPendingShot({ runsOffBat: runs, extraType, extras })
    } else {
      // Direct dispatch
      dispatchDelivery({
        runsOffBat: runs,
        extraType,
        extras,
        isWicket: false,
        wicketType: 'NONE',
        dismissedPlayerId: null,
        fielderId: null,
        shotX: null,
        shotY: null,
        shotZone: null,
      })
    }
  }

  const handleByeLegBye = (type: 'BYE' | 'LEG_BYE', runs: number) => {
    setActionError(null)
    if (isOverComplete && !manualBowlerId) {
      setShowBowlerModal(true)
      setActionError('Please select a new bowler for this over (Cricket Law 21.7).')
      return
    }
    dispatchDelivery({
      runsOffBat: 0,
      extraType: type,
      extras: runs,
      isWicket: false,
      wicketType: 'NONE',
      dismissedPlayerId: null,
      fielderId: null,
      shotX: null,
      shotY: null,
      shotZone: null,
    })
  }

  const handleShotSelected = (x: number, y: number, zone: string) => {
    if (!pendingShot) return
    const { runsOffBat, extraType, extras } = pendingShot
    setPendingShot(null)

    dispatchDelivery({
      runsOffBat,
      extraType,
      extras,
      isWicket: false,
      wicketType: 'NONE',
      dismissedPlayerId: null,
      fielderId: null,
      shotX: x,
      shotY: y,
      shotZone: zone as any,
    })
  }

  const handleWicketConfirmed = (wData: {
    wicketType: any
    dismissedPlayerId: string
    fielderId: string | null
    runsOffBat: number
    incomingBatterId: string | null
  }) => {
    setShowWicketModal(false)

    // Assign the new incoming batsman to the crease replacing the dismissed batter
    if (wData.incomingBatterId) {
      if (wData.dismissedPlayerId === strikerId) {
        setManualStrikerId(wData.incomingBatterId)
      } else {
        setManualNonStrikerId(wData.incomingBatterId)
      }
    }

    dispatchDelivery({
      runsOffBat: wData.runsOffBat,
      extraType: 'NONE',
      extras: 0,
      isWicket: true,
      wicketType: wData.wicketType,
      dismissedPlayerId: wData.dismissedPlayerId,
      fielderId: wData.fielderId,
      shotX: null,
      shotY: null,
      shotZone: null,
    })
  }

  const dispatchDelivery = async (deliveryPayload: any) => {
    try {
      startTransition(async () => {
        await submitDelivery({
          inningsNo: currentInningsNo,
          strikerId,
          nonStrikerId,
          bowlerId,
          ...deliveryPayload,
        })
        // Reset manual bowler override after over completes
        if (activeInnings.ballsInCurrentOver === 5 && deliveryPayload.extraType !== 'WIDE' && deliveryPayload.extraType !== 'NO_BALL') {
          setManualBowlerId(null)
        }
        refetch()
      })
    } catch (e: any) {
      setActionError(e.message || 'Delivery recording failed')
    }
  }

  const handleUndo = async () => {
    try {
      setActionError(null)
      startTransition(async () => {
        await undoLastBall()
        setManualStrikerId(null)
        setManualNonStrikerId(null)
        setManualBowlerId(null)
        refetch()
      })
    } catch (e: any) {
      setActionError(e.message || 'Undo failed')
    }
  }

  const handleSwapStrike = () => {
    const temp = strikerId
    setManualStrikerId(nonStrikerId)
    setManualNonStrikerId(temp)
  }

  const handleNextInnings = async () => {
    if (confirm('Are you sure you want to transition to the 2nd Innings?')) {
      await updateMatchStatus({ currentInnings: 2, status: 'IN_PROGRESS' })
      setManualStrikerId(null)
      setManualNonStrikerId(null)
      setManualBowlerId(null)
      refetch()
    }
  }

  const handleCompleteMatch = async () => {
    if (confirm('Mark this match as COMPLETED?')) {
      await updateMatchStatus({ status: 'COMPLETED' })
      refetch()
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] pb-20">
      {/* Top Scorer Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-3 shadow-2xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs text-slate-500 hover:text-[#001838] font-medium uppercase tracking-wider transition-colors"
            >
              ← Match Centre
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-editorial font-normal text-[#001838] uppercase tracking-wider">
              {battingTeamIsA ? match.teamAName : match.teamBName} • Innings {currentInningsNo}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href={`/live/${matchId}`}
              target="_blank"
              className="text-[11px] font-medium text-[#0066CC] bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors uppercase tracking-wider"
            >
              Public Feed ↗
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {/* Match Ticker & Big Score Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex justify-between items-baseline">
            <div className="flex items-baseline gap-3">
              <span className="text-4xl sm:text-5xl font-mono text-[#001838] tracking-tight font-normal">
                {activeInnings.totalRuns}/{activeInnings.totalWickets}
              </span>
              <span className="text-sm sm:text-base font-mono text-slate-500 font-light">
                ({activeInnings.totalOvers} / {match.oversLimit} ov)
              </span>
            </div>
            <div className="text-right text-xs space-y-1">
              <div className="text-slate-500 font-mono">
                CRR: <span className="font-medium text-[#001838]">{activeInnings.currentRunRate?.toFixed(2) || '0.00'}</span>
              </div>
              {activeInnings.target && (
                <div className="text-[#0066CC] font-mono font-medium">
                  TARGET: {activeInnings.target}
                </div>
              )}
            </div>
          </div>

          {/* Free Hit alert */}
          {activeInnings.isFreeHit && !activeInnings.isInningsComplete && (
            <div className="p-3 bg-[#001838] text-white rounded-xl text-xs font-medium flex items-center justify-center gap-2 animate-pulse uppercase tracking-wider">
              <span>FREE HIT ACTIVE (LAW 21)</span>
              <span className="text-[10px] text-slate-300 font-light lowercase">(only run out permitted)</span>
            </div>
          )}

          {/* Over Complete Bowler Alert */}
          {isOverComplete && !activeInnings.isInningsComplete && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-[#001838] flex items-center justify-between">
              <span>Over {activeInnings.completedOvers} Completed. Select bowler for Over {activeInnings.completedOvers + 1}</span>
              <button
                onClick={() => setShowBowlerModal(true)}
                className="bg-[#0066CC] hover:bg-[#0052A3] text-white px-3.5 py-1.5 rounded-lg font-medium uppercase tracking-wider text-[11px] transition-all cursor-pointer shadow-xs"
              >
                Select Bowler ➔
              </button>
            </div>
          )}

          {/* Innings status alert */}
          {activeInnings.isInningsComplete && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-[#001838] flex items-center justify-between uppercase tracking-wider">
              <span>Innings Concluded ({activeInnings.inningsCompleteReason})</span>
              {currentInningsNo === 1 ? (
                <button
                  onClick={handleNextInnings}
                  className="bg-[#0066CC] hover:bg-[#0052A3] text-white px-4 py-2 rounded-xl text-xs font-medium cursor-pointer uppercase tracking-wider shadow-xs"
                >
                  Start 2nd Innings ➔
                </button>
              ) : (
                <button
                  onClick={handleCompleteMatch}
                  className="bg-[#001838] hover:bg-[#0A2540] text-white px-4 py-2 rounded-xl text-xs font-medium cursor-pointer uppercase tracking-wider shadow-xs"
                >
                  Finalize Match
                </button>
              )}
            </div>
          )}
        </div>

        {/* Batters & Bowler Active Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Batters Box */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-3 shadow-xs">
            <div className="flex justify-between items-center text-[10px] font-medium text-slate-500 border-b border-slate-100 pb-2 uppercase tracking-wider">
              <span>BATSMEN AT CREASE</span>
              <span className="font-mono">R (B) • 4s 6s</span>
            </div>

            {/* Striker */}
            <div className="flex items-center justify-between text-xs bg-blue-50/60 p-3 rounded-xl border border-blue-200">
              <div className="flex items-center gap-2 font-medium text-[#001838]">
                <span className="w-2 h-2 rounded-full bg-[#0066CC] animate-pulse"></span>
                <select
                  value={strikerId}
                  onChange={e => setManualStrikerId(e.target.value)}
                  className="bg-transparent text-[#001838] font-medium focus:outline-none cursor-pointer text-xs"
                >
                  {availableBatters.map(p => (
                    <option key={p.id} value={p.id} className="bg-white text-[#001838]">
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="font-mono font-medium text-[#001838] text-xs">
                {striker?.runs || 0} ({striker?.ballsFaced || 0}) • {striker?.fours || 0}x4 {striker?.sixes || 0}x6
              </div>
            </div>

            {/* Non-Striker */}
            <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 font-light text-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                <select
                  value={nonStrikerId}
                  onChange={e => setManualNonStrikerId(e.target.value)}
                  className="bg-transparent text-slate-700 focus:outline-none cursor-pointer text-xs font-light"
                >
                  {availableBatters.map(p => (
                    <option key={p.id} value={p.id} className="bg-white text-[#001838]">
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="font-mono text-slate-600 text-xs font-light">
                {nonStriker?.runs || 0} ({nonStriker?.ballsFaced || 0}) • {nonStriker?.fours || 0}x4 {nonStriker?.sixes || 0}x6
              </div>
            </div>

            {/* Partnership */}
            {activeInnings.currentPartnership && (
              <div className="text-[11px] text-slate-500 text-center pt-2 border-t border-slate-100 font-mono font-light">
                PARTNERSHIP: <span className="text-[#001838] font-medium">{activeInnings.currentPartnership.runs}</span> RUNS ({activeInnings.currentPartnership.balls} BALLS)
              </div>
            )}
          </div>

          {/* Bowler Box */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-3 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center text-[10px] font-medium text-slate-500 border-b border-slate-100 pb-2 uppercase tracking-wider">
                <span>ACTIVE BOWLER</span>
                <span className="font-mono">O-M-R-W</span>
              </div>

              <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-slate-50 border border-slate-200 mt-3">
                <select
                  value={bowlerId}
                  onChange={e => setManualBowlerId(e.target.value)}
                  className="bg-transparent text-[#001838] font-medium focus:outline-none cursor-pointer text-xs"
                >
                  {fieldingPlayers.map(p => {
                    const isPrev = p.id === lastOverBowlerId && isOverComplete
                    return (
                      <option key={p.id} value={p.id} disabled={isPrev} className="bg-white text-[#001838]">
                        {p.name} {isPrev ? '(Previous over - Law 21.7)' : ''}
                      </option>
                    )
                  })}
                </select>

                <div className="font-mono font-medium text-[#001838] text-xs">
                  {bowler?.overs || '0.0'}-{bowler?.maidens || 0}-{bowler?.runsConceded || 0}-{bowler?.wickets || 0}
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowBowlerModal(true)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-xs font-medium uppercase tracking-wider text-slate-700 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            >
              Rotate / Change Bowler
            </button>
          </div>
        </div>

        {/* Over History Ribbon */}
        <OverHistory
          currentOverBalls={activeInnings.currentOverBalls || []}
          overSummaries={activeInnings.overSummaries || []}
        />

        {/* Action Error Banner */}
        {actionError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-700 text-center">
            {actionError}
          </div>
        )}

        {/* Primary Touch Scoring Keypad */}
        <ScoringKeypad
          onScore={handleScore}
          onWicket={() => setShowWicketModal(true)}
          onByeLegBye={handleByeLegBye}
          onUndo={handleUndo}
          onChangeStrike={handleSwapStrike}
          disabled={isPending || activeInnings.isInningsComplete}
        />
      </main>


      {/* Modal 1: Wagon Wheel Selector */}
      {pendingShot && (
        <WagonWheelSelector
          runs={pendingShot.runsOffBat}
          onSelect={handleShotSelected}
          onSkip={() => handleShotSelected(0, 0, 'MID_WICKET')}
        />
      )}

      {/* Modal 2: Wicket Dismissal Dialog */}
      {showWicketModal && (
        <WicketDialog
          strikerId={strikerId}
          nonStrikerId={nonStrikerId}
          strikerName={players[strikerId]?.name}
          nonStrikerName={players[nonStrikerId]?.name}
          fieldingPlayers={fieldingPlayers}
          availableIncomingBatters={availableIncomingBatters}
          isFreeHit={activeInnings.isFreeHit}
          onConfirm={handleWicketConfirmed}
          onCancel={() => setShowWicketModal(false)}
        />
      )}

      {/* Modal 3: Change Bowler Dialog */}
      {showBowlerModal && (
        <NewBowlerDialog
          bowlers={fieldingPlayers.map(p => ({
            id: p.id,
            name: p.name,
            overs: activeInnings.bowlerFigures?.[p.id]?.overs,
            oversBowled: activeInnings.bowlerFigures?.[p.id]?.oversBowled,
          }))}
          lastOverBowlerId={lastOverBowlerId}
          maxOversPerBowler={maxOversPerBowler}
          overNumber={activeInnings.completedOvers + 1}
          onSelect={(bId) => {
            setManualBowlerId(bId)
            setShowBowlerModal(false)
          }}
          onCancel={() => setShowBowlerModal(false)}
        />
      )}
    </div>
  )
}



