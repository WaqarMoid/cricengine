/**
 * npm run seed:check
 *
 * Compiles src/data/seed/setup.json + scoresheets/*.json exactly like the app does on boot
 * and prints every error / warning, the results, the points tables and the knockout
 * pairings. Paste the ERROR lines back to the LLM that wrote the scoresheets to get fixes.
 * Exit code 1 when there is at least one error (handy for CI).
 */
import { compileSeed } from '../src/lib/seed/compile'
import { seedScoresheets, seedSetup } from '../src/data/seed'

const out = compileSeed(seedSetup, seedScoresheets)
const errors = out.issues.filter(i => i.level === 'error')
const warnings = out.issues.filter(i => i.level === 'warning')
const name = (k: string) => seedSetup.players.find(p => p.key === k)?.name ?? k

console.log('\n=== CricEngine seed check ===')
console.log(`players ${out.players.length} · tournaments ${out.tournaments.length} · matches ${out.matches.length} · scoresheets ${seedScoresheets.length} · balls ${Object.values(out.events).reduce((a, e) => a + e.length, 0)}`)

if (errors.length) {
  console.log(`\n--- ${errors.length} ERROR(S) — these fixtures will NOT load ---`)
  errors.forEach(e => console.log(`ERROR  [${e.where}] ${e.message}`))
}
if (warnings.length) {
  console.log(`\n--- ${warnings.length} warning(s) — data loads, but check realism ---`)
  warnings.forEach(w => console.log(`warn   [${w.where}] ${w.message}`))
}

console.log('\n--- Results ---')
for (const m of out.matches) {
  const s = out.summaries[m.id]
  const score = s.innings.map(i => `${i.teamName} ${i.runs}/${i.wickets} (${i.overs})`).join('  v  ')
  console.log(`${m.key.padEnd(10)} ${m.status.padEnd(9)} ${score || `${m.teamAName} v ${m.teamBName}`}${m.resultText ? `  →  ${m.resultText}` : ''}`)
}

for (const t of seedSetup.tournaments) {
  const st = out.standings[t.key] || {}
  console.log(`\n--- ${t.name}: points table ---`)
  console.log('Grp Pos Team                 P  W  L  T  Pts   NRR')
  for (const g of Object.keys(st).sort()) {
    for (const r of st[g]) {
      console.log(`${g.padEnd(3)} ${String(r.position).padEnd(3)} ${r.teamName.padEnd(20)} ${r.played}  ${r.won}  ${r.lost}  ${r.tied}  ${String(r.points).padEnd(4)} ${r.nrr >= 0 ? '+' : ''}${r.nrr.toFixed(3)}${r.qualified ? '  Q' : ''}`)
    }
  }
  console.log(`\n--- ${t.name}: knockout fixtures as resolved now ---`)
  const teamByName = new Map(t.teams.map(x => [x.name, x]))
  for (const fx of t.fixtures.filter(f => f.stage !== 'GROUP')) {
    const m = out.matches.find(x => x.key === fx.key)
    if (!m) { console.log(`${fx.key.padEnd(10)} ${fx.teamA} v ${fx.teamB}: not decided yet (finish the previous stage first)`); continue }
    console.log(`${fx.key.padEnd(10)} ${m.teamAName} v ${m.teamBName}${m.resultText ? `  →  ${m.resultText}` : '  (needs a scoresheet)'}`)
    if (!m.resultText) {
      for (const side of [m.teamAName, m.teamBName]) {
        const tm = teamByName.get(side)!
        console.log(`           ${tm.key} ${tm.name}: ${tm.players.map(k => `${k} ${name(k)}`).join(', ')} (keeper ${tm.keeper ?? '-'})`)
      }
    }
  }
}
console.log(errors.length ? `\n✖ ${errors.length} error(s)` : '\n✔ no errors')
process.exit(errors.length ? 1 : 0)
