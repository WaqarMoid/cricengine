'use client'
import { useState } from 'react'

const ZONES = [
  { name: 'THIRD_MAN', label: 'Third Man', angle: -67.5 },
  { name: 'POINT', label: 'Point', angle: -22.5 },
  { name: 'COVER', label: 'Cover', angle: 22.5 },
  { name: 'LONG_OFF', label: 'Long Off', angle: 67.5 },
  { name: 'LONG_ON', label: 'Long On', angle: 112.5 },
  { name: 'MID_WICKET', label: 'Mid Wicket', angle: 157.5 },
  { name: 'SQUARE_LEG', label: 'Square Leg', angle: 202.5 },
  { name: 'FINE_LEG', label: 'Fine Leg', angle: 247.5 },
]

interface WagonWheelSelectorProps {
  onSelect: (x: number, y: number, zone: string) => void
  onSkip: () => void
  runs: number
}

export function WagonWheelSelector({ onSelect, onSkip, runs }: WagonWheelSelectorProps) {
  const [selectedPoint, setSelectedPoint] = useState<{ x: number; y: number } | null>(null)

  function handleClick(e: React.MouseEvent<SVGSVGElement>) {
    const svg = e.currentTarget
    const rect = svg.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 200 - 100
    const y = ((e.clientY - rect.top) / rect.height) * 200 - 100
    
    // Normalize to -1..1
    const nx = Math.round((x / 90) * 100) / 100
    const ny = Math.round((y / 90) * 100) / 100

    setSelectedPoint({ x: nx, y: ny })

    // Determine zone based on angle
    const angle = (Math.atan2(ny, nx) * 180 / Math.PI + 360) % 360
    const zone = ZONES.reduce((closest, z) => {
      const za = (z.angle + 360) % 360
      const diff = Math.abs(angle - za)
      const cdiff = Math.abs(angle - ((closest.angle + 360) % 360))
      return diff < cdiff ? z : closest
    })

    onSelect(nx, ny, zone.name)
  }

  const strokeColor = runs >= 6 ? '#F59E0B' : runs >= 4 ? '#38BDF8' : '#FFFFFF'

  return (
    <div className="fixed inset-0 bg-[#001838]/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-7 w-full max-w-sm border border-slate-200 shadow-2xl space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-editorial text-[#001838] font-normal text-sm uppercase tracking-wider">Select Shot Direction</h3>
            <p className="text-[11px] text-slate-500 font-light">Tap on the field where the ball was hit ({runs} runs)</p>
          </div>
          <button
            onClick={onSkip}
            className="text-xs font-normal text-slate-600 bg-slate-100 hover:bg-slate-200 px-3.5 py-1.5 rounded-xl border border-slate-200 transition-colors cursor-pointer"
          >
            Skip
          </button>
        </div>

        <div className="relative aspect-square w-full">
          <svg
            viewBox="-100 -100 200 200"
            className="w-full h-full rounded-full bg-gradient-to-br from-[#16A34A] to-[#15803D] border-4 border-[#047857] shadow-inner cursor-crosshair select-none"
            onClick={handleClick}
          >
            {/* Field boundary */}
            <circle cx="0" cy="0" r="95" className="fill-none" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.8" />
            
            {/* Inner ring (30-yard circle) */}
            <circle cx="0" cy="0" r="45" className="fill-none" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="2,2" opacity="0.6" />
            
            {/* Pitch Strip */}
            <rect x="-3.5" y="-14" width="7" height="28" fill="#FDE68A" rx="1.5" stroke="#D97706" strokeWidth="0.5" />

            {/* Zone divider lines */}
            {ZONES.map(zone => {
              const rad = ((zone.angle - 22.5) * Math.PI) / 180
              return (
                <line
                  key={`line-${zone.name}`}
                  x1="0"
                  y1="0"
                  x2={Math.cos(rad) * 95}
                  y2={Math.sin(rad) * 95}
                  stroke="#FFFFFF"
                  strokeWidth="0.5"
                  opacity="0.3"
                />
              )
            })}

            {/* Zone labels */}
            {ZONES.map(zone => {
              const rad = (zone.angle * Math.PI) / 180
              const lx = Math.cos(rad) * 72
              const ly = Math.sin(rad) * 72
              return (
                <text
                  key={zone.name}
                  x={lx}
                  y={ly}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#FFFFFF"
                  fontSize="4.5"
                  fontWeight="500"
                  fontFamily="system-ui"
                  className="pointer-events-none select-none drop-shadow-md"
                  opacity="0.9"
                >
                  {zone.label}
                </text>
              )
            })}

            {/* Selected shot vector */}
            {selectedPoint && (
              <g>
                <line
                  x1="0"
                  y1="0"
                  x2={selectedPoint.x * 90}
                  y2={selectedPoint.y * 90}
                  stroke={strokeColor}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <circle
                  cx={selectedPoint.x * 90}
                  cy={selectedPoint.y * 90}
                  r="5"
                  fill={strokeColor}
                  stroke="#001838"
                  strokeWidth="1.5"
                />
              </g>
            )}
          </svg>
        </div>
      </div>
    </div>
  )
}



