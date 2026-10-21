import type { Attendance, Category, DataSet, Worker } from './types'

export interface Summary {
  income: number
  material: number
  konsumsi: number
  lainnya: number
  wagesPaid: number
  expense: number
  balance: number
  wagesOwed: number
  workDays: number
  lastActivity: string | null
}

export function summarize(data: DataSet): Summary {
  const sum = (xs: { amount: number }[]) => xs.reduce((a, x) => a + x.amount, 0)
  const byCat = (c: Category) => sum(data.expenses.filter((e) => e.category === c))
  const income = sum(data.incomes)
  const material = byCat('material')
  const konsumsi = byCat('konsumsi')
  const lainnya = byCat('lainnya')
  const wagesPaid = sum(data.payments)
  const expense = material + konsumsi + lainnya + wagesPaid
  const wagesOwed = sum(data.attendance.filter((a) => !a.payment_id))
  const workDays = data.attendance.reduce((a, x) => a + x.portion, 0)
  const stamps = [
    ...data.incomes, ...data.expenses, ...data.attendance, ...data.payments,
  ].map((x) => x.created_at)
  const lastActivity = stamps.length ? stamps.reduce((a, b) => (a > b ? a : b)) : null
  return { income, material, konsumsi, lainnya, wagesPaid, expense, balance: income - expense, wagesOwed, workDays, lastActivity }
}

export interface WorkerStat {
  worker: Worker
  days: number
  earned: number
  paid: number
  owed: number
  unpaid: Attendance[]
  records: Attendance[]
  lastDate: string | null
}

export function workerStats(data: DataSet): WorkerStat[] {
  return data.workers
    .map((worker) => {
      const records = data.attendance
        .filter((a) => a.worker_id === worker.id)
        .sort((a, b) => a.date.localeCompare(b.date))
      const unpaid = records.filter((a) => !a.payment_id)
      const earned = records.reduce((s, a) => s + a.amount, 0)
      const paid = data.payments.filter((p) => p.worker_id === worker.id).reduce((s, p) => s + p.amount, 0)
      const owed = unpaid.reduce((s, a) => s + a.amount, 0)
      return {
        worker,
        days: records.reduce((s, a) => s + a.portion, 0),
        earned,
        paid,
        owed,
        unpaid,
        records,
        lastDate: records.length ? records[records.length - 1].date : null,
      }
    })
    .sort((a, b) => b.owed - a.owed || (b.lastDate ?? '').localeCompare(a.lastDate ?? '') || a.worker.name.localeCompare(b.worker.name))
}

export type EntryKind = 'income' | Category | 'upah'

export interface LedgerEntry {
  key: string
  id: string
  kind: EntryKind
  date: string
  title: string
  subtitle: string
  /** positif = uang masuk, negatif = uang keluar */
  amount: number
  created_at: string
  receipt_url?: string | null
  note: string
}

export function ledger(data: DataSet): LedgerEntry[] {
  const workerName = new Map(data.workers.map((w) => [w.id, w.name]))
  const entries: LedgerEntry[] = []

  for (const i of data.incomes) {
    entries.push({
      key: `i-${i.id}`, id: i.id, kind: 'income', date: i.date, title: i.source,
      subtitle: 'Dana masuk', amount: i.amount, created_at: i.created_at, note: i.note,
    })
  }
  for (const e of data.expenses) {
    const qty = e.unit ? `${formatQty(e.qty)} ${e.unit}` : e.qty !== 1 ? `${formatQty(e.qty)}x` : ''
    const each = e.unit_price && e.qty !== 1 ? ` × Rp ${e.unit_price.toLocaleString('id-ID')}` : ''
    entries.push({
      key: `e-${e.id}`, id: e.id, kind: e.category, date: e.date, title: e.item,
      subtitle: [CATEGORY_LABEL[e.category], qty && `${qty}${each}`].filter(Boolean).join(' · '),
      amount: -e.amount, created_at: e.created_at, receipt_url: e.receipt_url, note: e.note,
    })
  }
  for (const p of data.payments) {
    const covered = data.attendance.filter((a) => a.payment_id === p.id)
    const dayCount = covered.reduce((s, a) => s + a.portion, 0)
    entries.push({
      key: `p-${p.id}`, id: p.id, kind: 'upah', date: p.date,
      title: `Upah ${workerName.get(p.worker_id) ?? 'pekerja'}`,
      subtitle: dayCount ? `Bayar upah · ${formatQty(dayCount)} hari kerja` : 'Bayar upah',
      amount: -p.amount, created_at: p.created_at, note: p.note,
    })
  }
  return entries.sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))
}

export function formatQty(n: number) {
  return n.toLocaleString('id-ID', { maximumFractionDigits: 2 })
}

export function groupByDate<T extends { date: string }>(items: T[]): [string, T[]][] {
  const map = new Map<string, T[]>()
  for (const it of items) {
    const list = map.get(it.date)
    if (list) list.push(it)
    else map.set(it.date, [it])
  }
  return [...map.entries()]
}

export const CATEGORY_LABEL: Record<EntryKind, string> = {
  income: 'Dana Masuk',
  material: 'Material',
  konsumsi: 'Konsumsi',
  lainnya: 'Lain-lain',
  upah: 'Upah Pekerja',
}

/** Kehadiran per tanggal: [tanggal, daftar kehadiran] terbaru dulu */
export function attendanceByDate(data: DataSet): [string, Attendance[]][] {
  const sorted = [...data.attendance].sort((a, b) => b.date.localeCompare(a.date))
  return groupByDate(sorted)
}
