'use client'

export interface BowlerRow {
  id: string
  name: string
  overs: string
  maidens: number
  runs: number
  wickets: number
  economy: number
  isBowling: boolean
}

interface BowlingCardProps {
  bowlers: BowlerRow[]
}

export function BowlingCard({ bowlers }: BowlingCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
      <div className="px-5 py-3 bg-[#0A2540] text-white flex items-center justify-between">
        <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          Bowling Analysis
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100/90 text-slate-700 text-xs uppercase font-bold tracking-wider">
              <th className="py-3 px-4 sm:px-5">Bowler</th>
              <th className="text-right py-3 px-3 sm:px-4">O</th>
              <th className="text-right py-3 px-3 sm:px-4">M</th>
              <th className="text-right py-3 px-3 sm:px-4">R</th>
              <th className="text-right py-3 px-3 sm:px-4 text-slate-900 font-extrabold">W</th>
              <th className="text-right py-3 px-4 sm:px-5">Econ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {bowlers.map((b) => (
              <tr
                key={b.id}
                className={`transition-colors ${
                  b.isBowling
                    ? 'bg-emerald-50/70 border-l-4 border-l-emerald-600'
                    : 'hover:bg-slate-50/80'
                }`}
              >
                <td className="py-3.5 px-4 sm:px-5">
                  <div className="flex items-center gap-2 text-slate-900">
                    <span className="font-semibold text-sm sm:text-base">{b.name}</span>
                    {b.isBowling && (
                      <span className="text-[10px] font-bold font-sans uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
                        BOWLING
                      </span>
                    )}
                  </div>
                </td>
                <td className="text-right py-3.5 px-3 sm:px-4 font-sans font-medium text-xs sm:text-sm text-slate-700">{b.overs}</td>
                <td className="text-right py-3.5 px-3 sm:px-4 font-sans font-medium text-xs sm:text-sm text-slate-700">{b.maidens}</td>
                <td className="text-right py-3.5 px-3 sm:px-4 font-sans font-medium text-xs sm:text-sm text-slate-700">{b.runs}</td>
                <td className="text-right py-3.5 px-3 sm:px-4 font-sans font-bold text-base sm:text-lg text-slate-900">{b.wickets}</td>
                <td className="text-right py-3.5 px-4 sm:px-5 font-sans font-medium text-xs sm:text-sm text-slate-600">{b.economy.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}




