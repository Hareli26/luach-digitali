import { HDate, getSedra } from '@hebcal/core'
import type { DayKind, Settings } from '../types'
import { activeHolidayKeys, addDays } from './calendar'
import { halachicDate } from './zmanim'
import CREDITS from '../data/places.json'

/**
 * Background photographs of holy places. The board picks one from the calendar:
 * the holiday's place, on Shabbat the parsha's place and Shabbat places, on weekdays
 * a slow rotation that returns to the parsha's place every third change.
 */

export interface PlaceCredit {
  key: string
  file: string
  title: string
  author: string
  license: string
  source: string
  /** CSS object-position for the photo's subject, e.g. "50% 40%" */
  position?: string
}

export const PLACE_NAMES: Record<string, string> = {
  kotel: 'הכותל המערבי',
  machpela: 'מערת המכפלה, חברון',
  'kever-rachel': 'קבר רחל אמנו',
  tzfat: 'צפת העתיקה',
  meron: 'הר מירון',
  shiloh: 'תל שילה',
  sinai: 'מדבר סיני',
  nevo: 'הר נבו',
  yarden: 'נהר הירדן',
  grizim: 'הר גריזים והר עיבל',
  tiberias: 'טבריה והכנרת',
  hurva: 'בית הכנסת החורבה, ירושלים',
  jerusalem: 'חומות ירושלים',
  tzin: 'מדבר צין',
  esther: 'קבר מרדכי ואסתר, המדאן',
}

/** Only places that actually have a bundled photo. */
export const PLACES: PlaceCredit[] = (CREDITS as PlaceCredit[]).filter((c) => PLACE_NAMES[c.key])
const HAS = new Set(PLACES.map((p) => p.key))

/** Where each parsha happens or what it is about (English names as hebcal gives them). */
const PARSHA_PLACE: Record<string, string> = {
  Bereshit: 'kotel', // אבן השתייה, ממנה הושתת העולם
  'Lech-Lecha': 'machpela', // אלוני ממרא אשר בחברון
  Vayera: 'kotel', // העקדה בהר המוריה
  'Chayei Sara': 'machpela',
  Toldot: 'machpela',
  Vayetzei: 'kever-rachel',
  Vayishlach: 'kever-rachel',
  Vayeshev: 'grizim', // האחים רועים בשכם
  Vayechi: 'machpela',
  Shemot: 'sinai', // הסנה בחורב
  Beshalach: 'sinai',
  Yitro: 'sinai',
  Mishpatim: 'sinai',
  Terumah: 'shiloh',
  Tetzaveh: 'shiloh',
  'Ki Tisa': 'sinai',
  Vayakhel: 'shiloh',
  Pekudei: 'shiloh',
  Vayikra: 'shiloh',
  Tzav: 'shiloh',
  Shmini: 'shiloh',
  'Achrei Mot': 'kotel',
  Emor: 'kotel',
  Bamidbar: 'sinai',
  Nasso: 'sinai',
  "Beha'alotcha": 'tzin',
  "Sh'lach": 'tzin',
  Korach: 'tzin',
  Chukat: 'tzin',
  Balak: 'yarden',
  Pinchas: 'nevo',
  Matot: 'yarden',
  Masei: 'yarden',
  Devarim: 'yarden',
  Vaetchanan: 'nevo',
  "Re'eh": 'grizim',
  Shoftim: 'kotel',
  'Ki Tavo': 'grizim',
  Nitzavim: 'yarden',
  Vayeilech: 'yarden',
  "Ha'azinu": 'nevo',
  'Vezot Haberakhah': 'nevo',
}

/** HOLIDAY_OPTIONS key → place. Earlier entries win when two holidays meet. */
const HOLIDAY_PLACE: [string, string][] = [
  ['tisha-bav', 'kotel'],
  ['17-tammuz', 'jerusalem'],
  ['asara-btevet', 'jerusalem'],
  ['yom-kippur', 'kotel'],
  ['rosh-hashana', 'kotel'],
  ['sukkot', 'kotel'],
  ['shmini-atzeret', 'kotel'],
  ['pesach', 'jerusalem'],
  ['shavuot', 'sinai'],
  ['lag-baomer', 'meron'],
  ['yom-yerushalayim', 'kotel'],
  ['chanukah', 'jerusalem'],
  ['purim', 'esther'],
  ['tu-bishvat', 'tiberias'],
]

/** Shabbat places, alternating with the parsha's own. */
const SHABBAT_PLACES = ['tzfat', 'hurva', 'kotel']

export interface Backdrop {
  key: string
  name: string
  /** Why this place now: "פרשת חיי שרה", "שבת", "חנוכה", or '' */
  reason: string
  url: string
  credit: PlaceCredit
}

/** The coming Shabbat's parsha (English, as hebcal names it), if it has a place with a photo. */
function parshaPlaceKey(s: Settings, now: Date): string | null {
  try {
    const today = halachicDate(s, now, 'shkia')
    const sat = new HDate(addDays(today, (6 - today.getDay() + 7) % 7))
    const r = getSedra(sat.getFullYear(), s.israel).lookup(sat)
    if (r.chag) return null
    const en = r.parsha.find((p) => PARSHA_PLACE[p] && HAS.has(PARSHA_PLACE[p]))
    return en ? PARSHA_PLACE[en] : null
  } catch {
    return null
  }
}

function make(key: string, reason: string): Backdrop | null {
  const credit = PLACES.find((p) => p.key === key)
  if (!credit) return null
  return { key, name: PLACE_NAMES[key], reason, url: `places/${credit.file}`, credit }
}

/**
 * The background for this moment. `slot` counts changes (minutes / interval) so the choice is
 * stable across reloads and the same on every screen in the shul. `parshaHe` is the Hebrew parsha
 * name the board already shows.
 */
export function pickBackdrop(s: Settings, now: Date, kind: DayKind, slot: number, parshaHe: string): Backdrop | null {
  if (!PLACES.length) return null

  const holidays = activeHolidayKeys(s, now)
  for (const [hk, place] of HOLIDAY_PLACE) {
    if (holidays.includes(hk) && HAS.has(place)) return make(place, HOLIDAY_HE[hk] ?? '')
  }

  const parshaPlace = parshaPlaceKey(s, now)
  const parshaReason = parshaHe ? `פרשת ${parshaHe}` : ''

  if (kind === 'shabbat') {
    const pool = [...(parshaPlace ? [parshaPlace] : []), ...SHABBAT_PLACES.filter((k) => HAS.has(k) && k !== parshaPlace)]
    const key = pool[slot % pool.length]
    return make(key, key === parshaPlace ? parshaReason : 'שבת שלום')
  }

  // Weekday: every third change shows the parsha's place; the rest rotate through all places.
  const pool = PLACES.map((p) => p.key).filter((k) => k !== 'esther' && k !== parshaPlace)
  if (parshaPlace && (slot % 3 === 0 || !pool.length)) return make(parshaPlace, parshaReason)
  if (!pool.length) return null
  // Slots between the parsha's turns walk the pool in order.
  const step = parshaPlace ? slot - Math.floor(slot / 3) - 1 : slot
  return make(pool[((step % pool.length) + pool.length) % pool.length], '')
}

const HOLIDAY_HE: Record<string, string> = {
  'rosh-hashana': 'ראש השנה',
  'yom-kippur': 'יום הכיפורים',
  sukkot: 'סוכות',
  'shmini-atzeret': 'שמיני עצרת',
  chanukah: 'חנוכה',
  'asara-btevet': 'עשרה בטבת',
  'tu-bishvat': 'ט״ו בשבט',
  purim: 'פורים',
  pesach: 'פסח',
  'lag-baomer': 'ל״ג בעומר',
  'yom-yerushalayim': 'יום ירושלים',
  shavuot: 'שבועות',
  '17-tammuz': 'שבעה עשר בתמוז',
  'tisha-bav': 'תשעה באב',
}
