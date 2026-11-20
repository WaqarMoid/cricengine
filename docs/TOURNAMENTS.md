# Tournaments & series

CricEngine can now run a whole series — not just one-off matches.

## What you get
- **Create a tournament** (`/tournaments/new`): name, season, venue, overs per side, max squad size, max overs per bowler, one league or two groups + semi-finals, teams with squads.
- **Schedule fixtures** from *New Match* → "Tournament fixture": pick the tournament, stage (group / semi-final / final) and two teams. Lineups are pre-filled from the registered squads and validated server-side (only squad players, same group for group games).
- **Tournament page** (`/tournaments/[id]`) with tabs: Overview (champion, bracket, latest results, top performers) · Points Table · Matches (by day) · Knockouts · Stats · Squads. Works on phones (scrollable tab bar, compact tables).
- Match list, live feed and scorecard show the tournament, match label and the result line.

## Rules used (src/lib/tournament/standings.ts)
| Rule | Value |
|---|---|
| Points | Win 2 · Tie 1 · No result 1 · Loss 0 |
| Net run rate | runs scored ÷ overs faced − runs conceded ÷ overs bowled. A side bowled out is charged its full quota of overs (ICC rule). No-result games are excluded. |
| Table order | points → NRR → wins → name |
| Qualification | top `qualifyPerGroup` (default 2) of each group; "Q" appears only when the group has finished |
| Semi-finals | A1 v B2 and B1 v A2 (cross-over); projected from the live table until played |
| Final | winner SF1 v winner SF2 |
| Results | computed from ball events with the same engine as the live scorer, so the table can never disagree with a scorecard |

## Data model
New tables `tournaments`, `tournament_teams`, `app_meta`; new columns on `matches` (`tournament_id`, `stage`, `group_name`, `match_number`, `match_label`, `team_a_id`, `team_b_id`, `scheduled_at`, `venue`, `source`) and `players.source`. All created with `IF NOT EXISTS`, so existing databases upgrade in place.

## API
| Method | Route | Notes |
|---|---|---|
| GET | `/api/tournaments` | list with progress, champion, final result |
| POST | `/api/tournaments` | create with teams (`createTournamentSchema`) |
| GET | `/api/tournaments/[id]` | table, fixtures/results, bracket, leaders, squads |
| POST | `/api/matches` | accepts `tournamentId`, `stage`, `teamAId`, `teamBId` (+ optional `matchNumber`, `matchLabel`, `venue`, `scheduledAt`) |
| GET | `/api/matches` | now includes `summary` (innings totals + result) and `tournament`; the scorer PIN is no longer returned |
