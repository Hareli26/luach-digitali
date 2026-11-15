/**
 * Builds the offline text bank (src/data/bank/*.json) from Sefaria.
 * Run once (needs network):  node scripts/build-bank.mjs
 * Every item keeps its exact source reference; nothing is paraphrased.
 */
import { writeFile, mkdir } from 'node:fs/promises'

const OUT = new URL('../src/data/bank/', import.meta.url)
const API = 'https://www.sefaria.org/api'

async function get(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(20000) })
      if (r.ok) return await r.json()
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 800 * (i + 1)))
  }
  throw new Error('failed ' + url)
}

const text = async (ref) => {
  const j = await get(`${API}/v3/texts/${encodeURIComponent(ref)}?version=hebrew&return_format=text_only`)
  const v = j.versions?.[0]
  return { text: v?.text, license: v?.license, version: v?.versionTitle }
}

function clean(s) {
  return String(s)
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const HEB = 'אבגדהוזחטיכלמנסעפצקרשת'
function gem(n) {
  const ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט']
  const tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ']
  if (n % 100 === 15) return (n >= 100 ? 'ק'.repeat(Math.floor(n / 100)) : '') + 'טו'
  if (n % 100 === 16) return (n >= 100 ? 'ק'.repeat(Math.floor(n / 100)) : '') + 'טז'
  const h = ['', 'ק', 'ר', 'ש', 'ת', 'תק', 'תר', 'תש', 'תת'][Math.floor(n / 100)] ?? ''
  return h + tens[Math.floor((n % 100) / 10)] + ones[n % 10]
}
void HEB

/** Keeps every k-th item so a large book is sampled evenly, capped at `max`. */
function spread(items, max) {
  if (items.length <= max) return items
  const step = items.length / max
  return Array.from({ length: max }, (_, i) => items[Math.floor(i * step)])
}

const licenses = {}

async function likuteiEtzot() {
  const idx = await get(`${API}/v2/index/Likutei_Etzot`)
  const out = []
  for (const node of idx.schema.nodes) {
    if (!node.title || node.title.startsWith('Introduction')) continue
    let t, license, version
    try {
      ;({ text: t, license, version } = await text(`Likutei Etzot, ${node.title}`))
    } catch {
      process.stdout.write('x')
      continue
    }
    licenses.etzot = `${version} (${license})`
    ;(t || []).forEach((raw, i) => {
      let s = clean(raw)
      // first paragraph starts with the topic heading; every paragraph with its letter: "א. "
      if (i === 0) s = s.replace(/^.{0,40}?\s(?=[א-ת]{1,2}\.\s)/, '')
      s = s.replace(/^[א-ת]{1,3}\.\s+/, '')
      // trailing source in parentheses, e.g. (לק"א סי' ז' אות א')
      const m = s.match(/\s*\(([^()]{3,60})\)[:.]?\s*$/)
      const r = m ? m[1] : ''
      if (m) s = s.slice(0, m.index).replace(/[:]$/, '') + '.'
      if (s.length >= 40 && s.length <= 340) out.push({ s: `ליקוטי עצות, ${node.heTitle} ${gem(i + 1)}`, r, t: s })
    })
    process.stdout.write('.')
  }
  return out
}

async function seferHaMiddot() {
  const idx = await get(`${API}/v2/index/Sefer_HaMiddot`)
  const out = []
  for (const node of idx.schema.nodes) {
    if (!node.nodes) continue
    for (const part of node.nodes) {
      const { text: t, license, version } = await text(`Sefer HaMiddot, ${node.title}, ${part.title}`)
      licenses.midot = `${version} (${license})`
      ;(t || []).forEach((raw, i) => {
        const s = clean(raw).replace(/^[א-ת]{1,3}\.\s+/, '')
        if (s.length >= 25 && s.length <= 280) out.push({ s: `ספר המידות, ${node.heTitle} ${part.heTitle ? part.heTitle + ' ' : ''}${gem(i + 1)}`, t: s })
      })
    }
    process.stdout.write('.')
  }
  return out
}

async function sichotHaRan() {
  const { text: t, license, version } = await text('Sichot HaRan')
  licenses.sichot = `${version} (${license})`
  const out = []
  ;(t || []).forEach((siman, i) => {
    const s = clean((siman || []).join(' '))
    if (s.length >= 60 && s.length <= 520) out.push({ s: `שיחות הר״ן ${gem(i + 1)}`, t: s })
  })
  return out
}

/** Whole Kitzur: kept fully (by siman) so seasonal halachot can be chosen by siman. */
async function kitzur() {
  const { text: t, license, version } = await text('Kitzur Shulchan Arukh')
  licenses.kitzur = `${version} (${license})`
  const out = []
  ;(t || []).forEach((siman, si) =>
    (siman || []).forEach((raw, i) => {
      const s = clean(raw)
      if (s.length >= 40 && s.length <= 650) out.push({ n: si + 1, s: `קיצור שולחן ערוך ${gem(si + 1)}, ${gem(i + 1)}`, t: s })
    }),
  )
  return out
}

async function shulchanAruch() {
  // Simple two-level book: one request for all of Orach Chayim.
  const { text: t, license, version } = await text('Shulchan Arukh, Orach Chayim')
  licenses.sa = `${version} (${license})`
  const out = []
  ;(t || []).forEach((siman, si) =>
    (siman || []).forEach((raw, i) => {
      const s = clean(raw)
      if (s.length >= 40 && s.length <= 300) out.push({ n: si + 1, s: `שולחן ערוך אורח חיים ${gem(si + 1)}, ${gem(i + 1)}`, t: s })
    }),
  )
  return out
}

async function benIshChai() {
  const idx = await get(`${API}/v2/index/Ben_Ish_Hai`)
  const out = []
  for (const year of idx.schema.nodes.filter((n) => n.title?.startsWith('Halachot'))) {
    for (const parsha of year.nodes || []) {
      let t
      try {
        ;({ text: t } = await text(`Ben Ish Hai, ${year.title}, ${parsha.title}`))
      } catch {
        continue
      }
      ;(t || []).flat(Infinity).forEach((raw, i) => {
        const s = clean(raw)
        if (s.length >= 60 && s.length <= 450) out.push({ s: `בן איש חי, ${year.heTitle}, ${parsha.heTitle} ${gem(i + 1)}`, t: s })
      })
    }
    process.stdout.write('.')
  }
  licenses.bih = 'Ben Ish Hai (Sefaria)'
  return out
}

async function chapters(book, heBook, maxLen, count) {
  const out = []
  for (let c = 1; c <= count; c++) {
    let t
    try {
      ;({ text: t } = await text(`${book} ${c}`))
    } catch {
      break
    }
    if (!t) break
    ;(Array.isArray(t) ? t.flat(Infinity) : [t]).forEach((raw, i) => {
      const s = clean(raw)
      if (s.length >= 50 && s.length <= maxLen) out.push({ s: `${heBook} ${gem(c)}, ${gem(i + 1)}`, t: s })
    })
  }
  return out
}

async function avot() {
  const { text: t } = await text('Pirkei Avot')
  const out = []
  ;(t || []).forEach((perek, p) =>
    (perek || []).forEach((raw, i) => {
      const s = clean(raw)
      if (s.length <= 520) out.push({ s: `פרקי אבות ${gem(p + 1)}, ${gem(i + 1)}`, t: s })
    }),
  )
  return out
}

await mkdir(OUT, { recursive: true })
const jobs = {
  'breslov-etzot': [likuteiEtzot, 2500],
  'breslov-midot': [seferHaMiddot, 2500],
  'breslov-sichot': [sichotHaRan, 400],
  kitzur: [kitzur, 99999],
  'shulchan-aruch': [shulchanAruch, 1500],
  'mesilat-yesharim': [() => chapters('Mesilat Yesharim', 'מסילת ישרים', 380, 26), 500],
  avot: [avot, 200],
}
const only = process.argv.slice(2)
for (const [name, [fn, max]] of Object.entries(jobs)) {
  if (only.length && !only.includes(name)) continue
  process.stdout.write(`${name} `)
  try {
    const items = spread(await fn(), max)
    await writeFile(new URL(`${name}.json`, OUT), JSON.stringify(items))
    console.log(` ${items.length}`)
  } catch (e) {
    console.log(' FAILED', e.message)
  }
}
console.log(licenses)
