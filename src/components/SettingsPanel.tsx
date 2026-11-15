import { cloneElement, isValidElement, useEffect, useId, useRef, useState } from 'react'
import { useSettings } from '../settings'
import type { AnnSchedule, Announcement, DayKind, Nusach, PrayerTime, Settings, Theme, TzeitType } from '../types'
import { NUSACH_LABELS } from '../types'
import { CATEGORY_LABELS } from '../data/texts'
import { HEB_MONTHS } from '../lib/memorial'
import { TZEIT_OPTIONS, normalizeTzeitType } from '../lib/zmanim'
import { PRAYER_DAY_OPTIONS, isValidPrayerTime } from '../lib/prayers'
import { DOW_SHORT, HOLIDAY_OPTIONS, LEARNING_OPTIONS } from '../lib/calendar'
import { DECORS, SCREENS } from '../screenRegistry'
import { ANN_STYLES } from '../screens/AnnouncementsScreen'
import { addImages, removeImage, useImages } from '../lib/images'
import { migrate } from '../settings'
import { PLACES, PLACE_NAMES } from '../lib/places'

const CITIES: { name: string; lat: number; lng: number; elevation: number }[] = [
  { name: 'ירושלים', lat: 31.7781, lng: 35.2354, elevation: 754 },
  { name: 'תל אביב', lat: 32.0853, lng: 34.7818, elevation: 5 },
  { name: 'חיפה', lat: 32.794, lng: 34.9896, elevation: 300 },
  { name: 'באר שבע', lat: 31.2518, lng: 34.7913, elevation: 260 },
  { name: 'בני ברק', lat: 32.0807, lng: 34.8338, elevation: 30 },
  { name: 'אשדוד', lat: 31.8014, lng: 34.6435, elevation: 40 },
  { name: 'בית שמש', lat: 31.7497, lng: 34.9886, elevation: 300 },
  { name: 'צפת', lat: 32.9646, lng: 35.496, elevation: 850 },
  { name: 'טבריה', lat: 32.7922, lng: 35.5312, elevation: -200 },
  { name: 'אלעד', lat: 32.0523, lng: 34.9519, elevation: 120 },
  { name: 'מודיעין עילית', lat: 31.9306, lng: 35.0416, elevation: 320 },
  { name: 'ביתר עילית', lat: 31.6969, lng: 35.1206, elevation: 800 },
  { name: 'ניו יורק', lat: 40.7128, lng: -74.006, elevation: 10 },
  { name: 'לונדון', lat: 51.5074, lng: -0.1278, elevation: 11 },
]

type Tab = 'location' | 'zmanim' | 'prayers' | 'holidays' | 'shiurim' | 'memorial' | 'announcements' | 'donors' | 'content' | 'screens' | 'display'

const TABS: [Tab, string][] = [
  ['location', 'מיקום'],
  ['zmanim', 'זמנים ונוסח'],
  ['prayers', 'תפילות'],
  ['holidays', 'תפילות חגים'],
  ['shiurim', 'שיעורים'],
  ['memorial', 'נשמות וימי הולדת'],
  ['announcements', 'הודעות'],
  ['donors', 'תורמים והקדשה'],
  ['content', 'לימוד ותמונות'],
  ['screens', 'מסכים וזמנים'],
  ['display', 'תצוגה וגיבוי'],
]

export default function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { settings, update, reset } = useSettings()
  const [tab, setTab] = useState<Tab>('location')
  const [geo, setGeo] = useState<{ text: string; kind: 'ok' | 'error' | 'busy' } | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  // Snapshot taken when the panel opens, so every change made here can be undone in one step.
  const [snapshot] = useState<Settings>(settings)
  const changed = JSON.stringify(snapshot) !== JSON.stringify(settings)
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  // Move focus into the dialog, and keep Tab inside it.
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    panelRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !panelRef.current) return
      const items = panelRef.current.querySelectorAll<HTMLElement>('button, input, select, textarea, [tabindex]:not([tabindex="-1"])')
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', trap)
    return () => {
      document.removeEventListener('keydown', trap)
      prev?.focus?.()
    }
  }, [])

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setGeo({ text: 'הדפדפן אינו תומך באיתור מיקום. בחרו עיר מהרשימה או הזינו קו רוחב ואורך.', kind: 'error' })
      return
    }
    setGeo({ text: 'מאתר מיקום…', kind: 'busy' })
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        update({
          lat: +pos.coords.latitude.toFixed(5),
          lng: +pos.coords.longitude.toFixed(5),
          elevation: pos.coords.altitude ? Math.round(pos.coords.altitude) : settings.elevation,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        })
        setGeo({ text: 'המיקום עודכן לפי GPS', kind: 'ok' })
      },
      () =>
        setGeo({
          text: 'לא ניתן לאתר מיקום (אין הרשאה או אין חיישן במחשב). בחרו עיר מהרשימה או הזינו קו רוחב ואורך.',
          kind: 'error',
        }),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div
        ref={panelRef}
        className="settings-panel glass"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="settings-head">
          <h2 id={titleId}>הגדרות הלוח</h2>
          <button className="close-btn" onClick={onClose} aria-label="סגירת ההגדרות">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="settings-tabs" role="tablist" aria-label="קטגוריות הגדרות">
          {TABS.map(([k, label], i) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              className={tab === k ? 'stab active' : 'stab'}
              onClick={() => setTab(k)}
              {...(i === 0 ? { 'data-autofocus': true } : {})}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="settings-body" role="tabpanel">
          {tab === 'location' && (
            <div className="set-section">
              <Field label="שם בית הכנסת">
                <input value={settings.synagogueName} onChange={(e) => update({ synagogueName: e.target.value })} />
              </Field>

              <Field label="בחירה מהירה של עיר" hint="ממלא את שם היישוב, קו הרוחב, קו האורך והגובה.">
                <div className="city-chips" role="group">
                  {CITIES.map((c) => (
                    <button
                      key={c.name}
                      className={settings.locationName === c.name && settings.lat === c.lat ? 'city-chip active' : 'city-chip'}
                      aria-pressed={settings.locationName === c.name && settings.lat === c.lat}
                      onClick={() => update({ locationName: c.name, lat: c.lat, lng: c.lng, elevation: c.elevation })}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </Field>

              <button className="gps-btn" onClick={detectLocation}>
                איתור מיקום מדויק (GPS)
              </button>
              {geo && (
                <div className={`geo-status ${geo.kind}`} role="status">
                  {geo.text}
                </div>
              )}

              <details className="advanced">
                <summary>מיקום מדויק ידני</summary>
                <div className="set-section">
                  <Field label="שם היישוב">
                    <input value={settings.locationName} onChange={(e) => update({ locationName: e.target.value })} />
                  </Field>
                  <div className="row2">
                    <Field label="קו רוחב">
                      <input type="number" step="0.0001" value={settings.lat} onChange={(e) => update({ lat: +e.target.value })} />
                    </Field>
                    <Field label="קו אורך">
                      <input type="number" step="0.0001" value={settings.lng} onChange={(e) => update({ lng: +e.target.value })} />
                    </Field>
                    <Field label="גובה (מטרים)">
                      <input type="number" value={settings.elevation} onChange={(e) => update({ elevation: +e.target.value })} />
                    </Field>
                  </div>
                  <Field label="אזור זמן" hint="לדוגמה: Asia/Jerusalem, America/New_York">
                    <input value={settings.timeZone} dir="ltr" onChange={(e) => update({ timeZone: e.target.value })} />
                  </Field>
                </div>
              </details>

              <label className="switch-row">
                <input type="checkbox" checked={settings.israel} onChange={(e) => update({ israel: e.target.checked })} />
                <span>מנהג ארץ ישראל (יום טוב אחד, פרשיות א״י)</span>
              </label>
            </div>
          )}

          {tab === 'zmanim' && (
            <div className="set-section">
              <div className="hint notice">
                הזמנים מחושבים לפי מיקום בית הכנסת. יש לוודא אותם מול לוח מקומי או רב הקהילה לפני הסתמכות למעשה,
                במיוחד שיטת צאת הכוכבים וזמני הדלקת נרות והבדלה.
              </div>

              <Field label="נוסח התפילה">
                <select value={settings.nusach} onChange={(e) => update({ nusach: e.target.value as Nusach })}>
                  {Object.entries(NUSACH_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="row2">
                <Field label="הדלקת נרות: דקות לפני השקיעה">
                  <input type="number" min={0} max={60} value={settings.candleOffset} onChange={(e) => update({ candleOffset: +e.target.value })} />
                </Field>
                <Field label="צאת שבת והבדלה: דקות אחרי השקיעה">
                  <input type="number" min={0} max={90} value={settings.havdalaOffset} onChange={(e) => update({ havdalaOffset: +e.target.value })} />
                </Field>
              </div>

              <Field label="שיטת צאת הכוכבים" hint="מוצגת ליד כל זמן צאת בלוח. צאת ר״ת מוצג תמיד בשורה נפרדת.">
                <select
                  value={normalizeTzeitType(settings.tzeitType)}
                  onChange={(e) => update({ tzeitType: e.target.value as TzeitType })}
                >
                  {TZEIT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>

            </div>
          )}

          {tab === 'prayers' && <PrayersEditor />}

          {tab === 'memorial' && (
            <>
              <MemorialsEditor />
              <BirthdaysEditor />
              <RefuaEditor />
            </>
          )}

          {tab === 'holidays' && <HolidayEditor />}

          {tab === 'shiurim' && <ShiurimEditor />}

          {tab === 'donors' && <DonorsEditor />}

          {tab === 'content' && <ContentEditor />}

          {tab === 'screens' && <ScreensEditor />}

          {tab === 'announcements' && <AnnouncementsEditor />}

          {tab === 'display' && (
            <div className="set-section">
              <Field label="ערכת צבעים">
                <div className="theme-row" role="group">
                  {(['dark', 'parchment', 'light'] as Theme[]).map((t) => (
                    <button
                      key={t}
                      className={settings.theme === t ? 'theme-opt active' : 'theme-opt'}
                      aria-pressed={settings.theme === t}
                      onClick={() => update({ theme: t })}
                    >
                      {t === 'dark' ? 'לילה' : t === 'parchment' ? 'קלף' : 'יום'}
                    </button>
                  ))}
                </div>
              </Field>

              <BackdropSettings />

              <BackupTools />

              {confirmReset ? (
                <div className="reset-confirm" role="alert">
                  <span>כל ההגדרות, התפילות, ההודעות והיארצייטים יחזרו לברירת המחדל.</span>
                  <button
                    className="reset-btn"
                    onClick={() => {
                      reset()
                      setConfirmReset(false)
                    }}
                  >
                    כן, לאפס הכול
                  </button>
                  <button className="ghost-btn" onClick={() => setConfirmReset(false)}>
                    לא לאפס
                  </button>
                </div>
              ) : (
                <button className="reset-btn" onClick={() => setConfirmReset(true)}>
                  איפוס להגדרות ברירת מחדל…
                </button>
              )}
            </div>
          )}
        </div>

        <div className="settings-foot">
          <span className="shortcuts">
            <kbd>←</kbd>/<kbd>→</kbd> מעבר מסך · <kbd>רווח</kbd> השהיה · <kbd>F</kbd> מסך מלא · <kbd>S</kbd> הגדרות · <kbd>H</kbd> קיצורי מסכים · <kbd>Esc</kbd> סגירה
          </span>
          <span className="foot-actions">
            <span className="save-note">{changed ? 'השינויים נשמרים מיד' : ''}</span>
            {changed && (
              <button className="ghost-btn" onClick={() => update(snapshot)}>
                ביטול השינויים
              </button>
            )}
            <button className="done-btn" onClick={onClose}>
              סיום
            </button>
          </span>
        </div>
      </div>
    </div>
  )
}

/** Holy-place photographs behind the board, and the credits their licenses require. */
function BackdropSettings() {
  const { settings, update } = useSettings()
  const bd = settings.backdrop
  const set = (patch: Partial<typeof bd>) => update({ backdrop: { ...bd, ...patch } })
  return (
    <>
      <h3 className="set-sub">רקע: מקומות קדושים</h3>
      <label className="switch-row">
        <input type="checkbox" checked={bd.enabled} onChange={(e) => set({ enabled: e.target.checked })} />
        <span>להציג מאחורי הלוח תמונה של מקום קדוש</span>
      </label>
      <Field label="החלפת תמונה" hint="בזמן תפילה התמונה לא מתחלפת.">
        <select value={bd.minutes} disabled={!bd.enabled} onChange={(e) => set({ minutes: Number(e.target.value) })}>
          {[2, 5, 10, 15, 30].map((m) => (
            <option key={m} value={m}>
              כל {m} דקות
            </option>
          ))}
        </select>
      </Field>
      <div className="hint">
        בחג מוצג המקום הקשור לחג (סוכות: הכותל, ל״ג בעומר: מירון, שבועות: מדבר סיני). בשבת מתחלפים המקום של פרשת השבוע, צפת, החורבה והכותל. בימות החול כל המקומות מתחלפים, ובכל החלפה שלישית חוזר המקום של הפרשה.
      </div>
      {PLACES.length > 0 && (
        <details className="place-credits">
          <summary>קרדיטים לתמונות ({PLACES.length})</summary>
          <ul>
            {PLACES.map((p) => (
              <li key={p.key}>
                <span className="place-credits-name">{PLACE_NAMES[p.key]}</span>: <bdi>{p.author}</bdi>, <bdi>{p.license}</bdi>, Wikimedia Commons
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  )
}

/** Labels the single control inside it; a group of controls gets the label as its group name. */
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  const id = useId()
  const hintId = hint ? id + '-hint' : undefined
  const single = isValidElement(children) && ['input', 'select', 'textarea'].includes(children.type as string)
  return (
    <div className="field">
      {single ? (
        <label className="field-label" htmlFor={id}>
          {label}
        </label>
      ) : (
        <span className="field-label" id={id + '-label'}>
          {label}
        </span>
      )}
      {single
        ? cloneElement(children as React.ReactElement<any>, { id, 'aria-describedby': hintId })
        : isValidElement(children)
          ? cloneElement(children as React.ReactElement<any>, { 'aria-labelledby': id + '-label' })
          : children}
      {hint && (
        <span className="hint" id={hintId}>
          {hint}
        </span>
      )}
    </div>
  )
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
    </svg>
  )
}


const uid = (p: string) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)

/** Seven toggle buttons, Sunday → Shabbat. */
function DowPicker({ value, onChange, label }: { value: number[]; onChange: (v: number[]) => void; label: string }) {
  return (
    <div className="dow-pick" role="group" aria-label={label}>
      {DOW_SHORT.map((d, i) => {
        const on = value.includes(i)
        return (
          <button
            key={i}
            type="button"
            className={on ? 'dow-btn on' : 'dow-btn'}
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((x) => x !== i) : [...value, i].sort())}
          >
            {d}
          </button>
        )
      })}
    </div>
  )
}

function HebDateSelects({ day, month, onChange, labelPrefix }: { day: number; month: number; onChange: (p: { hebDay?: number; hebMonth?: number }) => void; labelPrefix: string }) {
  return (
    <>
      <select aria-label={`${labelPrefix}: יום בחודש העברי`} value={day} onChange={(e) => onChange({ hebDay: +e.target.value })}>
        {Array.from({ length: 30 }).map((_, i) => (
          <option key={i + 1} value={i + 1}>
            {i + 1}
          </option>
        ))}
      </select>
      <select aria-label={`${labelPrefix}: חודש עברי`} value={month} onChange={(e) => onChange({ hebMonth: +e.target.value })}>
        {HEB_MONTHS.map((mo) => (
          <option key={mo.value} value={mo.value}>
            {mo.label}
          </option>
        ))}
      </select>
    </>
  )
}

/* ------------------------------------------------------------------ prayers */

const DEFAULT_DURATION: Record<PrayerTime['category'], number> = { shacharit: 60, mincha: 25, arvit: 20, shiur: 0, other: 0 }

function PrayersEditor() {
  const { settings, update } = useSettings()
  const set = (id: string, patch: Partial<PrayerTime>) =>
    update({ prayerTimes: settings.prayerTimes.map((p) => (p.id === id ? { ...p, ...patch } : p)) })
  const remove = (id: string) => update({ prayerTimes: settings.prayerTimes.filter((p) => p.id !== id) })
  const add = () =>
    update({
      prayerTimes: [...settings.prayerTimes, { id: uid('p'), label: '', time: '18:00', days: 'daily', category: 'mincha' }],
    })

  return (
    <div className="set-section">
      <Field
        label="בזמן תפילה"
        hint="הלוח מזהה תפילה לפי השעה ומשך התפילה שבטבלה, ומתחיל להחזיק את המסך 2 דקות לפניה. משך 0 = לא נחשב תפילה."
      >
        <select value={settings.freezeScreen} onChange={(e) => update({ freezeScreen: e.target.value })}>
          <option value="none">להמשיך בסבב (לאט, דקה לכל מסך)</option>
          {SCREENS.filter((d) => ['prayers', 'combined', 'date', 'memorial', 'zmanim', 'diyoma'].includes(d.key)).map((d) => (
            <option key={d.key} value={d.key}>
              להציג רק: {d.name}
            </option>
          ))}
        </select>
      </Field>
      <label className="switch-row">
        <input type="checkbox" checked={settings.quietDuringPrayer} onChange={(e) => update({ quietDuringPrayer: e.target.checked })} />
        <span>בזמן תפילה לעצור גם את הרצועה התחתונה והאנימציות</span>
      </label>

      <div className="hint">
        שעה קבועה: <code>06:30</code>. יחסית לזמני היום, בדקות: <code>sunset-18</code> (18 דק׳ לפני השקיעה), <code>tzeit+0</code>,{' '}
        <code>sunrise+0</code>, <code>plag+0</code>, <code>chatzos+0</code>, <code>alos+0</code>. בלי שעה? השאירו ריק וכתבו הערה, למשל ״לאחר מנחה״.
      </div>
      <div className="prayer-editor" role="table" aria-label="זמני תפילות">
        <div className="pe-row pe-head" role="row">
          <span role="columnheader">שם</span>
          <span role="columnheader">שעה / הערה</span>
          <span role="columnheader">תפילה</span>
          <span role="columnheader">ימים</span>
          <span role="columnheader">משך (דק׳)</span>
          <span />
        </div>
        {settings.prayerTimes.map((p) => {
          const bad = !isValidPrayerTime(p.time, p.note)
          return (
            <div key={p.id} className="pe-block" role="row">
              <div className="pe-row">
                <input aria-label="שם התפילה" placeholder="לדוגמה: מנחה גדולה" value={p.label} onChange={(e) => set(p.id, { label: e.target.value })} />
                <div className="pe-time-wrap">
                  <input
                    aria-label={`שעת ${p.label || 'התפילה'}`}
                    aria-invalid={bad}
                    className={bad ? 'invalid' : undefined}
                    dir="ltr"
                    value={p.time}
                    onChange={(e) => set(p.id, { time: e.target.value })}
                  />
                  {!p.time.trim() && (
                    <input aria-label="הערה במקום שעה" placeholder="לאחר מנחה" value={p.note || ''} onChange={(e) => set(p.id, { note: e.target.value })} />
                  )}
                  {bad && <span className="field-error">{p.time.trim() ? 'שעה לא תקינה: לא תוצג בלוח' : 'כתבו שעה או הערה'}</span>}
                </div>
                <select aria-label="סוג תפילה" value={p.category} onChange={(e) => set(p.id, { category: e.target.value as PrayerTime['category'] })}>
                  <option value="shacharit">שחרית</option>
                  <option value="mincha">מנחה</option>
                  <option value="arvit">ערבית</option>
                  <option value="shiur">שיעור</option>
                  <option value="other">אחר</option>
                </select>
                <select aria-label="ימים" value={p.days} onChange={(e) => set(p.id, { days: e.target.value as PrayerTime['days'], dows: p.dows ?? [0, 1, 2, 3, 4] })}>
                  {PRAYER_DAY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  max={240}
                  aria-label="משך התפילה בדקות"
                  value={p.duration ?? DEFAULT_DURATION[p.category]}
                  onChange={(e) => set(p.id, { duration: Math.max(0, +e.target.value) })}
                />
                <button className="pe-del" onClick={() => remove(p.id)} aria-label={`מחיקת ${p.label || 'שורה'}`}>
                  <TrashIcon />
                </button>
              </div>
              {p.days === 'custom' && <DowPicker label={`ימים של ${p.label || 'התפילה'}`} value={p.dows ?? []} onChange={(dows) => set(p.id, { dows })} />}
            </div>
          )
        })}
      </div>
      <button className="add-btn" onClick={add}>
        + הוספת תפילה
      </button>
    </div>
  )
}

/* --------------------------------------------------------- holiday prayers */

function HolidayEditor() {
  const { settings, update } = useSettings()
  const list = settings.holidaySchedules
  const save = (next: typeof list) => update({ holidaySchedules: next })
  const setH = (id: string, patch: Partial<(typeof list)[number]>) => save(list.map((h) => (h.id === id ? { ...h, ...patch } : h)))
  const setItem = (h: (typeof list)[number], itemId: string, patch: Partial<(typeof list)[number]['items'][number]>) =>
    setH(h.id, { items: h.items.map((x) => (x.id === itemId ? { ...x, ...patch } : x)) })

  return (
    <div className="set-section">
      <div className="hint">
        זמני תפילות לחג מסוים. המסך ״תפילות חג״ נכנס לסבב כמה ימים לפני החג (כפי שתקבעו), ויוצא ממנו בסוף החג. השעות יכולות להיות יחסיות (<code>sunset-20</code>), ומחושבות לפי היום הראשון של החג.
      </div>
      {list.map((h) => (
        <div key={h.id} className="hol-block">
          <div className="row2">
            <Field label="חג">
              <select value={h.holiday} onChange={(e) => setH(h.id, { holiday: e.target.value })}>
                {HOLIDAY_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="להציג כמה ימים לפני">
              <input type="number" min={0} max={30} value={h.daysBefore} onChange={(e) => setH(h.id, { daysBefore: +e.target.value })} />
            </Field>
            <button className="pe-del" onClick={() => save(list.filter((x) => x.id !== h.id))} aria-label="מחיקת החג">
              <TrashIcon />
            </button>
          </div>
          {h.items.map((it) => (
            <div key={it.id} className="hol-row">
              <input aria-label="שם התפילה" placeholder="שחרית" value={it.label} onChange={(e) => setItem(h, it.id, { label: e.target.value })} />
              <input
                aria-label="שעה"
                dir="ltr"
                className={isValidPrayerTime(it.time, it.note) ? undefined : 'invalid'}
                value={it.time}
                onChange={(e) => setItem(h, it.id, { time: e.target.value })}
              />
              <input aria-label="הערה" placeholder="הערה (לא חובה)" value={it.note || ''} onChange={(e) => setItem(h, it.id, { note: e.target.value })} />
              <button className="pe-del" onClick={() => setH(h.id, { items: h.items.filter((x) => x.id !== it.id) })} aria-label={`מחיקת ${it.label || 'שורה'}`}>
                <TrashIcon />
              </button>
            </div>
          ))}
          <button className="add-btn small" onClick={() => setH(h.id, { items: [...h.items, { id: uid('hi'), label: '', time: '' }] })}>
            + שורה
          </button>
        </div>
      ))}
      <button
        className="add-btn"
        onClick={() => save([...list, { id: uid('h'), holiday: 'sukkot', daysBefore: 5, items: [{ id: uid('hi'), label: 'מנחה ערב חג', time: 'sunset-15' }] }])}
      >
        + הוספת חג
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ shiurim */

function ShiurimEditor() {
  const { settings, update } = useSettings()
  const list = settings.shiurim
  const set = (id: string, patch: Partial<(typeof list)[number]>) => update({ shiurim: list.map((x) => (x.id === id ? { ...x, ...patch } : x)) })
  return (
    <div className="set-section">
      <div className="hint">השיעורים של היום מוצגים ראשונים ומודגשים. אם השדה ״שעה״ ריק, תוצג ההערה (למשל ״לאחר ערבית״).</div>
      {list.map((x) => (
        <div key={x.id} className="pe-block">
          <div className="sh-edit-row">
            <input aria-label="נושא השיעור" placeholder="נושא השיעור" value={x.topic} onChange={(e) => set(x.id, { topic: e.target.value })} />
            <input aria-label="מוסר השיעור" placeholder="שם הרב" value={x.rabbi} onChange={(e) => set(x.id, { rabbi: e.target.value })} />
            <input
              aria-label="שעה"
              dir="ltr"
              placeholder="20:00"
              className={isValidPrayerTime(x.time, x.note) ? undefined : 'invalid'}
              value={x.time}
              onChange={(e) => set(x.id, { time: e.target.value })}
            />
            <input aria-label="הערה" placeholder="לאחר ערבית" value={x.note || ''} onChange={(e) => set(x.id, { note: e.target.value })} />
            <button className="pe-del" onClick={() => update({ shiurim: list.filter((y) => y.id !== x.id) })} aria-label={`מחיקת ${x.topic || 'שיעור'}`}>
              <TrashIcon />
            </button>
          </div>
          <DowPicker label={`ימי השיעור ${x.topic}`} value={x.dows} onChange={(dows) => set(x.id, { dows })} />
        </div>
      ))}
      <button className="add-btn" onClick={() => update({ shiurim: [...list, { id: uid('s'), time: '20:00', rabbi: '', topic: '', dows: [0, 1, 2, 3, 4] }] })}>
        + הוספת שיעור
      </button>
    </div>
  )
}

/* ----------------------------------------------------- memorials & birthdays */

function MemorialsEditor() {
  const { settings, update } = useSettings()
  const set = (id: string, patch: Partial<Settings['memorials'][number]>) =>
    update({ memorials: settings.memorials.map((m) => (m.id === id ? { ...m, ...patch } : m)) })
  const remove = (id: string) => update({ memorials: settings.memorials.filter((m) => m.id !== id) })
  const add = () => update({ memorials: [...settings.memorials, { id: uid('m'), name: '', hebDay: 1, hebMonth: 7, relation: '' }] })

  return (
    <div className="set-section">
      <h3 className="set-sub">הזכרת נשמות</h3>
      <div className="hint">
        לפי התאריך העברי. ביום היארצייט (החל מהשקיעה) הלוח מציג נר נשמה, ובנוסף את היארצייטים של השבוע והחודש. אפשר להוסיף שנת פטירה (לא חובה, למשל 5785), ואז הלוח יציג גם את מי שנמצא בתוך שנת האבל.
      </div>
      <div className="memorial-editor" role="table" aria-label="יארצייט">
        <div className="me-row pe-head" role="row">
          <span role="columnheader">שם</span>
          <span role="columnheader">קרבה / תיאור</span>
          <span role="columnheader">יום</span>
          <span role="columnheader">חודש</span>
          <span role="columnheader">שנה</span>
          <span />
        </div>
        {settings.memorials.map((m) => (
          <div key={m.id} className="me-row" role="row">
            <input aria-label="שם לעילוי נשמה" value={m.name} onChange={(e) => set(m.id, { name: e.target.value })} placeholder="ר׳ משה בן ר׳ אברהם ז״ל" />
            <input aria-label="קרבה או תיאור" value={m.relation || ''} onChange={(e) => set(m.id, { relation: e.target.value })} placeholder="לא חובה" />
            <HebDateSelects labelPrefix={m.name || 'יארצייט'} day={m.hebDay} month={m.hebMonth} onChange={(p) => set(m.id, p)} />
            <input
              type="number"
              aria-label="שנת פטירה עברית"
              placeholder="5785"
              min={5600}
              max={6000}
              value={m.hebYear ?? ''}
              onChange={(e) => set(m.id, { hebYear: e.target.value ? +e.target.value : undefined })}
            />
            <button className="pe-del" onClick={() => remove(m.id)} aria-label={`מחיקת ${m.name || 'שורה'}`}>
              <TrashIcon />
            </button>
          </div>
        ))}
      </div>
      <button className="add-btn" onClick={add}>
        + הוספת יארצייט
      </button>
    </div>
  )
}

function BirthdaysEditor() {
  const { settings, update } = useSettings()
  const list = settings.birthdays
  const set = (id: string, patch: Partial<(typeof list)[number]>) => update({ birthdays: list.map((b) => (b.id === id ? { ...b, ...patch } : b)) })
  return (
    <div className="set-section">
      <h3 className="set-sub">ימי הולדת</h3>
      <div className="hint">המסך ״ימי הולדת״ מופיע רק בשבוע שיש בו יום הולדת עברי.</div>
      {list.map((b) => (
        <div key={b.id} className="bd-edit-row">
          <input aria-label="שם" placeholder="שם" value={b.name} onChange={(e) => set(b.id, { name: e.target.value })} />
          <HebDateSelects labelPrefix={b.name || 'יום הולדת'} day={b.hebDay} month={b.hebMonth} onChange={(p) => set(b.id, p)} />
          <button className="pe-del" onClick={() => update({ birthdays: list.filter((x) => x.id !== b.id) })} aria-label={`מחיקת ${b.name || 'שורה'}`}>
            <TrashIcon />
          </button>
        </div>
      ))}
      <button className="add-btn" onClick={() => update({ birthdays: [...list, { id: uid('b'), name: '', hebDay: 1, hebMonth: 7 }] })}>
        + הוספת יום הולדת
      </button>
    </div>
  )
}

/* ------------------------------------------------------------ announcements */

function ScheduleEditor({ value, onChange }: { value: AnnSchedule | undefined; onChange: (v: AnnSchedule) => void }) {
  const sch: AnnSchedule = value ?? { kind: 'always' }
  const set = (p: Partial<AnnSchedule>) => onChange({ ...sch, ...p })
  return (
    <div className="sched">
      <select aria-label="מתי להציג" value={sch.kind} onChange={(e) => set({ kind: e.target.value as AnnSchedule['kind'] })}>
        <option value="always">תמיד</option>
        <option value="dow">בימים מסוימים בשבוע</option>
        <option value="range">מתאריך עד תאריך</option>
        <option value="holiday">לפני חג</option>
        <option value="parsha">בשבוע של פרשה</option>
      </select>
      {sch.kind === 'dow' && <DowPicker label="ימי הצגה" value={sch.dows ?? []} onChange={(dows) => set({ dows })} />}
      {sch.kind === 'range' && (
        <>
          <input type="date" aria-label="מתאריך" value={sch.from ?? ''} onChange={(e) => set({ from: e.target.value })} />
          <input type="date" aria-label="עד תאריך" value={sch.to ?? ''} onChange={(e) => set({ to: e.target.value })} />
        </>
      )}
      {sch.kind === 'holiday' && (
        <>
          <select aria-label="חג" value={sch.holiday ?? ''} onChange={(e) => set({ holiday: e.target.value })}>
            <option value="" disabled>
              בחרו חג
            </option>
            {HOLIDAY_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
          <input type="number" min={0} max={60} aria-label="ימים לפני החג" value={sch.daysBefore ?? 3} onChange={(e) => set({ daysBefore: +e.target.value })} />
          <span className="sched-unit">ימים לפני</span>
        </>
      )}
      {sch.kind === 'parsha' && <input aria-label="שם הפרשה" placeholder="למשל: וישלח" value={sch.parsha ?? ''} onChange={(e) => set({ parsha: e.target.value })} />}
    </div>
  )
}

function AnnouncementsEditor() {
  const { settings, update } = useSettings()
  const set = (id: string, patch: Partial<Announcement>) =>
    update({ announcements: settings.announcements.map((a) => (a.id === id ? { ...a, ...patch } : a)) })
  const remove = (id: string) => update({ announcements: settings.announcements.filter((a) => a.id !== id) })
  const add = () =>
    update({ announcements: [...settings.announcements, { id: uid('a'), title: '', body: '', style: 'plain', schedule: { kind: 'always' } }] })

  return (
    <div className="set-section">
      <div className="hint">
        הודעה רגילה מוצגת במסך ההודעות וברצועה התחתונה. הודעת אירוע (מזל טוב, ברית, שבת חתן וכו׳) מוצגת במסך שלם משלה. התזמון קובע מתי ההודעה תוצג. מחוץ לזמן הזה היא נשמרת בהגדרות ולא מוצגת.
      </div>
      <div className="ann-editor">
        {settings.announcements.map((a) => (
          <div key={a.id} className="ae-block">
            <div className="ae-row">
              <input aria-label="כותרת ההודעה" placeholder="כותרת" value={a.title} onChange={(e) => set(a.id, { title: e.target.value })} />
              <textarea aria-label="תוכן ההודעה" placeholder="תוכן ההודעה" value={a.body} onChange={(e) => set(a.id, { body: e.target.value })} rows={2} />
              <button className="pe-del" onClick={() => remove(a.id)} aria-label={`מחיקת ${a.title || 'הודעה'}`}>
                <TrashIcon />
              </button>
            </div>
            <div className="ae-opts">
              <select aria-label="סוג ההודעה" value={a.style ?? 'plain'} onChange={(e) => set(a.id, { style: e.target.value as Announcement['style'] })}>
                {ANN_STYLES.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </select>
              <select aria-label="רקע ההודעה" value={a.decor ?? ''} onChange={(e) => set(a.id, { decor: e.target.value || undefined })}>
                <option value="">רקע: כמו מסך ההודעות</option>
                {DECORS.map((o) => (
                  <option key={o.value} value={o.value}>
                    רקע: {o.label}
                  </option>
                ))}
              </select>
              <ScheduleEditor value={a.schedule} onChange={(schedule) => set(a.id, { schedule })} />
            </div>
          </div>
        ))}
      </div>
      <button className="add-btn" onClick={add}>
        + הוספת הודעה
      </button>
    </div>
  )
}

/* --------------------------------------------------------- donors & dedication */

function DonorsEditor() {
  const { settings, update } = useSettings()
  const list = settings.donors
  const set = (id: string, patch: Partial<(typeof list)[number]>) => update({ donors: list.map((d) => (d.id === id ? { ...d, ...patch } : d)) })
  return (
    <div className="set-section">
      <h3 className="set-sub">הקדשת הלוח</h3>
      <Field label="נוסח ההקדשה" hint="מוצג במסך ״הקדשת הלוח״. כל שורה בנפרד.">
        <textarea
          rows={4}
          placeholder={'לעילוי נשמת\nר׳ ... בן ... ז״ל\nתנצב״ה'}
          value={settings.dedication.text}
          onChange={(e) => update({ dedication: { ...settings.dedication, text: e.target.value } })}
        />
      </Field>
      <label className="switch-row">
        <input
          type="checkbox"
          checked={settings.dedication.showLine}
          onChange={(e) => update({ dedication: { ...settings.dedication, showLine: e.target.checked } })}
        />
        <span>להציג את ההקדשה גם ברצועה התחתונה</span>
      </label>

      <h3 className="set-sub">תורמים</h3>
      <Field label="כותרת המסך">
        <input value={settings.donorsTitle} onChange={(e) => update({ donorsTitle: e.target.value })} />
      </Field>
      <div className="hint">כל תורם ״מרכזי״ מקבל מסך שלם בתורו. שאר התורמים מוצגים יחד, עד 24 שמות, וגודל הגופן קטן ככל שיש יותר שמות.</div>
      {list.map((d) => (
        <div key={d.id} className="donor-edit-row">
          <input aria-label="שם התורם" placeholder="משפחת כהן" value={d.name} onChange={(e) => set(d.id, { name: e.target.value })} />
          <input aria-label="פרטי התרומה" placeholder="על תרומת הפרוכת" value={d.info} onChange={(e) => set(d.id, { info: e.target.value })} />
          <select aria-label="סוג" value={d.tier} onChange={(e) => set(d.id, { tier: e.target.value as 'major' | 'regular' })}>
            <option value="regular">רגיל</option>
            <option value="major">מרכזי</option>
          </select>
          <button className="pe-del" onClick={() => update({ donors: list.filter((x) => x.id !== d.id) })} aria-label={`מחיקת ${d.name || 'תורם'}`}>
            <TrashIcon />
          </button>
        </div>
      ))}
      <button className="add-btn" onClick={() => update({ donors: [...list, { id: uid('d'), name: '', info: '', tier: 'regular' }] })}>
        + הוספת תורם
      </button>
    </div>
  )
}

/* ------------------------------------------------------- learning & images */

function ContentEditor() {
  const { settings, update } = useSettings()
  const images = useImages()
  const [busy, setBusy] = useState(false)
  const halachot = settings.customHalachot
  const setH = (id: string, patch: Partial<(typeof halachot)[number]>) =>
    update({ customHalachot: halachot.map((h) => (h.id === id ? { ...h, ...patch } : h)) })

  return (
    <div className="set-section">
      <h3 className="set-sub">לימוד יומי</h3>
      <Field label="מה להציג במסך הלימוד היומי">
        <div className="cat-checks" role="group">
          {LEARNING_OPTIONS.map((o) => (
            <label key={o.key} className="cat-check">
              <input
                type="checkbox"
                checked={settings.learningItems.includes(o.key)}
                onChange={(e) =>
                  update({
                    learningItems: e.target.checked
                      ? LEARNING_OPTIONS.map((x) => x.key).filter((k) => k === o.key || settings.learningItems.includes(k))
                      : settings.learningItems.filter((k) => k !== o.key),
                  })
                }
              />
              {o.label}
            </label>
          ))}
        </div>
      </Field>
      <label className="switch-row">
        <input type="checkbox" checked={settings.fetchTexts} onChange={(e) => update({ fetchTexts: e.target.checked })} />
        <span>להוריד מספריא את הנוסח המלא של המשנה וההלכה היומית כשיש חיבור לרשת. הטקסט נשמר במחשב, כך שהלוח ממשיך להציג אותו גם בלי חיבור.</span>
      </label>

      <h3 className="set-sub">הלכה יומית משלכם</h3>
      <div className="hint">אם תוסיפו כאן הלכות, מסך ״הלכה יומית״ יציג אותן לפי הסדר, הלכה אחת בכל יום, במקום קיצור שולחן ערוך.</div>
      {halachot.map((h) => (
        <div key={h.id} className="ae-row">
          <input aria-label="כותרת ההלכה" placeholder="הלכות פורים" value={h.title} onChange={(e) => setH(h.id, { title: e.target.value })} />
          <textarea aria-label="תוכן ההלכה" rows={3} value={h.text} onChange={(e) => setH(h.id, { text: e.target.value })} />
          <button className="pe-del" onClick={() => update({ customHalachot: halachot.filter((x) => x.id !== h.id) })} aria-label={`מחיקת ${h.title || 'הלכה'}`}>
            <TrashIcon />
          </button>
        </div>
      ))}
      <button className="add-btn" onClick={() => update({ customHalachot: [...halachot, { id: uid('hl'), title: '', text: '' }] })}>
        + הוספת הלכה
      </button>

      <Field label="קטגוריות דבר תורה להצגה">
        <div className="cat-checks" role="group">
          {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
            <label key={k} className="cat-check">
              <input
                type="checkbox"
                checked={settings.textCategories.includes(k)}
                onChange={(e) => {
                  const next = e.target.checked ? [...settings.textCategories, k] : settings.textCategories.filter((c) => c !== k)
                  update({ textCategories: next })
                }}
              />
              {label}
            </label>
          ))}
        </div>
      </Field>

      <h3 className="set-sub">תמונות להצגה</h3>
      <div className="hint">בכל פעם שמסך התמונות מופיע מוצגת תמונה אחת. תמונות גדולות מוקטנות אוטומטית, ונשמרות במחשב הזה בלבד.</div>
      <label className="add-btn file-btn">
        {busy ? 'מוסיף…' : '+ הוספת תמונות'}
        <input
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={async (e) => {
            if (!e.target.files?.length) return
            setBusy(true)
            await addImages(e.target.files)
            setBusy(false)
            e.target.value = ''
          }}
        />
      </label>
      <div className="img-grid">
        {images.map((im) => (
          <div key={im.id} className="img-thumb">
            <img src={im.url} alt={im.name} />
            <button className="pe-del" onClick={() => removeImage(im.id)} aria-label={`מחיקת ${im.name}`}>
              <TrashIcon />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- screens */

const KINDS: [DayKind, string][] = [
  ['weekday', 'חול'],
  ['shabbat', 'שבת'],
  ['holiday', 'חג'],
]

const BANNER_ZMANIM: [string, string][] = [
  ['alos', 'עלות השחר'],
  ['netz', 'הנץ החמה'],
  ['shmaMGA', 'סו״ז ק״ש מג״א'],
  ['shmaGRA', 'סו״ז ק״ש גר״א'],
  ['tfilaGRA', 'סו״ז תפילה'],
  ['chatzos', 'חצות'],
  ['minchaG', 'מנחה גדולה'],
  ['plag', 'פלג המנחה'],
  ['shkia', 'שקיעה'],
  ['tzeit', 'צאת הכוכבים'],
]

function ScreensEditor() {
  const { settings, update } = useSettings()
  const times = settings.screenTimes
  const setT = (key: string, kind: DayKind, v: number) =>
    update({ screenTimes: { ...times, [key]: { ...(times[key] ?? { weekday: 15, shabbat: 15, holiday: 15 }), [kind]: Math.max(0, Math.min(300, v || 0)) } } })
  const copyWeekday = () =>
    update({ screenTimes: Object.fromEntries(Object.entries(times).map(([k, v]) => [k, { ...v, shabbat: v.weekday, holiday: v.weekday }])) })

  return (
    <div className="set-section">
      <div className="hint">
        לכל מסך: כמה שניות הוא מוצג (בנפרד לחול, לשבת ולחג) ואיזה רקע עיצובי יש לו. 0 = המסך לא מוצג באותו סוג יום. הרקעים מקבלים את צבעי ערכת הצבעים. מסכים עונתיים (עומר, חנוכה, צום, תפילות חג, ימי הולדת) מופיעים רק כשיש להם תוכן. המקש שליד כל מסך עובר אליו ישירות.
      </div>
      <div className="scr-table" role="table" aria-label="זמני מסכים">
        <div className="scr-row scr-head with-decor" role="row">
          <span role="columnheader">פעיל</span>
          <span role="columnheader">מסך</span>
          <span role="columnheader">מקש</span>
          {KINDS.map(([k, l]) => (
            <span key={k} role="columnheader">
              {l}
            </span>
          ))}
          <span role="columnheader">רקע</span>
        </div>
        {SCREENS.map((d) => (
          <div key={d.key} className={settings.enabledScreens[d.key] ? 'scr-row with-decor' : 'scr-row with-decor off'} role="row">
            <input
              type="checkbox"
              aria-label={`${d.name} בסבב`}
              checked={!!settings.enabledScreens[d.key]}
              onChange={(e) => update({ enabledScreens: { ...settings.enabledScreens, [d.key]: e.target.checked } })}
            />
            <span className="scr-name">
              {d.name}
              {d.hint && <span className="scr-hint">{d.hint}</span>}
            </span>
            <kbd>{d.keyLabel}</kbd>
            {KINDS.map(([k, l]) => (
              <input
                key={k}
                type="number"
                min={0}
                max={300}
                aria-label={`${d.name}: שניות ב${l}`}
                value={times[d.key]?.[k] ?? d.seconds}
                onChange={(e) => setT(d.key, k, +e.target.value)}
              />
            ))}
            <select
              aria-label={`רקע למסך ${d.name}`}
              value={settings.screenDecor[d.key] ?? d.decor ?? 'none'}
              onChange={(e) => update({ screenDecor: { ...settings.screenDecor, [d.key]: e.target.value } })}
            >
              {DECORS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <button className="ghost-btn" onClick={copyWeekday}>
        העתקת זמני חול לשבת ולחג
      </button>

      <h3 className="set-sub">רצועת זמנים</h3>
      <Field label="זמנים שרצים ברצועה התחתונה, בכל המסכים">
        <div className="cat-checks" role="group">
          {BANNER_ZMANIM.map(([k, l]) => (
            <label key={k} className="cat-check">
              <input
                type="checkbox"
                checked={settings.bannerZmanim.includes(k)}
                onChange={(e) =>
                  update({
                    bannerZmanim: e.target.checked
                      ? BANNER_ZMANIM.map(([x]) => x).filter((x) => x === k || settings.bannerZmanim.includes(x))
                      : settings.bannerZmanim.filter((x) => x !== k),
                  })
                }
              />
              {l}
            </label>
          ))}
        </div>
      </Field>

      <h3 className="set-sub">שעות פעילות המסך</h3>
      <label className="switch-row">
        <input type="checkbox" checked={settings.power.enabled} onChange={(e) => update({ power: { ...settings.power, enabled: e.target.checked } })} />
        <span>להחשיך את הלוח בשעות שבית הכנסת סגור. לחיצה על מקש כלשהו מדליקה אותו ל־10 דקות.</span>
      </label>
      {settings.power.enabled && (
        <>
          <div className="hours-grid" role="group" aria-label="שעות פעילות">
            {settings.power.hours.map((on, h) => (
              <button
                key={h}
                type="button"
                className={on ? 'hour-btn on' : 'hour-btn'}
                aria-pressed={on}
                aria-label={`${String(h).padStart(2, '0')}:00 ${on ? 'דולק' : 'כבוי'}`}
                onClick={() => update({ power: { ...settings.power, hours: settings.power.hours.map((x, i) => (i === h ? !x : x)) } })}
              >
                {String(h).padStart(2, '0')}
              </button>
            ))}
          </div>
          <div className="hint">שעה מודגשת = הלוח דולק. לחצו על שעה כדי להחליף בין דולק לכבוי.</div>
          <label className="switch-row">
            <input
              type="checkbox"
              checked={settings.power.shabbatAlwaysOn}
              onChange={(e) => update({ power: { ...settings.power, shabbatAlwaysOn: e.target.checked } })}
            />
            <span>בשבת ובחג הלוח דולק כל היממה</span>
          </label>
        </>
      )}
    </div>
  )
}

/* ----------------------------------------------------------------- backup */

function BackupTools() {
  const { settings, replace } = useSettings()
  const [msg, setMsg] = useState('')
  const exportJson = () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `luach-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
    setMsg('קובץ הגיבוי הורד')
  }
  return (
    <Field label="גיבוי והעברה למחשב אחר" hint="קובץ אחד שכולל את כל ההגדרות, התפילות, ההודעות, השמות והשיעורים. התמונות לא נכללות.">
      <div className="backup-row">
        <button className="ghost-btn" onClick={exportJson}>
          הורדת קובץ גיבוי
        </button>
        <label className="ghost-btn file-btn">
          טעינה מקובץ גיבוי…
          <input
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0]
              if (!f) return
              try {
                const data = JSON.parse(await f.text())
                if (typeof data !== 'object' || !data || !('synagogueName' in data)) throw new Error('bad')
                replace(migrate(data))
                setMsg('ההגדרות נטענו מהקובץ')
              } catch {
                setMsg('הקובץ אינו קובץ גיבוי של הלוח')
              }
              e.target.value = ''
            }}
          />
        </label>
        {msg && (
          <span className="save-note" role="status">
            {msg}
          </span>
        )}
      </div>
    </Field>
  )
}

function RefuaEditor() {
  const { settings, update } = useSettings()
  const list = settings.refua
  return (
    <div className="set-section">
      <h3 className="set-sub">לרפואה שלמה</h3>
      <div className="hint">שמות לתפילה, לדוגמה ״ראובן בן רחל״. המסך מוצג רק כשיש שמות, עד 24 שמות בכל פעם.</div>
      {list.map((r) => (
        <div key={r.id} className="refua-edit-row">
          <input aria-label="שם לרפואה" placeholder="ראובן בן רחל" value={r.name} onChange={(e) => update({ refua: list.map((x) => (x.id === r.id ? { ...x, name: e.target.value } : x)) })} />
          <button className="pe-del" onClick={() => update({ refua: list.filter((x) => x.id !== r.id) })} aria-label={`מחיקת ${r.name || 'שם'}`}>
            <TrashIcon />
          </button>
        </div>
      ))}
      <button className="add-btn" onClick={() => update({ refua: [...list, { id: uid('r'), name: '' }] })}>
        + הוספת שם
      </button>
    </div>
  )
}
