import { useEffect, useState } from 'react'

/**
 * Fetches Hebrew source text from Sefaria (public domain editions) and caches it,
 * so the board keeps showing today's text when the network drops. Never required for core function.
 */
const PREFIX = 'luach-sefaria:'

function stripHtml(s: string): string {
  return s
    .replace(/<sup[^>]*>.*?<\/sup>/g, '')
    .replace(/<i class="footnote">.*?<\/i>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function flatten(x: unknown): string[] {
  if (typeof x === 'string') return [stripHtml(x)].filter(Boolean)
  if (Array.isArray(x)) return x.flatMap(flatten)
  return []
}

function readCache(ref: string): string[] | null {
  try {
    const raw = localStorage.getItem(PREFIX + ref)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeCache(ref: string, val: string[]) {
  try {
    // Keep the cache small: drop old entries first.
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(PREFIX))
    if (keys.length > 40) keys.slice(0, keys.length - 40).forEach((k) => localStorage.removeItem(k))
    localStorage.setItem(PREFIX + ref, JSON.stringify(val))
  } catch {
    /* storage full — still fine */
  }
}

export async function fetchSefaria(ref: string): Promise<string[]> {
  const cached = readCache(ref)
  if (cached) return cached
  const url = `https://www.sefaria.org/api/v3/texts/${encodeURIComponent(ref)}?version=hebrew&return_format=text_only`
  const res = await fetch(url)
  if (!res.ok) throw new Error(String(res.status))
  const data = await res.json()
  const text = flatten(data?.versions?.[0]?.text)
  if (text.length) writeCache(ref, text)
  return text
}

export function useSefaria(ref: string | undefined, enabled: boolean): { text: string[] | null; state: 'idle' | 'loading' | 'ok' | 'error' } {
  const [state, setState] = useState<{ text: string[] | null; state: 'idle' | 'loading' | 'ok' | 'error' }>(() => {
    const c = ref ? readCache(ref) : null
    return c ? { text: c, state: 'ok' } : { text: null, state: 'idle' }
  })
  useEffect(() => {
    if (!ref || !enabled) return
    let alive = true
    const c = readCache(ref)
    if (c) {
      setState({ text: c, state: 'ok' })
      return
    }
    setState({ text: null, state: 'loading' })
    fetchSefaria(ref)
      .then((t) => alive && setState({ text: t, state: t.length ? 'ok' : 'error' }))
      .catch(() => alive && setState({ text: null, state: 'error' }))
    return () => {
      alive = false
    }
  }, [ref, enabled])
  return state
}
