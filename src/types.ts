export type Nusach = 'ashkenaz' | 'sefard' | 'edot_hamizrach' | 'teiman' | 'chabad'
export type Theme = 'dark' | 'parchment' | 'light'
/** 'deg85' is a legacy alias of 'geonim' (both 8.5°); normalized on load. */
export type TzeitType = 'geonim' | 'tukachinsky' | 'rt72' | 'deg85'

/** daily · weekday = Sun–Fri · sunthu = Sun–Thu · friday · shabbat · custom = the days in `dows` */
export type PrayerDays = 'daily' | 'weekday' | 'sunthu' | 'friday' | 'shabbat' | 'custom'

export interface PrayerTime {
  id: string
  label: string
  /** HH:mm fixed time, OR relative token: "sunset-20", "sunrise+0", "tzeit+0". Empty = no time (uses `note`). */
  time: string
  days: PrayerDays
  /** 0=Sun … 6=Shabbat, used when days === 'custom' */
  dows?: number[]
  category: 'shacharit' | 'mincha' | 'arvit' | 'shiur' | 'other'
  /** Minutes the tefillah lasts — the board holds still this long. Undefined = default by category. */
  duration?: number
  /** Free text shown instead of a time, e.g. "לאחר מנחה" */
  note?: string
}

/** Prayer times for a specific Yom Tov / fast, shown in the days before it. */
export interface HolidaySchedule {
  id: string
  /** key from HOLIDAY_OPTIONS */
  holiday: string
  /** Shown from this many days before the holiday until it ends */
  daysBefore: number
  items: { id: string; label: string; time: string; note?: string }[]
}

export type AnnStyle = 'plain' | 'mazaltov' | 'brit' | 'barmitzva' | 'wedding' | 'birth' | 'event' | 'condolence'

export interface AnnSchedule {
  kind: 'always' | 'dow' | 'range' | 'holiday' | 'parsha'
  dows?: number[]
  /** yyyy-mm-dd, inclusive */
  from?: string
  to?: string
  holiday?: string
  daysBefore?: number
  /** Parsha name in Hebrew as the board shows it (e.g. "וישלח") */
  parsha?: string
}

export interface Announcement {
  id: string
  title: string
  body: string
  style?: AnnStyle
  schedule?: AnnSchedule
  /** background design (see DECORS) */
  decor?: string
}

export interface Memorial {
  id: string
  name: string
  hebDay: number
  hebMonth: number
  /** Hebrew year of passing (optional; enables the mourning-year display) */
  hebYear?: number
  relation?: string
}

export interface Birthday {
  id: string
  name: string
  hebDay: number
  hebMonth: number
}

export interface Shiur {
  id: string
  /** fixed or relative time; empty uses `note` */
  time: string
  note?: string
  rabbi: string
  topic: string
  dows: number[]
}

export interface Donor {
  id: string
  name: string
  info: string
  tier: 'major' | 'regular'
}

export interface CustomHalacha {
  id: string
  title: string
  text: string
}

export type DayKind = 'weekday' | 'shabbat' | 'holiday'
export type ScreenTimes = Record<string, Record<DayKind, number>>

export interface Settings {
  synagogueName: string
  locationName: string
  lat: number
  lng: number
  elevation: number
  timeZone: string
  nusach: Nusach
  candleOffset: number
  havdalaOffset: number
  tzeitType: TzeitType
  israel: boolean
  rotationSeconds: number
  /** Keep the board still (no ticker, no pulses) during tefillah times */
  quietDuringPrayer: boolean
  /** Screen held during a tefillah; 'none' keeps rotating (slowly) */
  freezeScreen: string
  theme: Theme
  prayerTimes: PrayerTime[]
  holidaySchedules: HolidaySchedule[]
  announcements: Announcement[]
  memorials: Memorial[]
  birthdays: Birthday[]
  shiurim: Shiur[]
  donors: Donor[]
  donorsTitle: string
  /** Fixed dedication of the board */
  dedication: { text: string; showLine: boolean }
  customHalachot: CustomHalacha[]
  enabledScreens: Record<string, boolean>
  /** seconds per screen, by kind of day; 0 = not shown on that kind of day */
  screenTimes: ScreenTimes
  textCategories: string[]
  /** Zman keys shown in the information band */
  bannerZmanim: string[]
  /** Daily learning calendars shown */
  learningItems: string[]
  /** Fetch the full Mishna / Halacha text from Sefaria when online (cached for offline) */
  fetchTexts: boolean
  /** Names for refua shleima */
  refua: { id: string; name: string }[]
  /** Background design per screen (see DECORS); missing = the screen's default */
  screenDecor: Record<string, string>
  /** Photographs of holy places behind the board, chosen by holiday, Shabbat and parsha */
  backdrop: { enabled: boolean; minutes: number }
  /** Direction of prayer as seen by someone facing the screen, degrees clockwise: 0 = ahead (beyond the screen), 90 = right, 180 = behind, 270 = left. null = not set. */
  prayerArrow: number | null
  /** Display on/off by hour */
  power: { enabled: boolean; hours: boolean[]; shabbatAlwaysOn: boolean }
  /** Home Front Command alerts for the shul's area: the board shows a full-screen shelter notice */
  redAlert: RedAlertSettings
}

export interface RedAlertSettings {
  enabled: boolean
  /** City or area names exactly as Home Front Command writes them; a city name also covers its areas */
  cities: string[]
  /** Minutes after the last alert, with no official end message, before the board returns to its screens */
  holdMinutes: number
  /** Where the shul's protected space is, shown during an alert */
  shelterNote: string
  /** Optional relay URL that returns the same JSON as the feed (e.g. for boards outside Israel). Empty = the official feed. */
  feedUrl: string
}

export const NUSACH_LABELS: Record<Nusach, string> = {
  ashkenaz: 'אשכנז',
  sefard: 'ספרד',
  edot_hamizrach: 'עדות המזרח',
  teiman: 'תימן (בלדי)',
  chabad: 'חב״ד (האריז״ל)',
}
