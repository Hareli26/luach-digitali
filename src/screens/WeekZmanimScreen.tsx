import { useMemo } from 'react'
import { useSettings } from '../settings'
import { getZmanim, tzeitShort } from '../lib/zmanim'
import { JewishCalendar, HebrewDateFormatter } from 'kosher-zmanim'

const DOW = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']

function fmt(d: Date | null, tz: string): string {
  if (!d) return '—'
  return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz })
}

export default function WeekZmanimScreen({ now }: { now: Date }) {
  const { settings } = useSettings()
  const tz = settings.timeZone

  const rows = useMemo(() => {
    const out: { label: string; heb: string; netz: Date | null; chatzos: Date | null; shkia: Date | null; tzeit: Date | null; isToday: boolean }[] = []
    const f = new HebrewDateFormatter()
    f.setHebrewFormat(true)
    for (let i = 0; i < 7; i++) {
      const d = new Date(now)
      d.setDate(now.getDate() + i)
      const z = getZmanim(settings, d)
      let heb = ''
      try {
        const jc = new JewishCalendar(d)
        heb = f.formatHebrewNumber(jc.getJewishDayOfMonth())
      } catch {
        heb = ''
      }
      out.push({
        label: DOW[d.getDay()],
        heb,
        netz: z.find((x) => x.key === 'netz')?.time ?? null,
        chatzos: z.find((x) => x.key === 'chatzos')?.time ?? null,
        shkia: z.find((x) => x.key === 'shkia')?.time ?? null,
        tzeit: z.find((x) => x.key === 'tzeit')?.time ?? null,
        isToday: i === 0,
      })
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, now.getDate()])

  return (
    <div className="screen fade-screen week-screen">
      <h2 className="screen-title">
        זמני השבוע
        <span className="title-sub">{settings.locationName}</span>
      </h2>

      <div className="week-table glass" role="table" aria-label="זמני השבוע">
        <div className="wt-row wt-head" role="row">
          <span role="columnheader">יום</span>
          <span role="columnheader">הנץ</span>
          <span role="columnheader">חצות</span>
          <span role="columnheader">שקיעה</span>
          <span role="columnheader">
            צאת <span className="zman-op">{tzeitShort(settings.tzeitType)}</span>
          </span>
        </div>
        {rows.map((r, i) => (
          <div key={i} className={r.isToday ? 'wt-row today' : 'wt-row'} role="row">
            <span className="wt-day" role="cell">
              {r.label} · {r.heb}
              {r.isToday && <span className="next-tag">היום</span>}
            </span>
            <span role="cell">{fmt(r.netz, tz)}</span>
            <span role="cell">{fmt(r.chatzos, tz)}</span>
            <span role="cell">{fmt(r.shkia, tz)}</span>
            <span role="cell">{fmt(r.tzeit, tz)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
