import { useEffect, useRef, useState } from 'react'
import type { Settings } from '../types'
import { FULL_SCENARIO, IDLE, OREF_URL, SIM_EVENT, parseFeed, simPayload, simulate, step, tick, type AlertState, type FeedPayload, type SimKind } from '../lib/alerts'

const POLL_MS = 2000
/** After this long with no answer from the feed, the board says (quietly) that it has no connection. */
const STALE_MS = 60_000

export interface FeedStatus {
  /** 'off' = alerts switched off; 'ok' = the feed answered recently; 'error' = no answer for a minute */
  state: 'off' | 'ok' | 'error'
  /** Last successful poll (ms), 0 = never */
  lastOk: number
  /** Short reason for the last failure, for the settings panel */
  detail: string
}

type Bridge = { oref?: (url?: string) => Promise<{ ok: boolean; status: number; text: string; error?: string }> }

/**
 * Fetch the feed once. Inside the Electron kiosk the request goes through the main process,
 * which can send the headers the feed expects and is not blocked by the browser's CORS rules.
 * In a plain browser it goes to the dev server's /oref-alerts proxy, or to a custom relay URL.
 */
async function fetchFeed(customUrl: string, signal: AbortSignal): Promise<string> {
  const bridge = (window as any).luach as Bridge | undefined
  if (bridge?.oref) {
    const r = await bridge.oref(customUrl || OREF_URL)
    if (!r.ok) throw new Error(r.error || `HTTP ${r.status}`)
    return r.text
  }
  const res = await fetch(customUrl || './oref-alerts', { signal, cache: 'no-store', headers: { 'X-Requested-With': 'XMLHttpRequest' } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

export function useRedAlert(settings: Settings): { alert: AlertState; status: FeedStatus } {
  const cfg = settings.redAlert
  const [alert, setAlert] = useState<AlertState>(IDLE)
  const [status, setStatus] = useState<FeedStatus>({ state: 'off', lastOk: 0, detail: '' })
  const stateRef = useRef<AlertState>(IDLE)
  const cfgRef = useRef(cfg)
  cfgRef.current = cfg
  const placeRef = useRef(settings.locationName)
  placeRef.current = settings.locationName

  const apply = (next: AlertState) => {
    if (next !== stateRef.current) {
      stateRef.current = next
      setAlert(next)
    }
  }

  // Real feed.
  useEffect(() => {
    if (!cfg.enabled) {
      setStatus({ state: 'off', lastOk: 0, detail: '' })
      return
    }
    let stopped = false
    let timer: ReturnType<typeof setTimeout>
    let lastOk = 0
    const startedAt = Date.now()
    const ctrl = new AbortController()

    const poll = async () => {
      const c = cfgRef.current
      let payload: FeedPayload | null = null
      let failed = ''
      try {
        payload = parseFeed(await fetchFeed(c.feedUrl.trim(), ctrl.signal))
        lastOk = Date.now()
      } catch (e: any) {
        failed = String(e?.message || e)
      }
      if (stopped) return
      const now = Date.now()
      // A failed poll is not "quiet": only time moves, so a running alert is never cut short by a network blip.
      apply(failed ? tick(stateRef.current, now, { holdMinutes: c.holdMinutes }) : step(stateRef.current, payload, c.cities, now, { holdMinutes: c.holdMinutes }))
      const stale = now - (lastOk || startedAt) > STALE_MS
      setStatus((prev) => {
        const next: FeedStatus = { state: stale ? 'error' : 'ok', lastOk, detail: failed || '' }
        return prev.state === next.state && prev.lastOk === next.lastOk && prev.detail === next.detail ? prev : next
      })
      timer = setTimeout(poll, POLL_MS)
    }
    poll()
    return () => {
      stopped = true
      ctrl.abort()
      clearTimeout(timer)
    }
  }, [cfg.enabled])

  // Simulation: synthetic feed messages through the same state machine. Works even with alerts off.
  useEffect(() => {
    let timers: ReturnType<typeof setTimeout>[] = []
    let ticker: ReturnType<typeof setInterval> | undefined
    const clearAll = () => {
      timers.forEach(clearTimeout)
      timers = []
    }
    const feed = (kind: 'early' | 'alert' | 'end') => {
      const c = cfgRef.current
      const city = c.cities.find((x) => x.trim()) || placeRef.current || 'עיר לדוגמה'
      apply(step(stateRef.current, simPayload(kind, city), [city], Date.now(), { holdMinutes: c.holdMinutes, simulated: true }))
    }
    const onSim = (e: Event) => {
      const kind = (e as CustomEvent<SimKind>).detail
      clearAll()
      if (kind === 'stop') {
        if (stateRef.current.simulated) apply(IDLE)
        return
      }
      if (kind === 'full') FULL_SCENARIO.forEach(({ at, kind: k }) => timers.push(setTimeout(() => feed(k), at * 1000)))
      else feed(kind)
    }
    // While alerts are off nothing else advances time, so the simulation keeps its own clock.
    ticker = setInterval(() => {
      if (stateRef.current.phase !== 'idle') apply(tick(stateRef.current, Date.now(), { holdMinutes: cfgRef.current.holdMinutes }))
    }, 1000)
    window.addEventListener(SIM_EVENT, onSim)
    ;(window as any).luachSimulate = simulate
    // ?simulate=full (or early / alert / end) starts a simulation on load, for testing on a kiosk with no keyboard.
    const q = new URLSearchParams(window.location.search).get('simulate') as SimKind | null
    if (q && ['early', 'alert', 'end', 'full'].includes(q)) timers.push(setTimeout(() => simulate(q), 1500))
    return () => {
      clearAll()
      clearInterval(ticker)
      window.removeEventListener(SIM_EVENT, onSim)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { alert, status }
}
