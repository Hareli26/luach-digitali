import { useEffect, useMemo, useState } from 'react'
import { useSettings } from './settings'
import { useClock } from './hooks/useClock'
import Header from './components/Header'
import BottomBar from './components/BottomBar'
import SettingsPanel from './components/SettingsPanel'
import { BackdropCaption, BackdropLayer, useBackdrop } from './components/Backdrop'
import AlertOverlay from './components/AlertOverlay'
import { useRedAlert } from './hooks/useRedAlert'
import { simulate } from './lib/alerts'
import ZmanimScreen from './screens/ZmanimScreen'
import PrayersScreen from './screens/PrayersScreen'
import DateScreen from './screens/DateScreen'
import CompassScreen from './screens/CompassScreen'
import TextScreen from './screens/TextScreen'
import AnnouncementsScreen from './screens/AnnouncementsScreen'
import LearningScreen from './screens/LearningScreen'
import MemorialScreen from './screens/MemorialScreen'
import WeekZmanimScreen from './screens/WeekZmanimScreen'
import OmerScreen, { isOmerActive } from './screens/OmerScreen'
import DiyomaScreen from './screens/DiyomaScreen'
import StudyScreen from './screens/StudyScreen'
import CombinedScreen from './screens/CombinedScreen'
import {
  BirthdaysScreen,
  ChanukahScreen,
  DedicationScreen,
  DonorsScreen,
  FastScreen,
  HolidayPrayersScreen,
  ImagesScreen,
  ShiurimScreen,
  activeHolidaySchedule,
  hasBirthdaysThisWeek,
} from './screens/extraScreens'
import { AheadScreen, DayArcScreen, LevanaScreen, NachmanScreen, RefuaScreen, SeasonHalachaScreen, isLevanaActive } from './screens/uniqueScreens'
import { prayerInProgress } from './lib/prayers'
import { activeAnnouncements, dayKind, getChanukah, getFast } from './lib/calendar'
import { useImages } from './lib/images'
import { SCREENS, SCREEN_BY_KEY } from './screenRegistry'
import { activeAnnouncements as annsNow } from './lib/calendar'
import type { Settings } from './types'
import './app.css'

/** Typing in a field must never trigger board shortcuts. */
function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false
  return t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)
}

/** The background design for a screen: the gabbai's choice, else the screen's own; event notices carry their own. */
function decorFor(s: Settings, key: string, now: Date, cycle: number): string {
  if (key === 'announcements') {
    const events = annsNow(s, now).filter((a) => a.style && a.style !== 'plain')
    const plain = annsNow(s, now).length > events.length
    const pages = events.length + (plain ? 1 : 0)
    const page = pages ? cycle % pages : 0
    if (page < events.length && events[page].decor) return events[page].decor!
  }
  return s.screenDecor[key] ?? SCREEN_BY_KEY[key]?.decor ?? 'none'
}

/** Display schedule: off hours show a dark screen. Shabbat and Yom Tov can be kept on regardless. */
function isPoweredOff(s: Settings, now: Date, kind: string): boolean {
  if (!s.power.enabled) return false
  if (s.power.shabbatAlwaysOn && kind !== 'weekday') return false
  return s.power.hours[now.getHours()] === false
}

export default function App() {
  const { settings } = useSettings()
  const now = useClock(1000)
  const [showSettings, setShowSettings] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [screenIdx, setScreenIdx] = useState(0)
  const [cycle, setCycle] = useState(0)
  const [paused, setPaused] = useState(false)
  /** A key pressed during off hours wakes the board for 10 minutes. */
  const [wakeUntil, setWakeUntil] = useState(0)
  const images = useImages()
  const { alert: redAlert, status: alertFeed } = useRedAlert(settings)
  const alertShown = redAlert.phase !== 'idle'

  const minuteKey = Math.floor(now.getTime() / 60000)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const kind = useMemo(() => dayKind(settings, now), [settings.israel, settings.lat, settings.lng, minuteKey])

  // During a tefillah the board holds still (and optionally on one screen).
  const inPrayer = useMemo(
    () => prayerInProgress(settings, now),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings, minuteKey],
  )
  const quiet = !!inPrayer && settings.quietDuringPrayer
  const frozenOn = inPrayer && settings.freezeScreen !== 'none' ? settings.freezeScreen : null

  useEffect(() => {
    document.documentElement.toggleAttribute('data-quiet', quiet)
  }, [quiet])

  const backdrop = useBackdrop(now, kind, quiet)
  useEffect(() => {
    document.documentElement.toggleAttribute('data-backdrop', !!backdrop.shown)
  }, [backdrop.shown])

  // Seasonal / data-driven availability, recomputed each minute.
  const avail = useMemo(() => {
    const s = settings
    return {
      omer: isOmerActive(s, now),
      chanukah: !!getChanukah(s, now),
      fast: !!getFast(s, now),
      holiday: !!activeHolidaySchedule(s, now),
      birthdays: hasBirthdaysThisWeek(s, now),
      announcements: activeAnnouncements(s, now).length > 0,
      memorial: s.memorials.some((m) => m.name.trim()),
      shiurim: s.shiurim.some((x) => x.topic.trim() || x.rabbi.trim()),
      donors: s.donors.some((d) => d.name.trim()),
      dedication: !!s.dedication.text.trim(),
      halacha: true,
      images: images.length > 0,
      levana: isLevanaActive(s, now),
      refua: s.refua.some((r) => r.name.trim()),
    } as Record<string, boolean>
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, minuteKey, images.length])

  const render = (key: string): React.ReactNode => {
    switch (key) {
      case 'zmanim': return <ZmanimScreen now={now} />
      case 'prayers': return <PrayersScreen now={now} />
      case 'date': return <DateScreen now={now} />
      case 'diyoma': return <DiyomaScreen now={now} />
      case 'announcements': return <AnnouncementsScreen now={now} cycle={cycle} />
      case 'halacha': return <StudyScreen now={now} kind="halacha" cycle={cycle} />
      case 'mishna': return <StudyScreen now={now} kind="mishna" cycle={cycle} />
      case 'memorial': return <MemorialScreen now={now} />
      case 'images': return <ImagesScreen cycle={cycle} />
      case 'shiurim': return <ShiurimScreen now={now} />
      case 'combined': return <CombinedScreen now={now} cycle={cycle} />
      case 'week': return <WeekZmanimScreen now={now} />
      case 'donors': return <DonorsScreen cycle={cycle} />
      case 'dedication': return <DedicationScreen />
      case 'birthdays': return <BirthdaysScreen now={now} />
      case 'holiday': return <HolidayPrayersScreen now={now} />
      case 'omer': return <OmerScreen now={now} />
      case 'learning': return <LearningScreen now={now} cycle={cycle} />
      case 'texts': return <TextScreen round={round} now={now} />
      case 'nachman': return <NachmanScreen now={now} round={round} />
      case 'season': return <SeasonHalachaScreen now={now} round={round} />
      case 'dayarc': return <DayArcScreen now={now} />
      case 'ahead': return <AheadScreen now={now} />
      case 'levana': return <LevanaScreen now={now} />
      case 'refua': return <RefuaScreen cycle={cycle} />
      case 'chanukah': return <ChanukahScreen now={now} />
      case 'fast': return <FastScreen now={now} />
      case 'compass': return <CompassScreen />
      default: return null
    }
  }

  /** Rotation order: enabled, available, and given time on this kind of day. */
  const rotation = useMemo(() => {
    const keys = SCREENS.map((d) => d.key).filter(
      (k) => settings.enabledScreens[k] && avail[k] !== false && (settings.screenTimes[k]?.[kind] ?? SCREEN_BY_KEY[k].seconds) > 0,
    )
    return keys.length ? keys : ['zmanim']
  }, [settings.enabledScreens, settings.screenTimes, kind, avail])

  const activeIdx = screenIdx % rotation.length
  /** Completed rounds of the whole rotation — texts change every two rounds. */
  const round = Math.floor(cycle / rotation.length)
  const currentKey = frozenOn ?? rotation[activeIdx]

  // Each screen stays for its own time; while quiet without a held screen, at least a minute.
  const seconds = Math.max(5, settings.screenTimes[currentKey]?.[kind] ?? SCREEN_BY_KEY[currentKey]?.seconds ?? settings.rotationSeconds, quiet ? 60 : 0)
  useEffect(() => {
    if (paused || showSettings || frozenOn) return
    const id = setTimeout(() => {
      setScreenIdx((i) => (i + 1) % rotation.length)
      setCycle((c) => c + 1)
    }, seconds * 1000)
    return () => clearTimeout(id)
  }, [paused, showSettings, frozenOn, rotation.length, seconds, screenIdx])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {})
    else document.exitFullscreen?.().catch(() => {})
  }

  const goTo = (key: string) => {
    const i = rotation.indexOf(key)
    if (i >= 0) {
      setScreenIdx(i)
      setCycle((c) => c + 1)
    }
  }

  // Keyboard: arrows, space, S settings, F fullscreen, H help, and a key per screen (by physical key, any layout).
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      setWakeUntil(Date.now() + 10 * 60000)
      // Escape ends a simulation; a real alert cannot be dismissed from the keyboard.
      if (ev.key === 'Escape' && alertShown && redAlert.simulated) simulate('stop')
      if (ev.key === 'Escape') {
        setShowSettings(false)
        setShowHelp(false)
        return
      }
      if (showSettings || isTypingTarget(ev.target) || ev.ctrlKey || ev.metaKey || ev.altKey) return
      if (ev.key === 'ArrowLeft') setScreenIdx((i) => (i + 1) % rotation.length)
      else if (ev.key === 'ArrowRight') setScreenIdx((i) => (i - 1 + rotation.length) % rotation.length)
      else if (ev.key === ' ') {
        if (ev.target instanceof HTMLButtonElement) return
        ev.preventDefault()
        setPaused((p) => !p)
      } else if (ev.code === 'KeyS') setShowSettings(true)
      else if (ev.code === 'KeyF') toggleFullscreen()
      else if (ev.code === 'KeyH' || ev.key === '?') setShowHelp((h) => !h)
      else {
        const def = SCREENS.find((d) => d.code === ev.code)
        if (def) goTo(def.key)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rotation, showSettings, alertShown, redAlert.simulated])

  const overlay = <AlertOverlay alert={redAlert} now={now} timeZone={settings.timeZone} shelterNote={settings.redAlert.shelterNote} />

  if (isPoweredOff(settings, now, kind) && now.getTime() > wakeUntil && !showSettings) {
    // An alert lights a dark board too.
    if (alertShown) return overlay
    return (
      <div className="power-off" onClick={() => setWakeUntil(Date.now() + 10 * 60000)}>
        <span className="power-off-clock">{now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: settings.timeZone })}</span>
      </div>
    )
  }

  return (
    <>
    <BackdropLayer state={backdrop} />
    <div className="app">
      <Header now={now} />

      <main className="stage" aria-live="off">
        <div className="decor" data-decor={decorFor(settings, currentKey, now, cycle)} aria-hidden="true" />
        <div className="stage-inner" key={currentKey + screenIdx}>
          {render(currentKey) ?? render('zmanim')}
        </div>
      </main>

      {/* Strip between stage and bottom bar: rotation status, screen dots, controls. Never over content. */}
      <div className="strip">
        <div className="strip-start">
          <span className="strip-status" role="status">
            {frozenOn ? `${inPrayer?.label} · הלוח מוצג קבוע בזמן התפילה` : paused ? 'הסבב מושהה' : ''}
          </span>
          {alertFeed.state === 'error' && (
            <span className="strip-alert-off" title={alertFeed.detail}>
              אין קשר להתרעות פיקוד העורף
            </span>
          )}
          {!frozenOn && !paused && <BackdropCaption state={backdrop} />}
        </div>
        <nav className="dots" aria-label="מסכי הלוח">
          {rotation.map((k, i) => (
            <button
              key={k}
              className={k === currentKey ? 'dot active' : 'dot'}
              onClick={() => {
                setScreenIdx(i)
                setCycle((c) => c + 1)
              }}
              aria-label={SCREEN_BY_KEY[k]?.name ?? k}
              title={`${SCREEN_BY_KEY[k]?.name} (${SCREEN_BY_KEY[k]?.keyLabel})`}
              aria-current={k === currentKey ? 'true' : undefined}
            />
          ))}
        </nav>

        {/* Controls — faint until the pointer or keyboard focus reaches them */}
        <div className="controls">
          <button className="ctrl-btn" onClick={() => setShowHelp((h) => !h)} aria-label="קיצורי מקשים (H)" title="קיצורי מקשים (H)">
            <IconKeys />
          </button>
          <button className="ctrl-btn" onClick={() => setPaused((p) => !p)} aria-label={paused ? 'המשך סבב (רווח)' : 'השהיית סבב (רווח)'} title={paused ? 'המשך סבב (רווח)' : 'השהיית סבב (רווח)'}>
            {paused ? <IconPlay /> : <IconPause />}
          </button>
          <button className="ctrl-btn" onClick={toggleFullscreen} aria-label="מסך מלא (F)" title="מסך מלא (F)">
            <IconExpand />
          </button>
          <button className="ctrl-btn" onClick={() => setShowSettings(true)} aria-label="הגדרות (S)" title="הגדרות (S)">
            <IconSettings />
          </button>
        </div>
      </div>

      <BottomBar now={now} quietFor={quiet ? inPrayer?.label ?? null : null} />

      {showHelp && (
        <div className="help-overlay" onClick={() => setShowHelp(false)} role="dialog" aria-label="קיצורי מקשים">
          <div className="help-card glass" onClick={(e) => e.stopPropagation()}>
            <h2>מעבר ישיר למסך</h2>
            <div className="help-grid">
              {SCREENS.map((d) => (
                <button key={d.key} className={rotation.includes(d.key) ? 'help-item' : 'help-item off'} onClick={() => { goTo(d.key); setShowHelp(false) }}>
                  <kbd>{d.keyLabel}</kbd>
                  <span>{d.name}</span>
                </button>
              ))}
            </div>
            <p className="help-foot">
              <kbd>←</kbd>/<kbd>→</kbd> מסך הבא/קודם · <kbd>רווח</kbd> השהיה · <kbd>F</kbd> מסך מלא · <kbd>S</kbd> הגדרות · <kbd>H</kbd> חלון זה. מסכים מעומעמים אינם בסבב כרגע.
            </p>
          </div>
        </div>
      )}

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} feedStatus={alertFeed} />}
    </div>
    {overlay}
    </>
  )
}

const svgProps = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

function IconKeys() {
  return (
    <svg {...svgProps}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M7 10h.01M11 10h.01M15 10h.01M8 14h8" />
    </svg>
  )
}
function IconPause() {
  return (
    <svg {...svgProps}>
      <path d="M9 5v14M15 5v14" />
    </svg>
  )
}
function IconPlay() {
  return (
    <svg {...svgProps}>
      <path d="M8 5.5v13l10-6.5z" />
    </svg>
  )
}
function IconExpand() {
  return (
    <svg {...svgProps}>
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </svg>
  )
}
function IconSettings() {
  return (
    <svg {...svgProps}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  )
}
