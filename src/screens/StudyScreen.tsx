import { useLayoutEffect, useMemo, useRef } from 'react'
import { useSettings } from '../settings'
import { getLearning } from '../lib/calendar'
import { useSefaria } from '../lib/sefaria'
import { TEXTS } from '../data/texts'

/** Splits paragraphs into pages of roughly `budget` characters; a single long paragraph is split at sentence ends. */
function paginate(paras: string[], budget = 720): string[][] {
  const pieces: string[] = []
  for (const p of paras) {
    if (p.length <= budget) {
      pieces.push(p)
      continue
    }
    let cur = ''
    for (const sentence of p.split(/(?<=[.:;])\s+/)) {
      if (cur && cur.length + sentence.length > budget) {
        pieces.push(cur)
        cur = ''
      }
      cur = cur ? `${cur} ${sentence}` : sentence
    }
    if (cur) pieces.push(cur)
  }
  const pages: string[][] = []
  let page: string[] = []
  let len = 0
  for (const piece of pieces) {
    if (page.length && len + piece.length > budget) {
      pages.push(page)
      page = []
      len = 0
    }
    page.push(piece)
    len += piece.length
  }
  if (page.length) pages.push(page)
  return pages.length ? pages : [[]]
}

/**
 * Full-text daily study screen. `kind` picks the cycle:
 * mishna → Mishna Yomit; halacha → the shul's own halachot if entered, otherwise Kitzur Shulchan Aruch Yomi.
 * The text comes from Sefaria (cached); offline with no cache it shows the reference and a short halacha from the bank.
 * Long texts are split into pages — each appearance of the screen shows the next page — and the type shrinks to fit.
 */
export default function StudyScreen({ now, kind, cycle }: { now: Date; kind: 'mishna' | 'halacha'; cycle: number }) {
  const { settings } = useSettings()
  const day = Math.floor((now.getTime() - now.getTimezoneOffset() * 60000) / 86400000)

  const custom = kind === 'halacha' && settings.customHalachot.length ? settings.customHalachot[day % settings.customHalachot.length] : null

  const entry = useMemo(
    () => getLearning([kind === 'mishna' ? 'mishnaYomi' : 'kitzurShulchanAruch'], now, settings.israel)[0],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kind, settings.israel, now.getDate()],
  )
  const { text, state } = useSefaria(custom ? undefined : entry?.ref, settings.fetchTexts)

  const title = kind === 'mishna' ? 'משנה יומית' : 'הלכה יומית'
  const fallback = useMemo(() => {
    const pool = TEXTS.filter((t) => t.category === (kind === 'mishna' ? 'mishna' : 'shulchan'))
    return pool.length ? pool[day % pool.length] : null
  }, [kind, day])

  let heading = entry ? entry.value : ''
  let paras: string[] = []
  let source = ''
  if (custom) {
    heading = custom.title
    paras = custom.text.split(/\n+/).filter(Boolean)
  } else if (text?.length) {
    paras = text
    source = 'מתוך ספריא · מהדורה ברשות הציבור'
  } else if (fallback) {
    paras = [fallback.body]
    source = fallback.source + (state === 'loading' ? '' : ' · הטקסט המלא יוצג כשיהיה חיבור לרשת')
  }

  const pages = useMemo(() => paginate(paras), [paras.join('\n')]) // eslint-disable-line react-hooks/exhaustive-deps
  const pageIdx = cycle % pages.length
  const page = pages[pageIdx]

  // Shrink the type until the page fits (from 3.4vw down to 1.3vw).
  const bodyRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = bodyRef.current
    if (!el) return
    let size = 3.0
    el.style.setProperty('--study-fs', `${size}vw`)
    while (el.scrollHeight > el.clientHeight + 2 && size > 1.3) {
      size -= 0.1
      el.style.setProperty('--study-fs', `${size.toFixed(2)}vw`)
    }
  }, [page])

  return (
    <div className="screen fade-screen study-screen">
      <h2 className="screen-title">
        {title}
        {heading && <span className="title-sub study-ref">{heading}</span>}
        {pages.length > 1 && (
          <span className="title-sub">
            חלק {pageIdx + 1} מתוך {pages.length}
          </span>
        )}
      </h2>
      <div className="study-body glass" ref={bodyRef}>
        {state === 'loading' && !paras.length ? (
          <div className="study-loading">טוען…</div>
        ) : (
          page.map((p, i) => (
            <p key={i} className="study-p">
              {p}
            </p>
          ))
        )}
        {source && <div className="study-source">{source}</div>}
      </div>
    </div>
  )
}
