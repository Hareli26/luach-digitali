import { useMemo } from 'react'
import { useSettings } from '../settings'
import { upcomingPrayer } from '../lib/prayers'
import { nextZman, getZmanim } from '../lib/zmanim'
import { activeAnnouncements } from '../lib/calendar'

/** Calm countdown: hours and minutes; seconds only in the final 10 minutes. */
function countdown(target: Date, now: Date): string {
  const ms = Math.max(0, target.getTime() - now.getTime())
  const totalMin = Math.floor(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (totalMin < 10) {
    const s = Math.floor((ms % 60000) / 1000)
    return `${m}:${String(s).padStart(2, '0')}`
  }
  if (h > 0) return m ? `${h} ש׳ ו־${m} דק׳` : `${h} ש׳`
  return `${m} דק׳`
}

export default function BottomBar({ now, quietFor }: { now: Date; quietFor: string | null }) {
  const { settings } = useSettings()
  const minuteKey = Math.floor(now.getTime() / 60000)
  const tz = settings.timeZone
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const up = useMemo(() => upcomingPrayer(settings, now), [settings, minuteKey])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const zman = useMemo(() => nextZman(settings, now), [settings, minuteKey])

  const fmt = (d: Date) => d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz })

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const anns = useMemo(() => activeAnnouncements(settings, now), [settings, Math.floor(minuteKey / 10)])
  // Information band: chosen zmanim, so a reader on any screen still sees e.g. shkia.
  const zmanLine = useMemo(() => {
    if (!settings.bannerZmanim.length) return ''
    const list = getZmanim(settings, now)
    return settings.bannerZmanim
      .map((k) => list.find((z) => z.key === k))
      .filter((z): z is NonNullable<typeof z> => !!z && !!z.time)
      .map((z) => `${z.label}${z.opinion ? ` (${z.opinion})` : ''} ${fmt(z.time!)}`)
      .join('  ·  ')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, minuteKey])

  const items = [
    ...anns.map((a) => [a.title.trim(), a.body.trim()].filter(Boolean).join(' — ')),
    ...(zmanLine ? [zmanLine] : []),
    ...(settings.dedication.showLine && settings.dedication.text.trim() ? [settings.dedication.text.trim().replace(/\n+/g, ' ')] : []),
  ]
  const ticker = items.join('   ·   ')
  // Constant reading speed regardless of text length (~7 characters per second).
  const tickerSeconds = Math.max(30, Math.round((ticker.length * 2 + 40) / 7))

  return (
    <footer className="bottombar">
      <section className="next-tefila glass" aria-label="התפילה הבאה">
        {up && up.prayer.date ? (
          <>
            <div className="nt-label">{up.tomorrow ? 'מחר' : 'התפילה הבאה'}</div>
            <div className="nt-main">
              <span className="nt-name">{up.prayer.label}</span>
              <span className="nt-time">{up.prayer.display}</span>
            </div>
            {!up.tomorrow && (
              <div className="nt-countdown">
                בעוד <span>{countdown(up.prayer.date, now)}</span>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="nt-label">התפילה הבאה</div>
            <div className="nt-main">
              <span className="nt-name nt-empty">לא הוגדרו תפילות</span>
            </div>
          </>
        )}
      </section>

      {zman && zman.time && (
        <section className="next-zman glass" aria-label="הזמן הבא">
          <div className="nt-label">הזמן הבא</div>
          <div className="nz-name">
            {zman.label}
            {zman.opinion && <span className="zman-op">{zman.opinion}</span>}
          </div>
          <div className="nz-time">{fmt(zman.time)}</div>
        </section>
      )}

      <div className="ticker-wrap">
        <div className="ticker-tag">{quietFor ? 'תפילה' : anns.length ? 'הודעות' : 'זמנים'}</div>
        <div className="ticker-track">
          {quietFor ? (
            <div className="ticker-static">{quietFor} · הלוח בהשתקה בזמן התפילה</div>
          ) : ticker ? (
            <div className="ticker-move" style={{ animationDuration: `${tickerSeconds}s` }}>
              <span className="ticker-copy">{ticker}</span>
              <span className="ticker-copy" aria-hidden="true">
                {ticker}
              </span>
            </div>
          ) : (
            <div className="ticker-static">ברוכים הבאים · {settings.synagogueName}</div>
          )}
        </div>
      </div>
    </footer>
  )
}
