import type { Attendance, DataSet, Expense, Income, WagePayment, Worker } from './types'
import { shiftDate, today } from './format'

/** Contoh data untuk mode demo, mundur 10 hari dari hari ini. */
export function demoSeed(): DataSet {
  const t = today()
  const d = (n: number) => shiftDate(t, -n)
  const ts = (n: number, h = 9) => new Date(`${d(n)}T${String(h).padStart(2, '0')}:00:00`).toISOString()
  let seq = 0
  const id = () => `demo-${++seq}`

  const workers: Worker[] = [
    { id: id(), name: 'Pak Darto', daily_wage: 120000, phone: '', active: true, created_at: ts(10) },
    { id: id(), name: 'Mang Udin', daily_wage: 100000, phone: '', active: true, created_at: ts(10) },
    { id: id(), name: 'Asep', daily_wage: 100000, phone: '', active: true, created_at: ts(8) },
    { id: id(), name: 'Jajang', daily_wage: 90000, phone: '', active: true, created_at: ts(3) },
  ]
  const [darto, udin, asep, jajang] = workers

  const incomes: Income[] = [
    { id: id(), date: d(10), source: 'Dana Desa', amount: 10000000, note: 'Termin pertama', created_at: ts(10, 8) },
    { id: id(), date: d(9), source: 'Swadaya Warga RT 02', amount: 1750000, note: '', created_at: ts(9, 16) },
    { id: id(), date: d(4), source: 'Donatur (Bpk. H. Rahmat)', amount: 2000000, note: '', created_at: ts(4, 10) },
  ]

  const exp = (n: number, category: Expense['category'], item: string, qty: number, unit: string, unit_price: number, note = ''): Expense => ({
    id: id(), date: d(n), category, item, qty, unit, unit_price, amount: Math.round(qty * unit_price), note, receipt_url: null, created_at: ts(n, 11),
  })
  const expenses: Expense[] = [
    exp(10, 'material', 'Semen 50 kg', 20, 'sak', 72000, 'Toko Bangunan Jaya'),
    exp(10, 'material', 'Pasir', 2, 'm³', 350000),
    exp(9, 'material', 'Besi beton 10 mm', 30, 'batang', 85000),
    exp(9, 'material', 'Kawat bendrat', 5, 'kg', 25000),
    exp(7, 'material', 'Papan kayu bekisting', 25, 'lembar', 45000),
    exp(4, 'material', 'Batu split', 1.5, 'm³', 400000),
    exp(10, 'konsumsi', 'Kopi & gula', 1, 'paket', 45000),
    exp(10, 'konsumsi', 'Rokok', 3, 'bungkus', 28000),
    exp(9, 'konsumsi', 'Snack', 1, 'paket', 35000),
    exp(7, 'konsumsi', 'Nasi bungkus', 4, 'porsi', 15000),
    exp(3, 'konsumsi', 'Rokok', 2, 'bungkus', 28000),
    exp(3, 'konsumsi', 'Air mineral', 2, 'dus', 22000),
    exp(1, 'konsumsi', 'Kopi & gula', 1, 'paket', 45000),
    exp(6, 'lainnya', 'Sewa molen (mesin aduk)', 2, 'hari', 150000),
  ]

  const attendance: Attendance[] = []
  const work = (w: Worker, n: number, portion = 1) =>
    attendance.push({
      id: id(), worker_id: w.id, date: d(n), portion, wage: w.daily_wage, amount: Math.round(portion * w.daily_wage),
      payment_id: null, note: '', created_at: ts(n, 17),
    })
  ;[9, 8, 7, 6, 4, 3, 1].forEach((n) => work(darto, n))
  ;[9, 8, 6, 3, 1].forEach((n) => work(udin, n))
  work(udin, 7, 0.5)
  ;[8, 7, 6, 4, 0].forEach((n) => work(asep, n))
  ;[1, 0].forEach((n) => work(jajang, n))

  const payments: WagePayment[] = []
  const pay = (w: Worker, n: number, upToDay: number) => {
    const rows = attendance.filter((a) => a.worker_id === w.id && !a.payment_id && a.date <= d(upToDay))
    const p: WagePayment = { id: id(), worker_id: w.id, date: d(n), amount: rows.reduce((s, a) => s + a.amount, 0), note: '', created_at: ts(n, 18) }
    rows.forEach((a) => { a.payment_id = p.id })
    payments.push(p)
  }
  pay(darto, 6, 7)
  pay(udin, 6, 7)
  pay(asep, 3, 4)

  return {
    settings: {
      project_name: 'Perbaikan Jembatan Cibeureum',
      location: 'Kampung Cibeureum, RT 02 / RW 05',
      description: 'Laporan keuangan terbuka untuk seluruh warga. Setiap rupiah yang masuk dan keluar dicatat di sini.',
      updated_at: ts(0, 8),
    },
    incomes, expenses, workers, attendance, payments,
  }
}
