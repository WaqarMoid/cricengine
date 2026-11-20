/**
 * Historical records loaded into the database on boot (see src/lib/seed/apply.ts).
 *
 *  setup.json                    players, Hall 12 Phatta League (teams + fixtures), one-off fixtures
 *  scoresheets/*.json            ball-by-ball scoresheets, one per played fixture (see docs/SEED_DATA.md)
 *
 * Validate after every edit:   npm run seed:check
 */
import type { Scoresheet, SeedSetup } from '@/lib/seed/types'
import setup from './setup.json'
import oneOff from './scoresheets/one-off-matches.json'
import groupA from './scoresheets/h12pl-group-a.json'
import groupB from './scoresheets/h12pl-group-b.json'
import knockouts from './scoresheets/h12pl-knockouts.json'

export const seedSetup = setup as unknown as SeedSetup

export const seedScoresheets: Scoresheet[] = [
  ...(oneOff as unknown as Scoresheet[]),
  ...(groupA as unknown as Scoresheet[]),
  ...(groupB as unknown as Scoresheet[]),
  ...(knockouts as unknown as Scoresheet[]),
]
