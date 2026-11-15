import { JewishCalendar, HebrewDateFormatter, YomiCalculator, YerushalmiYomiCalculator } from 'kosher-zmanim'

export interface LearningItem {
  key: string
  label: string
  value: string
  icon: string
}

export function getDailyLearning(date = new Date(), israel = true): LearningItem[] {
  const jc = new JewishCalendar(date)
  jc.setInIsrael(israel)
  const f = new HebrewDateFormatter()
  f.setHebrewFormat(true)

  const safe = (fn: () => string): string => {
    try {
      return fn() || '—'
    } catch {
      return '—'
    }
  }

  const items: LearningItem[] = [
    { key: 'bavli', label: 'דף יומי בבלי', icon: '📖', value: safe(() => f.formatDafYomiBavli(YomiCalculator.getDafYomiBavli(jc))) },
    { key: 'yeru', label: 'דף יומי ירושלמי', icon: '📜', value: safe(() => f.formatDafYomiYerushalmi(YerushalmiYomiCalculator.getDafYomiYerushalmi(jc))) },
  ]
  return items
}

/** Molad of the current Jewish month (for Shabbat Mevarchim) */
export function getMolad(date = new Date()): string {
  try {
    const jc = new JewishCalendar(date)
    const m: any = jc.getMolad()
    const h = m.getMoladHours()
    const min = m.getMoladMinutes()
    const chalakim = m.getMoladChalakim()
    return `${h} שעות, ${min} דקות ו-${chalakim} חלקים`
  } catch {
    return ''
  }
}
