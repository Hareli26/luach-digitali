import {
  ComplexZmanimCalendar,
  GeoLocation,
  JewishCalendar,
  HebrewDateFormatter,
  YomiCalculator,
  DateTime,
} from 'kosher-zmanim'
import type { Settings, TzeitType } from '../types'

export interface Zman {
  key: string
  label: string
  /** The opinion / method this time follows, shown next to the label. */
  opinion?: string
  time: Date | null
  group: 'morning' | 'midday' | 'evening'
  highlight?: boolean
}

function toDate(dt: any): Date | null {
  if (!dt) return null
  try {
    if (typeof dt.toJSDate === 'function') return dt.toJSDate()
    if (dt instanceof Date) return dt
    return null
  } catch {
    return null
  }
}

function makeCalendar(s: Settings, date?: Date): ComplexZmanimCalendar {
  const geo = new GeoLocation(s.locationName, s.lat, s.lng, s.elevation, s.timeZone)
  const czc = new ComplexZmanimCalendar(geo)
  czc.setCandleLightingOffset(s.candleOffset)
  if (date) {
    const dt = DateTime.fromJSDate(date, { zone: s.timeZone })
    // @ts-ignore - kosher-zmanim accepts a Luxon DateTime
    czc.setDate(dt)
  }
  return czc
}

/** Tzeit opinions offered in settings. Each one maps to a distinct calculation. */
export const TZEIT_OPTIONS: { value: TzeitType; label: string; short: string }[] = [
  { value: 'geonim', label: 'גאונים — 8.5° מתחת לאופק', short: '8.5°' },
  { value: 'tukachinsky', label: 'גאונים — 7.083° (כ־13.5 דק׳ זמניות, לוח א״י)', short: '7.083°' },
  { value: 'rt72', label: 'רבנו תם — 72 דק׳ אחרי השקיעה', short: 'ר״ת 72 דק׳' },
]

/** Older saved settings used 'deg85', which was the same 8.5° calculation as 'geonim'. */
export function normalizeTzeitType(t: string | undefined): TzeitType {
  if (t === 'rt72' || t === 'tukachinsky') return t
  return 'geonim'
}

export function tzeitShort(type: TzeitType): string {
  return TZEIT_OPTIONS.find((o) => o.value === normalizeTzeitType(type))?.short ?? '8.5°'
}

function tzeit(czc: ComplexZmanimCalendar, type: TzeitType): Date | null {
  try {
    const t = normalizeTzeitType(type)
    if (t === 'rt72') return toDate(czc.getTzais72())
    if (t === 'tukachinsky') return toDate(czc.getTzaisGeonim7Point083Degrees())
    return toDate(czc.getTzaisGeonim8Point5Degrees())
  } catch {
    return null
  }
}

export function getZmanim(s: Settings, date?: Date): Zman[] {
  const czc = makeCalendar(s, date)
  const safe = (fn: () => any): Date | null => {
    try {
      return toDate(fn())
    } catch {
      return null
    }
  }
  const tz = normalizeTzeitType(s.tzeitType)

  const list: Zman[] = [
    { key: 'alos', label: 'עלות השחר', opinion: '16.1°', time: safe(() => czc.getAlosHashachar()), group: 'morning' },
    { key: 'misheyakir', label: 'טלית ותפילין', opinion: '11.5°', time: safe(() => czc.getMisheyakir11Point5Degrees()), group: 'morning' },
    { key: 'netz', label: 'הנץ החמה', time: safe(() => czc.getSunrise()), group: 'morning' },
    { key: 'shmaMGA', label: 'סו״ז ק״ש', opinion: 'מג״א', time: safe(() => czc.getSofZmanShmaMGA()), group: 'morning' },
    { key: 'shmaGRA', label: 'סו״ז ק״ש', opinion: 'גר״א', time: safe(() => czc.getSofZmanShmaGRA()), group: 'morning' },
    { key: 'tfilaGRA', label: 'סו״ז תפילה', opinion: 'גר״א', time: safe(() => czc.getSofZmanTfilaGRA()), group: 'morning' },
    { key: 'chatzos', label: 'חצות היום', time: safe(() => czc.getChatzos()), group: 'midday' },
    { key: 'minchaG', label: 'מנחה גדולה', opinion: 'גר״א', time: safe(() => czc.getMinchaGedola()), group: 'midday' },
    { key: 'minchaK', label: 'מנחה קטנה', opinion: 'גר״א', time: safe(() => (czc as any).getMinchaKetana()), group: 'evening' },
    { key: 'plag', label: 'פלג המנחה', opinion: 'גר״א', time: safe(() => (czc as any).getPlagHamincha()), group: 'evening' },
    { key: 'shkia', label: 'שקיעת החמה', time: safe(() => czc.getSunset()), group: 'evening' },
    { key: 'tzeit', label: 'צאת הכוכבים', opinion: tzeitShort(tz), time: tzeit(czc, tz), group: 'evening' },
  ]
  // Rabbeinu Tam as a separate row only when it isn't already the chosen tzeit.
  if (tz !== 'rt72') {
    list.push({ key: 'tzeitRT', label: 'צאת הכוכבים', opinion: 'ר״ת 72 דק׳', time: safe(() => czc.getTzais72()), group: 'evening' })
  }

  // Highlight the next upcoming zman
  const now = Date.now()
  let bestIdx = -1
  let bestDelta = Infinity
  list.forEach((z, i) => {
    if (z.time && z.time.getTime() > now) {
      const d = z.time.getTime() - now
      if (d < bestDelta) {
        bestDelta = d
        bestIdx = i
      }
    }
  })
  if (bestIdx >= 0) list[bestIdx].highlight = true

  return list
}

/** The next zman still ahead (today, otherwise the first one tomorrow). */
export function nextZman(s: Settings, now = new Date()): Zman | null {
  const t = now.getTime()
  const today = getZmanim(s, now).find((z) => z.time && z.time.getTime() > t)
  if (today) return today
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  return getZmanim(s, tomorrow).find((z) => z.time) ?? null
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(d.getDate() + n)
  return x
}

function jcFor(s: Settings, d: Date): JewishCalendar {
  const jc = new JewishCalendar(d)
  jc.setInIsrael(s.israel)
  return jc
}

function sunsetOf(s: Settings, d: Date): Date | null {
  try {
    return toDate(makeCalendar(s, d).getSunset())
  } catch {
    return null
  }
}

/**
 * The civil date whose Hebrew date applies right now.
 * The Hebrew day begins at sunset (`'shkia'`); the Omer is counted from tzeit (`'tzeit'`).
 */
export function halachicDate(s: Settings, now = new Date(), boundary: 'shkia' | 'tzeit' = 'shkia'): Date {
  try {
    const czc = makeCalendar(s, now)
    const edge = boundary === 'shkia' ? toDate(czc.getSunset()) : tzeit(czc, s.tzeitType)
    if (edge && now.getTime() >= edge.getTime()) return addDays(now, 1)
  } catch {
    /* fall through to the civil date */
  }
  return now
}

/** True from sunset until midnight: the Hebrew date has already moved on. */
export function isHebrewEvening(s: Settings, now = new Date()): boolean {
  return halachicDate(s, now, 'shkia').getDate() !== now.getDate()
}

export interface ShabbatInfo {
  /** 'shabbat' or 'yomtov' — what the coming (or current) holy day is */
  kind: 'shabbat' | 'yomtov'
  /** Hebrew name of the Yom Tov when kind === 'yomtov' */
  name: string
  candleLighting: Date | null
  /** End of the holy day: sunset + havdalaOffset on its last day */
  tzeitShabbat: Date | null
  parsha: string
  isErevShabbat: boolean
  isShabbat: boolean
  /** True while the holy day is in progress (between candle lighting and havdala) */
  inProgress: boolean
}

/**
 * Candle lighting and havdala for the current or next Shabbat / Yom Tov.
 * On Shabbat itself this returns *this* Shabbat's times until havdala, then moves on.
 */
export function getShabbatInfo(s: Settings, now = new Date()): ShabbatInfo {
  const f = new HebrewDateFormatter()
  f.setHebrewFormat(true)

  const compute = (from: Date): ShabbatInfo | null => {
    // Find the erev: today if today is a holy day already in progress (walk back), else the next erev.
    let erev: Date | null = null
    const today = jcFor(s, from)
    if (today.isAssurBemelacha()) {
      let d = from
      for (let i = 0; i < 4 && jcFor(s, addDays(d, -1)).isAssurBemelacha(); i++) d = addDays(d, -1)
      erev = addDays(d, -1)
    } else {
      for (let i = 0; i <= 8; i++) {
        const d = addDays(from, i)
        if (jcFor(s, d).hasCandleLighting()) {
          erev = d
          break
        }
      }
    }
    if (!erev) return null

    // Walk forward over the consecutive days of issur melacha.
    let last = addDays(erev, 1)
    for (let i = 0; i < 3 && jcFor(s, addDays(last, 1)).isAssurBemelacha(); i++) last = addDays(last, 1)

    let candle: Date | null = null
    try {
      candle = toDate(makeCalendar(s, erev).getCandleLighting())
    } catch {
      candle = null
    }
    const lastSunset = sunsetOf(s, last)
    const end = lastSunset ? new Date(lastSunset.getTime() + s.havdalaOffset * 60000) : null

    const firstDay = jcFor(s, addDays(erev, 1))
    // A Yom Tov that falls on Shabbat is still labelled by the Yom Tov (e.g. Rosh Hashana).
    const isYT = firstDay.isYomTovAssurBemelacha()
    let name = ''
    if (isYT) {
      try {
        name = f.formatYomTov(firstDay) || ''
      } catch {
        name = ''
      }
    }
    const startT = candle?.getTime() ?? 0
    return {
      kind: isYT ? 'yomtov' : 'shabbat',
      name,
      candleLighting: candle,
      tzeitShabbat: end,
      parsha: getParshaString(s, addDays(erev, 1)),
      isErevShabbat: now.getDay() === 5,
      isShabbat: now.getDay() === 6,
      inProgress: !!end && now.getTime() >= startT && now.getTime() < end.getTime(),
    }
  }

  let info = compute(now)
  // After havdala the period is over — show the next one.
  if (info && info.tzeitShabbat && now.getTime() >= info.tzeitShabbat.getTime()) info = compute(addDays(now, 1))
  return (
    info ?? {
      kind: 'shabbat',
      name: '',
      candleLighting: null,
      tzeitShabbat: null,
      parsha: getParshaString(s, now),
      isErevShabbat: now.getDay() === 5,
      isShabbat: now.getDay() === 6,
      inProgress: false,
    }
  )
}

export interface HebDate {
  dateHe: string
  dayOfWeek: string
  /** True after sunset: the Hebrew date shown is already tomorrow's ("אור ל…") */
  evening: boolean
  parsha: string
  yomTov: string
  roshChodesh: string
  omer: string
  dafYomi: string
  isRoshChodesh: boolean
  isYomTov: boolean
}

const DOW_HE = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'שבת קודש']

/** Hebrew date for `now`, advancing at sunset. The Omer line advances at tzeit. */
export function getHebrewDate(s: Settings, now = new Date()): HebDate {
  const hDate = halachicDate(s, now, 'shkia')
  const evening = hDate.getDate() !== now.getDate()
  const jc = jcFor(s, hDate)
  const f = new HebrewDateFormatter()
  f.setHebrewFormat(true)
  f.setUseLongHebrewYears(false)

  const safeStr = (fn: () => string): string => {
    try {
      return fn() || ''
    } catch {
      return ''
    }
  }

  const dowName = DOW_HE[hDate.getDay()]
  const dayOfWeek = evening ? (hDate.getDay() === 6 ? 'ליל שבת קודש' : `אור ל${dowName}`) : dowName

  let daf = ''
  try {
    daf = f.formatDafYomiBavli(YomiCalculator.getDafYomiBavli(jcFor(s, now)))
  } catch {
    daf = ''
  }

  let omer = ''
  try {
    const omerJc = jcFor(s, halachicDate(s, now, 'tzeit'))
    if (omerJc.getDayOfOmer() > 0) omer = f.formatOmer(omerJc)
  } catch {
    omer = ''
  }

  return {
    dateHe: safeStr(() => f.format(jc)),
    dayOfWeek,
    evening,
    parsha: getParshaString(s, hDate),
    yomTov: safeStr(() => f.formatYomTov(jc)),
    roshChodesh: safeStr(() => f.formatRoshChodesh(jc)),
    omer,
    dafYomi: daf,
    isRoshChodesh: (() => {
      try {
        return jc.isRoshChodesh()
      } catch {
        return false
      }
    })(),
    isYomTov: (() => {
      try {
        return jc.isYomTov()
      } catch {
        return false
      }
    })(),
  }
}

function getParshaString(s: Settings, date: Date): string {
  try {
    // Find the coming Shabbat
    const d = new Date(date)
    const until = (6 - d.getDay() + 7) % 7
    d.setDate(d.getDate() + until)
    const jc = jcFor(s, d)
    const f = new HebrewDateFormatter()
    f.setHebrewFormat(true)
    const p = f.formatParsha(jc)
    return p || ''
  } catch {
    return ''
  }
}
