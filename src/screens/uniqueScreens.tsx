import { useMemo } from 'react'
import { HDate, HebrewCalendar, flags } from '@hebcal/core'
import { JewishCalendar } from 'kosher-zmanim'
import { useSettings } from '../settings'
import { pick, seasonFor, useBanks, type BankItem, type BankName } from '../lib/bank'
import { getZmanim, getShabbatInfo, halachicDate } from '../lib/zmanim'
import { upcomingMemorials } from '../lib/memorial'
import { addDays } from '../lib/calendar'
import { fmtTime } from './extraScreens'
import type { Settings } from '../types'

/** Long quotes get smaller type so every text fits on one screen. */
function quoteSize(t: string): string {
  const n = t.length
  return n > 420 ? 'q-xs' : n > 280 ? 'q-s' : n > 160 ? 'q-m' : 'q-l'
}

function Quote({ item, tag, accent }: { item: BankItem; tag: string; accent?: string }) {
  return (
    <div className={`quote-card glass ${accent ?? ''}`}>
      <div className="quote-tag">{tag}</div>
      <blockquote className={`quote-body ${quoteSize(item.t)}`}>{item.t}</blockquote>
      <div className="quote-src">
        {item.s}
        {item.r && <span className="quote-r"> · מקור: {item.r}</span>}
      </div>
    </div>
  )
}

/* ---------------------------------------------------- Rabbi Nachman's counsel */

const NACHMAN: { bank: BankName; tag: string }[] = [
  { bank: 'breslov-etzot', tag: 'עצה מרבי נחמן' },
  { bank: 'breslov-midot', tag: 'מספר המידות' },
  { bank: 'breslov-etzot', tag: 'עצה מרבי נחמן' },
  { bank: 'breslov-sichot', tag: 'משיחות הר״ן' },
]

/** Rabbi Nachman of Breslov: Likutei Etzot, Sefer HaMiddot and Sichot HaRan, changing every two rounds. */
export function NachmanScreen({ now, round }: { now: Date; round: number }) {
  const banks = useBanks(['breslov-etzot', 'breslov-midot', 'breslov-sichot'])
  const step = Math.floor(round / 2)
  const src = NACHMAN[step % NACHMAN.length]
  const item = banks ? pick(banks[src.bank] ?? [], round, now, 2, 1) : null
  if (!item) return <div className="screen" />
  return (
    <div className="screen fade-screen quote-screen nachman">
      <Quote item={item} tag={src.tag} accent="q-nachman" />
      <div className="quote-foot">
        אִם אַתָּה מַאֲמִין שֶׁיְּכוֹלִין לְקַלְקֵל, תַּאֲמִין שֶׁיְּכוֹלִין לְתַקֵּן <span>(ליקוטי מוהר״ן תניינא, קיב)</span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------- halacha of the season */

/**
 * "הלכה בעיתה": a halacha that fits this week — Chanukah, Purim, Pesach, the Three Weeks, Elul, the Yamim Noraim,
 * Sukkot, Rosh Chodesh, or Shabbat from Thursday on. Edot HaMizrach / Teiman alternate Kitzur with Maran's Shulchan Aruch.
 */
export function SeasonHalachaScreen({ now, round }: { now: Date; round: number }) {
  const { settings } = useSettings()
  const sefardi = settings.nusach === 'edot_hamizrach' || settings.nusach === 'teiman'
  const banks = useBanks(sefardi ? ['kitzur', 'shulchan-aruch'] : ['kitzur'])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const season = useMemo(() => seasonFor(settings, now), [settings.israel, settings.lat, now.getDate(), now.getHours()])
  const item = useMemo(() => {
    if (!banks) return null
    const kitzur = banks.kitzur ?? []
    if (season.simanim.length) {
      const pool = kitzur.filter((x) => x.n && season.simanim.includes(x.n))
      return pick(pool.length ? pool : kitzur, round, now, 2, 3)
    }
    const pools = sefardi ? [banks['shulchan-aruch'] ?? [], kitzur] : [kitzur]
    const step = Math.floor(round / 2)
    return pick(pools[step % pools.length], round, now, 2, 3)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [banks, season.key, Math.floor(round / 2), now.getDate()])
  if (!item) return <div className="screen" />
  // Shulchan Aruch for Edot HaMizrach: Maran's words only, without the Rema's glosses ("הגה").
  const shown = item.s.startsWith('שולחן ערוך') ? { ...item, t: item.t.split(/\s*הגה[:\s]/)[0].replace(/:?\s*$/, '.') } : item
  return (
    <div className="screen fade-screen quote-screen season">
      <Quote item={shown} tag={season.title} accent={`q-season s-${season.key}`} />
    </div>
  )
}

/* ------------------------------------------------------------- the day arc */

const ARC_KEYS: [string, string][] = [
  ['alos', 'עלות'],
  ['netz', 'הנץ'],
  ['shmaGRA', 'ק״ש'],
  ['tfilaGRA', 'תפילה'],
  ['chatzos', 'חצות'],
  ['minchaG', 'מנחה ג׳'],
  ['plag', 'פלג'],
  ['shkia', 'שקיעה'],
  ['tzeit', 'צאת'],
]

/**
 * The whole halachic day as one arc of the sun, from alot to tzeit: every zman is marked where it falls,
 * the sun stands where it is now, and the part of the day already gone is shaded. Read in one glance from across the room.
 */
export function DayArcScreen({ now }: { now: Date }) {
  const { settings } = useSettings()
  const minuteKey = Math.floor(now.getTime() / 60000)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const zm = useMemo(() => getZmanim(settings, now), [settings, minuteKey])
  const get = (k: string) => zm.find((z) => z.key === k)?.time ?? null
  const start = get('alos')
  const end = get('tzeit')
  if (!start || !end) return null
  const span = end.getTime() - start.getTime()
  const frac = (d: Date) => Math.min(1, Math.max(0, (d.getTime() - start.getTime()) / span))
  // Arc geometry: a half ellipse; RTL — the day starts on the right (east) and ends on the left.
  const W = 1000
  const H = 620
  const cx = W / 2
  const cy = 360
  const rx = 440
  const ry = 320
  const pt = (f: number) => {
    const a = Math.PI * f // 0 → right, π → left
    return { x: cx + rx * Math.cos(a), y: cy - ry * Math.sin(a) }
  }
  const t = now.getTime()
  const isDay = t >= start.getTime() && t <= end.getTime()
  const nowF = frac(now)
  const sun = pt(nowF)
  const nextZ = ARC_KEYS.map(([k, l]) => ({ k, l, d: get(k) })).find((z) => z.d && z.d.getTime() > t)
  // Greedy rows: a label goes to the first row where it doesn't touch the previous label.
  const rowOf: Record<string, number> = {}
  const lastX: number[] = []
  for (const [k] of ARC_KEYS) {
    const d = get(k)
    if (!d) continue
    const x = pt(frac(d)).x
    let r = 0
    while (lastX[r] !== undefined && Math.abs(lastX[r] - x) < 115) r++
    rowOf[k] = r
    lastX[r] = x
  }
  const arcPath = (f0: number, f1: number) => {
    const a = pt(f0)
    const b = pt(f1)
    return `M ${a.x} ${a.y} A ${rx} ${ry} 0 0 0 ${b.x} ${b.y}`
  }

  return (
    <div className="screen fade-screen dayarc-screen">
      <h2 className="screen-title">
        קשת היום
        <span className="title-sub">מעלות השחר ועד צאת הכוכבים · {settings.locationName}</span>
      </h2>
      <div className="dayarc glass">
        <svg viewBox={`0 -10 ${W} ${H}`} className="dayarc-svg" role="img" aria-label="מהלך היום וזמני ההלכה">
          <path d={arcPath(0, 1)} className="arc-track" />
          {isDay && <path d={arcPath(0, nowF)} className="arc-past" />}
          <line x1={cx - rx - 30} y1={cy} x2={cx + rx + 30} y2={cy} className="arc-horizon" />
          {ARC_KEYS.map(([k, label]) => {
            const d = get(k)
            if (!d) return null
            const p = pt(frac(d))
            // Labels hang below the horizon, each in the first row with room, tied to its point by a thin line.
            const row = cy + 46 + 72 * (rowOf[k] ?? 0)
            const passed = d.getTime() <= t
            const isNext = nextZ?.k === k
            return (
              <g key={k} className={isNext ? 'arc-mark next' : passed ? 'arc-mark passed' : 'arc-mark'}>
                <line x1={p.x} y1={p.y} x2={p.x} y2={row - 22} className="arc-lead" />
                <circle cx={p.x} cy={p.y} r={isNext ? 9 : 6} />
                <text x={p.x} y={row} textAnchor="middle" className="arc-label">
                  {label}
                </text>
                <text x={p.x} y={row + 30} textAnchor="middle" className="arc-time">
                  {fmtTime(settings, d)}
                </text>
              </g>
            )
          })}
          {isDay && (
            <g className="arc-sun">
              <circle cx={sun.x} cy={sun.y} r="26" className="sun-glow" />
              <circle cx={sun.x} cy={sun.y} r="15" className="sun-core" />
            </g>
          )}
        </svg>
        <div className="dayarc-now">
          {isDay ? (
            <>
              עברו <b>{Math.round(nowF * 100)}%</b> מהיום
              {nextZ?.d && (
                <>
                  {' '}· הזמן הבא: <b>{nextZ.l}</b> בעוד <b>{Math.max(0, Math.round((nextZ.d.getTime() - t) / 60000))}</b> דק׳
                </>
              )}
            </>
          ) : (
            <>לילה · עלות השחר ב־{fmtTime(settings, t < start.getTime() ? start : null) === '—' ? 'בוקר' : fmtTime(settings, start)}</>
          )}
        </div>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------- kiddush levana */

export interface LevanaWindow {
  start: Date
  end: Date
  startLabel: string
  endLabel: string
  note: string
}

/**
 * Window for Kiddush Levana this month. Start: 3 days after the molad (7 for Edot HaMizrach / Teiman, per Shulchan Aruch).
 * End: half the lunar month after the molad (14 d 18 h 22 m) — the earlier opinion; a note gives the 15th as the later one.
 */
export function levanaWindow(s: Settings, now = new Date()): LevanaWindow | null {
  try {
    const jc = new JewishCalendar(now)
    const molad: any = (jc as any).getMoladAsDate()
    const m: Date = molad?.toJSDate ? molad.toJSDate() : molad
    if (!(m instanceof Date)) return null
    const sefardi = s.nusach === 'edot_hamizrach' || s.nusach === 'teiman'
    const startDays = sefardi ? 7 : 3
    const start = new Date(m.getTime() + startDays * 86400000)
    const end = new Date(m.getTime() + ((14 * 24 + 18) * 60 + 22) * 60000)
    const hm = new HDate(now).getMonth()
    const note =
      hm === 5 ? 'בחודש אב נוהגים לקדש לאחר תשעה באב' : hm === 7 ? 'בחודש תשרי נוהגים לקדש במוצאי יום הכיפורים' : 'נוהגים לקדש במוצאי שבת, כשהלבנה נראית'
    return {
      start,
      end,
      startLabel: `מתחילים ${startDays} ימים אחרי המולד`,
      endLabel: 'עד חצי החודש מהמולד (י״ד יום, י״ח שעות, כ״ב דק׳)',
      note,
    }
  } catch {
    return null
  }
}

export function isLevanaActive(s: Settings, now = new Date()): boolean {
  const w = levanaWindow(s, now)
  return !!w && now.getTime() >= w.start.getTime() - 86400000 && now.getTime() < w.end.getTime()
}

export function LevanaScreen({ now }: { now: Date }) {
  const { settings } = useSettings()
  const w = useMemo(() => levanaWindow(settings, now), [settings.nusach, now.getDate()]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!w) return null
  const daysLeft = Math.max(0, Math.ceil((w.end.getTime() - now.getTime()) / 86400000))
  const fmt = (d: Date) =>
    `${d.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: settings.timeZone })} · ${fmtTime(settings, d)}`
  const moonPhase = Math.min(1, Math.max(0, (now.getTime() - w.start.getTime() + 3 * 86400000) / (w.end.getTime() - w.start.getTime() + 3 * 86400000)))
  return (
    <div className="screen fade-screen levana-screen">
      <div className="levana-layout">
        <svg viewBox="0 0 200 200" className="moon-svg" aria-hidden="true">
          <defs>
            <mask id="moon-mask">
              <rect width="200" height="200" fill="white" />
              <circle cx={100 - 160 * moonPhase} cy="100" r="80" fill="black" />
            </mask>
          </defs>
          <circle cx="100" cy="100" r="80" className="moon-shadow" />
          <circle cx="100" cy="100" r="80" className="moon-lit" mask="url(#moon-mask)" />
        </svg>
        <div className="levana-text">
          <div className="lv-tag">קידוש לבנה</div>
          <div className="lv-main">{now.getTime() < w.start.getTime() ? 'מתחילים מחר בלילה' : `אפשר לקדש עוד ${daysLeft} ${daysLeft === 1 ? 'לילה' : 'לילות'}`}</div>
          <div className="lv-row">
            <span>{w.startLabel}</span>
            <b>{fmt(w.start)}</b>
          </div>
          <div className="lv-row">
            <span>{w.endLabel}</span>
            <b>{fmt(w.end)}</b>
          </div>
          <div className="lv-note">{w.note} · יש הנוהגים עד ליל ט״ו בחודש</div>
        </div>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------- what's ahead */

interface AheadItem {
  date: Date
  title: string
  kind: 'holiday' | 'fast' | 'rc' | 'yahrzeit' | 'birthday' | 'shabbat'
}

function aheadList(s: Settings, now: Date): AheadItem[] {
  const today = halachicDate(s, now, 'shkia')
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const end = addDays(t0, 45)
  const out: AheadItem[] = []
  try {
    const evs = HebrewCalendar.calendar({ start: t0, end, il: s.israel, noMinorFast: false, noSpecialShabbat: false })
    const seen = new Set<string>()
    for (const e of evs) {
      const f = e.getFlags()
      const kind: AheadItem['kind'] | null =
        f & (flags.MAJOR_FAST | flags.MINOR_FAST)
          ? 'fast'
          : f & flags.ROSH_CHODESH
            ? 'rc'
            : f & (flags.CHAG | flags.CHANUKAH_CANDLES | flags.MINOR_HOLIDAY | flags.MODERN_HOLIDAY | flags.EREV | flags.SPECIAL_SHABBAT)
              ? 'holiday'
              : null
      if (!kind) continue
      let title = e.render('he').replace(/:\s*\S+\s+נֵר(?:וֹת)?$/, '')
      if (/חֲנוּכָּה/.test(title)) title = 'חֲנוּכָּה'
      const k = title + (kind === 'rc' ? e.getDate().getMonth() : '')
      if (seen.has(k)) continue
      seen.add(k)
      out.push({ date: e.getDate().greg(), title, kind })
    }
  } catch {
    /* calendar unavailable */
  }
  for (const m of upcomingMemorials(s.memorials, today, 45)) out.push({ date: m.nextDate, title: `יארצייט · ${m.name}`, kind: 'yahrzeit' })
  for (const b of upcomingMemorials(s.birthdays, today, 45)) out.push({ date: b.nextDate, title: `יום הולדת · ${b.name}`, kind: 'birthday' })
  return out
    .filter((x) => x.date.getTime() >= t0.getTime())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 9)
}

/**
 * "מה לפנינו": a countdown to Shabbat (to the minute on Friday) and the next weeks laid out as a timeline —
 * festivals, fasts, Rosh Chodesh and the shul's own yahrzeits and birthdays together.
 */
export function AheadScreen({ now }: { now: Date }) {
  const { settings } = useSettings()
  const minuteKey = Math.floor(now.getTime() / 60000)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const list = useMemo(() => aheadList(settings, now), [settings, Math.floor(minuteKey / 30)])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sh = useMemo(() => getShabbatInfo(settings, now), [settings, minuteKey])
  const t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const days = (d: Date) => Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - t0) / 86400000)
  const target = sh.candleLighting
  const msLeft = target ? target.getTime() - now.getTime() : 0
  const countdown =
    sh.inProgress
      ? sh.kind === 'yomtov'
        ? 'חג שמח'
        : 'שבת שלום'
      : msLeft > 0
        ? msLeft < 86400000
          ? `${Math.floor(msLeft / 3600000)} שעות ו־${Math.floor((msLeft % 3600000) / 60000)} דקות`
          : `${Math.ceil(msLeft / 86400000)} ימים`
        : '—'
  return (
    <div className="screen fade-screen ahead-screen">
      <div className="ahead-count glass">
        <div className="ac-label">{sh.inProgress ? '' : sh.kind === 'yomtov' ? `עד ${sh.name || 'החג'}` : 'עד כניסת השבת'}</div>
        <div className="ac-value">{countdown}</div>
        {!sh.inProgress && target && <div className="ac-sub">הדלקת נרות {fmtTime(settings, target)}</div>}
      </div>
      <div className="ahead-line glass">
        <h3 className="cb-head">מה לפנינו</h3>
        <ol className="tl">
          {list.map((x, i) => {
            const d = days(x.date)
            return (
              <li key={i} className={`tl-item k-${x.kind}`}>
                <span className="tl-dot" aria-hidden="true" />
                <span className="tl-title">{x.title}</span>
                <span className="tl-date">{new HDate(x.date).renderGematriya(true).replace(/\s+\S+$/, '')}</span>
                <span className="tl-when">{d <= 0 ? 'היום' : d === 1 ? 'מחר' : `בעוד ${d} ימים`}</span>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- refua */

export function RefuaScreen({ cycle }: { cycle: number }) {
  const { settings } = useSettings()
  const names = settings.refua.filter((r) => r.name.trim())
  const per = 24
  const pages = Math.max(1, Math.ceil(names.length / per))
  const page = names.slice((cycle % pages) * per, (cycle % pages) * per + per)
  return (
    <div className="screen fade-screen refua-screen">
      <h2 className="screen-title">
        לרפואה שלמה
        <span className="title-sub">בתוך שאר חולי ישראל</span>
      </h2>
      <div className={page.length > 12 ? 'refua-grid glass dense' : 'refua-grid glass'}>
        {page.map((r) => (
          <div key={r.id} className="refua-name">
            {r.name}
          </div>
        ))}
      </div>
      <div className="refua-foot">הַמָּקוֹם יְרַחֵם עֲלֵיהֶם בְּתוֹךְ שְׁאָר חוֹלֵי יִשְׂרָאֵל</div>
    </div>
  )
}

