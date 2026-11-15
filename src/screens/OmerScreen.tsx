import { useMemo } from 'react'
import { useSettings } from '../settings'
import { JewishCalendar, HebrewDateFormatter } from 'kosher-zmanim'
import { halachicDate } from '../lib/zmanim'
import type { Settings } from '../types'

// The seven middot of the Omer
const MIDOT = ['חֶסֶד', 'גְּבוּרָה', 'תִּפְאֶרֶת', 'נֶצַח', 'הוֹד', 'יְסוֹד', 'מַלְכוּת']

/** The Omer count changes at tzeit, not at midnight. */
function omerCalendar(s: Settings, now: Date): JewishCalendar {
  const jc = new JewishCalendar(halachicDate(s, now, 'tzeit'))
  jc.setInIsrael(s.israel)
  return jc
}

export function isOmerActive(s: Settings, now = new Date()): boolean {
  try {
    return omerCalendar(s, now).getDayOfOmer() > 0
  } catch {
    return false
  }
}

export default function OmerScreen({ now }: { now: Date }) {
  const { settings } = useSettings()
  const minuteKey = Math.floor(now.getTime() / 60000)
  const info = useMemo(() => {
    try {
      const jc = omerCalendar(settings, now)
      const day = jc.getDayOfOmer()
      const f = new HebrewDateFormatter()
      f.setHebrewFormat(true)
      const weeks = Math.floor(day / 7)
      const days = day % 7
      const outer = MIDOT[Math.min(6, Math.floor((day - 1) / 7))]
      const inner = MIDOT[(day - 1) % 7]
      return { day, text: f.formatOmer(jc), weeks, days, sefira: `${inner} שֶׁבְּ${outer}` }
    } catch {
      return null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.israel, settings.lat, settings.lng, settings.tzeitType, minuteKey])

  if (!info || info.day <= 0) return null

  // From tzeit until midnight the count shown is tonight's.
  const tonight = halachicDate(settings, now, 'tzeit').getDate() !== now.getDate()

  return (
    <div className="screen fade-screen omer-screen">
      <div className="omer-card glass">
        <div className="omer-label">{tonight ? 'הלילה סופרים' : 'היום'}</div>
        <div className="omer-count">{info.day}</div>
        <div className="omer-text">{info.text}</div>
        {info.day >= 7 && (
          <div className="omer-weeks">
            שֶׁהֵם {info.weeks} שָׁבוּעוֹת{info.days ? ` וְ${info.days} יָמִים` : ''}
          </div>
        )}
        <div className="omer-sefira">{info.sefira}</div>
      </div>
    </div>
  )
}
