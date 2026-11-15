import { useMemo } from 'react'
import { useSettings } from '../settings'
import { TEXTS, CATEGORY_LABELS } from '../data/texts'
import { pick, useBanks, type BankName } from '../lib/bank'

/** Categories served from the full, sourced bank instead of the short built-in list. */
const BANK_FOR: Record<string, { banks: BankName[]; maxLen?: number }> = {
  breslov: { banks: ['breslov-etzot', 'breslov-midot', 'breslov-sichot'] },
  avot: { banks: ['avot'] },
  mussar: { banks: ['mesilat-yesharim'] },
  shulchan: { banks: ['kitzur'], maxLen: 360 },
}

interface Shown {
  label: string
  source: string
  body: string
}

/** A dvar Torah from the chosen categories. It changes once every two full rounds of the board, not on every appearance. */
export default function TextScreen({ round, now }: { round: number; now: Date }) {
  const { settings } = useSettings()
  const cats = settings.textCategories.length ? settings.textCategories : Object.keys(CATEGORY_LABELS)
  const bankNames = [...new Set(cats.flatMap((c) => BANK_FOR[c]?.banks ?? []))]
  const banks = useBanks(bankNames)

  const pool = useMemo<Shown[]>(() => {
    const out: Shown[] = []
    for (const c of cats) {
      const spec = BANK_FOR[c]
      if (spec) {
        if (!banks) continue
        // Up to 300 per category, so one huge book doesn't crowd out the rest.
        for (const b of spec.banks) {
          const list = (banks[b] ?? []).filter((x) => !spec.maxLen || x.t.length <= spec.maxLen)
          const step = Math.max(1, Math.floor(list.length / 300))
          for (let i = 0; i < list.length; i += step) out.push({ label: CATEGORY_LABELS[c], source: list[i].s, body: list[i].t })
        }
      } else {
        for (const t of TEXTS.filter((x) => x.category === c)) out.push({ label: t.categoryLabel, source: t.source, body: t.body })
      }
    }
    return out.length ? out : TEXTS.map((t) => ({ label: t.categoryLabel, source: t.source, body: t.body }))
  }, [cats.join(','), banks]) // eslint-disable-line react-hooks/exhaustive-deps

  const text = pick(pool, round, now, 2, 7)
  if (!text) return null
  const size = text.body.length > 380 ? 'tx-s' : text.body.length > 220 ? 'tx-m' : ''

  return (
    <div className="screen fade-screen text-screen">
      <div className="text-card glass">
        <div className="text-cat">{text.label}</div>
        <div className={`text-body ${size}`} key={text.source}>
          {text.body}
        </div>
        <div className="text-source">{text.source}</div>
        <div className="text-ornament" aria-hidden="true" />
      </div>
    </div>
  )
}
