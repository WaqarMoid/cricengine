'use client'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface WormChartProps {
  inn1Summaries: Array<{ overNumber: number; runs: number; wickets: number }>
  inn2Summaries?: Array<{ overNumber: number; runs: number; wickets: number }>
  team1Name: string
  team2Name: string
}

export function WormChart({
  inn1Summaries,
  inn2Summaries = [],
  team1Name,
  team2Name,
}: WormChartProps) {
  if (!inn1Summaries || inn1Summaries.length === 0) return null

  // Calculate cumulative runs
  let cumRuns1 = 0
  const inn1Map: Record<number, number> = {}
  inn1Summaries.forEach(s => {
    cumRuns1 += s.runs
    inn1Map[s.overNumber] = cumRuns1
  })

  let cumRuns2 = 0
  const inn2Map: Record<number, number> = {}
  inn2Summaries.forEach(s => {
    cumRuns2 += s.runs
    inn2Map[s.overNumber] = cumRuns2
  })

  const maxOvers = Math.max(
    ...inn1Summaries.map(s => s.overNumber),
    ...inn2Summaries.map(s => s.overNumber),
    1
  )

  const data = []
  for (let ov = 1; ov <= maxOvers; ov++) {
    data.push({
      over: `Ov ${ov}`,
      [team1Name]: inn1Map[ov] !== undefined ? inn1Map[ov] : null,
      [team2Name]: inn2Map[ov] !== undefined ? inn2Map[ov] : null,
    })
  }

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#001838] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#0066CC]"></span>
          Run Comparison Worm (Cumulative Runs)
        </h3>
      </div>

      <div className="w-full h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="over"
              tick={{ fill: '#64748B', fontSize: 10 }}
              axisLine={{ stroke: '#E2E8F0' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#64748B', fontSize: 10 }}
              axisLine={{ stroke: '#E2E8F0' }}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-[#001838] p-2.5 rounded-lg text-xs text-white shadow-md border border-white/10 space-y-1">
                      <div className="font-semibold text-slate-300">{label}</div>
                      {payload.map((p, idx) => (
                        <div key={idx} className="flex justify-between gap-3 text-[11px]">
                          <span style={{ color: p.color }}>{p.name}:</span>
                          <span className="font-mono font-medium">{p.value} runs</span>
                        </div>
                      ))}
                    </div>
                  )
                }
                return null
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
              iconType="circle"
            />
            <Line
              type="monotone"
              dataKey={team1Name}
              stroke="#0066CC"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#0066CC' }}
              connectNulls
            />
            {inn2Summaries.length > 0 && (
              <Line
                type="monotone"
                dataKey={team2Name}
                stroke="#059669"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#059669' }}
                connectNulls
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
