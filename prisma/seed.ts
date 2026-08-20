import { PrismaClient, BattingStyle, BowlingStyle, MatchStatus, TossDecision, ExtraType, WicketType } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const connectionString =
  process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/cricengine?schema=public'
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding CricEngine database...')

  // 1. Create sample players
  const playerInputs = [
    { name: 'Virat Kohli', battingStyle: BattingStyle.RIGHT_HAND, bowlingStyle: BowlingStyle.RIGHT_ARM_SPIN },
    { name: 'Rohit Sharma', battingStyle: BattingStyle.RIGHT_HAND, bowlingStyle: BowlingStyle.RIGHT_ARM_SPIN },
    { name: 'Suryakumar Yadav', battingStyle: BattingStyle.RIGHT_HAND, bowlingStyle: BowlingStyle.NONE },
    { name: 'Hardik Pandya', battingStyle: BattingStyle.RIGHT_HAND, bowlingStyle: BowlingStyle.RIGHT_ARM_FAST },
    { name: 'Ravindra Jadeja', battingStyle: BattingStyle.LEFT_HAND, bowlingStyle: BowlingStyle.LEFT_ARM_SPIN },
    { name: 'MS Dhoni', battingStyle: BattingStyle.RIGHT_HAND, bowlingStyle: BowlingStyle.NONE },
    { name: 'Jasprit Bumrah', battingStyle: BattingStyle.RIGHT_HAND, bowlingStyle: BowlingStyle.RIGHT_ARM_FAST },
    { name: 'Mohammed Shami', battingStyle: BattingStyle.RIGHT_HAND, bowlingStyle: BowlingStyle.RIGHT_ARM_FAST },
    { name: 'Shubman Gill', battingStyle: BattingStyle.RIGHT_HAND, bowlingStyle: BowlingStyle.NONE },
    { name: 'KL Rahul', battingStyle: BattingStyle.RIGHT_HAND, bowlingStyle: BowlingStyle.NONE },
  ]

  const players: Record<string, string> = {}
  for (const p of playerInputs) {
    const created = await prisma.player.create({
      data: p,
    })
    players[p.name] = created.id
    console.log(`Created player: ${p.name} (${created.id})`)
  }

  const teamAPlayerIds = [
    players['Virat Kohli'],
    players['Rohit Sharma'],
    players['Suryakumar Yadav'],
    players['Hardik Pandya'],
    players['Jasprit Bumrah'],
  ]

  const teamBPlayerIds = [
    players['Shubman Gill'],
    players['KL Rahul'],
    players['Ravindra Jadeja'],
    players['MS Dhoni'],
    players['Mohammed Shami'],
  ]

  // 2. Create sample match with fixed PIN 123456 for demo
  const match = await prisma.match.create({
    data: {
      teamAName: 'India Blue',
      teamBName: 'India Red',
      oversLimit: 20,
      status: MatchStatus.IN_PROGRESS,
      tossWinner: 'India Blue',
      tossDecision: TossDecision.BAT,
      currentInnings: 1,
      scorerPin: '123456',
      teamAPlayerIds,
      teamBPlayerIds,
    },
  })
  console.log(`Created match: ${match.teamAName} vs ${match.teamBName} (PIN: ${match.scorerPin})`)

  // 3. Pre-load a sample 1st over with realistic ball events & telemetry
  const strikerId = players['Virat Kohli']
  const nonStrikerId = players['Rohit Sharma']
  const bowlerId = players['Mohammed Shami']

  const sampleDeliveries = [
    // Ball 0.1: Dot ball
    {
      inningsNo: 1,
      overNumber: 0,
      ballInOver: 1,
      strikerId,
      nonStrikerId,
      bowlerId,
      runsOffBat: 0,
      extras: 0,
      extraType: ExtraType.NONE,
      isLegalDelivery: true,
      isWicket: false,
      wicketType: WicketType.NONE,
      shotX: 0.15,
      shotY: -0.3,
      shotZone: 'COVER',
    },
    // Ball 0.2: Single with strike rotation
    {
      inningsNo: 1,
      overNumber: 0,
      ballInOver: 2,
      strikerId,
      nonStrikerId,
      bowlerId,
      runsOffBat: 1,
      extras: 0,
      extraType: ExtraType.NONE,
      isLegalDelivery: true,
      isWicket: false,
      wicketType: WicketType.NONE,
      shotX: -0.4,
      shotY: 0.25,
      shotZone: 'MID_WICKET',
    },
    // Ball 0.3: Boundary 4 (Rohit on strike)
    {
      inningsNo: 1,
      overNumber: 0,
      ballInOver: 3,
      strikerId: nonStrikerId,
      nonStrikerId: strikerId,
      bowlerId,
      runsOffBat: 4,
      extras: 0,
      extraType: ExtraType.NONE,
      isLegalDelivery: true,
      isWicket: false,
      wicketType: WicketType.NONE,
      shotX: 0.85,
      shotY: -0.45,
      shotZone: 'POINT',
    },
    // Ball 0.3 (Extra): Wide ball
    {
      inningsNo: 1,
      overNumber: 0,
      ballInOver: 3,
      strikerId: nonStrikerId,
      nonStrikerId: strikerId,
      bowlerId,
      runsOffBat: 0,
      extras: 0,
      extraType: ExtraType.WIDE,
      isLegalDelivery: false,
      isWicket: false,
      wicketType: WicketType.NONE,
      shotX: null,
      shotY: null,
      shotZone: null,
    },
    // Ball 0.4: Maximum 6 (Rohit on strike)
    {
      inningsNo: 1,
      overNumber: 0,
      ballInOver: 4,
      strikerId: nonStrikerId,
      nonStrikerId: strikerId,
      bowlerId,
      runsOffBat: 6,
      extras: 0,
      extraType: ExtraType.NONE,
      isLegalDelivery: true,
      isWicket: false,
      wicketType: WicketType.NONE,
      shotX: -0.75,
      shotY: 0.7,
      shotZone: 'SQUARE_LEG',
    },
    // Ball 0.5: Dot ball
    {
      inningsNo: 1,
      overNumber: 0,
      ballInOver: 5,
      strikerId: nonStrikerId,
      nonStrikerId: strikerId,
      bowlerId,
      runsOffBat: 0,
      extras: 0,
      extraType: ExtraType.NONE,
      isLegalDelivery: true,
      isWicket: false,
      wicketType: WicketType.NONE,
      shotX: 0.1,
      shotY: 0.2,
      shotZone: 'MID_WICKET',
    },
    // Ball 0.6: Wicket (Bowled)
    {
      inningsNo: 1,
      overNumber: 0,
      ballInOver: 6,
      strikerId: nonStrikerId,
      nonStrikerId: strikerId,
      bowlerId,
      runsOffBat: 0,
      extras: 0,
      extraType: ExtraType.NONE,
      isLegalDelivery: true,
      isWicket: true,
      wicketType: WicketType.BOWLED,
      dismissedPlayerId: nonStrikerId,
      shotX: 0.0,
      shotY: 0.0,
      shotZone: null,
    },
  ]

  for (const delivery of sampleDeliveries) {
    await prisma.ballEvent.create({
      data: {
        matchId: match.id,
        ...delivery,
      },
    })
  }

  console.log(`Seeded ${sampleDeliveries.length} ball events in match ${match.id}`)
  console.log('Seeding completed successfully!')
}

main()
  .catch(e => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
