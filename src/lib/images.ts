import { useEffect, useState } from 'react'

/** Pictures for the slideshow live in IndexedDB (localStorage is too small for images). */
const DB = 'luach-images'
const STORE = 'images'

export interface StoredImage {
  id: string
  name: string
  blob: Blob
  added: number
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const r = fn(db.transaction(STORE, mode).objectStore(STORE))
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}

const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

export async function listImages(): Promise<StoredImage[]> {
  try {
    const all = await tx<StoredImage[]>('readonly', (s) => s.getAll() as IDBRequest<StoredImage[]>)
    return all.sort((a, b) => a.added - b.added)
  } catch {
    return []
  }
}

/** Scales large photos down to 1920px so the store stays light. */
async function shrink(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, 1920 / Math.max(bmp.width, bmp.height))
    if (scale === 1 && file.size < 1_500_000) return file
    const c = document.createElement('canvas')
    c.width = Math.round(bmp.width * scale)
    c.height = Math.round(bmp.height * scale)
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
    return await new Promise((res) => c.toBlob((b) => res(b ?? file), 'image/jpeg', 0.88))
  } catch {
    return file
  }
}

export async function addImages(files: FileList | File[]): Promise<void> {
  for (const f of Array.from(files)) {
    if (!f.type.startsWith('image/')) continue
    const blob = await shrink(f)
    await tx('readwrite', (s) => s.put({ id: 'img' + Date.now() + Math.random().toString(36).slice(2, 6), name: f.name, blob, added: Date.now() }))
  }
  notify()
}

export async function removeImage(id: string): Promise<void> {
  await tx('readwrite', (s) => s.delete(id))
  notify()
}

/** Object URLs for the stored images, kept in sync with changes made in settings. */
export function useImages(): { id: string; name: string; url: string }[] {
  const [items, setItems] = useState<{ id: string; name: string; url: string }[]>([])
  useEffect(() => {
    let urls: string[] = []
    let alive = true
    const load = () =>
      listImages().then((list) => {
        if (!alive) return
        urls.forEach((u) => URL.revokeObjectURL(u))
        const next = list.map((i) => ({ id: i.id, name: i.name, url: URL.createObjectURL(i.blob) }))
        urls = next.map((n) => n.url)
        setItems(next)
      })
    load()
    listeners.add(load)
    return () => {
      alive = false
      listeners.delete(load)
      urls.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [])
  return items
}
