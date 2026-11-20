'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { TournamentDetail } from '@/lib/tournament/service'
import { CalendarDays, Crown, MapPin, Medal, Shield, Swords, Trophy, Users } from 'lucide-react'
import { dayKey, fmtDate, fmtRange, fmtTime, nrrText } from './format'

type Tab = 'overview' | 'table' | 'matches' | 'knockouts' | 'stats' | 'squads'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'table', label: 'Points Table' },
  { id: 'matches', label: 'Matches' },
  { id: 'knockouts', label: 'Knockouts' },
  { id: 'stats', label: 'Stats' },
  { id: 'squads', label: 'Squads' },
]

type MatchRow = TournamentDetail['matches'][number]
interface TeamLite { id: string; name: string; shortName: string | null; groupName: string | null; color: string | null; captainId: string | null; keeperId: string | null; playerIds: string[] }

export function TournamentView({ data, initialTab = 'overview' }: { data: TournamentDetail; initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab)
  const { tournament: t, players, matches, standings, bracket, leaders } = data
  const teams = data.teams as TeamLite[]
  const teamById = useMemo(() => new Map<string, TeamLite>(teams.map(x => [x.id, x] as [string, TeamLite])), [teams])
  const pName = (id: string | null | undefined) => (id ? players[id]?.name ?? 'Player' : '—')
  const champion = data.championId ? teamById.get(data.championId) : null
  const final = bracket.find(b => b.stage === 'FINAL')
  const runnerUp = champion && final ? (final.teamA?.id === champion.id ? final.teamB : final.teamA) : null
  const groups = Object.keys(standings).sort()

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="bg-[#001838] text-white rounded-xl p-5 sm:p-6 border border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
              <span className="px-2 py-0.5 rounded bg-white/10 border border-white/10 font-mono">{t.shortName || 'TOURNAMENT'}</span>
              {t.season && <span>Season {t.season}</span>}
              <span>•</span>
              <span>{t.oversPerMatch} overs · {t.maxPlayersPerTeam}-a-side</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-wide break-words">{t.name}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300 font-light">
              {t.venue && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{t.venue}</span>}
              {t.startDate && <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{fmtRange(t.startDate, t.endDate)}</span>}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center shrink-0">
            <Stat label="Teams" value={teams.length} />
            <Stat label="Played" value={`${data.playedCount}/${data.totalMatches}`} />
            <Stat label="Groups" value={groups.length} />
          </div>
        </div>
        {champion && (
          <div className="flex items-center gap-3 rounded-lg bg-gradient-to-r from-amber-500/25 to-amber-500/5 border border-amber-400/30 px-4 py-3">
            <Crown className="w-6 h-6 text-amber-300 shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-amber-200 font-medium">Champions</div>
              <div className="text-base font-semibold text-white truncate">{champion.name}</div>
              {final?.resultText && <div className="text-[11px] text-slate-200 font-light">Final: {final.resultText}{runnerUp ? ` · Runners-up ${runnerUp.name}` : ''}</div>}
            </div>
          </div>
        )}
      </section>

      {/* Tabs (scrollable on phones) */}
      <div className="sticky top-14 sm:top-16 z-30 -mx-4 sm:mx-0 px-4 sm:px-0 bg-[#F8FAFC]/95 backdrop-blur py-2">
        <div className="flex gap-1 overflow-x-auto no-scrollbar bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
          {TABS.map(x => (
            <button
              key={x.id}
              type="button"
              onClick={() => setTab(x.id)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${tab === x.id ? 'bg-[#001838] text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              {x.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            {t.description && (
              <p className="bg-white rounded-xl border border-slate-200 p-4 text-xs text-slate-600 font-light leading-relaxed">{t.description}</p>
            )}
            <Card title="Knockouts" icon={<Swords className="w-3.5 h-3.5" />}>
              <Bracket bracket={bracket} />
            </Card>
            <Card title="Latest results" icon={<CalendarDays className="w-3.5 h-3.5" />}>
              <div className="divide-y divide-slate-100">
                {matches.filter(m => m.isComplete).slice(-4).reverse().map(m => <MatchLine key={m.id} m={m} />)}
                {matches.filter(m => m.isComplete).length === 0 && <Empty text="No results yet." />}
              </div>
            </Card>
          </div>
          <div className="space-y-5">
            {data.playerOfTournamentId && (
              <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3 shadow-2xs">
                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center"><Medal className="w-5 h-5" /></div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">{champion ? 'Player of the tournament' : 'Top performer so far'}</div>
                  <Link href={`/players/${data.playerOfTournamentId}`} className="text-sm font-semibold text-[#001838] hover:text-[#0066CC] truncate block">{pName(data.playerOfTournamentId)}</Link>
                </div>
              </div>
            )}
            <LeaderCard title="Most runs" rows={leaders.mostRuns.slice(0, 3)} unit="runs" pName={pName} teamById={teamById} />
            <LeaderCard title="Most wickets" rows={leaders.mostWickets.slice(0, 3)} unit="wkts" pName={pName} teamById={teamById} />
          </div>
        </div>
      )}

      {tab === 'table' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {groups.map(g => (
            <Card key={g} title={groups.length > 1 ? `Group ${g}` : 'Standings'} icon={<Shield className="w-3.5 h-3.5" />}>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full text-xs min-w-[340px]">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <th className="text-left font-medium py-2 pl-4 sm:pl-2 w-6">#</th>
                      <th className="text-left font-medium py-2">Team</th>
                      <th className="font-medium py-2 w-7">P</th>
                      <th className="font-medium py-2 w-7">W</th>
                      <th className="font-medium py-2 w-7">L</th>
                      <th className="font-medium py-2 w-7 hidden sm:table-cell">T/NR</th>
                      <th className="font-medium py-2 w-9">Pts</th>
                      <th className="font-medium py-2 w-16">NRR</th>
                      <th className="font-medium py-2 pr-4 sm:pr-2 hidden sm:table-cell">Form</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings[g].map(r => {
                      const top = r.position <= t.qualifyPerGroup
                      return (
                        <tr key={r.teamId} className={`border-b border-slate-100 last:border-0 ${top ? 'bg-emerald-50/60' : ''}`}>
                          <td className="py-2.5 pl-4 sm:pl-2 font-mono text-slate-500">{r.position}</td>
                          <td className="py-2.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <TeamDot color={teamById.get(r.teamId)?.color} />
                              <span className="font-medium text-slate-900 truncate">{r.teamName}</span>
                              {r.qualified && <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-100 px-1 rounded">Q</span>}
                            </div>
                          </td>
                          <td className="text-center font-mono">{r.played}</td>
                          <td className="text-center font-mono">{r.won}</td>
                          <td className="text-center font-mono">{r.lost}</td>
                          <td className="text-center font-mono hidden sm:table-cell">{r.tied + r.noResult}</td>
                          <td className="text-center font-mono font-semibold text-[#001838]">{r.points}</td>
                          <td className={`text-center font-mono ${r.nrr >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{nrrText(r.nrr)}</td>
                          <td className="pr-4 sm:pr-2 hidden sm:table-cell">
                            <div className="flex gap-0.5 justify-center">
                              {r.form.map((f, i) => (
                                <span key={i} className={`w-4 h-4 rounded text-[9px] font-semibold flex items-center justify-center text-white ${f === 'W' ? 'bg-emerald-600' : f === 'L' ? 'bg-red-500' : 'bg-slate-400'}`}>{f}</span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-slate-400 font-light pt-2">
                Win 2 · Tie/NR 1 · Top {t.qualifyPerGroup} qualify{groups.length > 1 ? ' (semi-finals cross over: A1 v B2, B1 v A2)' : ''} · NRR charges full overs to a side bowled out.
              </p>
            </Card>
          ))}
        </div>
      )}

      {tab === 'matches' && <MatchesByDay matches={matches} />}

      {tab === 'knockouts' && (
        <Card title="Knockout bracket" icon={<Swords className="w-3.5 h-3.5" />}>
          <Bracket bracket={bracket} />
          {!data.groupStageComplete && <p className="text-[11px] text-slate-500 pt-3 font-light">Group stage still running — semi-final teams are projected from the current table.</p>}
        </Card>
      )}

      {tab === 'stats' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <LeaderCard title="Most runs" rows={leaders.mostRuns} unit="runs" pName={pName} teamById={teamById} />
          <LeaderCard title="Most wickets" rows={leaders.mostWickets} unit="wkts" pName={pName} teamById={teamById} />
          <LeaderCard title="Highest score" rows={leaders.highestScore} unit="" pName={pName} teamById={teamById} showDetailOnly />
          <LeaderCard title="Best bowling" rows={leaders.bestBowling} unit="" pName={pName} teamById={teamById} showDetailOnly />
          <LeaderCard title="Most sixes" rows={leaders.mostSixes} unit="6s" pName={pName} teamById={teamById} />
          <LeaderCard title="Best economy (min 3 ov)" rows={leaders.bestEconomy} unit="econ" pName={pName} teamById={teamById} />
        </div>
      )}

      {tab === 'squads' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {teams.map(tm => (
            <div key={tm.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between gap-2" style={{ borderTop: `3px solid ${tm.color || '#0066CC'}` }}>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[#001838] truncate">{tm.name}</div>
                  <div className="text-[10px] text-slate-500">{tm.groupName ? `Group ${tm.groupName}` : ''}{tm.shortName ? ` · ${tm.shortName}` : ''}</div>
                </div>
                <Users className="w-4 h-4 text-slate-400 shrink-0" />
              </div>
              <ul className="divide-y divide-slate-100">
                {tm.playerIds.map((pid: string) => (
                  <li key={pid} className="px-4 py-2 flex items-center justify-between gap-2 text-xs">
                    <Link href={`/players/${pid}`} className="text-slate-800 hover:text-[#0066CC] truncate">
                      {pName(pid)}
                      {tm.captainId === pid && <span className="text-[10px] text-amber-700 font-semibold ml-1">(c)</span>}
                      {tm.keeperId === pid && <span className="text-[10px] text-slate-500 font-semibold ml-1">(wk)</span>}
                    </Link>
                    <span className="text-[10px] text-slate-400 shrink-0">{styleLabel(players[pid]?.bowlingStyle, players[pid]?.battingStyle)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function styleLabel(bowl?: string | null, bat?: string | null) {
  const b = bat === 'LEFT_HAND' ? 'LHB' : 'RHB'
  const map: Record<string, string> = { RIGHT_ARM_FAST: 'RA pace', RIGHT_ARM_SPIN: 'RA spin', LEFT_ARM_FAST: 'LA pace', LEFT_ARM_SPIN: 'LA spin' }
  return bowl && map[bowl] ? `${b} · ${map[bowl]}` : b
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 min-w-[70px]">
      <div className="text-base font-semibold font-mono">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-slate-400">{label}</div>
    </div>
  )
}

function Card({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-[#001838] flex items-center gap-2">{icon}{title}</h2>
      {children}
    </section>
  )
}

function Empty({ text }: { text: string }) {
  return <div className="text-xs text-slate-400 font-light py-6 text-center">{text}</div>
}

function TeamDot({ color }: { color?: string | null }) {
  return <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color || '#94A3B8' }} />
}

function scoreFor(m: MatchRow, side: 'A' | 'B') {
  const inn = m.innings.find(i => i.side === side)
  return inn ? `${inn.runs}/${inn.wickets}` : null
}
function oversFor(m: MatchRow, side: 'A' | 'B') {
  const inn = m.innings.find(i => i.side === side)
  return inn ? inn.overs : null
}

function MatchLine({ m }: { m: MatchRow }) {
  const winA = m.result?.winner === 'A'
  const winB = m.result?.winner === 'B'
  const live = m.status === 'IN_PROGRESS' || m.status === 'INNINGS_BREAK'
  return (
    <div className="py-3 first:pt-1 last:pb-1 space-y-2">
      <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500">
        <span className="font-medium uppercase tracking-wider">
          {m.label}{m.groupName ? ` · Group ${m.groupName}` : m.stage !== 'GROUP' ? ` · ${m.stageLabel}` : ''}
        </span>
        <span className="shrink-0">{fmtDate(m.scheduledAt)} · {fmtTime(m.scheduledAt)}</span>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-sm">
        <span className={`truncate ${winA ? 'font-semibold text-[#001838]' : 'text-slate-700'}`}>{m.teamAName}</span>
        <span className="font-mono text-right text-slate-800">{scoreFor(m, 'A') ?? ''}{oversFor(m, 'A') && <span className="text-[10px] text-slate-400 ml-1">({oversFor(m, 'A')})</span>}</span>
        <span className={`truncate ${winB ? 'font-semibold text-[#001838]' : 'text-slate-700'}`}>{m.teamBName}</span>
        <span className="font-mono text-right text-slate-800">{scoreFor(m, 'B') ?? ''}{oversFor(m, 'B') && <span className="text-[10px] text-slate-400 ml-1">({oversFor(m, 'B')})</span>}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[11px] ${m.result ? 'text-emerald-700 font-medium' : live ? 'text-red-600 font-medium' : 'text-slate-400'}`}>
          {m.result?.text ?? (live ? 'Live now' : 'Yet to begin')}
        </span>
        <div className="flex gap-1.5 shrink-0">
          {(m.isComplete || live) && (
            <Link href={`/matches/${m.id}/scorecard`} className="text-[11px] px-2.5 py-1 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50">Scorecard</Link>
          )}
          <Link href={`/live/${m.id}`} className="text-[11px] px-2.5 py-1 rounded-md bg-[#0066CC] text-white hover:bg-[#0052A3]">{live ? 'Live' : m.isComplete ? 'Analysis' : 'Match'}</Link>
        </div>
      </div>
    </div>
  )
}

function MatchesByDay({ matches }: { matches: MatchRow[] }) {
  const days = new Map<string, MatchRow[]>()
  for (const m of matches) {
    const k = dayKey(m.scheduledAt)
    ;(days.get(k) || days.set(k, []).get(k)!).push(m)
  }
  const keys = [...days.keys()].sort()
  if (keys.length === 0) return <Empty text="No fixtures yet." />
  return (
    <div className="space-y-4">
      {keys.map(k => (
        <Card key={k} title={fmtDate(days.get(k)![0].scheduledAt, true)} icon={<CalendarDays className="w-3.5 h-3.5" />}>
          <div className="divide-y divide-slate-100">
            {days.get(k)!.map(m => <MatchLine key={m.id} m={m} />)}
          </div>
        </Card>
      ))}
    </div>
  )
}

function Bracket({ bracket }: { bracket: TournamentDetail['bracket'] }) {
  if (!bracket.length) return <Empty text="Knockouts are available for two-group tournaments." />
  const semis = bracket.filter(b => b.stage === 'SEMI_FINAL')
  const fin = bracket.find(b => b.stage === 'FINAL')
  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-center">
      <div className="space-y-3">{semis.map(s => <BracketCard key={s.label} slot={s} />)}</div>
      <div className="hidden md:flex flex-col items-center text-slate-300"><Swords className="w-5 h-5" /></div>
      {fin && <BracketCard slot={fin} highlight />}
    </div>
  )
}

function BracketCard({ slot, highlight }: { slot: TournamentDetail['bracket'][number]; highlight?: boolean }) {
  const row = (team: { id: string; name: string } | null, seed: string) => {
    const won = !!team && slot.winnerId === team.id
    return (
      <div className={`flex items-center justify-between gap-2 px-3 py-2 text-xs ${won ? 'bg-emerald-50' : ''}`}>
        <span className={`truncate ${won ? 'font-semibold text-[#001838]' : team ? 'text-slate-800' : 'text-slate-400 italic'}`}>
          {team ? team.name : 'TBD'}
        </span>
        <span className="flex items-center gap-1.5 shrink-0">
          {won && <Trophy className="w-3 h-3 text-amber-500" />}
          <span className="text-[10px] font-mono text-slate-400">{seed}</span>
        </span>
      </div>
    )
  }
  const inner = (
    <div className={`rounded-lg border overflow-hidden ${highlight ? 'border-amber-300 shadow-sm' : 'border-slate-200'}`}>
      <div className={`px-3 py-1.5 text-[10px] uppercase tracking-wider font-semibold flex justify-between ${highlight ? 'bg-amber-50 text-amber-800' : 'bg-slate-50 text-slate-600'}`}>
        <span>{slot.label}</span>
        {slot.projected && <span className="normal-case font-normal text-slate-400">projected</span>}
      </div>
      <div className="divide-y divide-slate-100">
        {row(slot.teamA, slot.seedA)}
        {row(slot.teamB, slot.seedB)}
      </div>
      {slot.resultText && <div className="px-3 py-1.5 text-[11px] text-emerald-700 border-t border-slate-100">{slot.resultText}</div>}
    </div>
  )
  return slot.matchId ? <Link href={`/matches/${slot.matchId}/scorecard`} className="block hover:opacity-90">{inner}</Link> : inner
}

function LeaderCard({
  title, rows, unit, pName, teamById, showDetailOnly,
}: {
  title: string
  rows: TournamentDetail['leaders']['mostRuns']
  unit: string
  pName: (id: string) => string
  teamById: Map<string, TeamLite>
  showDetailOnly?: boolean
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-[#001838]">{title}</div>
      {rows.length === 0 ? <Empty text="No data yet." /> : (
        <ol className="divide-y divide-slate-100">
          {rows.map((r, i) => {
            const team = r.teamId ? teamById.get(r.teamId) : null
            return (
              <li key={r.playerId + i} className="px-4 py-2 flex items-center gap-3 text-xs">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 ${i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <Link href={`/players/${r.playerId}`} className="font-medium text-slate-900 hover:text-[#0066CC] truncate block">{pName(r.playerId)}</Link>
                  <div className="text-[10px] text-slate-400 truncate">{team?.shortName || team?.name || ''}{!showDetailOnly && r.detail ? ` · ${r.detail}` : ''}</div>
                </div>
                <span className="font-mono font-semibold text-[#001838] shrink-0">
                  {showDetailOnly ? r.detail : <>{r.value}{unit && <span className="text-[10px] text-slate-400 font-normal ml-0.5">{unit}</span>}</>}
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
