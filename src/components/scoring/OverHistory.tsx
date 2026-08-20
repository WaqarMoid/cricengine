'use client'

interface OverHistoryProps {
  currentOverBalls: string[]
  overSummaries: Array<{ overNumber: number; runs: number; wickets: number; balls: string[] }>
}

export function OverHistory({ currentOverBalls, overSummaries }: OverHistoryProps) {
  const getBallStyle = (ball: string) => {
    if (ball.includes('W')) return 'bg-[#DC2626] text-white border-[#B91C1C]' // Cricinfo Red
    if (ball === '4') return 'bg-[#16A34A] text-white border-[#15803D]' // Cricinfo Green for 4s
    if (ball === '6') return 'bg-[#2563EB] text-white border-[#1D4ED8]' // Cricinfo Royal Blue for 6s
    if (ball.includes('Wd') || ball.includes('Nb')) return 'bg-[#FDE68A] text-[#92400E] border-[#F59E0B]' // Amber for Extras
    if (ball === '.') return 'bg-white text-slate-400 border-slate-200'
    return 'bg-slate-100 text-slate-800 border-slate-200'
  }

  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-200 space-y-4 shadow-sm">
      {/* Current Over Ribbon */}
      <div className="flex items-center gap-3">
        <span className="font-editorial text-xs font-normal text-[#001838] uppercase tracking-wider min-w-[70px]">
          This Over
        </span>
        <div className="flex gap-2 flex-wrap items-center">
          {currentOverBalls.map((ball, i) => (
            <span
              key={i}
              className={`${getBallStyle(ball)} w-8 h-8 rounded-xl flex items-center justify-center text-xs font-mono font-normal border transition-all shadow-xs`}
            >
              {ball}
            </span>
          ))}
          {Array.from({ length: Math.max(0, 6 - currentOverBalls.length) }).map((_, i) => (
            <span
              key={`empty-${i}`}
              className="w-8 h-8 rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-slate-300 text-xs font-mono"
            >
              •
            </span>
          ))}
        </div>
      </div>

      {/* Previous Overs (last 3) */}
      {overSummaries.length > 0 && (
        <div className="pt-3 border-t border-slate-100 space-y-2 font-light">
          {overSummaries.slice(-3).reverse().map((over) => (
            <div key={over.overNumber} className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-mono text-[11px] min-w-[70px]">
                Over {over.overNumber}
              </span>
              <div className="flex gap-1.5 flex-wrap items-center">
                {over.balls.map((ball, i) => (
                  <span
                    key={i}
                    className={`${getBallStyle(ball)} w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-mono font-normal border`}
                  >
                    {ball}
                  </span>
                ))}
              </div>
              <span className="text-[#001838] font-mono ml-auto text-[11px] font-normal">
                {over.runs} R {over.wickets > 0 ? `• ${over.wickets} W` : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}



