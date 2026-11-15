import { useMemo } from 'react'
import { useSettings } from '../settings'
import { getLearning, getWeekly } from '../lib/calendar'
import { TEXTS } from '../data/texts'

export default function LearningScreen({ now, cycle }: { now: Date; cycle: number }) {
  const { settings } = useSettings()
  const learning = useMemo(
    () => getLearning(settings.learningItems, now, settings.israel),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings.learningItems, settings.israel, now.getDate()],
  )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const weekly = useMemo(() => getWeekly(settings, now), [settings, now.getDate()])

  const pool = TEXTS.filter((t) => ['gemara', 'mishna', 'chumash'].includes(t.category))
  const dvar = pool[(cycle + now.getDate()) % pool.length]
  const cards = [...learning.map((l) => ({ key: l.key, label: l.label, value: l.value })), { key: 'parsha', label: 'פרשת השבוע', value: weekly.parsha || '—' }]

  return (
    <div className="screen fade-screen learning-screen">
      <h2 className="screen-title">
        לימוד יומי
        <span className="title-sub">סדר הלימוד להיום</span>
      </h2>

      <div className="learning-grid" data-count={cards.length}>
        {cards.map((c) => (
          <div key={c.key} className="learn-card glass">
            <div className="learn-label">{c.label}</div>
            <div className="learn-val">{c.value}</div>
          </div>
        ))}
      </div>

      {dvar && cards.length <= 6 && (
        <div className="learn-dvar glass">
          <div className="learn-dvar-tag">
            {dvar.categoryLabel} · {dvar.source}
          </div>
          <div className="learn-dvar-body">{dvar.body}</div>
        </div>
      )}
    </div>
  )
}
