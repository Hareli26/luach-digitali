// Temple Mount / Even HaShtiya coordinates
export const JERUSALEM = { lat: 31.778015, lng: 35.235413 }

const toRad = (d: number) => (d * Math.PI) / 180
const toDeg = (r: number) => (r * 180) / Math.PI

/** Initial great-circle bearing (degrees, 0 = true north) from a point to Jerusalem */
export function bearingToJerusalem(lat: number, lng: number): number {
  const φ1 = toRad(lat)
  const φ2 = toRad(JERUSALEM.lat)
  const Δλ = toRad(JERUSALEM.lng - lng)
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  const θ = Math.atan2(y, x)
  return (toDeg(θ) + 360) % 360
}

/** Great-circle distance in km */
export function distanceToJerusalem(lat: number, lng: number): number {
  const R = 6371
  const φ1 = toRad(lat)
  const φ2 = toRad(JERUSALEM.lat)
  const Δφ = toRad(JERUSALEM.lat - lat)
  const Δλ = toRad(JERUSALEM.lng - lng)
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function compassLabel(bearing: number): string {
  const dirs = ['צפון', 'צפון-מזרח', 'מזרח', 'דרום-מזרח', 'דרום', 'דרום-מערב', 'מערב', 'צפון-מערב']
  return dirs[Math.round(bearing / 45) % 8]
}
