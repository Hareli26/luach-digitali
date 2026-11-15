import { useMemo } from 'react'
import { useSettings } from '../settings'
import { activeAnnouncements } from '../lib/calendar'
import type { AnnStyle } from '../types'

export const ANN_STYLES: { value: AnnStyle; label: string; tag: string }[] = [
  { value: 'plain', label: 'הודעה רגילה', tag: '' },
  { value: 'mazaltov', label: 'מזל טוב', tag: 'מזל טוב' },
  { value: 'brit', label: 'ברית מילה', tag: 'ברית מילה' },
  { value: 'barmitzva', label: 'בר / בת מצווה', tag: 'בר מצווה' },
  { value: 'wedding', label: 'חתונה / שבת חתן', tag: 'שבת חתן' },
  { value: 'birth', label: 'הולדת בת / בן', tag: 'מזל טוב' },
  { value: 'event', label: 'אירוע קהילתי', tag: 'אירוע' },
  { value: 'condolence', label: 'ניחום אבלים', tag: 'ניחום אבלים' },
]

/**
 * Plain notices share one grid. An event notice (mazal tov, brit, …) gets the whole screen;
 * when there are several, each appearance shows the next one.
 */
export default function AnnouncementsScreen({ now, cycle }: { now: Date; cycle: number }) {
  const { settings } = useSettings()
  const minuteKey = Math.floor(now.getTime() / 60000)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const items = useMemo(() => activeAnnouncements(settings, now), [settings, Math.floor(minuteKey / 10)])
  const events = items.filter((a) => a.style && a.style !== 'plain')
  const plain = items.filter((a) => !a.style || a.style === 'plain')

  // Alternate: events one at a time, and the plain grid as one more "page".
  const pages = events.length + (plain.length ? 1 : 0)
  const page = pages ? cycle % pages : 0

  if (page < events.length) {
    const a = events[page]
    const tag = ANN_STYLES.find((s) => s.value === a.style)?.tag
    return (
      <div className={`screen fade-screen event-screen ev-${a.style}`}>
        <div className="event-card glass">
          {tag && <div className="ev-tag">{tag}</div>}
          <div className="ev-title">{a.title}</div>
          <div className="ev-body">{a.body}</div>
          <div className="ev-ornament" aria-hidden="true" />
        </div>
      </div>
    )
  }

  return (
    <div className="screen fade-screen ann-screen">
      <h2 className="screen-title">הודעות הקהילה</h2>
      <div className="ann-grid" data-count={Math.min(plain.length, 6)}>
        {plain.length === 0 && <div className="ann-empty glass">אין הודעות כעת</div>}
        {plain.slice(0, 6).map((a) => (
          <div key={a.id} className="ann-card glass">
            <div className="ann-title">{a.title}</div>
            <div className="ann-body">{a.body}</div>
          </div>
        ))}
      </div>
      {plain.length > 6 && <div className="ann-more">ועוד {plain.length - 6} הודעות ברצועה התחתונה</div>}
    </div>
  )
}
