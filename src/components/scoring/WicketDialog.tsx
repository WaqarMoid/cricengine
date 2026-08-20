'use client'
import { useState } from 'react'
import { Users, ArrowRight } from 'lucide-react'

const ALL_WICKET_TYPES = [
  { value: 'BOWLED', label: 'Bowled', needsFielder: false },
  { value: 'CAUGHT', label: 'Caught', needsFielder: true },
  { value: 'LBW', label: 'LBW', needsFielder: false },
  { value: 'RUN_OUT', label: 'Run Out', needsFielder: true },
  { value: 'STUMPED', label: 'Stumped', needsFielder: true },
  { value: 'HIT_WICKET', label: 'Hit Wicket', needsFielder: false },
  { value: 'RETIRED', label: 'Retired', needsFielder: false },
]

interface WicketDialogProps {
  strikerId: string
  nonStrikerId: string
  strikerName?: string
  nonStrikerName?: string
  fieldingPlayers: Array<{ id: string; name: string }>
  availableIncomingBatters: Array<{ id: string; name: string }>
  isFreeHit?: boolean
  isWide?: boolean
  onConfirm: (data: {
    wicketType: 'BOWLED' | 'CAUGHT' | 'LBW' | 'RUN_OUT' | 'STUMPED' | 'HIT_WICKET' | 'RETIRED'
    dismissedPlayerId: string
    fielderId: string | null
    runsOffBat: number
    incomingBatterId: string | null
  }) => void
  onCancel: () => void
}

export function WicketDialog({
  strikerId,
  nonStrikerId,
  strikerName,
  nonStrikerName,
  fieldingPlayers,
  availableIncomingBatters,
  isFreeHit = false,
  isWide = false,
  onConfirm,
  onCancel
}: WicketDialogProps) {
  const [wicketType, setWicketType] = useState<string>('')
  const [dismissedId, setDismissedId] = useState<string>(strikerId)
  const [fielderId, setFielderId] = useState<string | null>(null)
  const [runsOnWicket, setRunsOnWicket] = useState(0)
  const [incomingBatterId, setIncomingBatterId] = useState<string>(
    availableIncomingBatters.length > 0 ? availableIncomingBatters[0].id : ''
  )

  // Filter wicket types according to cricket laws
  const allowedWicketTypes = ALL_WICKET_TYPES.filter(w => {
    if (isFreeHit) {
      return w.value === 'RUN_OUT' || w.value === 'RETIRED'
    }
    if (isWide) {
      return ['STUMPED', 'RUN_OUT', 'HIT_WICKET', 'RETIRED'].includes(w.value)
    }
    return true
  })

  const selectedType = allowedWicketTypes.find(w => w.value === wicketType)
  const isRunOut = wicketType === 'RUN_OUT'
  const isLastWicket = availableIncomingBatters.length === 0

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-md border border-[#E4E4E7] max-h-[90vh] overflow-y-auto shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-[#E4E4E7] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-black animate-pulse" />
            <h3 className="text-black font-black text-sm uppercase tracking-widest">
              Dismissal Confirmation
            </h3>
          </div>
          {isFreeHit && (
            <span className="text-[9px] uppercase font-mono font-bold tracking-widest bg-black text-white px-2.5 py-0.5 rounded-full">
              FREE HIT (LAW 21)
            </span>
          )}
        </div>

        {/* Dismissed Batter Selection (Who is out) */}
        <div className="space-y-2">
          <label className="text-[10px] text-[#71717A] font-black uppercase tracking-widest block">
            Dismissed Batter
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDismissedId(strikerId)}
              className={`py-3 px-3 rounded-2xl text-xs font-bold border cursor-pointer transition-all ${
                dismissedId === strikerId
                  ? 'bg-black text-white border-black shadow-sm'
                  : 'bg-[#F4F4F5] border-[#E4E4E7] text-black hover:border-black'
              }`}
            >
              {strikerName || 'Striker'} (Facing)
            </button>
            <button
              type="button"
              onClick={() => setDismissedId(nonStrikerId)}
              className={`py-3 px-3 rounded-2xl text-xs font-bold border cursor-pointer transition-all ${
                dismissedId === nonStrikerId
                  ? 'bg-black text-white border-black shadow-sm'
                  : 'bg-[#F4F4F5] border-[#E4E4E7] text-black hover:border-black'
              }`}
            >
              {nonStrikerName || 'Non-Striker'}
            </button>
          </div>
        </div>

        {/* Wicket Type Selection */}
        <div className="space-y-2">
          <label className="text-[10px] text-[#71717A] font-black uppercase tracking-widest block">
            Dismissal Method
          </label>
          <div className="grid grid-cols-2 gap-2">
            {allowedWicketTypes.map(w => (
              <button
                key={w.value}
                type="button"
                onClick={() => {
                  setWicketType(w.value)
                  if (w.value !== 'RUN_OUT') setDismissedId(strikerId)
                }}
                className={`py-2.5 px-3 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
                  wicketType === w.value
                    ? 'bg-black text-white border-black shadow-sm'
                    : 'bg-[#F4F4F5] border-[#E4E4E7] text-black hover:border-black'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>

        {/* Fielder Selector */}
        {selectedType?.needsFielder && (
          <div className="space-y-2">
            <label className="text-[10px] text-[#71717A] font-black uppercase tracking-widest block">
              {wicketType === 'CAUGHT' ? 'Catcher' : wicketType === 'STUMPED' ? 'Wicketkeeper' : 'Fielder Involved'}
            </label>
            <select
              value={fielderId || ''}
              onChange={e => setFielderId(e.target.value || null)}
              className="w-full bg-[#F4F4F5] border border-[#E4E4E7] rounded-2xl px-3.5 py-3 text-black text-xs font-bold focus:border-black focus:bg-white focus:outline-none"
            >
              <option value="">Select fielder...</option>
              {fieldingPlayers.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Runs completed on run out */}
        {isRunOut && (
          <div className="space-y-2">
            <label className="text-[10px] text-[#71717A] font-black uppercase tracking-widest block">
              Runs Completed Before Dismissal
            </label>
            <div className="flex gap-2">
              {[0, 1, 2, 3].map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRunsOnWicket(r)}
                  className={`w-12 h-10 rounded-xl text-xs font-mono font-bold border cursor-pointer ${
                    runsOnWicket === r
                      ? 'bg-black text-white border-black'
                      : 'bg-[#F4F4F5] border-[#E4E4E7] text-black'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Select Incoming Batsman (Law 25) */}
        {!isLastWicket ? (
          <div className="bg-[#F4F4F5] p-4 rounded-3xl border border-[#E4E4E7] space-y-2">
            <label className="text-[10px] text-black font-black uppercase tracking-widest flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#71717A]" />
              <span>Incoming Batsman (Next In)</span>
            </label>
            <p className="text-[11px] text-[#71717A]">
              Choose the incoming batsman replacing {dismissedId === strikerId ? (strikerName || 'striker') : (nonStrikerName || 'non-striker')}.
            </p>
            <select
              value={incomingBatterId}
              onChange={e => setIncomingBatterId(e.target.value)}
              className="w-full bg-white border border-[#E4E4E7] rounded-2xl px-3.5 py-3 text-black text-xs font-bold focus:border-black focus:outline-none shadow-xs"
            >
              {availableIncomingBatters.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="p-4 bg-[#F4F4F5] border border-[#E4E4E7] rounded-3xl text-xs font-black text-black text-center uppercase tracking-wider">
            Innings Complete: All Out
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="py-3.5 px-5 rounded-2xl bg-[#F4F4F5] hover:bg-[#E4E4E7] text-black font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (wicketType) {
                onConfirm({
                  wicketType: wicketType as any,
                  dismissedPlayerId: dismissedId,
                  fielderId,
                  runsOffBat: runsOnWicket,
                  incomingBatterId: isLastWicket ? null : incomingBatterId,
                })
              }
            }}
            disabled={!wicketType || (selectedType?.needsFielder && !fielderId) || (!isLastWicket && !incomingBatterId)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-3.5 rounded-2xl bg-black hover:bg-neutral-800 disabled:opacity-30 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer disabled:cursor-not-allowed shadow-md"
          >
            <span>Confirm Out & Next Batter</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}



