import type { AlertState } from '../lib/alerts'

function mmss(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

/**
 * Takes over the whole board while Home Front Command has an alert for the shul's area.
 * Red for an alert, amber for an early warning, green for the end of the event.
 * Read from across the room, with nothing to press: it leaves on its own.
 */
export default function AlertOverlay({ alert, now, timeZone, shelterNote }: { alert: AlertState; now: Date; timeZone: string; shelterNote: string }) {
  if (alert.phase === 'idle') return null
  const t = now.getTime()
  const clock = now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone })
  const cities = alert.cities.join(' · ')

  let heading: string
  let action: string
  let detail: string
  let foot: string
  if (alert.phase === 'alert') {
    heading = alert.title
    action = 'היכנסו למרחב המוגן'
    // The feed's own instruction usually repeats the action line; show only what it adds.
    detail = alert.desc.startsWith(action) ? alert.desc.slice(action.length).trim() : alert.desc
    if (!detail) detail = 'ושהו בו עד להודעה על סיום האירוע'
    foot = `מאז ההתרעה ${mmss(t - alert.since)} · ההודעה תוסר כשפיקוד העורף יודיע על סיום האירוע`
  } else if (alert.phase === 'early') {
    heading = 'התרעה מקדימה'
    action = 'היו מוכנים להיכנס למרחב המוגן'
    detail = alert.title === 'התרעה מקדימה' ? alert.desc : alert.title
    foot = 'בדקות הקרובות עשויה להישמע אזעקה באזור'
  } else {
    const left = Math.ceil(((alert.clearUntil ?? t) - t) / 1000)
    if (alert.clearReason === 'official') {
      heading = alert.title || 'האירוע הסתיים'
      action = 'ניתן לצאת מהמרחב המוגן'
      detail = alert.desc && alert.desc !== action ? alert.desc : ''
    } else {
      heading = 'לא התקבלו התרעות נוספות'
      action = 'אם לא התקבלה הנחיה אחרת, ניתן לצאת מהמרחב המוגן'
      detail = `חלפו ${Math.round((t - alert.lastSeen) / 60000)} דקות מההתרעה האחרונה באזור`
    }
    foot = `הלוח יחזור לתצוגה הרגילה בעוד ${Math.max(0, left)} שניות`
  }

  return (
    <div className={`red-alert ra-${alert.phase}`} role="alertdialog" aria-live="assertive" aria-label={`${heading}. ${action}`}>
      <div className="ra-top">
        <span className="ra-source">פיקוד העורף{alert.simulated && <strong className="ra-sim">הדמיה · זו אינה התרעה אמיתית</strong>}</span>
        <span className="ra-clock">{clock}</span>
      </div>

      <div className="ra-body">
        <AlertIcon phase={alert.phase} />
        <h1 className="ra-heading">{heading}</h1>
        <p className="ra-action">{action}</p>
        {detail && <p className="ra-detail">{detail}</p>}
        {alert.phase !== 'clear' && shelterNote.trim() && (
          <div className="ra-shelter">
            <span className="ra-shelter-label">המרחב המוגן של בית הכנסת</span>
            <span className="ra-shelter-text">{shelterNote}</span>
          </div>
        )}
        {cities && <p className="ra-cities">{cities}</p>}
      </div>

      <div className="ra-foot">{foot}</div>
    </div>
  )
}

function AlertIcon({ phase }: { phase: AlertState['phase'] }) {
  const p = { width: 120, height: 120, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true, className: 'ra-icon' }
  if (phase === 'clear')
    return (
      <svg {...p}>
        <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6z" />
        <path d="M8.5 12l2.5 2.5 4.5-5" />
      </svg>
    )
  return (
    <svg {...p}>
      <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6z" />
      <path d="M12 8v5M12 16.5h.01" />
    </svg>
  )
}
