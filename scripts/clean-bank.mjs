/** Post-processing for the bank: drops topics unsuitable for a public screen and tidies sources. Run after build-bank. */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
const dir = new URL('../src/data/bank/', import.meta.url)
const strip = (s) => s.replace(/[֑-ׇ]/g, '')
// Topics that belong in a sefer, not on a wall screen in shul.
// Whole words only (with the usual one-letter prefixes), so "קריאת שמע" or "זרעים" are not caught.
const WORDS = ['בית הכסא', 'בית הכסה', 'תשמיש המטה', 'תשמיש', 'נדה', 'קרי', 'שכבת זרע', 'הוצאת זרע', 'צואה', 'מי רגלים', 'נקביו', 'ערוה', 'ערות', 'זונה', 'יבמה', 'פרוצה']
const EDGE = '[\\s,.;:"\'()\\[\\]]'
const UNSUITABLE = WORDS.map((w) => new RegExp(`(^|${EDGE})[ובלהמש]?${w}($|${EDGE})`))
let total = 0
for (const f of readdirSync(dir)) {
  if (!f.endsWith('.json')) continue
  const items = JSON.parse(readFileSync(new URL(f, dir), 'utf8'))
  const out = items
    .filter((x) => !UNSUITABLE.some((re) => re.test(strip(x.t))))
    .map((x) => {
      const t = x.t
        .replace(/^\[[א-ת]{1,3}\]\.?\s*/, '')
        .replace(/^\(?[א-ת]{1,3}\)\s+/, '')
        // a bare "(שם)" / "(שם אות ג)" pointing at the previous paragraph means nothing on its own
        .replace(/\s*:?\s*\((?:שם|שָׁם)[^()]{0,20}\)\s*[.:]?\s*$/, '.')
        .replace(/:\s*$/, '.')
      const r = x.r && !/^שם\b/.test(strip(x.r)) ? x.r : undefined
      return r ? { ...x, t, r } : (({ r: _r, ...rest }) => ({ ...rest, t }))(x)
    })
  writeFileSync(new URL(f, dir), JSON.stringify(out))
  console.log(f, items.length, '→', out.length)
  total += out.length
}
console.log('total', total)
