import type { PGlite } from '@electric-sql/pglite'
import { createHash } from 'crypto'
import { seedScoresheets, seedSetup } from '@/data/seed'
import { compileSeed } from './compile'

/**
 * Loads the historical records into the embedded database.
 *  - Deterministic ids, so every serverless instance holds identical records.
 *  - Content-hashed: runs once per data version; editing the JSON re-seeds.
 *  - Only rows with source = 'seed' are ever replaced; live-scored data is untouched.
 *  - Invalid scoresheets are skipped (the fixture stays SCHEDULED) instead of breaking boot.
 */
export async function applySeed(db: PGlite): Promise<void> {
  const hash = createHash('sha1').update(JSON.stringify([seedSetup, seedScoresheets])).digest('hex').slice(0, 16)
  const current = await db.query<{ value: string }>(`SELECT "value" FROM "app_meta" WHERE "key" = 'seed_hash'`)
  if (current.rows[0]?.value === hash) return

  const out = compileSeed(seedSetup, seedScoresheets)
  const errors = out.issues.filter(i => i.level === 'error')
  if (errors.length) {
    console.warn(`[cricengine] seed: ${errors.length} scoresheet error(s); affected fixtures stay unplayed. Run "npm run seed:check".`)
  }

  const arr = (ids: string[]) => `{${ids.join(',')}}`

  await db.transaction(async tx => {
    await tx.query(`DELETE FROM "ball_events" WHERE "match_id" IN (SELECT "id" FROM "matches" WHERE "source" = 'seed')`)
    await tx.query(`DELETE FROM "matches" WHERE "source" = 'seed'`)
    await tx.query(`DELETE FROM "tournament_teams" WHERE "source" = 'seed'`)
    await tx.query(`DELETE FROM "tournaments" WHERE "source" = 'seed'`)

    for (const p of out.players) {
      await tx.query(
        `INSERT INTO "players" ("id","name","batting_style","bowling_style","source","created_at")
         VALUES ($1,$2,$3::text::"BattingStyle",$4::text::"BowlingStyle",'seed',$5::timestamptz AT TIME ZONE 'UTC')
         ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "batting_style" = EXCLUDED."batting_style",
           "bowling_style" = EXCLUDED."bowling_style", "source" = 'seed'`,
        [p.id, p.name, p.battingStyle, p.bowlingStyle, '2026-09-01T10:00:00+05:30'],
      )
    }

    for (const t of out.tournaments) {
      await tx.query(
        `INSERT INTO "tournaments" ("id","name","short_name","season","venue","description","format","overs_per_match",
           "max_players_per_team","max_overs_per_bowler","qualify_per_group","start_date","end_date","source","created_at")
         VALUES ($1,$2,$3,$4,$5,$6,'GROUPS_KNOCKOUT',$7::int,$8::int,$9::int,$10::int,
           $11::timestamptz AT TIME ZONE 'UTC',$12::timestamptz AT TIME ZONE 'UTC','seed',$11::timestamptz AT TIME ZONE 'UTC')`,
        [t.id, t.name, t.shortName, t.season, t.venue, t.description, t.oversPerMatch, t.maxPlayersPerTeam,
          t.maxOversPerBowler, t.qualifyPerGroup, `${t.startDate}T09:00:00+05:30`, `${t.endDate}T21:00:00+05:30`],
      )
      for (const tm of t.teams) {
        await tx.query(
          `INSERT INTO "tournament_teams" ("id","tournament_id","name","short_name","group_name","captain_id","keeper_id","color","player_ids","source")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::text[],'seed')`,
          [tm.id, t.id, tm.name, tm.shortName, tm.groupName, tm.captainId, tm.keeperId, tm.color, arr(tm.playerIds)],
        )
      }
    }

    for (const m of out.matches) {
      await tx.query(
        `INSERT INTO "matches" ("id","team_a_name","team_b_name","overs_limit","status","toss_winner","toss_decision",
           "current_innings","scorer_pin","team_a_player_ids","team_b_player_ids","created_at",
           "tournament_id","stage","group_name","match_number","match_label","team_a_id","team_b_id","scheduled_at","venue","source")
         VALUES ($1,$2,$3,$4::int,$5::text::"MatchStatus",$6,$7::text::"TossDecision",$8::int,$9,$10::text[],$11::text[],
           $12::timestamptz AT TIME ZONE 'UTC',$13,$14,$15,$16::int,$17,$18,$19,$12::timestamptz AT TIME ZONE 'UTC',$20,'seed')`,
        [m.id, m.teamAName, m.teamBName, m.oversLimit, m.status, m.tossWinner, m.tossDecision, m.currentInnings,
          m.scorerPin, arr(m.teamAPlayerIds), arr(m.teamBPlayerIds), m.scheduledAt, m.tournamentId, m.stage,
          m.groupName, m.matchNumber, m.label, m.teamAId, m.teamBId, m.venue],
      )

      const evs = out.events[m.id] || []
      // chunked multi-row insert; SERIAL sequence_no is assigned in row order
      const COLS = 23
      for (let start = 0; start < evs.length; start += 100) {
        const chunk = evs.slice(start, start + 100)
        const params: unknown[] = []
        const rows = chunk.map((e, i) => {
          const b = i * COLS
          params.push(
            e.id, e.matchId, e.inningsNo, e.overNumber, e.ballInOver, e.strikerId, e.nonStrikerId, e.bowlerId,
            e.runsOffBat, e.extras, e.extraType, e.isLegalDelivery, e.isWicket, e.wicketType, e.dismissedPlayerId,
            e.fielderId, e.shotX, e.shotY, e.shotZone, e.pitchLine, e.pitchLength, e.isUndone, e.createdAt,
          )
          const p = (n: number) => `$${b + n}`
          return `(${p(1)},${p(2)},${p(3)}::int,${p(4)}::int,${p(5)}::int,${p(6)},${p(7)},${p(8)},${p(9)}::int,${p(10)}::int,` +
            `${p(11)}::text::"ExtraType",${p(12)}::boolean,${p(13)}::boolean,${p(14)}::text::"WicketType",${p(15)},${p(16)},` +
            `${p(17)}::float8,${p(18)}::float8,${p(19)},${p(20)},${p(21)},${p(22)}::boolean,${p(23)}::timestamptz AT TIME ZONE 'UTC')`
        })
        await tx.query(
          `INSERT INTO "ball_events" ("id","match_id","innings_no","over_number","ball_in_over","striker_id","non_striker_id",
             "bowler_id","runs_off_bat","extras","extra_type","is_legal_delivery","is_wicket","wicket_type","dismissed_player_id",
             "fielder_id","shot_x","shot_y","shot_zone","pitch_line","pitch_length","is_undone","created_at")
           VALUES ${rows.join(',')}
           ON CONFLICT ("id") DO NOTHING`,
          params,
        )
      }
    }

    await tx.query(
      `INSERT INTO "app_meta" ("key","value") VALUES ('seed_hash',$1)
       ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value"`,
      [hash],
    )
  })
}
