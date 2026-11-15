import { useMemo } from 'react'
import { useSettings } from '../settings'
import { upcomingMemorials, inMourningYear, formatHebYear } from '../lib/memorial'
import { halachicDate } from '../lib/zmanim'

function Flame({ className = 'mt-flame' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 32" aria-hidden="true">
      <path d="M12 2c3 5 6 8 6 13a6 6 0 0 1-12 0c0-3 2-5 3-7 0 3 1 4 2 4 0-4 0-7 1-10z" />
      <rect x="9" y="24" width="6" height="7" rx="1" />
    </svg>
  )
}

/**
 * Yahrzeit board: today large, then this week and this month as name tiles.
 * Names still within the year of mourning are listed apart, as many shuls do.
 */
export default function MemorialScreen({ now }: { now: Date }) {
  const { settings } = useSettings()
  const minuteKey = Math.floor(now.getTime() / 60000)
  // A yahrzeit begins at sunset, so "today" follows the Hebrew date.
  const hNow = halachicDate(settings, now, 'shkia')
  const list = useMemo(
    () => upcomingMemorials(settings.memorials, hNow, 30),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings, minuteKey],
  )
  const mourning = useMemo(
    () => settings.memorials.filter((m) => m.name.trim() && inMourningYear(m, hNow)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings.memorials, hNow.getDate()],
  )
  const today = list.filter((m) => m.isToday)
  const week = list.filter((m) => !m.isToday && m.daysAway <= 7)
  const month = list.filter((m) => m.daysAway > 7)

  const tile = (m: (typeof list)[number]) => (
    <div key={m.id} className="yz-tile">
      <span className="yz-name">{m.name}</span>
      {m.relation && <span className="yz-rel">{m.relation}</span>}
      <span className="yz-date">
        {m.hebDateLabel}
        {m.hebYear ? ` ${formatHebYear(m.hebYear)}` : ''}
      </span>
    </div>
  )

  return (
    <div className="screen fade-screen memorial-screen">
      <h2 className="screen-title">
        הזכרת נשמות
        <span className="title-sub">לעילוי נשמת · תנצב״ה</span>
      </h2>

      {today.length > 0 && (
        <div className="memorial-today">
          <div className="mt-head">נר נשמה היום</div>
          <div className="mt-cards">
            {today.slice(0, 4).map((m) => (
              <div key={m.id} className="mt-card glass">
                <Flame />
                <div className="mt-name">{m.name}</div>
                {m.relation && <div className="mt-rel">{m.relation}</div>}
                <div className="mt-date">
                  {m.hebDateLabel}
                  {m.hebYear ? ` ${formatHebYear(m.hebYear)}` : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="yz-sections">
        <section className="yz-section glass">
          <div className="ml-head">יארצייט השבוע</div>
          {week.length ? <div className="yz-grid">{week.slice(0, 12).map(tile)}</div> : <div className="ml-empty">אין יארצייט בשבוע הקרוב</div>}
        </section>
        <section className="yz-section glass">
          <div className="ml-head">בחודש הקרוב</div>
          {month.length ? <div className="yz-grid">{month.slice(0, 12).map(tile)}</div> : <div className="ml-empty">—</div>}
        </section>
        {mourning.length > 0 && (
          <section className="yz-section glass mourning">
            <div className="ml-head">בתוך שנת האבל</div>
            <div className="yz-grid">
              {mourning.slice(0, 8).map((m) => (
                <div key={m.id} className="yz-tile">
                  <span className="yz-name">{m.name}</span>
                  {m.relation && <span className="yz-rel">{m.relation}</span>}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
