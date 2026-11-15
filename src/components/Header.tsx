import { useSettings } from '../settings'
import { getHebrewDate } from '../lib/zmanim'
import { NUSACH_LABELS } from '../types'
import { useMemo } from 'react'
import { ARROW_LABELS, PrayerArrow } from './PrayerArrow'

export default function Header({ now }: { now: Date }) {
  const { settings } = useSettings()
  const minuteKey = Math.floor(now.getTime() / 60000)
  // Recomputed each minute so the Hebrew date turns over at sunset.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const heb = useMemo(() => getHebrewDate(settings, now), [settings, minuteKey])

  const time = now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: settings.timeZone })
  const seconds = String(now.getSeconds()).padStart(2, '0')
  const greg = now.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: settings.timeZone })

  const chips = [heb.yomTov, heb.roshChodesh, heb.omer].filter(Boolean)

  return (
    <header className="hdr">
      <div className="hdr-right">
        <div className="hdr-shul">{settings.synagogueName}</div>
        <div className="hdr-loc">
          {settings.locationName} · נוסח {NUSACH_LABELS[settings.nusach]}
          {settings.prayerArrow != null && (
            <span className="hdr-pray" aria-label={`כיוון התפילה: ${ARROW_LABELS[settings.prayerArrow] ?? ''}`}>
              <PrayerArrow angle={settings.prayerArrow} className="hdr-pray-arrow" />
              כיוון התפילה
            </span>
          )}
        </div>
      </div>

      <div className="hdr-clock" aria-label={`השעה ${time}`}>
        <span className="clock-main">{time}</span>
        <span className="clock-sec" aria-hidden="true">
          {seconds}
        </span>
      </div>

      <div className="hdr-left">
        <div className="hdr-hebdate">{heb.dateHe}</div>
        <div className="hdr-dow">
          {heb.dayOfWeek} · {greg}
        </div>
        {chips.length > 0 && (
          <div className="hdr-chips">
            {chips.map((c) => (
              <span key={c} className={c === heb.yomTov ? 'hdr-chip yomtov' : c === heb.omer ? 'hdr-chip omer' : 'hdr-chip'}>
                {c}
              </span>
            ))}
          </div>
        )}
      </div>
    </header>
  )
}
