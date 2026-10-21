const rupiahFmt = new Intl.NumberFormat('id-ID')

export function rupiah(n: number): string {
  const sign = n < 0 ? '-' : ''
  return `${sign}Rp ${rupiahFmt.format(Math.abs(Math.round(n)))}`
}

/** "1,5 jt", "250 rb" — untuk angka ringkas di grafik */
export function rupiahShort(n: number): string {
  const a = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (a >= 1_000_000_000) return `${sign}${trim(a / 1_000_000_000)} M`
  if (a >= 1_000_000) return `${sign}${trim(a / 1_000_000)} jt`
  if (a >= 1_000) return `${sign}${trim(a / 1_000)} rb`
  return `${sign}${a}`
}

function trim(n: number) {
  return n.toLocaleString('id-ID', { maximumFractionDigits: 1 })
}

export function num(n: number): string {
  return n.toLocaleString('id-ID', { maximumFractionDigits: 2 })
}

export function days(portion: number): string {
  return `${num(portion)} hari`
}

/** Tanggal lokal dalam format YYYY-MM-DD */
export function isoDate(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function today(): string {
  return isoDate()
}

export function shiftDate(date: string, delta: number): string {
  const d = parseDate(date)
  d.setDate(d.getDate() + delta)
  return isoDate(d)
}

export function parseDate(date: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const longFmt = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const shortFmt = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' })
const monthFmt = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' })

export function dateLong(date: string): string {
  return longFmt.format(parseDate(date))
}

export function dateShort(date: string): string {
  return shortFmt.format(parseDate(date))
}

/** "Hari ini", "Kemarin", atau tanggal lengkap */
export function dateFriendly(date: string): string {
  if (date === today()) return 'Hari ini'
  if (date === shiftDate(today(), -1)) return 'Kemarin'
  return dateLong(date)
}

export function monthLabel(month: string): string {
  return monthFmt.format(parseDate(`${month}-01`))
}

export function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'baru saja'
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} hari lalu`
  return dateLong(isoDate(new Date(iso)))
}

/** Ambil angka dari teks yang diketik ("150.000" -> 150000) */
export function parseMoney(text: string): number {
  const digits = text.replace(/[^0-9]/g, '')
  return digits ? Number(digits) : 0
}
