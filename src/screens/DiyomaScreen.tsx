import { useMemo } from 'react'
import { useSettings } from '../settings'
import { getDiyoma, getLearning } from '../lib/calendar'

/** Inyanei Diyoma: what changes in today's tefillah, plus today's learning. */
export default function DiyomaScreen({ now }: { now: Date }) {
  const { settings } = useSettings()
  const minuteKey = Math.floor(now.getTime() / 60000)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const items = useMemo(() => getDiyoma(settings, now), [settings, minuteKey])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const learning = useMemo(() => getLearning(settings.learningItems.slice(0, 4), now, settings.israel), [settings.learningItems, settings.israel, now.getDate()])

  return (
    <div className="screen fade-screen diyoma-screen">
      <h2 className="screen-title">
        ענייני דיומא
        <span className="title-sub">מה משתנה בתפילה היום</span>
      </h2>
      <div className="diyoma-grid">
        <div className="diyoma-list glass">
          {items.map((it, i) => (
            <div key={i} className={`dy-row ${it.tone}`}>
              <span className="dy-label">{it.label}</span>
              <span className="dy-val">
                {it.value}
                {it.note && <span className="dy-note">{it.note}</span>}
              </span>
            </div>
          ))}
        </div>
        <div className="diyoma-side glass">
          <div className="dy-side-head">לימוד יומי</div>
          {learning.map((l) => (
            <div key={l.key} className="dy-learn">
              <span className="dy-learn-label">{l.label}</span>
              <span className="dy-learn-val">{l.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
