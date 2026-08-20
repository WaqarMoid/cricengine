import { PrismaClient } from '@prisma/client'
import { PGlite } from '@electric-sql/pglite'
import {
  ColumnTypeEnum,
  SqlDriverAdapter,
  SqlQuery,
  SqlResultSet,
  Transaction,
  ColumnType,
  SqlMigrationAwareDriverAdapterFactory,
} from '@prisma/driver-adapter-utils'
import path from 'path'
import fs from 'fs'

const OID_TO_COLUMN_TYPE: Record<number, ColumnType> = {
  16: ColumnTypeEnum.Boolean,
  17: ColumnTypeEnum.Bytes,
  18: ColumnTypeEnum.Character,
  19: ColumnTypeEnum.Text,
  20: ColumnTypeEnum.Int64,
  21: ColumnTypeEnum.Int32,
  23: ColumnTypeEnum.Int32,
  25: ColumnTypeEnum.Text,
  114: ColumnTypeEnum.Json,
  700: ColumnTypeEnum.Float,
  701: ColumnTypeEnum.Double,
  1042: ColumnTypeEnum.Character,
  1043: ColumnTypeEnum.Text,
  1082: ColumnTypeEnum.Date,
  1083: ColumnTypeEnum.Time,
  1114: ColumnTypeEnum.DateTime,
  1184: ColumnTypeEnum.DateTime,
  1700: ColumnTypeEnum.Numeric,
  2950: ColumnTypeEnum.Uuid,
  3802: ColumnTypeEnum.Json,
  1009: ColumnTypeEnum.TextArray,
  2951: ColumnTypeEnum.UuidArray,
  1007: ColumnTypeEnum.Int32Array,
  1016: ColumnTypeEnum.Int64Array,
}

function mapOidToColumnType(dataTypeID: number): ColumnType {
  return OID_TO_COLUMN_TYPE[dataTypeID] ?? ColumnTypeEnum.Text
}

class PGliteAdapter implements SqlDriverAdapter {
  provider = 'postgres' as const
  adapterName = 'pglite-adapter'

  constructor(private db: PGlite, private initPromise?: Promise<void>) {}

  private async ready() {
    if (this.initPromise) await this.initPromise
  }

  async queryRaw(query: SqlQuery): Promise<SqlResultSet> {
    await this.ready()
    const res = await this.db.query(query.sql, query.args as any[])
    const columnNames = res.fields.map(f => f.name)
    const columnTypes = res.fields.map(f => mapOidToColumnType(f.dataTypeID))
    const rows = res.rows.map(row => {
      if (Array.isArray(row)) return row
      return columnNames.map(col => (row as any)[col])
    })
    return {
      columnNames,
      columnTypes,
      rows,
    }
  }

  async executeRaw(query: SqlQuery): Promise<number> {
    await this.ready()
    const res = await this.db.query(query.sql, query.args as any[])
    return res.affectedRows ?? 0
  }

  async executeScript(script: string): Promise<void> {
    await this.ready()
    await this.db.exec(script)
  }

  async startTransaction(): Promise<Transaction> {
    const self = this
    await this.db.query('BEGIN')
    return {
      provider: 'postgres',
      adapterName: 'pglite-adapter',
      options: { usePhantomQuery: false },
      async queryRaw(query: SqlQuery): Promise<SqlResultSet> {
        return self.queryRaw(query)
      },
      async executeRaw(query: SqlQuery): Promise<number> {
        return self.executeRaw(query)
      },
      async commit(): Promise<void> {
        await self.db.query('COMMIT')
      },
      async rollback(): Promise<void> {
        await self.db.query('ROLLBACK')
      },
    }
  }

  getConnectionInfo() {
    return {
      supportsRelationJoins: true,
    }
  }

  async dispose(): Promise<void> {
    // no-op
  }
}

class PGliteAdapterFactory implements SqlMigrationAwareDriverAdapterFactory {
  provider = 'postgres' as const
  adapterName = 'pglite-adapter'

  constructor(private db: PGlite, private initPromise?: Promise<void>) {}

  async connect(): Promise<SqlDriverAdapter> {
    return new PGliteAdapter(this.db, this.initPromise)
  }

  async connectToShadowDb(): Promise<SqlDriverAdapter> {
    return new PGliteAdapter(this.db, this.initPromise)
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  pglite: PGlite | undefined
  initPromise: Promise<void> | undefined
}

function getDatabaseInstance() {
  if (!globalForPrisma.pglite) {
    const dbDir = path.join(process.cwd(), 'prisma', 'pglite-db')
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }
    try {
      globalForPrisma.pglite = new PGlite(dbDir)
    } catch {
      globalForPrisma.pglite = new PGlite()
    }
  }
  return globalForPrisma.pglite
}

export function ensureTables(pglite: PGlite): Promise<void> {
  if (!globalForPrisma.initPromise) {
    globalForPrisma.initPromise = (async () => {
      try {
        await pglite.waitReady
        await pglite.exec(`
        DO $$ BEGIN
          CREATE TYPE "BattingStyle" AS ENUM ('RIGHT_HAND', 'LEFT_HAND');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE TYPE "BowlingStyle" AS ENUM ('RIGHT_ARM_FAST', 'RIGHT_ARM_SPIN', 'LEFT_ARM_FAST', 'LEFT_ARM_SPIN', 'NONE');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE TYPE "MatchStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'INNINGS_BREAK', 'COMPLETED', 'ABANDONED');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE TYPE "TossDecision" AS ENUM ('BAT', 'BOWL');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE TYPE "ExtraType" AS ENUM ('NONE', 'WIDE', 'NO_BALL', 'BYE', 'LEG_BYE', 'PENALTY');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE TYPE "WicketType" AS ENUM ('NONE', 'BOWLED', 'CAUGHT', 'LBW', 'RUN_OUT', 'STUMPED', 'HIT_WICKET', 'RETIRED');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;

        CREATE TABLE IF NOT EXISTS "leagues" (
          "id" TEXT PRIMARY KEY,
          "name" TEXT NOT NULL,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS "players" (
          "id" TEXT PRIMARY KEY,
          "name" TEXT NOT NULL,
          "batting_style" "BattingStyle",
          "bowling_style" "BowlingStyle" DEFAULT 'NONE',
          "avatar_url" TEXT,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS "matches" (
          "id" TEXT PRIMARY KEY,
          "league_id" TEXT,
          "team_a_name" TEXT NOT NULL,
          "team_b_name" TEXT NOT NULL,
          "overs_limit" INTEGER NOT NULL DEFAULT 20,
          "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
          "toss_winner" TEXT,
          "toss_decision" "TossDecision",
          "current_innings" INTEGER NOT NULL DEFAULT 1,
          "scorer_pin" TEXT NOT NULL DEFAULT '',
          "team_a_player_ids" TEXT[] NOT NULL DEFAULT '{}',
          "team_b_player_ids" TEXT[] NOT NULL DEFAULT '{}',
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS "ball_events" (
          "id" TEXT PRIMARY KEY,
          "match_id" TEXT NOT NULL,
          "innings_no" INTEGER NOT NULL,
          "over_number" INTEGER NOT NULL,
          "ball_in_over" INTEGER NOT NULL,
          "sequence_no" SERIAL,
          "striker_id" TEXT NOT NULL,
          "non_striker_id" TEXT NOT NULL,
          "bowler_id" TEXT NOT NULL,
          "runs_off_bat" INTEGER NOT NULL DEFAULT 0,
          "extras" INTEGER NOT NULL DEFAULT 0,
          "extra_type" "ExtraType" NOT NULL DEFAULT 'NONE',
          "is_legal_delivery" BOOLEAN NOT NULL DEFAULT true,
          "is_wicket" BOOLEAN NOT NULL DEFAULT false,
          "wicket_type" "WicketType" NOT NULL DEFAULT 'NONE',
          "dismissed_player_id" TEXT,
          "fielder_id" TEXT,
          "shot_x" DOUBLE PRECISION,
          "shot_y" DOUBLE PRECISION,
          "shot_zone" TEXT,
          "pitch_line" TEXT,
          "pitch_length" TEXT,
          "is_undone" BOOLEAN NOT NULL DEFAULT false,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `)
      } catch {
        // safe ignore in concurrent build workers
      }
    })()
  }
  return globalForPrisma.initPromise
}

function createPrismaClient(): PrismaClient {
  const pglite = getDatabaseInstance()
  const initPromise = ensureTables(pglite)
  const adapter = new PGliteAdapterFactory(pglite, initPromise)
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}


