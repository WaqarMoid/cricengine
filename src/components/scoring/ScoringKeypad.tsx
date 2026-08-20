'use client'
import { useState } from 'react'
import { RotateCcw, ArrowLeftRight, ChevronDown } from 'lucide-react'

interface ScoringKeypadProps {
  onScore: (runs: number, extraType?: 'NONE' | 'WIDE' | 'NO_BALL' | 'BYE' | 'LEG_BYE' | 'PENALTY', extras?: number) => void
  onWicket: () => void
  onByeLegBye: (type: 'BYE' | 'LEG_BYE', runs: number) => void
  onUndo: () => void
  onChangeStrike: () => void
  disabled?: boolean
}

export function ScoringKeypad({
  onScore,
  onWicket,
  onByeLegBye,
  onUndo,
  onChangeStrike,
  disabled
}: ScoringKeypadProps) {
  const [showByeMenu, setShowByeMenu] = useState(false)

  const btnBase = "flex items-center justify-center rounded-2xl font-mono transition-all active:scale-[0.97] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed select-none"
  const runBtn = `${btnBase} bg-white hover:bg-slate-50 text-[#001838] border border-slate-200 shadow-xs font-normal`
  const fourBtn = `${btnBase} bg-[#16A34A] hover:bg-[#15803D] text-white font-normal shadow-sm`
  const sixBtn = `${btnBase} bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-normal shadow-sm`
  const extraBtn = `${btnBase} bg-[#FEF3C7] hover:bg-[#FDE68A] text-[#92400E] border border-[#FCD34D] font-sans text-xs tracking-wider uppercase font-medium shadow-xs`
  const wicketBtn = `${btnBase} bg-[#DC2626] hover:bg-[#B91C1C] text-white font-sans text-xs font-medium tracking-wider uppercase shadow-md`
  const toolBtn = `${btnBase} bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 font-sans text-xs font-normal tracking-wider uppercase`

  return (
    <div className="space-y-3 p-5 bg-white rounded-3xl border border-slate-200 shadow-sm">
      {/* Primary Run Buttons 0, 1, 2, 3 */}
      <div className="grid grid-cols-4 gap-2.5">
        {[0, 1, 2, 3].map(r => (
          <button
            key={r}
            className={`${runBtn} h-14 text-2xl`}
            onClick={() => onScore(r)}
            disabled={disabled}
          >
            {r}
          </button>
        ))}
      </div>

      {/* 4, 6, WIDE, NO BALL */}
      <div className="grid grid-cols-4 gap-2.5">
        <button
          className={`${fourBtn} h-14 text-2xl`}
          onClick={() => onScore(4)}
          disabled={disabled}
        >
          4
        </button>
        <button
          className={`${sixBtn} h-14 text-2xl`}
          onClick={() => onScore(6)}
          disabled={disabled}
        >
          6
        </button>
        <button
          className={`${extraBtn} h-14`}
          onClick={() => onScore(0, 'WIDE', 0)}
          disabled={disabled}
        >
          WIDE
        </button>
        <button
          className={`${extraBtn} h-14`}
          onClick={() => onScore(0, 'NO_BALL', 0)}
          disabled={disabled}
        >
          NO BALL
        </button>
      </div>

      {/* Wicket & Bye Row */}
      <div className="grid grid-cols-2 gap-2.5 relative">
        <button
          className={`${wicketBtn} h-14`}
          onClick={onWicket}
          disabled={disabled}
        >
          DISMISSAL / WICKET
        </button>
        
        <div className="relative">
          <button
            className={`w-full h-14 flex items-center justify-center gap-1.5 rounded-2xl bg-[#E0F2FE] hover:bg-[#BAE6FD] text-[#0369A1] border border-[#7DD3FC] font-sans text-xs font-medium tracking-wider uppercase shadow-xs transition-all cursor-pointer`}
            onClick={() => setShowByeMenu(!showByeMenu)}
            disabled={disabled}
          >
            <span>EXTRAS / BYES</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {showByeMenu && (
            <div className="absolute bottom-16 left-0 right-0 bg-white border border-slate-200 rounded-3xl p-4 space-y-3 z-30 shadow-2xl">
              {(['BYE', 'LEG_BYE'] as const).map(type => (
                <div key={type}>
                  <div className="text-[10px] font-medium text-slate-500 uppercase tracking-widest mb-1.5 px-1 font-editorial">
                    {type.replace('_', ' ')}
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[1, 2, 3, 4].map(r => (
                      <button
                        key={r}
                        className={`${runBtn} h-10 text-sm font-mono`}
                        onClick={() => {
                          onByeLegBye(type, r)
                          setShowByeMenu(false)
                        }}
                      >
                        +{r}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Undo & Swap Strike */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
        <button
          className={`${toolBtn} h-11 flex items-center justify-center gap-1.5`}
          onClick={onUndo}
          disabled={disabled}
        >
          <RotateCcw className="w-3.5 h-3.5 stroke-[1.5]" />
          <span>Undo Delivery</span>
        </button>
        <button
          className={`${toolBtn} h-11 flex items-center justify-center gap-1.5`}
          onClick={onChangeStrike}
          disabled={disabled}
        >
          <ArrowLeftRight className="w-3.5 h-3.5 stroke-[1.5]" />
          <span>Rotate Strike</span>
        </button>
      </div>
    </div>
  )
}



