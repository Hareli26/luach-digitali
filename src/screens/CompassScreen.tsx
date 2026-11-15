import { useEffect, useMemo, useState } from 'react'
import { useSettings } from '../settings'
import { bearingToJerusalem, distanceToJerusalem, compassLabel } from '../lib/geo'

export default function CompassScreen() {
  const { settings } = useSettings()
  const bearing = useMemo(() => bearingToJerusalem(settings.lat, settings.lng), [settings.lat, settings.lng])
  const dist = useMemo(() => distanceToJerusalem(settings.lat, settings.lng), [settings.lat, settings.lng])
  const [heading, setHeading] = useState<number | null>(null)

  // Use live device orientation when available (tablet / phone board)
  useEffect(() => {
    const handler = (e: DeviceOrientationEvent & { webkitCompassHeading?: number }) => {
      const h = e.webkitCompassHeading ?? (e.alpha != null ? 360 - e.alpha : null)
      if (h != null) setHeading(h)
    }
    window.addEventListener('deviceorientationabsolute' as any, handler as any, true)
    window.addEventListener('deviceorientation', handler as any, true)
    return () => {
      window.removeEventListener('deviceorientationabsolute' as any, handler as any, true)
      window.removeEventListener('deviceorientation', handler as any, true)
    }
  }, [])

  // Rose rotates to keep north up (device) or static; needle points to Jerusalem.
  const roseRotation = heading != null ? -heading : 0
  const needleRotation = bearing + roseRotation

  const nearJerusalem = dist < 2

  return (
    <div className="screen fade-screen compass-screen">
      <h2 className="screen-title">
        הכיוון לירושלים
        <span className="title-sub">לכיוון הר הבית · כיוון התפילה</span>
      </h2>

      <div className="compass-wrap">
        <div className="compass glass">
          <svg viewBox="0 0 400 400" className="compass-svg">
            <defs>
              <radialGradient id="roseGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.1" />
                <stop offset="100%" stopColor="var(--gold)" stopOpacity="0.02" />
              </radialGradient>
              <linearGradient id="needleGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--gold-bright)" />
                <stop offset="100%" stopColor="var(--gold-deep)" />
              </linearGradient>
            </defs>

            <circle cx="200" cy="200" r="190" fill="url(#roseGrad)" stroke="var(--line)" strokeWidth="2" />
            <circle cx="200" cy="200" r="150" fill="none" stroke="var(--line)" strokeWidth="1" />

            <g style={{ transform: `rotate(${roseRotation}deg)`, transformOrigin: '200px 200px', transition: 'transform 0.4s' }}>
              {Array.from({ length: 72 }).map((_, i) => {
                const major = i % 9 === 0
                const a = (i * 5 * Math.PI) / 180
                const r1 = 190
                const r2 = major ? 168 : 180
                return (
                  <line
                    key={i}
                    x1={200 + r1 * Math.sin(a)}
                    y1={200 - r1 * Math.cos(a)}
                    x2={200 + r2 * Math.sin(a)}
                    y2={200 - r2 * Math.cos(a)}
                    stroke={major ? 'var(--gold)' : 'var(--ink-faint)'}
                    strokeWidth={major ? 2.5 : 1}
                  />
                )
              })}
              <text x="200" y="46" textAnchor="middle" className="rose-letter">צפון</text>
              <text x="352" y="207" textAnchor="middle" className="rose-letter">מזרח</text>
              <text x="200" y="370" textAnchor="middle" className="rose-letter">דרום</text>
              <text x="48" y="207" textAnchor="middle" className="rose-letter">מערב</text>
            </g>

            {/* Needle to Jerusalem */}
            <g style={{ transform: `rotate(${needleRotation}deg)`, transformOrigin: '200px 200px', transition: 'transform 0.5s' }}>
              <polygon points="200,40 212,200 200,214 188,200" fill="url(#needleGrad)" />
              <polygon points="200,214 210,300 200,288 190,300" fill="var(--ink-faint)" opacity="0.5" />
              <circle cx="200" cy="80" r="10" fill="var(--gold-bright)" />
            </g>

            <circle cx="200" cy="200" r="12" fill="var(--bg-2)" stroke="var(--gold)" strokeWidth="2" />
          </svg>

        </div>

        <div className="compass-info">
          <div className="compass-stat glass">
            <div className="cs-label">זווית מצפון</div>
            <div className="cs-val">{Math.round(bearing)}°</div>
            <div className="cs-sub">{compassLabel(bearing)}</div>
          </div>
          <div className="compass-stat glass">
            <div className="cs-label">מרחק לירושלים</div>
            <div className="cs-val">{nearJerusalem ? '0' : Math.round(dist).toLocaleString('he-IL')}</div>
            <div className="cs-sub">ק״מ</div>
          </div>
          <div className="compass-note glass">
            {heading != null
              ? 'המצפן מכויל לפי חיישן המכשיר'
              : nearJerusalem
                ? 'אתם בירושלים — מול הר הבית'
                : 'החץ הזהוב מצביע לכיוון ירושלים ביחס לצפון האמיתי'}
          </div>
        </div>
      </div>
    </div>
  )
}
