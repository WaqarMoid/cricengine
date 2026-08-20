'use client'
import { useState } from 'react'
import { ArrowRight } from 'lucide-react'

interface NewBowlerDialogProps {
  bowlers: Array<{ id: string; name: string; overs?: string; oversBowled?: number }>
  lastOverBowlerId: string | null  // Cannot bowl consecutive overs (Cricket Law 21.7)
  maxOversPerBowler?: number
  overNumber?: number
  onSelect: (bowlerId: string) => void
  onCancel?: () => void
}

export function NewBowlerDialog({
  bowlers,
  lastOverBowlerId,
  maxOversPerBowler,
  overNumber,
  onSelect,
  onCancel
}: NewBowlerDialogProps) {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-7 w-full max-w-sm border border-[#E4E4E7] shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#E4E4E7] pb-3">
          <div>
            <h3 className="text-black font-black text-sm uppercase tracking-widest">
              {overNumber ? `Bowler • Over ${overNumber}` : 'Select Bowler'}
            </h3>
            <p className="text-[11px] text-[#71717A] mt-0.5">Consecutive overs restricted under Law 21.7</p>
          </div>
          <span className="text-[9px] uppercase font-mono font-bold tracking-widest bg-black text-white px-2.5 py-0.5 rounded-full">
            LAW 21.7
          </span>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {bowlers.map(b => {
            const isConsecutiveBlocked = b.id === lastOverBowlerId
            const isMaxOversBlocked = maxOversPerBowler && (b.oversBowled || 0) >= maxOversPerBowler
            const isBlocked = isConsecutiveBlocked || isMaxOversBlocked

            return (
              <button
                key={b.id}
                type="button"
                disabled={Boolean(isBlocked)}
                onClick={() => setSelected(b.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition-all cursor-pointer ${
                  isBlocked
                    ? 'opacity-30 cursor-not-allowed bg-[#F4F4F5] border-[#E4E4E7]'
                    : selected === b.id
                      ? 'bg-black text-white border-black shadow-sm'
                      : 'bg-[#F4F4F5] border-[#E4E4E7] text-black hover:border-black'
                }`}
              >
                <div className="flex flex-col text-left">
                  <span className="font-black text-xs uppercase tracking-wide">{b.name}</span>
                  {isConsecutiveBlocked && (
                    <span className="text-[9px] text-[#71717A] uppercase tracking-wider font-bold">
                      Bowled Previous Over (Law 21.7)
                    </span>
                  )}
                  {isMaxOversBlocked && (
                    <span className="text-[9px] text-[#71717A] uppercase tracking-wider font-bold">
                      Max Quota Reached ({maxOversPerBowler} ov)
                    </span>
                  )}
                </div>
                {b.overs && (
                  <span className={`text-xs font-mono px-2 py-0.5 rounded-xl border ${
                    selected === b.id ? 'bg-white text-black border-white' : 'bg-white text-black border-[#E4E4E7]'
                  }`}>
                    {b.overs} ov
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="flex gap-2.5 pt-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="py-3 px-4 rounded-2xl bg-[#F4F4F5] hover:bg-[#E4E4E7] text-black font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={() => selected && onSelect(selected)}
            disabled={!selected}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-3.5 rounded-2xl bg-black hover:bg-neutral-800 text-white font-black text-xs uppercase tracking-wider disabled:opacity-30 transition-all cursor-pointer disabled:cursor-not-allowed shadow-sm"
          >
            <span>Confirm Bowler</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}



