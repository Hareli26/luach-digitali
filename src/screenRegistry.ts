/**
 * Every screen the board can show. `code` is the KeyboardEvent.code that jumps straight to it,
 * so shortcuts work on a Hebrew or English keyboard layout alike.
 * `auto` screens appear only when they have something to show (season, data).
 */
export interface ScreenDef {
  key: string
  name: string
  code: string
  keyLabel: string
  seconds: number
  hint?: string
  /** background design used unless the gabbai picks another */
  decor?: string
}

export const SCREENS: ScreenDef[] = [
  { key: 'date', name: 'ענייני השבוע', code: 'Digit1', keyLabel: '1', seconds: 18, hint: 'פרשה, הפטרה, שבת, פרקי אבות', decor: 'arches' },
  { key: 'prayers', name: 'זמני תפילות', code: 'Digit2', keyLabel: '2', seconds: 20 },
  { key: 'diyoma', name: 'ענייני דיומא', code: 'Digit3', keyLabel: '3', seconds: 15, hint: 'תוספות בתפילה, ברכת השנים, תחנון' },
  { key: 'announcements', name: 'הודעות ואירועים', code: 'Digit4', keyLabel: '4', seconds: 15, decor: 'vines' },
  { key: 'zmanim', name: 'זמני היום', code: 'Digit5', keyLabel: '5', seconds: 20 },
  { key: 'halacha', name: 'הלכה יומית', code: 'Digit6', keyLabel: '6', seconds: 25 },
  { key: 'memorial', name: 'הזכרת נשמות', code: 'Digit7', keyLabel: '7', seconds: 18, hint: 'יארצייט היום, השבוע והחודש' },
  { key: 'images', name: 'תמונות', code: 'Digit8', keyLabel: '8', seconds: 10 },
  { key: 'mishna', name: 'משנה יומית', code: 'Digit9', keyLabel: '9', seconds: 25 },
  { key: 'shiurim', name: 'לוח שיעורים', code: 'Digit0', keyLabel: '0', seconds: 15 },
  { key: 'combined', name: 'מבט אחד', code: 'KeyQ', keyLabel: 'Q', seconds: 25, hint: 'הכול במסך אחד, ללובי' },
  { key: 'week', name: 'זמני השבוע', code: 'KeyW', keyLabel: 'W', seconds: 15 },
  { key: 'donors', name: 'תורמים', code: 'KeyE', keyLabel: 'E', seconds: 12 },
  { key: 'dedication', name: 'הקדשת הלוח', code: 'KeyR', keyLabel: 'R', seconds: 10, decor: 'frame' },
  { key: 'birthdays', name: 'ימי הולדת', code: 'KeyT', keyLabel: 'T', seconds: 10, hint: 'מופיע רק בשבוע של יום הולדת' },
  { key: 'holiday', name: 'תפילות חג', code: 'KeyY', keyLabel: 'Y', seconds: 20, hint: 'מופיע לפני חג שהוגדרו לו זמנים' },
  { key: 'omer', name: 'ספירת העומר', code: 'KeyU', keyLabel: 'U', seconds: 12, hint: 'בימי הספירה בלבד' },
  { key: 'learning', name: 'לימוד יומי', code: 'KeyI', keyLabel: 'I', seconds: 18 },
  { key: 'texts', name: 'דבר תורה', code: 'KeyO', keyLabel: 'O', seconds: 18, hint: 'מתחלף כל שני סבבים', decor: 'pomegranate' },
  { key: 'chanukah', name: 'חנוכה', code: 'KeyP', keyLabel: 'P', seconds: 15, hint: 'בימי חנוכה בלבד' },
  { key: 'fast', name: 'זמני הצום', code: 'KeyA', keyLabel: 'A', seconds: 15, hint: 'מ־3 ימים לפני צום' },
  { key: 'compass', name: 'כיוון לירושלים', code: 'KeyJ', keyLabel: 'J', seconds: 12 },
  { key: 'nachman', name: 'עצה מרבי נחמן', code: 'KeyN', keyLabel: 'N', seconds: 18, hint: 'ליקוטי עצות, ספר המידות, שיחות הר״ן', decor: 'stars' },
  { key: 'season', name: 'הלכה בעיתה', code: 'KeyK', keyLabel: 'K', seconds: 20, hint: 'הלכות שמתאימות לשבוע: שבת, חג, ראש חודש', decor: 'stone' },
  { key: 'dayarc', name: 'קשת היום', code: 'KeyD', keyLabel: 'D', seconds: 15, hint: 'מסלול השמש וכל הזמנים בקשת אחת' },
  { key: 'ahead', name: 'מה לפנינו', code: 'KeyM', keyLabel: 'M', seconds: 15, hint: 'ספירה לאחור לשבת וציר זמן של 45 יום' },
  { key: 'levana', name: 'קידוש לבנה', code: 'KeyL', keyLabel: 'L', seconds: 12, hint: 'בזמן קידוש לבנה בלבד', decor: 'stars' },
  { key: 'refua', name: 'רפואה שלמה', code: 'KeyZ', keyLabel: 'Z', seconds: 12 },
]

/** Background designs: drawn in the theme's gold, very faint, behind the content. */
export const DECORS: { value: string; label: string }[] = [
  { value: 'none', label: 'ללא' },
  { value: 'stars', label: 'שמי לילה' },
  { value: 'stone', label: 'אבן ירושלמית' },
  { value: 'arches', label: 'קשתות ירושלים' },
  { value: 'pomegranate', label: 'רימונים' },
  { value: 'lattice', label: 'מגן דוד משולב' },
  { value: 'tallit', label: 'פסי טלית' },
  { value: 'vines', label: 'גפן ועלים' },
  { value: 'waves', label: 'גלים' },
  { value: 'frame', label: 'מסגרת מעוטרת' },
]

export const SCREEN_BY_KEY: Record<string, ScreenDef> = Object.fromEntries(SCREENS.map((s) => [s.key, s]))
