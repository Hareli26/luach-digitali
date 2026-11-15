import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react'
import type { ScreenTimes, Settings } from './types'
import { normalizeTzeitType } from './lib/zmanim'
import { SCREENS } from './screenRegistry'

const STORAGE_KEY = 'luach-settings-v1'

/** Screens that would mostly repeat on Shabbat are shorter there; nothing is hidden by default. */
function defaultTimes(base?: number): ScreenTimes {
  return Object.fromEntries(
    SCREENS.map((d) => {
      const sec = base ?? d.seconds
      return [d.key, { weekday: sec, shabbat: sec, holiday: sec }]
    }),
  )
}

export const DEFAULT_SETTINGS: Settings = {
  synagogueName: 'בית הכנסת "אור החיים"',
  locationName: 'ירושלים',
  lat: 31.7781,
  lng: 35.2354,
  elevation: 754,
  timeZone: 'Asia/Jerusalem',
  nusach: 'sefard',
  candleOffset: 20,
  havdalaOffset: 30,
  tzeitType: 'geonim',
  israel: true,
  rotationSeconds: 18,
  quietDuringPrayer: true,
  freezeScreen: 'prayers',
  theme: 'dark',
  prayerTimes: [
    { id: 'p1', label: 'שחרית', time: '06:30', days: 'weekday', category: 'shacharit' },
    { id: 'p2', label: 'שחרית (ותיקין)', time: 'sunrise+0', days: 'daily', category: 'shacharit' },
    { id: 'p3', label: 'שחרית שבת', time: '08:30', days: 'shabbat', category: 'shacharit' },
    { id: 'p4', label: 'מנחה', time: 'sunset-18', days: 'custom', dows: [0, 1, 2, 3, 4, 6], category: 'mincha' },
    { id: 'p5', label: 'ערבית', time: 'tzeit+0', days: 'daily', category: 'arvit' },
    { id: 'p6', label: 'דף יומי', time: '20:00', days: 'daily', category: 'shiur' },
    { id: 'p7', label: 'מנחה ערב שבת', time: 'sunset-10', days: 'friday', category: 'mincha' },
    { id: 'p8', label: 'סעודה שלישית', time: '', note: 'לאחר מנחה', days: 'shabbat', category: 'other', duration: 0 },
  ],
  holidaySchedules: [],
  birthdays: [],
  shiurim: [
    { id: 's1', time: '20:00', rabbi: 'רב בית הכנסת', topic: 'דף יומי', dows: [0, 1, 2, 3, 4] },
    { id: 's2', time: '', note: 'לאחר ערבית', rabbi: '', topic: 'הלכה יומית', dows: [0, 1, 2, 3, 4] },
  ],
  donors: [],
  donorsTitle: 'תודה לתורמי בית הכנסת',
  dedication: { text: '', showLine: true },
  customHalachot: [],
  screenTimes: defaultTimes(),
  bannerZmanim: ['netz', 'shmaGRA', 'shkia', 'tzeit'],
  learningItems: ['dafYomi', 'mishnaYomi', 'rambam1', 'nachYomi', 'kitzurShulchanAruch', 'chofetzChaim'],
  fetchTexts: true,
  refua: [],
  screenDecor: {},
  power: { enabled: false, hours: Array(24).fill(true), shabbatAlwaysOn: true },
  announcements: [
    { id: 'a1', title: 'שיעור הרב', body: 'שיעור בהלכה בכל יום שלישי בשעה 20:30 באולם המרכזי' },
    { id: 'a2', title: 'קידוש', body: 'הקידוש השבת בחסות משפחת כהן לרגל הולדת הבן' },
  ],
  memorials: [
    { id: 'm1', name: 'ר׳ משה בן ר׳ אברהם ז״ל', hebDay: 3, hebMonth: 9, relation: 'מייסד בית הכנסת' },
    { id: 'm2', name: 'מרת שרה בת ר׳ יעקב ע״ה', hebDay: 15, hebMonth: 9, relation: '' },
  ],
  enabledScreens: Object.fromEntries(SCREENS.map((d) => [d.key, true])),
  textCategories: ['tehillim', 'mishlei', 'avot', 'chumash', 'mishna', 'gemara', 'shulchan', 'rambam', 'breslov', 'mussar'],
}

const SEED_KEY = 'luach-seed-applied'

/**
 * Multi-PC deployment (Electron): a backup file placed at C:\ProgramData\LuachDigitali\settings.json
 * is applied on start whenever it is newer than the one this machine last applied.
 * Local edits made afterwards stay until the shared file is updated again.
 */
function loadSeed(): Settings | null {
  try {
    const seed = (window as any).luach?.seed?.() as { json: string; mtime: number } | null
    if (!seed) return null
    if (String(seed.mtime) === localStorage.getItem(SEED_KEY)) return null
    const data = JSON.parse(seed.json)
    if (typeof data !== 'object' || !data || !('synagogueName' in data)) return null
    localStorage.setItem(SEED_KEY, String(seed.mtime))
    return migrate(data)
  } catch {
    return null
  }
}

function load(): Settings {
  const seeded = loadSeed()
  if (seeded) return seeded
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw)
    return migrate(parsed)
  } catch {
    return DEFAULT_SETTINGS
  }
}

/** Fills in anything an older save (or an imported backup) doesn't have. */
export function migrate(parsed: any): Settings {
  const base = parsed.screenTimes ? DEFAULT_SETTINGS.screenTimes : defaultTimes(parsed.rotationSeconds)
  return {
    ...DEFAULT_SETTINGS,
    ...parsed,
    tzeitType: normalizeTzeitType(parsed.tzeitType),
    enabledScreens: { ...DEFAULT_SETTINGS.enabledScreens, ...(parsed.enabledScreens || {}) },
    screenTimes: { ...base, ...(parsed.screenTimes || {}) },
    dedication: { ...DEFAULT_SETTINGS.dedication, ...(parsed.dedication || {}) },
    power: { ...DEFAULT_SETTINGS.power, ...(parsed.power || {}) },
    screenDecor: { ...(parsed.screenDecor || {}) },
    // Text categories added later are switched on for existing boards too.
    textCategories: Array.isArray(parsed.textCategories) ? parsed.textCategories : DEFAULT_SETTINGS.textCategories,
  }
}

interface Ctx {
  settings: Settings
  update: (patch: Partial<Settings>) => void
  replace: (next: Settings) => void
  reset: () => void
}

const SettingsContext = createContext<Ctx | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      /* ignore */
    }
  }, [settings])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme)
  }, [settings.theme])

  const value = useMemo<Ctx>(
    () => ({
      settings,
      update: (patch) => setSettings((s) => ({ ...s, ...patch })),
      replace: (next) => setSettings(migrate(next)),
      reset: () => setSettings(DEFAULT_SETTINGS),
    }),
    [settings],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
