import { HDate, HebrewCalendar, DailyLearning, flags, type Event as HEvent } from '@hebcal/core'
import '@hebcal/learning'
import { getLeyningOnDate } from '@hebcal/leyning'
import type { AnnSchedule, Announcement, DayKind, Nusach, Settings } from '../types'
import { getZmanim, halachicDate, getShabbatInfo, tzeitShort } from './zmanim'

/* ---------------------------------------------------------------- dates */

export function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(d.getDate() + n)
  return x
}

/** HDate that applies right now (the Hebrew day turns at sunset). */
export function hdNow(s: Settings, now = new Date()): HDate {
  return new HDate(halachicDate(s, now, 'shkia'))
}

function holidaysOn(hd: HDate, il: boolean): HEvent[] {
  return (HebrewCalendar.getHolidaysOnDate(hd, il) ?? []) as HEvent[]
}

const CHAG = flags.CHAG
const CHOL = flags.CHOL_HAMOED

/** weekday / shabbat / holiday — picks which column of screen times to use. */
export function dayKind(s: Settings, now = new Date()): DayKind {
  const hd = hdNow(s, now)
  const evs = holidaysOn(hd, s.israel)
  if (evs.some((e) => e.getFlags() & (CHAG | CHOL))) return 'holiday'
  if (hd.getDay() === 6) return 'shabbat'
  return 'weekday'
}

/* --------------------------------------------------------- holiday keys */

/** Holidays a schedule or announcement can be tied to. `match` is the start of hebcal's English description. */
export const HOLIDAY_OPTIONS: { key: string; label: string; match: string[] }[] = [
  { key: 'rosh-hashana', label: 'ראש השנה', match: ['Rosh Hashana'] },
  { key: 'tzom-gedaliah', label: 'צום גדליה', match: ['Tzom Gedaliah'] },
  { key: 'yom-kippur', label: 'יום כיפור', match: ['Yom Kippur'] },
  { key: 'sukkot', label: 'סוכות', match: ['Sukkot'] },
  { key: 'shmini-atzeret', label: 'שמיני עצרת ושמחת תורה', match: ['Shmini Atzeret', 'Simchat Torah'] },
  { key: 'chanukah', label: 'חנוכה', match: ['Chanukah'] },
  { key: 'asara-btevet', label: 'עשרה בטבת', match: ["Asara B'Tevet"] },
  { key: 'tu-bishvat', label: 'ט״ו בשבט', match: ['Tu BiShvat'] },
  { key: 'taanit-esther', label: 'תענית אסתר', match: ["Ta'anit Esther"] },
  { key: 'purim', label: 'פורים', match: ['Purim', 'Shushan Purim'] },
  { key: 'pesach', label: 'פסח', match: ['Pesach'] },
  { key: 'yom-haatzmaut', label: 'יום העצמאות', match: ["Yom HaAtzma'ut"] },
  { key: 'lag-baomer', label: 'ל״ג בעומר', match: ['Lag BaOmer'] },
  { key: 'yom-yerushalayim', label: 'יום ירושלים', match: ['Yom Yerushalayim'] },
  { key: 'shavuot', label: 'שבועות', match: ['Shavuot'] },
  { key: '17-tammuz', label: 'שבעה עשר בתמוז', match: ['Tzom Tammuz'] },
  { key: 'tisha-bav', label: 'תשעה באב', match: ["Tish'a B'Av"] },
  { key: 'rosh-chodesh', label: 'ראש חודש', match: ['Rosh Chodesh'] },
]

export function holidayLabel(key: string): string {
  return HOLIDAY_OPTIONS.find((h) => h.key === key)?.label ?? key
}

function matchesKey(ev: HEvent, key: string): boolean {
  const opt = HOLIDAY_OPTIONS.find((h) => h.key === key)
  if (!opt) return false
  const d = ev.getDesc()
  return opt.match.some((m) => d.startsWith(m)) && !d.startsWith('Erev')
}

export interface HolidayWindow {
  key: string
  /** first civil day of the holiday */
  start: Date
  /** last civil day of the holiday */
  end: Date
  daysUntil: number
}

/**
 * The next (or current) occurrence of a holiday, if it begins within `daysBefore` days.
 * Days are counted on the Hebrew date, so the evening before counts as the holiday.
 */
export function holidayWindow(s: Settings, key: string, daysBefore: number, now = new Date()): HolidayWindow | null {
  const today = halachicDate(s, now, 'shkia')
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  let start: Date | null = null
  let end: Date | null = null
  // Look back a few days too, so a holiday in progress is found.
  for (let i = -9; i <= Math.max(daysBefore, 0) + 1; i++) {
    const d = addDays(t0, i)
    const on = holidaysOn(new HDate(d), s.israel).some((e) => matchesKey(e, key))
    if (on) {
      if (!start || (end && (d.getTime() - end.getTime()) / 86400000 > 1)) {
        if (start && end && end.getTime() >= t0.getTime()) break
        start = d
      }
      end = d
    }
  }
  if (!start || !end || end.getTime() < t0.getTime()) return null
  const daysUntil = Math.round((start.getTime() - t0.getTime()) / 86400000)
  if (daysUntil > daysBefore) return null
  return { key, start, end, daysUntil }
}

/* -------------------------------------------------------- inyanei diyoma */

export interface DiyomaItem {
  label: string
  value: string
  /** 'add' = something said today, 'omit' = something not said, 'info' */
  tone: 'add' | 'omit' | 'info'
  note?: string
}

function isSefardi(n: Nusach): boolean {
  return n === 'edot_hamizrach' || n === 'teiman'
}

/** Barech: "ותן טל ומטר" from 7 Cheshvan in Israel; abroad from the evening of Dec 4 (Dec 5 before a civil leap year). */
function isGeshamimRequest(hd: HDate, civil: Date, israel: boolean): boolean {
  const m = hd.getMonth()
  const day = hd.getDate()
  // Nisan 15 onward (summer) through Cheshvan
  const yearMonths = [1, 2, 3, 4, 5, 6, 7]
  if (m === 1 && day >= 15) return false
  if (yearMonths.includes(m) && m !== 1) return false
  if (israel) {
    if (m === 8) return day >= 7
    return true
  }
  // Abroad: from Dec 5 (or 6) as halachic date, through 14 Nisan
  const y = civil.getMonth() >= 8 ? civil.getFullYear() : civil.getFullYear() - 1
  const startDay = (y + 1) % 4 === 0 ? 6 : 5
  const start = new Date(y, 11, startDay)
  return civil.getTime() >= start.getTime()
}

/** Gevurot: "משיב הרוח" from Musaf of Shmini Atzeret (22 Tishrei) to Musaf of the first day of Pesach (15 Nisan). */
function rainSeason(hd: HDate): 'geshem' | 'tal' | 'switch-to-geshem' | 'switch-to-tal' {
  const m = hd.getMonth()
  const d = hd.getDate()
  if (m === 7 && d === 22) return 'switch-to-geshem'
  if (m === 1 && d === 15) return 'switch-to-tal'
  if (m === 7) return d > 22 ? 'geshem' : 'tal'
  if (m === 1) return d > 15 ? 'tal' : 'geshem'
  if (m >= 2 && m <= 6) return 'tal'
  return 'geshem'
}

export function getDiyoma(s: Settings, now = new Date()): DiyomaItem[] {
  const civil = halachicDate(s, now, 'shkia')
  const hd = new HDate(civil)
  const il = s.israel
  const evs = holidaysOn(hd, il)
  const out: DiyomaItem[] = []
  const has = (f: number) => evs.some((e) => e.getFlags() & f)
  const desc = (p: string) => evs.some((e) => e.getDesc().startsWith(p))
  const m = hd.getMonth()
  const d = hd.getDate()
  const chanukah = desc('Chanukah') && !(m === 9 && d === 24)

  // Gevurot
  const rain = rainSeason(hd)
  const tal = s.nusach === 'ashkenaz' && !il ? '' : 'מוֹרִיד הַטָּל'
  if (rain === 'geshem') out.push({ label: 'בברכת גבורות', value: 'מַשִּׁיב הָרוּחַ וּמוֹרִיד הַגֶּשֶׁם', tone: 'add' })
  else if (rain === 'switch-to-geshem')
    out.push({ label: 'בברכת גבורות', value: 'מַשִּׁיב הָרוּחַ וּמוֹרִיד הַגֶּשֶׁם', tone: 'add', note: 'החל מתפילת מוסף' })
  else if (rain === 'switch-to-tal')
    out.push({ label: 'בברכת גבורות', value: tal || 'אין אומרים משיב הרוח', tone: 'info', note: 'החל מתפילת מוסף' })
  else if (tal) out.push({ label: 'בברכת גבורות', value: tal, tone: 'info' })

  // Birkat HaShanim — not on Shabbat / Yom Tov (no weekday amida)
  const weekdayAmida = hd.getDay() !== 6 && !has(CHAG)
  if (weekdayAmida) {
    const winter = isGeshamimRequest(hd, civil, il)
    if (isSefardi(s.nusach)) {
      out.push({ label: 'ברכת השנים', value: winter ? 'בָּרֵךְ עָלֵינוּ' : 'בָּרְכֵנוּ', tone: winter ? 'add' : 'info' })
    } else {
      out.push({ label: 'ברכת השנים', value: winter ? 'וְתֵן טַל וּמָטָר לִבְרָכָה' : 'וְתֵן בְּרָכָה', tone: winter ? 'add' : 'info' })
    }
  }

  // Aseret Yemei Teshuva
  if (m === 7 && d >= 1 && d <= 10) {
    out.push({ label: 'עשרת ימי תשובה', value: 'הַמֶּלֶךְ הַקָּדוֹשׁ · זׇכְרֵנוּ לְחַיִּים', tone: 'add', note: 'וכתוב, ובספר חיים, המלך המשפט' })
  }

  // Ya'aleh VeYavo
  const roshChodesh = has(flags.ROSH_CHODESH)
  if (roshChodesh || has(CHOL) || has(CHAG)) {
    out.push({ label: 'בתפילה ובברכת המזון', value: 'יַעֲלֶה וְיָבֹא', tone: 'add' })
  }

  // Al HaNisim
  if (chanukah) out.push({ label: 'בהודאה ובברכת המזון', value: 'עַל הַנִּסִּים — בימי מתתיהו', tone: 'add' })
  if (desc('Purim') && !desc('Purim Katan')) out.push({ label: 'בהודאה ובברכת המזון', value: 'עַל הַנִּסִּים — בימי מרדכי ואסתר', tone: 'add' })
  if (desc('Shushan Purim') && !desc('Shushan Purim Katan'))
    out.push({ label: 'בירושלים ובערים המוקפות חומה', value: 'עַל הַנִּסִּים — שושן פורים', tone: 'add' })

  // Hallel
  const hallel = HebrewCalendar.hallel(hd, il)
  if (hallel === 2) out.push({ label: 'הלל', value: 'הַלֵּל שָׁלֵם', tone: 'add' })
  else if (hallel === 1) out.push({ label: 'הלל', value: 'חֲצִי הַלֵּל', tone: 'add', note: 'בדילוג' })

  // Fasts: Aneinu
  if (has(flags.MINOR_FAST) || desc("Tish'a B'Av")) {
    out.push({ label: 'תענית ציבור', value: 'עֲנֵנוּ', tone: 'add', note: 'ש״ץ בחזרה; היחיד בשומע תפילה במנחה' })
  }

  // Tachanun
  if (weekdayAmida || hd.getDay() === 6) {
    const t = HebrewCalendar.tachanun(hd, il)
    if (hd.getDay() === 6) {
      // Tzidkatcha at Shabbat Mincha: omitted when Tachanun would not be said on this day or on the Sunday after.
      const sunday = HebrewCalendar.tachanun(new HDate(addDays(civil, 1)), il)
      const festive =
        has(flags.ROSH_CHODESH | CHAG | CHOL | flags.MINOR_HOLIDAY) ||
        chanukah ||
        m === 1 ||
        (m === 3 && d <= 12) ||
        (m === 7 && d >= 10)
      const say = sunday.shacharit && !festive
      out.push(
        say
          ? { label: 'במנחת שבת', value: 'צִדְקָתְךָ צֶדֶק', tone: 'info' }
          : { label: 'במנחת שבת', value: 'אין אומרים צִדְקָתְךָ', tone: 'omit', note: 'לפי מנהג רוב הקהילות' },
      )
    } else if (!t.shacharit && !t.mincha) {
      out.push({ label: 'תחנון', value: 'אין אומרים תַּחֲנוּן', tone: 'omit' })
    } else if (t.shacharit && !t.mincha) {
      out.push({ label: 'תחנון', value: 'אומרים תחנון בשחרית; במנחה אין אומרים', tone: 'info' })
    } else {
      out.push({ label: 'תחנון', value: 'אומרים תַּחֲנוּן', tone: 'info' })
    }
    if (hd.getDay() !== 6 && t.shacharit && (hd.getDay() === 1 || hd.getDay() === 4)) {
      out.push({ label: 'שני וחמישי', value: 'וְהוּא רַחוּם · קריאת התורה', tone: 'info' })
    }
  }

  // Omer reminder
  const omerEv = evs.find((e) => e.getFlags() & flags.OMER_COUNT)
  if (omerEv) out.push({ label: 'ספירת העומר', value: omerEv.render('he'), tone: 'info' })

  // Mashiv / mevarchim reminders for Shabbat
  if (hd.getDay() === 6) {
    const mev = mevarchimOn(hd)
    if (mev) out.push({ label: 'שבת מברכים', value: mev, tone: 'info' })
  }

  return out
}

function mevarchimOn(hd: HDate): string {
  try {
    const evs = HebrewCalendar.calendar({ start: hd, end: hd, shabbatMevarchim: true, noHolidays: true, il: true })
    const mev = evs.find((e) => e.getFlags() & flags.SHABBAT_MEVARCHIM)
    return mev ? mev.render('he') : ''
  } catch {
    return ''
  }
}

/* ------------------------------------------------------------- weekly */

const BOOKS_HE: Record<string, string> = {
  Joshua: 'יהושע', Judges: 'שופטים', 'I Samuel': 'שמואל א', 'II Samuel': 'שמואל ב', 'I Kings': 'מלכים א', 'II Kings': 'מלכים ב',
  Isaiah: 'ישעיהו', Jeremiah: 'ירמיהו', Ezekiel: 'יחזקאל', Hosea: 'הושע', Joel: 'יואל', Amos: 'עמוס', Obadiah: 'עובדיה',
  Jonah: 'יונה', Micah: 'מיכה', Nahum: 'נחום', Habakkuk: 'חבקוק', Zephaniah: 'צפניה', Haggai: 'חגי', Zechariah: 'זכריה',
  Malachi: 'מלאכי', Samuel: 'שמואל', Kings: 'מלכים',
}

function gem(n: number): string {
  const ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט']
  const tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ']
  if (n === 15) return 'טו'
  if (n === 16) return 'טז'
  const h = n >= 100 ? 'ק'.repeat(Math.floor(n / 100)) : ''
  return h + tens[Math.floor((n % 100) / 10)] + ones[n % 10]
}

/** "Hosea 12:13-14:10; Joel 2:15" → "הושע יב, יג – יד, י · יואל ב, טו" */
export function haftaraHebrew(en: string | undefined): string {
  if (!en) return ''
  return en
    .split(/;\s*/)
    .map((part) => {
      const m = part.match(/^(.*?)\s+(\d.*)$/)
      if (!m) return part
      const book = BOOKS_HE[m[1]] ?? m[1]
      const range = m[2]
        .split('-')
        .map((pos) => pos.split(':').map((x) => gem(parseInt(x, 10))).join(', '))
        .join(' – ')
      return `${book} ${range}`
    })
    .join(' · ')
}

export interface WeeklyInfo {
  parsha: string
  specialShabbat: string
  haftara: string
  avot: string
  mevarchim: string
}

/** Leyning for the coming Shabbat (or this Shabbat, until it ends). */
export function getWeekly(s: Settings, now = new Date()): WeeklyInfo {
  const today = halachicDate(s, now, 'shkia')
  const sat = addDays(today, (6 - today.getDay() + 7) % 7)
  const hd = new HDate(sat)
  const out: WeeklyInfo = { parsha: '', specialShabbat: '', haftara: '', avot: '', mevarchim: '' }
  try {
    const ley: any = getLeyningOnDate(hd, s.israel)
    if (ley) {
      out.parsha = typeof ley.name === 'object' ? ley.name.he : ley.name
      // The Sefardi haftara, when it differs, comes as {k, b, e} (book, begin, end).
      const seph = isSefardi(s.nusach) && ley.seph && typeof ley.seph === 'object' && !Array.isArray(ley.seph) ? `${ley.seph.k} ${ley.seph.b}-${ley.seph.e}` : ''
      out.haftara = haftaraHebrew(seph || ley.haftara)
    }
  } catch {
    /* holiday Shabbat without leyning data */
  }
  try {
    const special = holidaysOn(hd, s.israel).find((e) => e.getFlags() & flags.SPECIAL_SHABBAT)
    if (special) out.specialShabbat = special.render('he')
  } catch {
    /* none */
  }
  try {
    const avot = DailyLearning.lookup('pirkeiAvotSummer', hd, s.israel)
    if (avot) out.avot = avot.render('he')
  } catch {
    /* outside the season */
  }
  out.mevarchim = mevarchimOn(hd)
  return out
}

/* ------------------------------------------------------------ learning */

export const LEARNING_OPTIONS: { key: string; label: string }[] = [
  { key: 'dafYomi', label: 'דף יומי בבלי' },
  { key: 'yerushalmi-vilna', label: 'דף יומי ירושלמי' },
  { key: 'mishnaYomi', label: 'משנה יומית' },
  { key: 'nachYomi', label: 'נ״ך יומי' },
  { key: 'rambam1', label: 'רמב״ם — פרק אחד' },
  { key: 'rambam3', label: 'רמב״ם — שלושה פרקים' },
  { key: 'kitzurShulchanAruch', label: 'קיצור שולחן ערוך' },
  { key: 'chofetzChaim', label: 'חפץ חיים' },
  { key: 'tanyaYomi', label: 'תניא יומי' },
  { key: 'psalms', label: 'תהילים (מחזור חודשי)' },
  { key: 'arukhHaShulchanYomi', label: 'ערוך השולחן' },
  { key: 'perekYomi', label: 'פרק יומי במשנה' },
]

/** Strips the calendar's own prefix and writes chapter:verse numbers as Hebrew letters ("18:6-7" → "יח, ו–ז"). */
function cleanLearning(s: string): string {
  return s
    .replace(/^Kitzur Shulchan Arukh\s*/, '')
    .replace(/^Arukh HaShulchan\s*/, '')
    .replace(/^תַּנְיָא:\s*/, '')
    .replace(/^דַּף יוֹמִי:\s*/, '')
    // Chofetz Chaim style "7.11-7.12" (klal.se'if)
    .replace(/(\d+)\.(\d+)-(\d+)\.(\d+)/g, (_, c1, a, c2, b) =>
      c1 === c2 ? `כלל ${gem(+c1)}, ${gem(+a)}–${gem(+b)}` : `כלל ${gem(+c1)}, ${gem(+a)} – כלל ${gem(+c2)}, ${gem(+b)}`,
    )
    .replace(/(\d+)\.(\d+)/g, (_, c, a) => `כלל ${gem(+c)}, ${gem(+a)}`)
    .replace(/(\d+):(\d+)(?:-(\d+))?/g, (_, c, a, b) => `${gem(+c)}, ${gem(+a)}${b ? `–${gem(+b)}` : ''}`)
}

export interface LearningEntry {
  key: string
  label: string
  value: string
  /** Sefaria ref when the source text can be fetched */
  ref?: string
}

export function sefariaRef(url: string | undefined): string | undefined {
  if (!url) return undefined
  const m = url.match(/sefaria\.org\/([^?]+)/)
  return m ? decodeURIComponent(m[1]) : undefined
}

/** Daily learning keyed to the civil day (the cycles change at midnight, as printed luachot do). */
export function getLearning(keys: string[], now = new Date(), israel = true): LearningEntry[] {
  const hd = new HDate(now)
  const out: LearningEntry[] = []
  for (const key of keys) {
    const opt = LEARNING_OPTIONS.find((o) => o.key === key)
    if (!opt) continue
    try {
      const ev: any = DailyLearning.lookup(key, hd, israel)
      if (!ev) continue
      out.push({ key, label: opt.label, value: cleanLearning(ev.render('he')), ref: sefariaRef(ev.url?.()) })
    } catch {
      /* calendar not running today */
    }
  }
  return out
}

/* --------------------------------------------------------------- fasts */

export interface FastInfo {
  name: string
  start: Date | null
  startLabel: string
  end: Date | null
  endLabel: string
  daysUntil: number
  postponed: boolean
}

/** Next public fast within `within` days (or today's). */
export function getFast(s: Settings, now = new Date(), within = 3): FastInfo | null {
  const today = halachicDate(s, now, 'shkia')
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  for (let i = 0; i <= within; i++) {
    const day = addDays(t0, i)
    const hd = new HDate(day)
    const fast = holidaysOn(hd, s.israel).find((e) => e.getFlags() & (flags.MINOR_FAST | flags.MAJOR_FAST))
    if (!fast) continue
    const desc = fast.getDesc()
    if (desc.startsWith('Erev')) continue
    const zm = getZmanim(s, day)
    const zPrev = getZmanim(s, addDays(day, -1))
    const get = (list: typeof zm, k: string) => list.find((z) => z.key === k)?.time ?? null
    const major = !!(fast.getFlags() & flags.MAJOR_FAST)
    let start: Date | null
    let startLabel: string
    let end: Date | null
    let endLabel: string
    if (major) {
      start = get(zPrev, 'shkia')
      startLabel = 'תחילת הצום (שקיעה, ערב הצום)'
      if (desc.startsWith('Yom Kippur')) {
        const sh = getShabbatInfo(s, addDays(day, -1))
        start = sh.candleLighting ?? start
        startLabel = 'תחילת הצום (הדלקת נרות)'
        const sunset = get(zm, 'shkia')
        end = sunset ? new Date(sunset.getTime() + s.havdalaOffset * 60000) : null
        endLabel = `סיום הצום (שקיעה + ${s.havdalaOffset} דק׳)`
      } else {
        end = get(zm, 'tzeit')
        endLabel = `סיום הצום (צאת הכוכבים ${tzeitShort(s.tzeitType)})`
      }
    } else {
      start = get(zm, 'alos')
      startLabel = 'תחילת הצום (עלות השחר 16.1°)'
      end = get(zm, 'tzeit')
      endLabel = `סיום הצום (צאת הכוכבים ${tzeitShort(s.tzeitType)})`
    }
    return {
      name: fast.render('he'),
      start,
      startLabel,
      end,
      endLabel,
      daysUntil: i,
      // A fast moved off Shabbat lands on a date other than its own (17 Tammuz, 9 Av, Tzom Gedaliah → Sunday; Esther → Thursday)
      postponed: /Tammuz|Tish'a|Gedaliah/.test(desc) ? hd.getDay() === 0 : /Esther/.test(desc) ? hd.getDay() === 4 : false,
    }
  }
  return null
}

/* ------------------------------------------------------------ chanukah */

export interface ChanukahInfo {
  candles: number
  tonight: boolean
  lightingLabel: string
  lighting: Date | null
}

/**
 * Candles to light tonight (from sunset) or tonight's count during the day.
 * Lighting time: Friday before Shabbat candles; Motzei Shabbat after havdala; otherwise at tzeit / shkia.
 */
export function getChanukah(s: Settings, now = new Date()): ChanukahInfo | null {
  const civilToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  // Candles lit on the evening of civil day D belong to Hebrew day D+1.
  const evening = new HDate(addDays(civilToday, 1))
  const m = evening.getMonth()
  const d = evening.getDate()
  const kislevLen = HDate.daysInMonth(9, evening.getFullYear())
  let n = 0
  if (m === 9 && d >= 25) n = d - 24
  else if (m === 10 && d <= 3) n = kislevLen - 24 + d
  if (n < 1 || n > 8) return null
  const zm = getZmanim(s, civilToday)
  const get = (k: string) => zm.find((z) => z.key === k)?.time ?? null
  const dow = civilToday.getDay()
  let lighting: Date | null
  let lightingLabel: string
  if (dow === 5) {
    const sh = getShabbatInfo(s, civilToday)
    lighting = sh.candleLighting ? new Date(sh.candleLighting.getTime() - 5 * 60000) : null
    lightingLabel = 'ערב שבת: לפני הדלקת נרות שבת'
  } else if (dow === 6) {
    lighting = getShabbatInfo(s, addDays(civilToday, -1)).tzeitShabbat
    lightingLabel = 'מוצאי שבת: לאחר הבדלה'
  } else {
    lighting = get('tzeit')
    lightingLabel = 'זמן הדלקה: צאת הכוכבים'
  }
  return { candles: n, tonight: true, lighting, lightingLabel }
}

/* ------------------------------------------------------- announcements */

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function scheduleActive(sch: AnnSchedule | undefined, s: Settings, now = new Date(), parsha = ''): boolean {
  if (!sch || sch.kind === 'always') return true
  switch (sch.kind) {
    case 'dow':
      return !sch.dows?.length || sch.dows.includes(now.getDay())
    case 'range': {
      const t = ymd(now)
      return (!sch.from || t >= sch.from) && (!sch.to || t <= sch.to)
    }
    case 'holiday':
      return !!sch.holiday && !!holidayWindow(s, sch.holiday, sch.daysBefore ?? 3, now)
    case 'parsha':
      return !!sch.parsha && parsha.replace(/[֑-ׇ]/g, '').includes(sch.parsha.replace(/[֑-ׇ]/g, '').trim())
  }
  return true
}

export function activeAnnouncements(s: Settings, now = new Date()): Announcement[] {
  const needParsha = s.announcements.some((a) => a.schedule?.kind === 'parsha')
  const parsha = needParsha ? getWeekly(s, now).parsha : ''
  return s.announcements.filter((a) => (a.title.trim() || a.body.trim()) && scheduleActive(a.schedule, s, now, parsha))
}

export const DOW_SHORT = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']
