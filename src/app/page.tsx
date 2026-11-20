'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Plus, Radio, Lock, Trophy, ArrowRight, X, KeyRound, CheckCircle2, Shield, Eye } from 'lucide-react'

export default function DashboardPage() {
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMatchForPin, setSelectedMatchForPin] = useState<any | null>(null)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')
  const [pinLoading, setPinLoading] = useState(false)
  const [tournaments, setTournaments] = useState<any[]>([])

  useEffect(() => {
    fetchMatches()
    fetch('/api/tournaments')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setTournaments(d) })
      .catch(() => {})
  }, [])

  const sideScore = (m: any, side: 'A' | 'B') => {
    const inn = m.summary?.innings?.find((i: any) => i.side === side)
    return inn ? `${inn.runs}/${inn.wickets} (${inn.overs})` : ''
  }
  const contextLabel = (m: any) =>
    m.tournament ? `${m.tournament.shortName || m.tournament.name} · ${m.matchLabel || ''}` : m.matchLabel || 'One-off'

  async function fetchMatches() {
    try {
      const res = await fetch('/api/matches')
      const data = await res.json()
      setMatches(Array.isArray(data) ? data : [])
    } catch {
      setMatches([])
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyPin(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedMatchForPin) return
    setPinError('')
    setPinLoading(true)

    try {
      const res = await fetch(`/api/matches/${selectedMatchForPin.id}/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput }),
      })
      const { valid } = await res.json()
      if (valid) {
        sessionStorage.setItem(`scorer-auth-${selectedMatchForPin.id}`, pinInput)
        window.location.href = `/score/${selectedMatchForPin.id}`
      } else {
        setPinError('Incorrect 6-digit PIN. Please try again.')
        setPinLoading(false)
      }
    } catch {
      setPinError('Unable to connect. Please check your connection.')
      setPinLoading(false)
    }
  }

  const liveMatches = matches.filter(m => m.status === 'IN_PROGRESS' || m.status === 'INNINGS_BREAK')
  const featuredMatch = liveMatches[0] || matches[0] || null

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] pb-24">
      <Navbar />

      {/* Top Live Scores Strip */}
      <div className="bg-[#00142E] border-b border-[#0A2540] overflow-x-auto py-2 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-3 min-w-max">
          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-mono pr-3 border-r border-white/10">
            <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" />
            <span className="font-medium text-[11px]">MATCH TICKER</span>
          </div>

          {matches.length === 0 ? (
            <div className="text-xs text-slate-400 font-light">No matches available. Create a new match to get started.</div>
          ) : (
            matches.slice(0, 6).map((m) => (
              <Link
                key={m.id}
                href={`/live/${m.id}`}
                className="flex items-center gap-2.5 bg-white/5 hover:bg-white/10 px-3 py-1 rounded-md border border-white/10 text-xs transition-colors"
              >
                <span className="text-[10px] font-mono text-slate-400">{m.oversLimit} ov</span>
                <span className="text-white font-medium">{m.teamAName} vs {m.teamBName}</span>
                {m.status === 'IN_PROGRESS' ? (
                  <span className="text-[9px] font-mono text-red-400 font-medium px-1.5 py-0.2 rounded bg-red-500/20">LIVE</span>
                ) : (
                  <span className="text-[9px] font-mono text-slate-400">{m.status.replace('_', ' ')}</span>
                )}
              </Link>
            ))
          )}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Simple Header & Instructions Bar */}
        <section className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h1 className="text-lg font-semibold text-[#001838]">
                CricEngine — Cricket Match Scorer Tool
              </h1>
              <p className="text-xs text-slate-500 font-light">
                Digital scoring for local, club, and tournament cricket matches.
              </p>
            </div>
            <Link
              href="/matches/new"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0066CC] hover:bg-[#0052A3] text-white text-xs font-medium transition-colors shadow-2xs self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Match</span>
            </Link>
          </div>

          {/* 3 Step Visual Instructions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="w-6 h-6 rounded-full bg-[#001838] text-white flex items-center justify-center text-xs font-medium shrink-0">
                1
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-medium text-slate-900">Setup Match & Teams</div>
                <p className="text-[11px] text-slate-500 font-light">
                  Add team names, player lineups, and over limits. A private 6-digit PIN key is created.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="w-6 h-6 rounded-full bg-[#0066CC] text-white flex items-center justify-center text-xs font-medium shrink-0">
                2
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-medium text-slate-900">Scorer Access (PIN Locked)</div>
                <p className="text-[11px] text-slate-500 font-light">
                  Enter your 6-digit PIN to open the scorer console, score balls, wickets, extras, and overs.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-medium shrink-0">
                3
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-medium text-slate-900">Public Live Feed</div>
                <p className="text-[11px] text-slate-500 font-light">
                  Spectators and players can follow the live scorecard and wagon wheel without any login.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Featured / Active Match Card */}
        {featuredMatch && (
          <section className="bg-[#001838] text-white rounded-xl p-5 sm:p-6 shadow-sm border border-slate-800 space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-300 border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-white">{featuredMatch.oversLimit} Overs Match</span>
                <span>•</span>
                <span className="truncate">{featuredMatch.tournament ? contextLabel(featuredMatch) : `Match #${featuredMatch.id.slice(0, 6)}`}</span>
              </div>
              {featuredMatch.status === 'IN_PROGRESS' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-medium uppercase animate-pulse">
                  <span className="w-1 h-1 rounded-full bg-white"></span>
                  Live Match
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-md bg-white/10 text-slate-300 text-[10px] uppercase">
                  {featuredMatch.status.replace('_', ' ')}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4 py-2 text-center md:text-left">
              <div>
                <h3 className="text-xl font-medium text-white">{featuredMatch.teamAName}</h3>
                <p className="text-xs text-slate-300 font-mono">{sideScore(featuredMatch, 'A') || `Innings ${featuredMatch.currentInnings}`}</p>
              </div>

              <div className="text-center space-y-1">
                <div className="text-xs font-mono text-amber-400">
                  {featuredMatch.summary?.result?.text || (featuredMatch.status === 'IN_PROGRESS' ? 'IN PROGRESS' : featuredMatch.status.replace('_', ' '))}
                </div>
                <div className="text-sm text-slate-300 font-light">
                  {featuredMatch.tossWinner ? (
                    <span>Toss: <strong>{featuredMatch.tossWinner}</strong> ({featuredMatch.tossDecision?.toLowerCase()})</span>
                  ) : (
                    <span>{featuredMatch.teamAName} vs {featuredMatch.teamBName}</span>
                  )}
                </div>
              </div>

              <div className="text-center md:text-right">
                <h3 className="text-xl font-medium text-white">{featuredMatch.teamBName}</h3>
                <p className="text-xs text-slate-300 font-mono">{sideScore(featuredMatch, 'B') || 'Opponent'}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
              <span className="text-xs text-slate-400 font-light">
                Use Scorer button with your 6-digit key to score this match.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedMatchForPin(featuredMatch)
                    setPinInput('')
                    setPinError('')
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors border border-white/15 flex items-center gap-1.5 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-300" />
                  <span>Open Scorer Console</span>
                </button>
                <Link
                  href={`/live/${featuredMatch.id}`}
                  className="px-3.5 py-1.5 rounded-lg bg-[#0066CC] hover:bg-[#0052A3] text-white text-xs font-medium transition-colors shadow-2xs"
                >
                  Live Feed ➔
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Tournaments */}
        {tournaments.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h2 className="text-sm font-semibold text-[#001838] uppercase tracking-wide">Tournaments</h2>
              <Link href="/tournaments" className="text-xs text-[#0066CC] hover:underline font-medium">View all</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {tournaments.slice(0, 2).map((t) => (
                <Link key={t.id} href={`/tournaments/${t.id}`} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3 hover:border-[#0066CC]/50 transition-colors shadow-2xs">
                  <div className="w-10 h-10 rounded-lg bg-[#001838] text-amber-300 flex items-center justify-center shrink-0">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-[#001838] truncate">{t.name}</div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {t.teamCount} teams · {t.played}/{t.matchCount} played · {t.oversPerMatch} overs
                    </div>
                    {t.champion && <div className="text-[11px] text-amber-700 font-medium truncate">🏆 {t.champion} — {t.finalResult}</div>}
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* All Matches Directory */}
        <section className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h2 className="text-sm font-semibold text-[#001838] uppercase tracking-wide">
              All Matches ({matches.length})
            </h2>
            <Link
              href="/matches/new"
              className="text-xs text-[#0066CC] hover:underline font-medium"
            >
              + Create Match
            </Link>
          </div>

          {matches.length === 0 && !loading ? (
            <div className="bg-white rounded-xl p-8 text-center border border-slate-200 space-y-3 shadow-2xs">
              <Trophy className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="text-sm font-medium text-slate-800">No matches found</div>
              <p className="text-xs text-slate-500 max-w-xs mx-auto font-light">
                Click below to set up team names, overs, and players to start scoring.
              </p>
              <Link
                href="/matches/new"
                className="inline-flex items-center gap-1.5 bg-[#0066CC] text-white text-xs font-medium px-3.5 py-2 rounded-lg"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Match</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {matches.map((match) => (
                <div
                  key={match.id}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs hover:border-[#0066CC]/50 transition-colors flex flex-col justify-between"
                >
                  <div className="bg-slate-50 px-4 py-2 flex items-center justify-between text-xs border-b border-slate-200">
                    <span className="font-mono text-slate-600 font-light truncate pr-2">
                      {match.oversLimit} ov · {contextLabel(match)}
                    </span>
                    {match.status === 'IN_PROGRESS' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.2 rounded-full bg-red-600 text-white">
                        LIVE
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.2 rounded-full bg-slate-200 text-slate-700">
                        {match.status.replace('_', ' ')}
                      </span>
                    )}
                  </div>

                  <div className="p-4 space-y-2">
                    {(['A', 'B'] as const).map(side => {
                      const won = match.summary?.result?.winner === side
                      return (
                        <div key={side} className="flex items-center justify-between gap-2 text-sm">
                          <span className={`truncate ${won ? 'font-semibold text-[#001838]' : 'font-medium text-slate-900'}`}>
                            {side === 'A' ? match.teamAName : match.teamBName}
                          </span>
                          <span className="text-xs font-mono text-slate-600 shrink-0">{sideScore(match, side)}</span>
                        </div>
                      )
                    })}

                    <div className="pt-2 border-t border-slate-100 text-[11px] font-light flex justify-between gap-2">
                      {match.summary?.result ? (
                        <span className="text-emerald-700 font-medium truncate">{match.summary.result.text}</span>
                      ) : (
                        <span className="text-slate-500">{match._count?.ballEvents || 0} balls bowled</span>
                      )}
                      {match.tossWinner && !match.summary?.result && <span className="text-slate-500 truncate">Toss: {match.tossWinner}</span>}
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-50 border-t border-slate-200 grid grid-cols-3 gap-1.5 text-xs">
                    <button
                      onClick={() => {
                        setSelectedMatchForPin(match)
                        setPinInput('')
                        setPinError('')
                      }}
                      className="py-1.5 rounded-md bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-center font-medium transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Lock className="w-3 h-3 text-slate-400" />
                      <span>Scorer</span>
                    </button>
                    <Link
                      href={`/live/${match.id}`}
                      className="py-1.5 rounded-md bg-[#0066CC] hover:bg-[#0052A3] text-white text-center font-medium transition-colors"
                    >
                      Live Feed
                    </Link>
                    <Link
                      href={`/matches/${match.id}/scorecard`}
                      className="py-1.5 rounded-md bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 text-center font-medium transition-colors"
                    >
                      Scorecard
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* PIN Security Modal for Scorer Console Access */}
      {selectedMatchForPin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full border border-slate-200 shadow-xl space-y-4">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-[#001838] flex items-center justify-center text-white">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-900">Enter 6-Digit Scorer PIN</h3>
                  <p className="text-[11px] text-slate-500">{selectedMatchForPin.teamAName} vs {selectedMatchForPin.teamBName}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedMatchForPin(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 font-light">
              Enter the 6-digit match key to unlock the scoring console and match controls.
            </p>

            <form onSubmit={handleVerifyPin} className="space-y-3">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-center text-2xl font-mono tracking-[0.3em] text-[#001838] focus:border-[#0066CC] focus:bg-white focus:outline-none transition-colors"
                placeholder="••••••"
                autoFocus
              />

              {pinError && <p className="text-red-600 text-xs text-center font-medium">{pinError}</p>}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedMatchForPin(null)}
                  className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pinInput.length !== 6 || pinLoading}
                  className="flex-1 py-2 rounded-lg bg-[#0066CC] hover:bg-[#0052A3] disabled:opacity-40 text-white text-xs font-medium transition-colors disabled:cursor-not-allowed cursor-pointer shadow-xs"
                >
                  {pinLoading ? 'Verifying...' : 'Unlock Scorer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}





