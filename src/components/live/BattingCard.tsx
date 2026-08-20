'use client'

export interface BatterRow {
  id: string
  name: string
  runs: number
  balls: number
  fours: number
  sixes: number
  strikeRate: number
  isOut: boolean
  isOnStrike: boolean
  howOut?: string
}

interface BattingCardProps {
  batters: BatterRow[]
  extras: { wides: number; noBalls: number; byes: number; legByes: number; total: number }
  totalRuns: number
  totalWickets: number
  totalOvers: string
}

export function BattingCard({ batters, extras, totalRuns, totalWickets, totalOvers }: BattingCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
      {/* ESPNcricinfo / Cricbuzz Style Table Header */}
      <div className="px-5 py-3 bg-[#001838] text-white flex items-center justify-between">
        <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
          Batting Scorecard
        </h3>
        <span className="text-xs sm:text-sm font-sans font-bold text-amber-300">
          {totalRuns}/{totalWickets} <span className="font-normal text-slate-300">({totalOvers} ov)</span>
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100/90 text-slate-700 text-xs uppercase font-bold tracking-wider">
              <th className="py-3 px-4 sm:px-5">Batters</th>
              <th className="text-right py-3 px-3 sm:px-4 text-slate-900 font-extrabold">R</th>
              <th className="text-right py-3 px-3 sm:px-4">B</th>
              <th className="text-right py-3 px-3 sm:px-4">4s</th>
              <th className="text-right py-3 px-3 sm:px-4">6s</th>
              <th className="text-right py-3 px-4 sm:px-5">SR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {batters.map((b) => (
              <tr
                key={b.id}
                className={`transition-colors ${
                  b.isOnStrike && !b.isOut
                    ? 'bg-blue-50/70 border-l-4 border-l-[#0066CC]'
                    : 'hover:bg-slate-50/80'
                }`}
              >
                <td className="py-3.5 px-4 sm:px-5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm sm:text-base font-semibold ${
                        b.isOut
                          ? 'text-slate-800'
                          : 'text-[#0066CC] hover:underline cursor-pointer'
                      }`}
                    >
                      {b.name}
                      {b.isOnStrike && !b.isOut && <span className="text-red-500 font-bold ml-1">*</span>}
                    </span>
                  </div>
                  {b.isOut ? (
                    <div className="text-xs text-slate-500 font-normal mt-0.5">
                      {b.howOut || 'out'}
                    </div>
                  ) : (
                    <div className="text-xs text-emerald-600 font-medium mt-0.5">
                      not out
                    </div>
                  )}
                </td>
                <td className="text-right py-3.5 px-3 sm:px-4 font-sans font-bold text-base sm:text-lg text-slate-900">
                  {b.runs}
                </td>
                <td className="text-right py-3.5 px-3 sm:px-4 font-sans font-medium text-xs sm:text-sm text-slate-700">
                  {b.balls}
                </td>
                <td className="text-right py-3.5 px-3 sm:px-4 font-sans font-medium text-xs sm:text-sm text-slate-700">
                  {b.fours}
                </td>
                <td className="text-right py-3.5 px-3 sm:px-4 font-sans font-medium text-xs sm:text-sm text-slate-700">
                  {b.sixes}
                </td>
                <td className="text-right py-3.5 px-4 sm:px-5 font-sans font-medium text-xs sm:text-sm text-slate-600">
                  {b.strikeRate.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap justify-between items-center gap-3 text-xs sm:text-sm text-slate-600 font-normal">
        <span>
          Extras: <strong className="text-slate-900 font-bold">{extras.total}</strong>{' '}
          <span className="text-slate-500 text-xs">
            (b {extras.byes}, lb {extras.legByes}, w {extras.wides}, nb {extras.noBalls})
          </span>
        </span>
        <span className="font-medium text-slate-800">
          TOTAL: <strong className="text-slate-950 font-bold text-sm sm:text-base">{totalRuns}</strong>{' '}
          <span className="text-slate-600">({totalWickets} wkts, {totalOvers} ov)</span>
        </span>
      </div>
    </div>
  )
}




