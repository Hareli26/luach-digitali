/** Direction of prayer relative to someone facing the screen (see Settings.prayerArrow). */
export const ARROW_LABELS: Record<number, string> = {
  0: 'קדימה, מעבר למסך',
  45: 'קדימה וימינה',
  90: 'ימינה',
  135: 'אחורה וימינה',
  180: 'אחורה, מאחוריכם',
  225: 'אחורה ושמאלה',
  270: 'שמאלה',
  315: 'קדימה ושמאלה',
}

/** An arrow pointing up (= ahead), turned clockwise by `angle`. */
export function PrayerArrow({ angle, className }: { angle: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <g transform={`rotate(${angle} 50 50)`}>
        <path d="M50 6 L84 46 H62 V94 H38 V46 H16 Z" fill="currentColor" />
      </g>
    </svg>
  )
}
