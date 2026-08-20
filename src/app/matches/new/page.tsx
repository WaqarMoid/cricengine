'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Check, Copy, ArrowRight, X, Plus, Users, ShieldCheck, Trophy, Sparkles } from 'lucide-react'

export default function NewMatchPage() {
  const router = useRouter()

  const [teamAName, setTeamAName] = useState('')
  const [teamBName, setTeamBName] = useState('')
  const [oversLimit, setOversLimit] = useState(20)
  const [tossWinner, setTossWinner] = useState<'A' | 'B'>('A')
  const [tossDecision, setTossDecision] = useState<'BAT' | 'BOWL'>('BAT')

  const [existingPlayers, setExistingPlayers] = useState<Array<{ id: string; name: string }>>([])
  const [teamAPlayers, setTeamAPlayers] = useState<string[]>([])
  const [teamBPlayers, setTeamBPlayers] = useState<string[]>([])

  const [playerAInput, setPlayerAInput] = useState('')
  const [playerBInput, setPlayerBInput] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [createdMatch, setCreatedMatch] = useState<{ id: string; scorerPin: string } | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/players')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setExistingPlayers(data)
      })
      .catch(() => {})
  }, [])

  const handleAddPlayerA = () => {
    if (playerAInput.trim() && !teamAPlayers.includes(playerAInput.trim())) {
      setTeamAPlayers([...teamAPlayers, playerAInput.trim()])
      setPlayerAInput('')
    }
  }

  const handleAddPlayerB = () => {
    if (playerBInput.trim() && !teamBPlayers.includes(playerBInput.trim())) {
      setTeamBPlayers([...teamBPlayers, playerBInput.trim()])
      setPlayerBInput('')
    }
  }

  const handleRemovePlayerA = (name: string) => {
    setTeamAPlayers(teamAPlayers.filter(p => p !== name))
  }

  const handleRemovePlayerB = (name: string) => {
    setTeamBPlayers(teamBPlayers.filter(p => p !== name))
  }

  const handleQuickFill = () => {
    setTeamAName('England Men')
    setTeamBName('Pakistan Men')
    setTeamAPlayers(['Ben Duckett', 'Emilio Gay', 'Jordan Cox', 'Joe Root (c)', 'Harry Brook', 'Dan Lawrence'])
    setTeamBPlayers(['Abdullah Shafique', 'Shan Masood (c)', 'Babar Azam', 'Saud Shakeel', 'Mohammad Rizwan (wk)', 'Agha Salman'])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!teamAName.trim() || !teamBName.trim()) {
      setError('Please provide names for both teams.')
      return
    }

    if (teamAPlayers.length < 2 || teamBPlayers.length < 2) {
      setError('Each team must have at least 2 players registered.')
      return
    }

    setLoading(true)

    try {
      const teamAPlayerIds: string[] = []
      for (const name of teamAPlayers) {
        const existing = existingPlayers.find(p => p.name.toLowerCase() === name.toLowerCase())
        if (existing) {
          teamAPlayerIds.push(existing.id)
        } else {
          const res = await fetch('/api/players', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, battingStyle: 'RIGHT_HAND' }),
          })
          const created = await res.json()
          if (!res.ok) throw new Error(created.error || 'Failed to create player')
          teamAPlayerIds.push(created.id)
        }
      }

      const teamBPlayerIds: string[] = []
      for (const name of teamBPlayers) {
        const existing = existingPlayers.find(p => p.name.toLowerCase() === name.toLowerCase())
        if (existing) {
          teamBPlayerIds.push(existing.id)
        } else {
          const res = await fetch('/api/players', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, battingStyle: 'RIGHT_HAND' }),
          })
          const created = await res.json()
          if (!res.ok) throw new Error(created.error || 'Failed to create player')
          teamBPlayerIds.push(created.id)
        }
      }

      const tossWinnerName = tossWinner === 'A' ? teamAName : teamBName
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamAName,
          teamBName,
          oversLimit,
          tossWinner: tossWinnerName,
          tossDecision,
          teamAPlayerIds,
          teamBPlayerIds,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        let errorMessage = 'Failed to create match'
        if (data.error) {
          if (typeof data.error === 'string') {
            errorMessage = data.error
          } else if (data.error.fieldErrors) {
            errorMessage = Object.values(data.error.fieldErrors).flat().join(', ')
          } else if (data.error.formErrors) {
            errorMessage = data.error.formErrors.join(', ')
          }
        }
        throw new Error(errorMessage)
      }

      // Store in session
      sessionStorage.setItem(`scorer-auth-${data.id}`, data.scorerPin)
      setCreatedMatch({ id: data.id, scorerPin: data.scorerPin })
    } catch (err: any) {
      setError(err.message || 'Failed to create match')
    } finally {
      setLoading(false)
    }
  }

  const copyPin = () => {
    if (createdMatch?.scorerPin) {
      navigator.clipboard.writeText(createdMatch.scorerPin)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] pb-24">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {createdMatch ? (
          <div className="bg-white rounded-2xl p-8 sm:p-12 border border-slate-200 shadow-xl text-center space-y-6 max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md">
              <Check className="w-7 h-7 stroke-[2]" />
            </div>
            
            <div className="space-y-1.5">
              <h1 className="font-editorial text-2xl font-normal text-[#001838]">Match Initialized Successfully</h1>
              <p className="text-xs text-slate-500 font-light leading-relaxed">
                Your 6-digit scorekeeper PIN key is generated. Keep this secure to manage and score this fixture.
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 space-y-3">
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium block">
                Official Scorekeeper PIN
              </span>
              <div className="text-4xl font-mono text-[#001838] tracking-[0.3em] font-normal">
                {createdMatch.scorerPin}
              </div>
              <button
                type="button"
                onClick={copyPin}
                className="inline-flex items-center gap-1.5 text-xs text-[#0066CC] font-medium bg-white px-3.5 py-1.5 rounded-lg border border-slate-200 hover:border-[#0066CC] transition-colors cursor-pointer shadow-2xs"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied to Clipboard' : 'Copy PIN'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <Link
                href={`/score/${createdMatch.id}`}
                className="inline-flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl bg-[#0066CC] hover:bg-[#0052A3] text-white font-medium text-xs uppercase tracking-wider transition-all shadow-md"
              >
                <span>Launch Scorer Console</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href={`/live/${createdMatch.id}`}
                className="inline-flex items-center justify-center py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs uppercase tracking-wider transition-all"
              >
                <span>Public Live Feed</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h1 className="font-editorial text-2xl font-normal text-[#001838]">Create Match Fixture</h1>
                <p className="text-xs text-slate-500 font-light">Configure teams, over quota, toss decision, and playing XI lineups</p>
              </div>
              <button
                type="button"
                onClick={handleQuickFill}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 px-3.5 py-1.5 rounded-lg border border-slate-200 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
                <span>Load Sample Lineup</span>
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Team Names */}
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wider text-[#001838] block">
                  Team Names
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    required
                    value={teamAName}
                    onChange={e => setTeamAName(e.target.value)}
                    placeholder="Team A Name (e.g. England Men)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-[#001838] placeholder:text-slate-400 focus:border-[#0066CC] focus:bg-white focus:outline-none transition-colors"
                  />
                  <input
                    type="text"
                    required
                    value={teamBName}
                    onChange={e => setTeamBName(e.target.value)}
                    placeholder="Team B Name (e.g. Pakistan Men)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-[#001838] placeholder:text-slate-400 focus:border-[#0066CC] focus:bg-white focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Overs and Toss */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-wider text-[#001838] block">
                    Overs Quota
                  </label>
                  <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                    {[5, 10, 20].map((ov) => (
                      <button
                        key={ov}
                        type="button"
                        onClick={() => setOversLimit(ov)}
                        className={`py-1.5 rounded-lg text-xs font-mono transition-all font-medium ${
                          oversLimit === ov
                            ? 'bg-[#001838] text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {ov} Ov
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-wider text-[#001838] block">
                    Toss Winner
                  </label>
                  <select
                    value={tossWinner}
                    onChange={e => setTossWinner(e.target.value as 'A' | 'B')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-[#001838] focus:border-[#0066CC] focus:bg-white focus:outline-none"
                  >
                    <option value="A">{teamAName || 'Team A'}</option>
                    <option value="B">{teamBName || 'Team B'}</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-wider text-[#001838] block">
                    Toss Decision
                  </label>
                  <select
                    value={tossDecision}
                    onChange={e => setTossDecision(e.target.value as 'BAT' | 'BOWL')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-[#001838] focus:border-[#0066CC] focus:bg-white focus:outline-none"
                  >
                    <option value="BAT">Elected to Bat</option>
                    <option value="BOWL">Elected to Bowl</option>
                  </select>
                </div>
              </div>

              {/* Lineup Rosters */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-medium uppercase tracking-wider text-[#001838] block">
                  Playing Squads
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Squad A */}
                  <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-[#001838] flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        <span>{teamAName || 'Team A'} ({teamAPlayers.length})</span>
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={playerAInput}
                        onChange={e => setPlayerAInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddPlayerA() } }}
                        placeholder="Add player..."
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-[#001838] placeholder:text-slate-400 focus:border-[#0066CC] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddPlayerA}
                        className="bg-[#001838] hover:bg-[#0A2540] text-white px-3.5 py-1.5 rounded-xl text-xs font-medium cursor-pointer shadow-xs"
                      >
                        Add
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 min-h-16 max-h-32 overflow-y-auto pt-1">
                      {teamAPlayers.map((p, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 bg-white text-[#001838] text-xs px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs font-light"
                        >
                          {p}
                          <button
                            type="button"
                            onClick={() => handleRemovePlayerA(p)}
                            className="text-slate-400 hover:text-slate-700 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      {teamAPlayers.length === 0 && (
                        <span className="text-xs text-slate-400 italic self-center font-light">No players added yet</span>
                      )}
                    </div>
                  </div>

                  {/* Squad B */}
                  <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-[#001838] flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        <span>{teamBName || 'Team B'} ({teamBPlayers.length})</span>
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={playerBInput}
                        onChange={e => setPlayerBInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddPlayerB() } }}
                        placeholder="Add player..."
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-[#001838] placeholder:text-slate-400 focus:border-[#0066CC] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddPlayerB}
                        className="bg-[#001838] hover:bg-[#0A2540] text-white px-3.5 py-1.5 rounded-xl text-xs font-medium cursor-pointer shadow-xs"
                      >
                        Add
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 min-h-16 max-h-32 overflow-y-auto pt-1">
                      {teamBPlayers.map((p, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 bg-white text-[#001838] text-xs px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs font-light"
                        >
                          {p}
                          <button
                            type="button"
                            onClick={() => handleRemovePlayerB(p)}
                            className="text-slate-400 hover:text-slate-700 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      {teamBPlayers.length === 0 && (
                        <span className="text-xs text-slate-400 italic self-center font-light">No players added yet</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-[#0066CC] hover:bg-[#0052A3] disabled:opacity-40 text-white font-medium text-xs uppercase tracking-wider transition-all cursor-pointer disabled:cursor-not-allowed shadow-md"
              >
                {loading ? 'Initializing Match & Key...' : 'Create Match & Generate PIN Key ➔'}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  )
}


