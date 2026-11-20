// Shared display helpers (safe on server and client; fixed IST timezone avoids hydration drift)
const TZ = 'Asia/Kolkata'

export function fmtDate(iso: string | null | undefined, withYear = false) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-IN', { timeZone: TZ, day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}), weekday: withYear ? undefined : 'short' })
}

export function fmtTime(iso: string | null | undefined) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-IN', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true })
}

export function fmtRange(a: string | null | undefined, b: string | null | undefined) {
  if (!a) return ''
  const s = new Date(a).toLocaleDateString('en-IN', { timeZone: TZ, day: 'numeric', month: 'short' })
  const e = b ? new Date(b).toLocaleDateString('en-IN', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' }) : ''
  return e ? `${s} – ${e}` : s
}

export function dayKey(iso: string | null | undefined) {
  if (!iso) return 'TBD'
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ })
}

export function nrrText(n: number) {
  return `${n >= 0 ? '+' : ''}${n.toFixed(3)}`
}

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}
