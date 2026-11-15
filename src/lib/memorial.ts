import { JewishCalendar, HebrewDateFormatter } from 'kosher-zmanim'
import type { Memorial } from '../types'

export const HEB_MONTHS: { value: number; label: string }[] = [
  { value: 7, label: 'תשרי' },
  { value: 8, label: 'חשוון' },
  { value: 9, label: 'כסלו' },
  { value: 10, label: 'טבת' },
  { value: 11, label: 'שבט' },
  { value: 12, label: 'אדר (א׳)' },
  { value: 13, label: 'אדר ב׳' },
  { value: 1, label: 'ניסן' },
  { value: 2, label: 'אייר' },
  { value: 3, label: 'סיוון' },
  { value: 4, label: 'תמוז' },
  { value: 5, label: 'אב' },
  { value: 6, label: 'אלול' },
]

export function hebMonthLabel(m: number): string {
  return HEB_MONTHS.find((x) => x.value === m)?.label ?? String(m)
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function hebToGreg(hyear: number, hmonth: number, hday: number): Date | null {
  try {
    const jc = new JewishCalendar(hyear, hmonth, hday)
    return new Date(jc.getGregorianYear(), jc.getGregorianMonth(), jc.getGregorianDayOfMonth())
  } catch {
    return null
  }
}

function isLeap(hyear: number): boolean {
  try {
    return new JewishCalendar(hyear, 7, 1).isJewishLeapYear()
  } catch {
    return false
  }
}

/** Resolve the month actually observed in a given hebrew year (Adar handling). */
function observedMonth(hmonth: number, hyear: number): number {
  const leap = isLeap(hyear)
  if (hmonth === 12 && !leap) return 12 // Adar
  if (hmonth === 13 && !leap) return 12 // Adar II -> Adar in a regular year
  if (hmonth === 12 && leap) return 12 // Adar I
  return hmonth
}

export interface MemorialOccurrence extends Memorial {
  nextDate: Date
  hebDateLabel: string
  isToday: boolean
  daysAway: number
}

export function upcomingMemorials(memorials: Memorial[], now = new Date(), withinDays = 45): MemorialOccurrence[] {
  const today = startOfDay(now)
  const todayJc = new JewishCalendar(now)
  const curYear = todayJc.getJewishYear()
  const f = new HebrewDateFormatter()
  f.setHebrewFormat(true)

  const out: MemorialOccurrence[] = []

  for (const mem of memorials) {
    if (!mem.name.trim()) continue
    let found: Date | null = null
    for (let yOff = 0; yOff <= 1; yOff++) {
      const hy = curYear + yOff
      const mon = observedMonth(mem.hebMonth, hy)
      const d = hebToGreg(hy, mon, mem.hebDay)
      if (d && startOfDay(d).getTime() >= today.getTime()) {
        found = d
        break
      }
    }
    if (!found) continue
    const daysAway = Math.round((startOfDay(found).getTime() - today.getTime()) / 86400000)
    if (daysAway > withinDays) continue

    let hebLabel = ''
    try {
      const jc = new JewishCalendar(found)
      hebLabel = `${f.formatHebrewNumber(mem.hebDay)} ${f.formatMonth(jc)}`
    } catch {
      hebLabel = `${mem.hebDay} ${hebMonthLabel(mem.hebMonth)}`
    }

    out.push({
      ...mem,
      nextDate: found,
      hebDateLabel: hebLabel,
      isToday: daysAway === 0,
      daysAway,
    })
  }

  return out.sort((a, b) => a.daysAway - b.daysAway)
}

/** Civil date of the passing, when the Hebrew year is known. */
export function passingDate(m: Memorial): Date | null {
  if (!m.hebYear) return null
  return hebToGreg(m.hebYear, observedMonth(m.hebMonth, m.hebYear), m.hebDay)
}

/** Within twelve Hebrew months of the passing — the year of kaddish and mourning. */
export function inMourningYear(m: Memorial, now = new Date()): boolean {
  const d = passingDate(m)
  if (!d) return false
  const end = hebToGreg(m.hebYear! + 1, observedMonth(m.hebMonth, m.hebYear! + 1), m.hebDay)
  const t = startOfDay(now).getTime()
  return t >= startOfDay(d).getTime() && (!end || t < startOfDay(end).getTime())
}

export function currentHebYear(now = new Date()): number {
  return new JewishCalendar(now).getJewishYear()
}

export function formatHebYear(y: number): string {
  const f = new HebrewDateFormatter()
  f.setHebrewFormat(true)
  try {
    return f.formatHebrewNumber(y % 1000)
  } catch {
    return String(y)
  }
}
