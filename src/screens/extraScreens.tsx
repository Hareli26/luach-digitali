import { useEffect, useMemo, useState } from 'react'
import { useSettings } from '../settings'
import { DOW_SHORT, getChanukah, getFast, holidayLabel, holidayWindow } from '../lib/calendar'
import { resolvePrayerTime } from '../lib/prayers'
import { upcomingMemorials } from '../lib/memorial'
import { halachicDate } from '../lib/zmanim'
import { useImages } from '../lib/images'
import type { Settings } from '../types'

export function fmtTime(s: Settings, d: Date | null): string {
  return !d ? '—' : d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: s.timeZone })
}

/** A time cell: fixed "HH:mm" as typed, relative tokens resolved for `day`, otherwise the note. */
export function timeText(s: Settings, time: string, note: string | undefined, day: Date): string {
  const t = time.trim()
  if (!t) return note?.trim() || ''
  if (/^\d{1,2}:\d{2}$/.test(t)) return t.padStart(5, '0')
  const d = resolvePrayerTime(s, { time: t }, day)
  return d ? fmtTime(s, d) : note?.trim() || '—'
}

/* ------------------------------------------------------------- shiurim */

export function ShiurimScreen({ now }: { now: Date }) {
  const { settings } = useSettings()
  const dow = now.getDay()
  const rows = settings.shiurim
    .filter((s) => s.topic.trim() || s.rabbi.trim())
    .map((s) => ({ ...s, display: timeText(settings, s.time, s.note, now), today: s.dows.includes(dow) }))
  const today = rows.filter((r) => r.today)
  const other = rows.filter((r) => !r.today)

  const daysLabel = (d: number[]) => (d.length === 7 ? 'כל יום' : d.length === 5 && [0, 1, 2, 3, 4].every((x) => d.includes(x)) ? 'א׳–ה׳' : d.map((x) => DOW_SHORT[x]).join(' '))

  return (
    <div className="screen fade-screen shiurim-screen">
      <h2 className="screen-title">
        לוח שיעורים
        <span className="title-sub">{today.length ? `${today.length} שיעורים היום` : 'אין שיעורים היום'}</span>
      </h2>
      <div className="shiur-table glass" role="table">
        <div className="sh-row sh-head" role="row">
          <span role="columnheader">שעה</span>
          <span role="columnheader">נושא השיעור</span>
          <span role="columnheader">מוסר השיעור</span>
          <span role="columnheader">ימים</span>
        </div>
        {[...today, ...other].map((r) => (
          <div key={r.id} className={r.today ? 'sh-row today' : 'sh-row'} role="row">
            <span className="sh-time">{r.display}</span>
            <span className="sh-topic">{r.topic}</span>
            <span className="sh-rabbi">{r.rabbi}</span>
            <span className="sh-days">{daysLabel(r.dows)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------- donors */

export function DonorsScreen({ cycle }: { cycle: number }) {
  const { settings } = useSettings()
  const all = settings.donors.filter((d) => d.name.trim())
  const major = all.filter((d) => d.tier === 'major')
  const regular = all.filter((d) => d.tier !== 'major')
  // Major donors get a page each in turn; everyone else is listed together.
  const featured = major.length ? major[cycle % major.length] : null
  return (
    <div className="screen fade-screen donors-screen">
      <h2 className="screen-title">{settings.donorsTitle || 'תורמי בית הכנסת'}</h2>
      <div className={featured ? 'donors-layout with-featured' : 'donors-layout'}>
        {featured && (
          <div className="donor-featured glass">
            <div className="df-name">{featured.name}</div>
            {featured.info && <div className="df-info">{featured.info}</div>}
          </div>
        )}
        {regular.length > 0 && (
          <div className={regular.length > 12 ? "donor-wall glass dense" : "donor-wall glass"}>
            {regular.slice(0, 24).map((d) => (
              <div key={d.id} className="dw-item">
                <span className="dw-name">{d.name}</span>
                {d.info && <span className="dw-info">{d.info}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------- dedication */

export function DedicationScreen() {
  const { settings } = useSettings()
  const lines = settings.dedication.text.split(/\n+/).filter(Boolean)
  return (
    <div className="screen fade-screen dedication-screen">
      <div className="dedication-card glass">
        <svg className="ded-flame" viewBox="0 0 24 32" aria-hidden="true">
          <path d="M12 2c3 5 6 8 6 13a6 6 0 0 1-12 0c0-3 2-5 3-7 0 3 1 4 2 4 0-4 0-7 1-10z" />
        </svg>
        <div className="ded-tag">הלוח נתרם</div>
        {lines.map((l, i) => (
          <div key={i} className="ded-line">
            {l}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ----------------------------------------------------------- birthdays */

export function BirthdaysScreen({ now }: { now: Date }) {
  const { settings } = useSettings()
  const list = useMemo(
    () => upcomingMemorials(settings.birthdays, halachicDate(settings, now, 'shkia'), 6),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings.birthdays, now.getDate(), now.getHours()],
  )
  return (
    <div className="screen fade-screen birthdays-screen">
      <h2 className="screen-title">
        יום הולדת שמח
        <span className="title-sub">ימי הולדת עבריים השבוע</span>
      </h2>
      <div className="bd-grid" data-count={Math.min(list.length, 6)}>
        {list.slice(0, 6).map((b) => (
          <div key={b.id} className={b.isToday ? 'bd-card glass today' : 'bd-card glass'}>
            <div className="bd-name">{b.name}</div>
            <div className="bd-date">{b.hebDateLabel}</div>
            <div className="bd-when">{b.isToday ? 'היום!' : b.daysAway === 1 ? 'מחר' : `בעוד ${b.daysAway} ימים`}</div>
          </div>
        ))}
      </div>
      <div className="bd-blessing">עד מאה ועשרים שנה</div>
    </div>
  )
}

export function hasBirthdaysThisWeek(s: Settings, now: Date): boolean {
  return s.birthdays.length > 0 && upcomingMemorials(s.birthdays, halachicDate(s, now, 'shkia'), 6).length > 0
}

/* ------------------------------------------------------ holiday prayers */

export function activeHolidaySchedule(s: Settings, now: Date) {
  for (const h of s.holidaySchedules) {
    if (!h.items.length) continue
    const w = holidayWindow(s, h.holiday, h.daysBefore, now)
    if (w) return { sched: h, win: w }
  }
  return null
}

export function HolidayPrayersScreen({ now }: { now: Date }) {
  const { settings } = useSettings()
  const minuteKey = Math.floor(now.getTime() / 60000)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const found = useMemo(() => activeHolidaySchedule(settings, now), [settings, minuteKey])
  if (!found) return null
  const { sched, win } = found
  const title = holidayLabel(sched.holiday)
  return (
    <div className="screen fade-screen holiday-screen" data-holiday={sched.holiday}>
      <h2 className="screen-title">
        זמני תפילות · {title}
        <span className="title-sub">{win.daysUntil > 0 ? `בעוד ${win.daysUntil} ימים` : 'חג שמח'}</span>
      </h2>
      <div className="holiday-list glass">
        {sched.items.map((it) => (
          <div key={it.id} className="prayer-row">
            <span className="prayer-name">{it.label}</span>
            <span className="prayer-time">{timeText(settings, it.time, it.note, win.start)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ chanukah */

const CHANUKAH_BRACHOT = [
  'בָּרוּךְ אַתָּה ה׳ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו וְצִוָּנוּ לְהַדְלִיק נֵר חֲנֻכָּה.',
  'בָּרוּךְ אַתָּה ה׳ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, שֶׁעָשָׂה נִסִּים לַאֲבוֹתֵינוּ בַּיָּמִים הָהֵם בַּזְּמַן הַזֶּה.',
  'בָּרוּךְ אַתָּה ה׳ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, שֶׁהֶחֱיָנוּ וְקִיְּמָנוּ וְהִגִּיעָנוּ לַזְּמַן הַזֶּה.',
]

export function ChanukahScreen({ now }: { now: Date }) {
  const { settings } = useSettings()
  const minuteKey = Math.floor(now.getTime() / 60000)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const info = useMemo(() => getChanukah(settings, now), [settings, minuteKey])
  if (!info) return null
  const n = info.candles
  const brachot = n === 1 ? CHANUKAH_BRACHOT : CHANUKAH_BRACHOT.slice(0, 2)
  return (
    <div className="screen fade-screen chanukah-screen">
      <div className="chanukah-layout">
        <div className="menorah glass" aria-label={`${n} נרות`}>
          <svg viewBox="0 0 340 200" className="menorah-svg" aria-hidden="true">
            <rect x="60" y="150" width="220" height="6" rx="3" className="m-base" />
            <rect x="166" y="156" width="8" height="30" className="m-base" />
            <rect x="130" y="184" width="80" height="8" rx="4" className="m-base" />
            {Array.from({ length: 9 }).map((_, i) => {
              const shamash = i === 4
              const x = 30 + i * 35
              const y = shamash ? 40 : 70
              // Candles are placed right to left; tonight's count is lit (plus the shamash).
              const slot = i < 4 ? 8 - i : i > 4 ? 8 - (i - 1) : 0
              const lit = shamash || slot <= n
              return (
                <g key={i}>
                  <rect x={x - 6} y={y} width="12" height={150 - y} rx="2" className={shamash ? 'm-candle shamash' : 'm-candle'} />
                  {lit && <path d={`M${x} ${y - 26}c5 8 8 12 8 17a8 8 0 0 1-16 0c0-5 3-9 8-17z`} className="m-flame" />}
                </g>
              )
            })}
          </svg>
          <div className="ch-count">
            {n === 8 ? 'זאת חנוכה' : 'הלילה'} · <b>{n}</b> {n === 1 ? 'נר' : 'נרות'}
          </div>
          <div className="ch-time">
            {info.lightingLabel}
            <b>{fmtTime(settings, info.lighting)}</b>
          </div>
        </div>
        <div className="ch-brachot glass">
          <div className="ch-head">סדר ההדלקה</div>
          {brachot.map((b, i) => (
            <p key={i}>{b}</p>
          ))}
          <div className="ch-note">מדליקים את הנר החדש (השמאלי) תחילה, ומוסיפים בכל לילה נר אחד</div>
        </div>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- fast */

export function FastScreen({ now }: { now: Date }) {
  const { settings } = useSettings()
  const minuteKey = Math.floor(now.getTime() / 60000)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fast = useMemo(() => getFast(settings, now), [settings, minuteKey])
  if (!fast) return null
  return (
    <div className="screen fade-screen fast-screen">
      <div className="fast-card glass">
        <div className="fast-when">{fast.daysUntil === 0 ? 'היום' : fast.daysUntil === 1 ? 'מחר' : `בעוד ${fast.daysUntil} ימים`}</div>
        <div className="fast-name">{fast.name}</div>
        {fast.postponed && <div className="fast-note">נדחה מפני השבת</div>}
        <div className="fast-times">
          <div>
            <span>{fast.startLabel}</span>
            <b>{fmtTime(settings, fast.start)}</b>
          </div>
          <div>
            <span>{fast.endLabel}</span>
            <b>{fmtTime(settings, fast.end)}</b>
          </div>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------- images */

export function ImagesScreen({ cycle }: { cycle: number }) {
  const imgs = useImages()
  const [i, setI] = useState(0)
  useEffect(() => {
    if (imgs.length) setI((x) => (x + 1) % imgs.length)
  }, [cycle, imgs.length])
  const img = imgs[i % Math.max(1, imgs.length)]
  if (!img) return <div className="screen ann-empty glass">אין תמונות. אפשר להוסיף בהגדרות ← תמונות.</div>
  return (
    <div className="screen fade-screen images-screen">
      <img key={img.id} src={img.url} alt="" className="slide-img" />
    </div>
  )
}
