import { useEffect, useState } from 'react'
import { HDate } from '@hebcal/core'
import type { Settings } from '../types'
import { halachicDate } from './zmanim'

/**
 * The offline text bank (src/data/bank, built from Sefaria by scripts/build-bank.mjs).
 * Every item is quoted exactly, with its source. Files are loaded only when a screen needs them.
 */
export interface BankItem {
  /** source, e.g. "ליקוטי עצות, אמונה ג" */
  s: string
  /** where the author drew it from, when given (Likutei Etzot) */
  r?: string
  t: string
  /** siman number (Kitzur / Shulchan Aruch) */
  n?: number
}

export type BankName = 'breslov-etzot' | 'breslov-midot' | 'breslov-sichot' | 'kitzur' | 'shulchan-aruch' | 'mesilat-yesharim' | 'avot'

const loaders: Record<BankName, () => Promise<{ default: BankItem[] }>> = {
  'breslov-etzot': () => import('../data/bank/breslov-etzot.json') as any,
  'breslov-midot': () => import('../data/bank/breslov-midot.json') as any,
  'breslov-sichot': () => import('../data/bank/breslov-sichot.json') as any,
  kitzur: () => import('../data/bank/kitzur.json') as any,
  'shulchan-aruch': () => import('../data/bank/shulchan-aruch.json') as any,
  'mesilat-yesharim': () => import('../data/bank/mesilat-yesharim.json') as any,
  avot: () => import('../data/bank/avot.json') as any,
}

const cache = new Map<BankName, BankItem[]>()

export async function loadBank(name: BankName): Promise<BankItem[]> {
  const hit = cache.get(name)
  if (hit) return hit
  try {
    const items = (await loaders[name]()).default
    cache.set(name, items)
    return items
  } catch {
    return []
  }
}

export function useBanks(names: BankName[]): Record<string, BankItem[]> | null {
  const key = names.join(',')
  const [data, setData] = useState<Record<string, BankItem[]> | null>(() =>
    names.every((n) => cache.has(n)) ? Object.fromEntries(names.map((n) => [n, cache.get(n)!])) : null,
  )
  useEffect(() => {
    let alive = true
    Promise.all(names.map(loadBank)).then((lists) => alive && setData(Object.fromEntries(names.map((n, i) => [n, lists[i]]))))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return data
}

/**
 * Which item to show: changes once every `every` full rotations of the board,
 * and starts from a different place each day so the same text doesn't open every morning.
 */
export function pick<T>(list: T[], round: number, now: Date, every = 2, salt = 0): T | null {
  if (!list.length) return null
  const day = Math.floor(now.getTime() / 86400000)
  const step = Math.floor(round / Math.max(1, every))
  // A large odd stride walks through the whole list without obvious neighbours.
  const i = (day * 7919 + step * 104729 + salt * 31) % list.length
  return list[(i + list.length) % list.length]
}

/* ------------------------------------------------------- halacha of the season */

export interface Season {
  key: string
  title: string
  simanim: number[]
}

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i)

/**
 * "הלכה בעיתה" — which chapters of Kitzur Shulchan Aruch fit right now:
 * the coming festival, the season of the year, or Shabbat at the end of the week.
 */
export function seasonFor(s: Settings, now = new Date()): Season {
  const hd = new HDate(halachicDate(s, now, 'shkia'))
  const m = hd.getMonth()
  const d = hd.getDate()
  const dow = hd.getDay()
  const adar = hd.isLeapYear() ? 13 : 12

  if ((m === 9 && d >= 15) || (m === 10 && d <= 2)) return { key: 'chanukah', title: 'הלכות חנוכה', simanim: [139] }
  if (m === adar && d <= 15) return { key: 'purim', title: 'הלכות פורים וארבע פרשיות', simanim: [140, 141, 142] }
  if ((m === adar && d > 15) || (m === 1 && d <= 22)) return { key: 'pesach', title: 'הלכות פסח', simanim: range(107, 119) }
  if ((m === 4 && d >= 17) || (m === 5 && d <= 9)) return { key: 'bein', title: 'הלכות בין המצרים', simanim: range(121, 126) }
  if (m === 6) return { key: 'elul', title: 'הלכות חודש אלול', simanim: [127, 128] }
  if (m === 7 && d <= 10) return { key: 'yamim', title: 'הלכות הימים הנוראים', simanim: range(129, 133) }
  if (m === 7 && d <= 23) return { key: 'sukkot', title: 'הלכות סוכות', simanim: range(134, 138) }
  if ((m === 2) || (m === 1 && d > 22) || (m === 3 && d <= 5)) {
    if (dow >= 4) return { key: 'shabbat', title: 'הלכות שבת', simanim: [...range(72, 90), 96] }
    return { key: 'omer', title: 'ימי הספירה', simanim: [120] }
  }
  if (d >= 29 || d === 1 || d === 30) return { key: 'rc', title: 'הלכות ראש חודש', simanim: [97] }
  if (dow >= 4) return { key: 'shabbat', title: 'הלכות שבת', simanim: [...range(72, 90), 96] }
  return { key: 'general', title: 'הלכה יומית', simanim: [] }
}
