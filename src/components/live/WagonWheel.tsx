'use client'
import { useState } from 'react'

export interface Shot {
  x: number
  y: number
  runs: number
  zone: string | null
}

interface WagonWheelProps {
  shots: Shot[]
}

export function WagonWheel({ shots }: WagonWheelProps) {
  const [filter, setFilter] = useState<'all' | '4s' | '6s' | 'boundaries'>('all')

  const filtered = shots.filter(s => {
    if (filter === '4s') return s.runs === 4
    if (filter === '6s') return s.runs === 6
    if (filter === 'boundaries') return s.runs >= 4
    return true
  })

  const getShotColor = (runs: number) => {
    if (runs >= 6) return '#F59E0B' // Bright Amber / Gold for 6s
    if (runs >= 4) return '#38BDF8' // Electric Sky Blue for 4s
    if (runs >= 1) return '#FFFFFF' // Crisp White for singles/doubles
    return '#CBD5E1'
  }

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 flex flex-col items-center shadow-sm">
      <div className="w-full flex items-center justify-between mb-4">
        <h3 className="font-editorial text-xs font-normal uppercase tracking-wider text-[#001838] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#059669]"></span>
          Wagon Wheel
        </h3>
        
        {/* Filter Toggles */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          {(['all', '4s', '6s', 'boundaries'] as const).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-lg text-[10px] font-medium uppercase tracking-wider transition-all cursor-pointer ${
                filter === f
                  ? 'bg-[#001838] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {f === 'all' ? 'All' : f === '4s' ? '4s' : f === '6s' ? '6s' : 'Boundaries'}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full max-w-[280px] aspect-square relative my-2">
        <svg viewBox="-100 -100 200 200" className="w-full h-full rounded-full bg-gradient-to-br from-[#16A34A] to-[#15803D] border-4 border-[#047857] shadow-inner select-none">
          {/* Field Boundary */}
          <circle cx="0" cy="0" r="95" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.8" />
          
          {/* 30-Yard Inner Circle */}
          <circle cx="0" cy="0" r="45" fill="none" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="2,2" opacity="0.6" />
          
          {/* Cricket Pitch Strip (Tan / Sand) */}
          <rect x="-3.5" y="-14" width="7" height="28" fill="#FDE68A" rx="1.5" stroke="#D97706" strokeWidth="0.5" />
          <rect x="-2" y="-12" width="4" height="2" fill="#92400E" />
          <rect x="-2" y="10" width="4" height="2" fill="#92400E" />

          {/* Fielder Position Indicator Dots */}
          {[
            [-30, -50], [30, -50], [-70, -20], [70, -20],
            [-50, 40], [50, 40], [0, -75], [0, 75], [-20, 20]
          ].map(([fx, fy], i) => (
            <circle key={i} cx={fx} cy={fy} r="2.5" fill="#FFFFFF" opacity="0.4" />
          ))}

          {/* Render Shot Vector Rays */}
          {filtered.map((shot, idx) => (
            <line
              key={`line-${idx}`}
              x1="0"
              y1="0"
              x2={shot.x * 90}
              y2={shot.y * 90}
              stroke={getShotColor(shot.runs)}
              strokeWidth={shot.runs >= 6 ? 2.5 : shot.runs >= 4 ? 2 : 1.2}
              strokeLinecap="round"
              opacity={0.9}
            />
          ))}

          {/* Shot Landing Points */}
          {filtered.map((shot, idx) => (
            <circle
              key={`dot-${idx}`}
              cx={shot.x * 90}
              cy={shot.y * 90}
              r={shot.runs >= 6 ? 4 : shot.runs >= 4 ? 3.5 : 2.5}
              fill={getShotColor(shot.runs)}
              stroke="#001838"
              strokeWidth="0.75"
              opacity={1}
            />
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex justify-center items-center gap-4 mt-3 text-[10px] font-medium uppercase tracking-wider text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-white border border-slate-300 inline-block" /> 1-3 Runs
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#38BDF8] inline-block" /> 4s
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] inline-block" /> 6s
        </span>
      </div>
    </div>
  )
}



