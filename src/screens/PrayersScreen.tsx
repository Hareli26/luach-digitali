import { useMemo } from 'react'
import { useSettings } from '../settings'
import { resolveAllPrayers, nextPrayer, type ResolvedPrayer } from '../lib/prayers'
import { addDays } from '../lib/calendar'

const CAT_LABEL: Record<string, string> = {
  shacharit: 'שחרית',
  mincha: 'מנחה',
  arvit: 'ערבית',
  shiur: 'שיעורים',
  other: 'נוסף',
}
const CAT_ORDER = ['shacharit', 'mincha', 'arvit', 'shiur', 'other']

/**
 * Today's tefillot by category. On a weekday the coming Shabbat (Friday + Shabbat) is shown alongside,
 * so the whole week's schedule is visible on one screen.
 */
export default function PrayersScreen({ now }: { now: Date }) {
  const { settings } = useSettings()
  const minuteKey = Math.floor(now.getTime() / 60000)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const prayers = useMemo(() => resolveAllPrayers(settings, now), [settings, minuteKey])
  const next = nextPrayer(prayers, now)
  const dow = now.getDay()

  const shabbatList = useMemo(() => {
    if (dow >= 5) return null
    const fri = addDays(now, 5 - dow)
    const sat = addDays(now, 6 - dow)
    const friOnly = resolveAllPrayers(settings, fri).filter((p) => {
      const src = settings.prayerTimes.find((x) => x.id === p.id)
      return src?.days === 'friday' || (src?.days === 'custom' && src.dows?.includes(5))
    })
    return { fri: friOnly, sat: resolveAllPrayers(settings, sat).filter((p) => p.category !== 'shiur') }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, dow])

  const byCat = prayers.reduce<Record<string, ResolvedPrayer[]>>((acc, p) => {
    ;(acc[p.category] ||= []).push(p)
    return acc
  }, {})
  const cats = CAT_ORDER.filter((c) => byCat[c]?.length)

  const row = (p: ResolvedPrayer, hot = false) => (
    <div key={p.id} className={hot ? 'prayer-row hot' : 'prayer-row'}>
      <span className="prayer-name">
        {p.label}
        {hot && <span className="next-tag now">הבאה</span>}
      </span>
      <span className={p.date ? 'prayer-time' : 'prayer-time note'}>{p.display}</span>
    </div>
  )

  return (
    <div className="screen fade-screen prayers-screen">
      <h2 className="screen-title">
        זמני תפילות
        <span className="title-sub">{dow === 6 ? 'שבת קודש' : dow === 5 ? 'ערב שבת' : 'יום חול'}</span>
      </h2>

      {cats.length === 0 ? (
        <div className="ann-empty glass">לא הוגדרו תפילות להיום. אפשר להוסיף בהגדרות ← תפילות.</div>
      ) : (
        <div className={shabbatList ? 'prayers-split' : undefined}>
          <div className="prayers-grid" data-count={cats.length}>
            {cats.map((cat) => (
              <div key={cat} className="prayer-card glass">
                <h3 className="prayer-card-head">{CAT_LABEL[cat]}</h3>
                {byCat[cat].map((p) => row(p, next?.id === p.id))}
              </div>
            ))}
          </div>
          {shabbatList && (shabbatList.fri.length > 0 || shabbatList.sat.length > 0) && (
            <div className="prayer-card glass shabbat-prayers">
              <h3 className="prayer-card-head">שבת הקרובה</h3>
              {shabbatList.fri.length > 0 && <div className="sp-sub">ערב שבת</div>}
              {shabbatList.fri.map((p) => row(p))}
              <div className="sp-sub">שבת קודש</div>
              {shabbatList.sat.map((p) => row(p))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
