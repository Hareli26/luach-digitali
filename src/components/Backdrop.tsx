import { useEffect, useMemo, useState } from 'react'
import { useSettings } from '../settings'
import { getWeekly } from '../lib/calendar'
import { pickBackdrop, type Backdrop } from '../lib/places'
import type { DayKind } from '../types'

export interface BackdropState {
  shown: Backdrop | null
  prev: Backdrop | null
  settle: () => void
}

/**
 * The holy-place photograph for now. It changes every `minutes`, never during a tefillah
 * (quiet holds the last one), and only after the next photo has loaded so nothing flashes.
 */
export function useBackdrop(now: Date, kind: DayKind, quiet: boolean): BackdropState {
  const { settings } = useSettings()
  const { enabled, minutes } = settings.backdrop
  const slot = Math.floor(now.getTime() / (Math.max(1, minutes) * 60000))
  const dayKey = now.toDateString() + now.getHours()

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const parshaHe = useMemo(() => getWeekly(settings, now).parsha, [settings.israel, settings.nusach, dayKey])
  const picked = useMemo(
    () => (enabled ? pickBackdrop(settings, now, kind, slot, parshaHe) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabled, settings.israel, settings.lat, settings.lng, kind, slot, parshaHe],
  )

  const [shown, setShown] = useState<Backdrop | null>(null)
  const [prev, setPrev] = useState<Backdrop | null>(null)

  useEffect(() => {
    if (!picked) {
      setShown(null)
      setPrev(null)
      return
    }
    if (quiet && shown) return
    if (shown && picked.key === shown.key && picked.reason === shown.reason) return
    if (shown?.key === picked.key) {
      setShown(picked) // same photo, new caption
      return
    }
    let alive = true
    const img = new Image()
    img.onload = img.onerror = () => {
      if (!alive) return
      setPrev(shown)
      setShown(picked)
    }
    img.src = picked.url
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked, quiet])

  return { shown, prev, settle: () => setPrev(null) }
}

/** Full-bleed photo layer under the whole board, veiled in the theme's ground colour. */
export function BackdropLayer({ state }: { state: BackdropState }) {
  const { shown, prev, settle } = state
  if (!shown) return null
  return (
    <div className="backdrop" aria-hidden="true">
      {prev && <img key={'p-' + prev.key} className="backdrop-img" src={prev.url} alt="" style={{ objectPosition: prev.credit.position }} />}
      <img
        key={shown.key}
        className={prev ? 'backdrop-img entering' : 'backdrop-img'}
        src={shown.url}
        alt=""
        style={{ objectPosition: shown.credit.position }}
        onAnimationEnd={settle}
      />
      <div className="backdrop-veil" />
    </div>
  )
}

/** Names the place (and why it is shown) with the photographer's credit, in the strip. */
export function BackdropCaption({ state }: { state: BackdropState }) {
  const b = state.shown
  if (!b) return null
  return (
    <span className="place-caption">
      <span className="place-name">{b.name}</span>
      {b.reason && <span className="place-reason"> · {b.reason}</span>}
      <span className="place-credit">
        {' '}
        · צילום: <bdi>{b.credit.author}</bdi>, <bdi>{b.credit.license}</bdi>
      </span>
    </span>
  )
}
