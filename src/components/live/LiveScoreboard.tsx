'use client'
import { useState } from 'react'
import { Share2, Check, Radio } from 'lucide-react'

interface LiveScoreboardProps {
  teamName: string
  score: number
  wickets: number
  overs: string
  crr: number
  rrr: number | null
  target: number | null
  matchStatus?: string
  result?: string | null
}

export function LiveScoreboard({
  teamName,
  score,
  wickets,
  overs,
  crr,
  rrr,
  target,
  matchStatus,
  result
}: LiveScoreboardProps) {
  const [copied, setCopied] = useState(false)

  const handleShare = () => {
    const text = `${teamName}: ${score}/${wickets} (${overs} ov) | CRR: ${crr.toFixed(2)}${target ? ` | Target: ${target}` : ''}\nFollow live on CricEngine: ${window.location.href}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-2xl bg-gradient-to-r from-[#001838] via-[#00224D] to-[#047857] text-white p-6 sm:p-7 shadow-lg border border-slate-800 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
          <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-wide">{teamName}</h2>
          {matchStatus && (
            <span className="text-[10px] font-medium tracking-wider px-2.5 py-0.5 rounded-md bg-white/10 text-slate-200 border border-white/15 uppercase">
              {matchStatus.replace('_', ' ')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {target !== null && (
            <div className="text-xs font-mono text-amber-300 bg-amber-500/20 px-3 py-1 rounded-lg border border-amber-400/30 font-medium">
              TARGET: <span className="text-white font-bold">{target}</span>
            </div>
          )}
          <button
            onClick={handleShare}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer border border-white/10 text-xs flex items-center gap-1"
            title="Share Match Summary"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            <span className="text-[11px] hidden sm:inline">{copied ? 'Copied' : 'Share'}</span>
          </button>
        </div>
      </div>

      <div className="flex items-baseline gap-4 my-2">
        <span className="text-6xl sm:text-8xl font-sans font-bold text-white tracking-tight leading-none">
          {score}<span className="text-slate-400 font-light text-4xl sm:text-6xl">/</span>{wickets}
        </span>
        <span className="text-slate-300 text-2xl sm:text-3xl font-mono font-medium">
          ({overs} <span className="text-xs uppercase font-sans font-normal text-slate-400">ov</span>)
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-6 pt-3 border-t border-white/10 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 uppercase text-[11px]">CRR:</span>
          <span className="text-white font-mono font-semibold text-sm">{crr.toFixed(2)}</span>
        </div>

        {rrr !== null && rrr > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-slate-400 uppercase text-[11px]">REQ RR:</span>
            <span className="font-mono text-amber-300 font-semibold text-sm">
              {rrr.toFixed(2)}
            </span>
          </div>
        )}

        {target !== null && target > score && (
          <div className="flex items-center gap-1.5 sm:ml-auto text-slate-300 font-light">
            Need <span className="text-white font-mono font-bold px-1.5 py-0.5 bg-white/15 rounded text-xs">{target - score}</span> runs to win
          </div>
        )}
      </div>

      {result && (
        <div className="mt-3 p-3 bg-emerald-600/90 text-white rounded-xl text-center text-xs font-semibold uppercase tracking-wider shadow-sm">
          {result}
        </div>
      )}
    </div>
  )
}




