import { useMemo } from 'react'
import { useSettings } from '../settings'
import { getZmanim } from '../lib/zmanim'

function fmt(d: Date | null, tz: string): string {
  if (!d) return '—'
  return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz })
}

export default function ZmanimScreen({ now }: { now: Date }) {
  const { settings } = useSettings()
  const tz = settings.timeZone
  const minuteKey = Math.floor(now.getTime() / 60000)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const zmanim = useMemo(() => getZmanim(settings, now), [settings, minuteKey])

  const groups = {
    morning: zmanim.filter((z) => z.group === 'morning'),
    midday: zmanim.filter((z) => z.group === 'midday'),
    evening: zmanim.filter((z) => z.group === 'evening'),
  }

  return (
    <div className="screen fade-screen zmanim-screen">
      <h2 className="screen-title">
        זמני היום
        <span className="title-sub">לפי מיקום: {settings.locationName}</span>
      </h2>

      <div className="zmanim-grid">
        <ZmanColumn title="בוקר" items={groups.morning} tz={tz} />
        <ZmanColumn title="צהריים" items={groups.midday} tz={tz} />
        <ZmanColumn title="ערב" items={groups.evening} tz={tz} />
      </div>
    </div>
  )
}

function ZmanColumn({ title, items, tz }: { title: string; items: ReturnType<typeof getZmanim>; tz: string }) {
  return (
    <div className="zman-col glass">
      <h3 className="zman-col-head">{title}</h3>
      <ul className="zman-list">
        {items.map((z) => (
          <li key={z.key} className={z.highlight ? 'zman-row next' : 'zman-row'}>
            <span className="zman-label">
              {z.label}
              {z.opinion && <span className="zman-op">{z.opinion}</span>}
              {z.highlight && <span className="next-tag">הבא</span>}
            </span>
            <span className="zman-dots" />
            <span className="zman-time">{fmt(z.time, tz)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
