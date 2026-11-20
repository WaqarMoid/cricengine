'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { ArrowLeft, Plus, Trash2, Trophy } from 'lucide-react'

interface TeamDraft {
  name: string
  shortName: string
  groupName: string
  players: string // one name per line
}

const blankTeam = (group: string): TeamDraft => ({ name: '', shortName: '', groupName: group, players: '' })

export default function NewTournamentPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [shortName, setShortName] = useState('')
  const [season, setSeason] = useState(String(new Date().getFullYear()))
  const [venue, setVenue] = useState('')
  const [oversPerMatch, setOvers] = useState(10)
  const [maxPlayersPerTeam, setMaxPlayers] = useState(7)
  const [maxOversPerBowler, setMaxBowler] = useState(2)
  const [groups, setGroups] = useState<1 | 2>(2)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [teams, setTeams] = useState<TeamDraft[]>([blankTeam('A'), blankTeam('A'), blankTeam('B'), blankTeam('B')])
  const [existing, setExisting] = useState<Array<{ id: string; name: string }>>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/players').then(r => r.json()).then(d => { if (Array.isArray(d)) setExisting(d) }).catch(() => {})
  }, [])

  const update = (i: number, patch: Partial<TeamDraft>) => setTeams(ts => ts.map((t, j) => (j === i ? { ...t, ...patch } : t)))

  async function resolvePlayerIds(names: string[]) {
    const ids: string[] = []
    for (const n of names) {
      const found = existing.find(p => p.name.toLowerCase() === n.toLowerCase())
      if (found) { ids.push(found.id); continue }
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: n, battingStyle: 'RIGHT_HAND' }),
      })
      const created = await res.json()
      if (!res.ok) throw new Error(`Could not add player ${n}`)
      ids.push(created.id)
      existing.push({ id: created.id, name: n })
    }
    return ids
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const cleaned = teams
      .map(t => ({ ...t, list: t.players.split('\n').map(s => s.trim()).filter(Boolean) }))
      .filter(t => t.name.trim())
    if (!name.trim()) return setError('Give the tournament a name.')
    if (cleaned.length < 2) return setError('Add at least two teams.')
    for (const t of cleaned) {
      if (t.list.length < 2) return setError(`${t.name}: add at least 2 players (one per line).`)
      if (t.list.length > maxPlayersPerTeam) return setError(`${t.name}: max ${maxPlayersPerTeam} players.`)
    }
    const all = cleaned.flatMap(t => t.list.map(n => n.toLowerCase()))
    if (new Set(all).size !== all.length) return setError('A player is listed in more than one team.')

    setSaving(true)
    try {
      const payloadTeams = []
      for (const t of cleaned) {
        const playerIds = await resolvePlayerIds(t.list)
        payloadTeams.push({
          name: t.name.trim(),
          shortName: t.shortName.trim() || undefined,
          groupName: groups === 2 ? t.groupName : 'A',
          captainId: playerIds[0],
          playerIds,
        })
      }
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          shortName: shortName.trim() || undefined,
          season: season.trim() || undefined,
          venue: venue.trim() || undefined,
          oversPerMatch,
          maxPlayersPerTeam,
          maxOversPerBowler,
          qualifyPerGroup: 2,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          teams: payloadTeams,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        const msg = typeof data.error === 'string' ? data.error
          : [...Object.values(data.error?.fieldErrors || {}).flat(), ...(data.error?.formErrors || [])].join(', ')
        throw new Error(msg || 'Could not create tournament')
      }
      router.push(`/tournaments/${data.id}`)
    } catch (err: any) {
      setError(err.message || 'Could not create tournament')
      setSaving(false)
    }
  }

  const input = 'w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-[#0066CC] focus:bg-white focus:outline-none'
  const label = 'text-[11px] font-medium text-slate-600 uppercase tracking-wider'

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] pb-24">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <Link href="/tournaments" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-[#0066CC]"><ArrowLeft className="w-3 h-3" /> Tournaments</Link>
        <form onSubmit={submit} className="space-y-4">
          <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <h1 className="text-base font-semibold text-[#001838] flex items-center gap-2"><Trophy className="w-4 h-4" /> Create a tournament</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2 space-y-1"><div className={label}>Name</div><input className={input} value={name} onChange={e => setName(e.target.value)} placeholder="Hall 12 Phatta League" /></div>
              <div className="space-y-1"><div className={label}>Short name</div><input className={input} value={shortName} maxLength={12} onChange={e => setShortName(e.target.value)} placeholder="H12PL" /></div>
              <div className="space-y-1"><div className={label}>Season</div><input className={input} value={season} onChange={e => setSeason(e.target.value)} /></div>
              <div className="sm:col-span-2 space-y-1"><div className={label}>Venue</div><input className={input} value={venue} onChange={e => setVenue(e.target.value)} placeholder="Hall 12 Ground, IIT Kanpur" /></div>
              <div className="space-y-1"><div className={label}>Start date</div><input type="date" className={input} value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
              <div className="space-y-1"><div className={label}>End date</div><input type="date" className={input} value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1"><div className={label}>Overs / side</div><input type="number" min={1} max={50} className={input} value={oversPerMatch} onChange={e => setOvers(Number(e.target.value))} /></div>
              <div className="space-y-1"><div className={label}>Max squad</div><input type="number" min={2} max={15} className={input} value={maxPlayersPerTeam} onChange={e => setMaxPlayers(Number(e.target.value))} /></div>
              <div className="space-y-1"><div className={label}>Overs / bowler</div><input type="number" min={1} max={10} className={input} value={maxOversPerBowler} onChange={e => setMaxBowler(Number(e.target.value))} /></div>
              <div className="space-y-1">
                <div className={label}>Format</div>
                <select className={input} value={groups} onChange={e => setGroups(Number(e.target.value) as 1 | 2)}>
                  <option value={2}>2 groups + semis</option>
                  <option value={1}>Single league</option>
                </select>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#001838]">Teams ({teams.length})</h2>
              <button type="button" onClick={() => setTeams(ts => [...ts, blankTeam(ts.length % 2 ? 'B' : 'A')])} className="text-xs text-[#0066CC] font-medium flex items-center gap-1 cursor-pointer"><Plus className="w-3.5 h-3.5" /> Add team</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {teams.map((t, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
                  <div className="flex gap-2">
                    <input className={input} value={t.name} onChange={e => update(i, { name: e.target.value })} placeholder={`Team ${i + 1} name`} />
                    <input className={`${input} w-20`} value={t.shortName} maxLength={6} onChange={e => update(i, { shortName: e.target.value.toUpperCase() })} placeholder="ABC" />
                    {groups === 2 && (
                      <select className={`${input} w-16`} value={t.groupName} onChange={e => update(i, { groupName: e.target.value })}>
                        <option value="A">A</option>
                        <option value="B">B</option>
                      </select>
                    )}
                    <button type="button" aria-label="Remove team" onClick={() => setTeams(ts => ts.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-600 px-1 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <textarea className={`${input} h-28 font-mono text-xs`} value={t.players} onChange={e => update(i, { players: e.target.value })} placeholder={'Players, one per line\n(first = captain)'} />
                </div>
              ))}
            </div>
          </section>

          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
          <button type="submit" disabled={saving} className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-[#0066CC] hover:bg-[#0052A3] disabled:opacity-50 text-white text-sm font-medium cursor-pointer">
            {saving ? 'Creating…' : 'Create tournament'}
          </button>
        </form>
      </main>
    </div>
  )
}
