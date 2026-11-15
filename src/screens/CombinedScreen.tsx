import { useMemo } from 'react'
import { useSettings } from '../settings'
import { getZmanim, halachicDate, getShabbatInfo } from '../lib/zmanim'
import { resolveAllPrayers, nextPrayer } from '../lib/prayers'
import { activeAnnouncements, getDiyoma, getWeekly } from '../lib/calendar'
import { upcomingMemorials } from '../lib/memorial'
import { fmtTime } from './extraScreens'

const ZMAN_KEYS = ['alos', 'netz', 'shmaMGA', 'shmaGRA', 'tfilaGRA', 'chatzos', 'minchaG', 'plag', 'shkia', 'tzeit', 'tzeitRT']

/** One-glance board for a lobby: zmanim · tefillot · what's on today, all at once. */
export default function CombinedScreen({ now, cycle }: { now: Date; cycle: number }) {
  const { settings } = useSettings()
  const minuteKey = Math.floor(now.getTime() / 60000)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const zmanim = useMemo(() => getZmanim(settings, now).filter((z) => ZMAN_KEYS.includes(z.key)), [settings, minuteKey])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const prayers = useMemo(() => resolveAllPrayers(settings, now).filter((p) => p.category !== 'shiur'), [settings, minuteKey])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const diyoma = useMemo(() => getDiyoma(settings, now).filter((d) => d.tone !== 'info').slice(0, 3), [settings, minuteKey])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const weekly = useMemo(() => getWeekly(settings, now), [settings, now.getDate()])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const shabbat = useMemo(() => getShabbatInfo(settings, now), [settings, minuteKey])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const anns = useMemo(() => activeAnnouncements(settings, now), [settings, Math.floor(minuteKey / 10)])
  const yz = useMemo(
    () => upcomingMemorials(settings.memorials, halachicDate(settings, now, 'shkia'), 7),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings.memorials, minuteKey],
  )
  const next = nextPrayer(prayers, now)
  const ann = anns.length ? anns[cycle % anns.length] : null

  return (
    <div className="screen fade-screen combined-screen">
      <section className="cb-col glass">
        <h3 className="cb-head">זמני היום</h3>
        {zmanim.map((z) => (
          <div key={z.key} className={z.highlight ? 'cb-row next' : 'cb-row'}>
            <span>
              {z.label}
              {z.opinion && <span className="zman-op">{z.opinion}</span>}
            </span>
            <b>{fmtTime(settings, z.time)}</b>
          </div>
        ))}
      </section>

      <section className="cb-center">
        <div className="cb-week glass">
          <div>
            <span className="cb-k">פרשת השבוע</span>
            <span className="cb-v">{weekly.parsha || '—'}</span>
          </div>
          <div>
            <span className="cb-k">{shabbat.kind === 'yomtov' ? 'הדלקת נרות חג' : 'הדלקת נרות'}</span>
            <span className="cb-v num">{fmtTime(settings, shabbat.candleLighting)}</span>
          </div>
          <div>
            <span className="cb-k">{shabbat.kind === 'yomtov' ? 'צאת החג' : 'צאת שבת'}</span>
            <span className="cb-v num">{fmtTime(settings, shabbat.tzeitShabbat)}</span>
          </div>
        </div>

        {ann ? (
          <div className={`cb-ann glass ev-${ann.style || 'plain'}`}>
            <div className="ann-title">{ann.title}</div>
            <div className="ann-body">{ann.body}</div>
          </div>
        ) : (
          <div className="cb-ann glass">
            <div className="ann-title">{settings.synagogueName}</div>
          </div>
        )}

        {diyoma.length > 0 && (
          <div className="cb-diyoma glass">
            {diyoma.map((d, i) => (
              <span key={i} className={`cb-dy ${d.tone}`}>
                {d.value}
              </span>
            ))}
          </div>
        )}

        {yz.length > 0 && (
          <div className="cb-yz glass">
            <span className="cb-k">יארצייט השבוע</span>
            <div className="cb-yz-names">
              {yz.slice(0, 6).map((m) => (
                <span key={m.id} className={m.isToday ? 'today' : undefined}>
                  {m.name} · {m.hebDateLabel}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="cb-col glass">
        <h3 className="cb-head">זמני תפילות</h3>
        {prayers.map((p) => (
          <div key={p.id} className={next?.id === p.id ? 'cb-row hot' : 'cb-row'}>
            <span>{p.label}</span>
            <b>{p.display}</b>
          </div>
        ))}
      </section>
    </div>
  )
}
