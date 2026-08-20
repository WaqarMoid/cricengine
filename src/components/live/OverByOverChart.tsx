'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface OverByOverChartProps {
  overSummaries: Array<{ overNumber: number; runs: number; wickets: number }>
}

export function OverByOverChart({ overSummaries }: OverByOverChartProps) {
  if (!overSummaries || overSummaries.length === 0) {
    return null
  }

  const data = overSummaries.map(o => ({
    name: `Ov ${o.overNumber}`,
    runs: o.runs,
    wickets: o.wickets,
  }))

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-editorial text-xs font-normal uppercase tracking-wider text-[#001838] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#0066CC]"></span>
          Manhattan Run Rate Progression
        </h3>
      </div>
      <div className="w-full h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="name"
              tick={{ fill: '#64748B', fontSize: 10, fontWeight: 400 }}
              axisLine={{ stroke: '#E2E8F0' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#64748B', fontSize: 10, fontWeight: 400 }}
              axisLine={{ stroke: '#E2E8F0' }}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload
                  return (
                    <div className="bg-[#001838] border border-white/15 p-3 rounded-xl shadow-xl text-xs text-white">
                      <div className="font-editorial font-normal text-white mb-0.5">{item.name}</div>
                      <div className="text-[#38BDF8] font-mono">{item.runs} runs</div>
                      {item.wickets > 0 && (
                        <div className="text-[#F87171] font-medium">{item.wickets} wicket(s)</div>
                      )}
                    </div>
                  )
                }
                return null
              }}
            />
            <Bar dataKey="runs" radius={[6, 6, 0, 0]} isAnimationActive={false}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.wickets > 0 ? '#DC2626' : entry.runs >= 10 ? '#0066CC' : '#059669'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}



