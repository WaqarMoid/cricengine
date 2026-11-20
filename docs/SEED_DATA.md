# Historical records (seed data)

The app ships with real-looking history: **Hall 12 Phatta League 2026** (8 teams × 7, two groups, semis, final; 10 overs) and **3 one-off box-cricket games** (4–6 overs, 4–5 a side). Player names are IIT Kanpur Y23 students.

## Files
```
src/data/seed/
  setup.json                  players (P01…P72), tournament, teams, fixtures, one-off fixtures   ← hand-written
  scoresheets/
    one-off-matches.json      OO-01 … OO-03                                                        ← Gemini
    h12pl-group-a.json        H12-M01, M03, M05, M07, M09, M11                                     ← Gemini
    h12pl-group-b.json        H12-M02, M04, M06, M08, M10, M12                                     ← Gemini
    h12pl-knockouts.json      H12-SF1, H12-SF2, H12-FINAL                                          ← Gemini
  index.ts                    bundles the files above
```

## How it loads
`src/lib/db.ts` → `ensureTables()` → `src/lib/seed/apply.ts`:
1. `compileSeed()` (src/lib/seed/compile.ts) turns each compact scoresheet into full `ball_events` rows. It works out striker/non-striker (odd runs, end of over, new batter replaces the dismissed one), over & ball numbers, timestamps from the fixture time, and wagon-wheel coordinates.
2. It validates every ball (6 legal balls per over, Law 21.7 consecutive overs, bowler quota, fielders from the fielding side, free-hit dismissals, all-out at n−1 wickets, chase stops on the winning ball, no KO ties) and resolves semi-final teams from the computed table.
3. Rows are inserted with deterministic UUIDs and `source = 'seed'`, guarded by a content hash in `app_meta` — every serverless instance gets identical records, re-seeding only happens when the JSON changes, and live-scored matches are never touched.
4. A scoresheet with errors is skipped (that fixture shows as "Yet to begin"); the app never crashes on bad data.

## Ball grammar
See the header of `src/lib/seed/compile.ts` or `docs/prompts/gemini-scoresheets.md`.

## Commands
```bash
npm run seed:check   # errors, warnings, results, points table, knockout pairings (exit 1 on errors)
npm test             # includes "committed seed data compiles with zero errors"
rm -rf prisma/pglite-db && npm run dev   # local: force a fresh load
```
