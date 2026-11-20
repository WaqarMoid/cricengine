import { createHash } from 'crypto'

/** Deterministic RFC-4122 v5-style UUID from a string key (stable across cold starts). */
export function uuidFromKey(key: string): string {
  const h = createHash('sha1').update(`cricengine:${key}`).digest()
  h[6] = (h[6] & 0x0f) | 0x50 // version 5
  h[8] = (h[8] & 0x3f) | 0x80 // RFC variant
  const hex = h.subarray(0, 16).toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

/** Deterministic 6-digit scorer PIN for a seeded fixture. */
export function pinFromKey(key: string): string {
  const h = createHash('sha1').update(`cricengine-pin:${key}`).digest()
  return String(100000 + (h.readUInt32BE(0) % 900000))
}

export function seedFromKey(key: string): number {
  return createHash('sha1').update(key).digest().readUInt32BE(4)
}

/** Small deterministic PRNG (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
