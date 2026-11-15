import { useMemo } from 'react'
import { useSettings } from '../settings'
import { getHebrewDate, getShabbatInfo } from '../lib/zmanim'
import { getWeekly } from '../lib/calendar'

/** Inyanei HaShavua: date, parsha + haftara, Shabbat times, Pirkei Avot and Mevarchim. */
export default function DateScreen({ now }: { now: Date }) {
  const { settings } = useSettings()
  const fmt = (d: Date | null): string =>
    !d ? '—' : d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: settings.timeZone })
  const minuteKey = Math.floor(now.getTime() / 60000)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const heb = useMemo(() => getHebrewDate(settings, now), [settings, minuteKey])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const shabbat = useMemo(() => getShabbatInfo(settings, now), [settings, minuteKey])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const weekly = useMemo(() => getWeekly(settings, now), [settings, minuteKey])

  const isYT = shabbat.kind === 'yomtov'
  const startLabel = isYT ? `הדלקת נרות · ${shabbat.name || 'יום טוב'}` : 'הדלקת נרות שבת'
  const endLabel = isYT ? 'צאת החג' : 'צאת שבת'
  const parsha = weekly.parsha || heb.parsha

  return (
    <div className="screen fade-screen date-screen">
      <div className="date-hero glass">
        <div className="date-hero-label">{heb.evening ? 'הלילה' : 'היום'}</div>
        <div className="date-hero-main">{heb.dateHe}</div>
        <div className="date-hero-dow">{heb.dayOfWeek}</div>
        <div className="date-badges">
          {heb.yomTov && <div className="date-badge yomtov">{heb.yomTov}</div>}
          {heb.roshChodesh && <div className="date-badge">{heb.roshChodesh}</div>}
          {weekly.specialShabbat && <div className="date-badge">{weekly.specialShabbat}</div>}
          {weekly.mevarchim && <div className="date-badge">{weekly.mevarchim}</div>}
          {heb.omer && <div className="date-badge omer">{heb.omer}</div>}
        </div>
      </div>

      <div className="date-side">
        <div className="info-card glass">
          <div className="info-card-label">פרשת השבוע</div>
          <div className="info-card-val">{parsha || '—'}</div>
          {weekly.haftara && (
            <div className="info-card-sub">
              <span>הפטרה</span> {weekly.haftara}
            </div>
          )}
        </div>
        <div className="info-card glass">
          <div className="info-card-label">{weekly.avot ? 'פרקי אבות בשבת' : 'דף יומי בבלי'}</div>
          <div className="info-card-val">{weekly.avot || heb.dafYomi || '—'}</div>
        </div>
        <div className="info-card glass shabbat-card">
          <div className="info-card-label">
            {startLabel}
            <span className="info-card-op">{settings.candleOffset} דק׳ לפני השקיעה</span>
          </div>
          <div className="info-card-val big">{fmt(shabbat.candleLighting)}</div>
          <div className="shabbat-split">
            <span>
              {endLabel}
              <span className="info-card-op">שקיעה + {settings.havdalaOffset} דק׳</span>
            </span>
            <b>{fmt(shabbat.tzeitShabbat)}</b>
          </div>
        </div>
      </div>
    </div>
  )
}
