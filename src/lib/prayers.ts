import type { PrayerDays, PrayerTime, Settings } from '../types'
import { getZmanim } from './zmanim'

export interface ResolvedPrayer {
  id: string
  label: string
  category: PrayerTime['category']
  date: Date | null
  display: string
  active: boolean // happens today
  duration?: number
}

export const PRAYER_DAY_OPTIONS: { value: PrayerDays; label: string }[] = [
  { value: 'daily', label: 'כל יום' },
  { value: 'weekday', label: 'חול (א׳–ו׳)' },
  { value: 'sunthu', label: 'א׳–ה׳' },
  { value: 'friday', label: 'ערב שבת (ו׳)' },
  { value: 'shabbat', label: 'שבת' },
  { value: 'custom', label: 'ימים נבחרים…' },
]

export const ZMAN_TOKENS: Record<string, string> = {
  sunrise: 'netz',
  netz: 'netz',
  sunset: 'shkia',
  shkia: 'shkia',
  tzeit: 'tzeit',
  chatzos: 'chatzos',
  plag: 'plag',
  alos: 'alos',
}

function zmanBase(s: Settings, token: string, day: Date): Date | null {
  const key = ZMAN_TOKENS[token]
  if (!key) return null
  return getZmanim(s, day).find((x) => x.key === key)?.time ?? null
}

/** Checks a prayer time string without resolving it: "06:30", "sunset-18", "tzeit+0". */
export function isValidPrayerTime(t: string, note?: string): boolean {
  const v = t.trim()
  if (!v) return !!note?.trim()
  const hm = v.match(/^(\d{1,2}):(\d{2})$/)
  if (hm) return +hm[1] < 24 && +hm[2] < 60
  const rel = v.match(/^([a-z]+)([+-]\d+)?$/i)
  return !!rel && rel[1].toLowerCase() in ZMAN_TOKENS
}

/** Parse "HH:mm" or relative "sunset-18" / "tzeit+0" into a Date on `day` */
export function resolvePrayerTime(s: Settings, pt: Pick<PrayerTime, 'time'>, day = new Date()): Date | null {
  const t = pt.time.trim()
  if (!t) return null
  const rel = t.match(/^([a-z]+)([+-]\d+)?$/i)
  if (rel && !/^\d/.test(t)) {
    const base = zmanBase(s, rel[1].toLowerCase(), day)
    if (!base) return null
    const offset = rel[2] ? parseInt(rel[2], 10) : 0
    return new Date(base.getTime() + offset * 60000)
  }
  const hm = t.match(/^(\d{1,2}):(\d{2})$/)
  if (hm && +hm[1] < 24 && +hm[2] < 60) {
    const d = new Date(day)
    d.setHours(parseInt(hm[1], 10), parseInt(hm[2], 10), 0, 0)
    return d
  }
  return null
}

function isFixed(t: string): boolean {
  return /^\d{1,2}:\d{2}$/.test(t.trim())
}
function normalizeFixed(t: string): string {
  const m = t.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return t
  return `${m[1].padStart(2, '0')}:${m[2]}`
}

export function dayMatches(days: PrayerDays | string, dow: number, dows?: number[]): boolean {
  switch (days) {
    case 'custom':
      return !!dows?.includes(dow)
    case 'daily':
      return true
    case 'shabbat':
      return dow === 6
    case 'weekday':
      return dow <= 5 // Sun–Fri
    case 'sunthu':
      return dow <= 4
    case 'friday':
      return dow === 5
    default:
      return true
  }
}

export function resolveAllPrayers(s: Settings, day = new Date()): ResolvedPrayer[] {
  const dow = day.getDay()
  return s.prayerTimes
    .map((pt) => {
      const date = resolvePrayerTime(s, pt, day)
      return {
        id: pt.id,
        label: pt.label,
        category: pt.category,
        date,
        // Fixed HH:mm times are wall-clock as entered; relative (zman-derived) times are formatted in the location tz.
        // An unreadable time never shows its raw text on the board.
        display: !date
          ? pt.note?.trim() || '—'
          : isFixed(pt.time)
            ? normalizeFixed(pt.time)
            : date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: s.timeZone }),
        active: dayMatches(pt.days, dow, pt.dows),
        duration: pt.duration,
      }
    })
    .filter((p) => p.active)
    .sort((a, b) => {
      if (!a.date && !b.date) return 0
      if (!a.date) return 1
      if (!b.date) return -1
      return a.date.getTime() - b.date.getTime()
    })
}

/** The next prayer still ahead today */
export function nextPrayer(prayers: ResolvedPrayer[], now = new Date()): ResolvedPrayer | null {
  const t = now.getTime()
  return prayers.find((p) => p.date && p.date.getTime() > t) ?? null
}

/** Next prayer today, or the first one tomorrow (flagged) once today's are over. */
export function upcomingPrayer(s: Settings, now = new Date()): { prayer: ResolvedPrayer; tomorrow: boolean } | null {
  const today = nextPrayer(resolveAllPrayers(s, now), now)
  if (today) return { prayer: today, tomorrow: false }
  const t = new Date(now)
  t.setDate(now.getDate() + 1)
  const first = resolveAllPrayers(s, t).find((p) => p.date)
  return first ? { prayer: first, tomorrow: true } : null
}

/** Approximate length of each tefillah, used only for the quiet window. */
export function durationMin(p: Pick<ResolvedPrayer, 'category' | 'duration'>, dow: number): number {
  if (typeof p.duration === 'number') return p.duration
  if (p.category === 'shacharit') return dow === 6 ? 150 : 60
  if (p.category === 'mincha') return 25
  if (p.category === 'arvit') return 20
  return 0
}

/** The tefillah in progress right now (from 2 min before until its approximate end), if any. */
export function prayerInProgress(s: Settings, now = new Date()): ResolvedPrayer | null {
  const t = now.getTime()
  const dow = now.getDay()
  for (const p of resolveAllPrayers(s, now)) {
    const len = durationMin(p, dow)
    if (!p.date || !len) continue
    const start = p.date.getTime() - 2 * 60000
    const end = p.date.getTime() + len * 60000
    if (t >= start && t < end) return p
  }
  return null
}
