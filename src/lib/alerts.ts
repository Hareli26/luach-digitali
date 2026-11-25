/**
 * Home Front Command (Pikud HaOref) alerts for the shul's own area.
 *
 * The board polls the public alerts feed every two seconds. When an alert names one of the
 * cities the gabbai configured, the board hands the whole screen to a red shelter notice, and
 * goes back to the rotating screens on its own when the event ends. Nothing here needs a touch.
 *
 * Everything in this file is pure (no React, no network) so it can be tested with fixed inputs.
 */

/** The live feed. It usually answers only from Israeli IP addresses. */
export const OREF_URL = 'https://www.oref.org.il/WarningMessages/alert/alerts.json'

/** What one poll of the feed carries. An empty body (or "{}") means nothing is active right now. */
export interface FeedPayload {
  id?: string
  cat?: string | number
  title?: string
  desc?: string
  data?: string[]
}

/**
 * How the board reads a feed message.
 * GUESS: the feed has no documented schema. These rules follow what the feed has sent since 2024:
 * real alerts carry a category such as 1 (rockets) or 6 (hostile aircraft); category 10 carries
 * "news flashes", which are either an early warning ("בדקות הקרובות צפויות להתקבל התרעות באזורך")
 * or the end of the event ("האירוע הסתיים" / "ניתן לצאת מהמרחב המוגן"); 101 is a system test.
 * The title is checked first because it is the most stable part.
 */
export type FeedKind = 'alert' | 'early' | 'end' | 'test'

export function classify(p: FeedPayload): FeedKind {
  const title = norm(p.title ?? '')
  const cat = String(p.cat ?? '')
  if (cat === '101' || title.includes('בדיקה')) return 'test'
  if (title.includes('האירוע הסתיים') || title.includes('ניתן לצאת') || title.includes('יכולים לצאת')) return 'end'
  if (title.includes('בדקות הקרובות') || title.includes('צפויות להתקבל') || title.includes('התרעה מקדימה')) return 'early'
  if (cat === '10') return 'early'
  return 'alert'
}

/** Hebrew names arrive with mixed quote marks, dashes and spacing; compare them in one form. */
export function norm(s: string): string {
  return s
    .replace(/[׳‘’'`]/g, "'")
    .replace(/[״“”"]/g, '"')
    .replace(/[‐-―־]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Does a city in the feed belong to one the gabbai configured?
 * The feed splits large cities into areas ("תל אביב - מרכז העיר"), so the configured name
 * "תל אביב" also matches every one of its areas. A configured area matches only itself.
 */
export function cityMatches(feedCity: string, configured: string): boolean {
  const f = norm(feedCity)
  const c = norm(configured)
  if (!c) return false
  return f === c || f.startsWith(c + ' -') || f.startsWith(c + '-')
}

export function matchCities(feedCities: string[], configured: string[]): string[] {
  return feedCities.filter((f) => configured.some((c) => cityMatches(f, c)))
}

/** The feed returns a BOM, blank text, or "{}" when quiet. */
export function parseFeed(text: string): FeedPayload | null {
  const t = text.replace(/^﻿/, '').trim()
  if (!t || t === '{}' || t === 'null' || t === '[]') return null
  try {
    const data = JSON.parse(t)
    if (!data || typeof data !== 'object' || !Array.isArray(data.data)) return null
    return data as FeedPayload
  } catch {
    return null
  }
}

/* ------------------------------------------------------------------ state */

export type AlertPhase = 'idle' | 'early' | 'alert' | 'clear'

export interface AlertState {
  phase: AlertPhase
  title: string
  desc: string
  /** The configured area's cities named by the feed in this event */
  cities: string[]
  /** When this event started on the board (ms) */
  since: number
  /** When the feed last named one of our cities (ms) */
  lastSeen: number
  /** 'official': the feed said the event ended; 'timeout': the waiting time passed with no new alert */
  clearReason?: 'official' | 'timeout'
  /** The all-clear stays up until this time, then the board returns to its screens */
  clearUntil?: number
  /** Started from the settings or the URL, not from the real feed */
  simulated?: boolean
}

export const IDLE: AlertState = { phase: 'idle', title: '', desc: '', cities: [], since: 0, lastSeen: 0 }

/** How long the green "you may leave" notice stays before the screens return. */
export const CLEAR_SHOWN_MS = 60_000

export interface StepOptions {
  /** Minutes after the last alert for our area before the board stops showing it, when no official end arrives */
  holdMinutes: number
  simulated?: boolean
}

/** Advance the board's alert state with one poll result (or with `null` for a quiet poll). */
export function step(state: AlertState, payload: FeedPayload | null, configured: string[], now: number, opts: StepOptions): AlertState {
  let s = state
  if (payload) {
    const kind = classify(payload)
    const ours = matchCities(payload.data ?? [], configured)
    if (kind !== 'test' && ours.length) {
      const simulated = !!opts.simulated
      if (kind === 'alert') {
        const continuing = s.phase === 'alert'
        s = {
          phase: 'alert',
          title: payload.title?.trim() || 'התרעה',
          desc: payload.desc?.trim() || '',
          cities: continuing ? union(s.cities, ours) : ours,
          since: continuing ? s.since : now,
          lastSeen: now,
          simulated: continuing ? s.simulated && simulated : simulated,
        }
      } else if (kind === 'early') {
        // An early warning never downgrades a running alert.
        if (s.phase !== 'alert') {
          s = {
            phase: 'early',
            title: payload.title?.trim() || 'התרעה מקדימה',
            desc: payload.desc?.trim() || '',
            cities: s.phase === 'early' ? union(s.cities, ours) : ours,
            since: s.phase === 'early' ? s.since : now,
            lastSeen: now,
            simulated,
          }
        }
      } else if (kind === 'end') {
        if (s.phase === 'alert' || s.phase === 'early') {
          s = { ...s, phase: 'clear', clearReason: 'official', clearUntil: now + CLEAR_SHOWN_MS, title: payload.title?.trim() || 'האירוע הסתיים', desc: payload.desc?.trim() || '' }
        }
      }
    }
  }
  return tick(s, now, opts)
}

/** Time-based changes that happen with no new feed message. */
export function tick(s: AlertState, now: number, opts: StepOptions): AlertState {
  const hold = Math.max(1, opts.holdMinutes) * 60_000
  if (s.phase === 'alert' && now - s.lastSeen > hold) {
    // GUESS: no official end arrived. Home Front Command's standing rule is ten minutes in the
    // protected space unless told otherwise, so after the waiting time the board says so, carefully.
    return { ...s, phase: 'clear', clearReason: 'timeout', clearUntil: now + CLEAR_SHOWN_MS }
  }
  if (s.phase === 'early' && now - s.lastSeen > hold) return IDLE
  if (s.phase === 'clear' && now >= (s.clearUntil ?? 0)) return IDLE
  return s
}

function union(a: string[], b: string[]): string[] {
  return [...a, ...b.filter((x) => !a.includes(x))]
}

/* ------------------------------------------------------------ simulation */

/**
 * A simulated event goes through the same parser and state machine as the real feed.
 * Start one from the settings (פיקוד העורף tab), from the URL (?simulate=full), or from the
 * console with window.luachSimulate('full').
 */
export type SimKind = 'early' | 'alert' | 'end' | 'full' | 'stop'
export const SIM_EVENT = 'luach:simulate-alert'

export function simulate(kind: SimKind) {
  window.dispatchEvent(new CustomEvent(SIM_EVENT, { detail: kind }))
}

/** Feed messages for a simulated event in the given city. Titles copy the real feed's wording. */
export function simPayload(kind: 'early' | 'alert' | 'end', city: string): FeedPayload {
  const id = 'sim-' + Date.now()
  if (kind === 'early') return { id, cat: '10', title: 'בדקות הקרובות צפויות להתקבל התרעות באזורך', desc: 'יש לשפר את המיקום למיגון המיטבי בקרבתך', data: [city] }
  if (kind === 'end') return { id, cat: '10', title: 'האירוע הסתיים', desc: 'השוהים במרחב המוגן יכולים לצאת', data: [city] }
  return { id, cat: '1', title: 'ירי רקטות וטילים', desc: 'היכנסו למרחב המוגן ושהו בו 10 דקות', data: [city] }
}

/**
 * The full scenario, as offsets in seconds: an early warning, the siren (the feed keeps naming
 * the city for a while, then goes quiet), and the official end of the event.
 */
export const FULL_SCENARIO: { at: number; kind: 'early' | 'alert' | 'end' }[] = [
  { at: 0, kind: 'early' },
  { at: 8, kind: 'alert' },
  { at: 12, kind: 'alert' },
  { at: 16, kind: 'alert' },
  { at: 40, kind: 'end' },
]
