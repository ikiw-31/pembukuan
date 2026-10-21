import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type {
  AttendanceEntry, DataSet, ExpenseInput, IncomeInput, Settings, WorkerInput,
} from './types'
import { demoSeed } from './demoSeed'

export interface Session {
  email: string
}

export interface Store {
  mode: 'supabase' | 'demo'
  load(): Promise<DataSet>
  getSession(): Promise<Session | null>
  onAuthChange(cb: (s: Session | null) => void): () => void
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
  saveSettings(s: Omit<Settings, 'updated_at'>): Promise<void>
  saveIncome(i: IncomeInput): Promise<void>
  deleteIncome(id: string): Promise<void>
  saveExpense(e: ExpenseInput): Promise<void>
  deleteExpense(id: string): Promise<void>
  saveWorker(w: WorkerInput): Promise<string>
  deleteWorker(id: string): Promise<void>
  /** Simpan kehadiran satu tanggal. Hari yang belum dibayar & tidak ada di daftar akan dihapus. */
  saveAttendanceDay(date: string, entries: AttendanceEntry[]): Promise<void>
  payWorker(workerId: string, date: string, attendanceIds: string[], note: string): Promise<void>
  deletePayment(id: string): Promise<void>
  uploadReceipt(file: Blob): Promise<string>
}

export class StoreError extends Error {}

/* ------------------------------------------------------------------ */
/* Supabase                                                            */
/* ------------------------------------------------------------------ */

function friendlyError(err: { message?: string; code?: string } | null): never {
  const msg = err?.message ?? 'Terjadi kesalahan'
  if (/Invalid login credentials/i.test(msg)) throw new StoreError('Email atau kata sandi salah.')
  if (/row-level security|permission denied|Tidak punya izin/i.test(msg))
    throw new StoreError('Akun ini belum diizinkan mengubah data.')
  if (/Failed to fetch|NetworkError|network/i.test(msg))
    throw new StoreError('Tidak ada sinyal internet. Coba lagi sebentar.')
  if (/violates foreign key|attendance_worker_id_fkey|wage_payments_worker_id_fkey/i.test(msg))
    throw new StoreError('Pekerja ini sudah punya catatan kerja/pembayaran, jadi tidak bisa dihapus. Nonaktifkan saja.')
  throw new StoreError(msg)
}

class SupabaseStore implements Store {
  mode = 'supabase' as const
  private sb: SupabaseClient

  constructor(url: string, key: string) {
    this.sb = createClient(url, key)
  }

  private async all<T>(table: string, order: string): Promise<T[]> {
    const page = 1000
    const out: T[] = []
    for (let from = 0; ; from += page) {
      const { data, error } = await this.sb.from(table).select('*').order(order).order('id').range(from, from + page - 1)
      if (error) friendlyError(error)
      out.push(...(data as T[]))
      if (!data || data.length < page) return out
    }
  }

  async load(): Promise<DataSet> {
    const [settingsRes, incomes, expenses, workers, attendance, payments] = await Promise.all([
      this.sb.from('settings').select('*').eq('id', 1).maybeSingle(),
      this.all<DataSet['incomes'][number]>('incomes', 'date'),
      this.all<DataSet['expenses'][number]>('expenses', 'date'),
      this.all<DataSet['workers'][number]>('workers', 'name'),
      this.all<DataSet['attendance'][number]>('attendance', 'date'),
      this.all<DataSet['payments'][number]>('wage_payments', 'date'),
    ])
    if (settingsRes.error) friendlyError(settingsRes.error)
    const settings: Settings = settingsRes.data ?? {
      project_name: 'Perbaikan Jembatan', location: '', description: '', updated_at: new Date().toISOString(),
    }
    // Kolom numeric dari Postgres bisa datang sebagai string
    const n = (x: unknown) => Number(x)
    return {
      settings,
      incomes: incomes.map((i) => ({ ...i, amount: n(i.amount) })),
      expenses: expenses.map((e) => ({ ...e, qty: n(e.qty), unit_price: n(e.unit_price), amount: n(e.amount) })),
      workers: workers.map((w) => ({ ...w, daily_wage: n(w.daily_wage) })),
      attendance: attendance.map((a) => ({ ...a, portion: n(a.portion), wage: n(a.wage), amount: n(a.amount) })),
      payments: payments.map((p) => ({ ...p, amount: n(p.amount) })),
    }
  }

  async getSession() {
    const { data } = await this.sb.auth.getSession()
    return data.session?.user.email ? { email: data.session.user.email } : null
  }

  onAuthChange(cb: (s: Session | null) => void) {
    const { data } = this.sb.auth.onAuthStateChange((_e, session) => {
      cb(session?.user.email ? { email: session.user.email } : null)
    })
    return () => data.subscription.unsubscribe()
  }

  async signIn(email: string, password: string) {
    const { error } = await this.sb.auth.signInWithPassword({ email: email.trim(), password })
    if (error) friendlyError(error)
  }

  async signOut() {
    await this.sb.auth.signOut()
  }

  private async run(p: PromiseLike<{ error: { message: string } | null }>) {
    const { error } = await p
    if (error) friendlyError(error)
  }

  saveSettings(s: Omit<Settings, 'updated_at'>) {
    return this.run(this.sb.from('settings').upsert({ id: 1, ...s, updated_at: new Date().toISOString() }))
  }

  saveIncome({ id, ...rest }: IncomeInput) {
    return this.run(id ? this.sb.from('incomes').update(rest).eq('id', id) : this.sb.from('incomes').insert(rest))
  }

  deleteIncome(id: string) {
    return this.run(this.sb.from('incomes').delete().eq('id', id))
  }

  saveExpense({ id, ...rest }: ExpenseInput) {
    return this.run(id ? this.sb.from('expenses').update(rest).eq('id', id) : this.sb.from('expenses').insert(rest))
  }

  deleteExpense(id: string) {
    return this.run(this.sb.from('expenses').delete().eq('id', id))
  }

  async saveWorker({ id, ...rest }: WorkerInput) {
    if (id) {
      await this.run(this.sb.from('workers').update(rest).eq('id', id))
      return id
    }
    const { data, error } = await this.sb.from('workers').insert(rest).select('id').single()
    if (error) friendlyError(error)
    return data.id as string
  }

  deleteWorker(id: string) {
    return this.run(this.sb.from('workers').delete().eq('id', id))
  }

  async saveAttendanceDay(date: string, entries: AttendanceEntry[]) {
    const { data: existing, error } = await this.sb.from('attendance').select('id, worker_id, payment_id').eq('date', date)
    if (error) friendlyError(error)
    const paid = new Set(existing.filter((a) => a.payment_id).map((a) => a.worker_id))
    const keep = new Set(entries.map((e) => e.worker_id))
    const toDelete = existing.filter((a) => !a.payment_id && !keep.has(a.worker_id)).map((a) => a.id)
    const rows = entries
      .filter((e) => !paid.has(e.worker_id))
      .map((e) => ({ worker_id: e.worker_id, date, portion: e.portion, wage: e.wage, amount: Math.round(e.portion * e.wage) }))
    if (toDelete.length) await this.run(this.sb.from('attendance').delete().in('id', toDelete))
    if (rows.length) await this.run(this.sb.from('attendance').upsert(rows, { onConflict: 'worker_id,date' }))
  }

  async payWorker(workerId: string, date: string, attendanceIds: string[], note: string) {
    const { error } = await this.sb.rpc('pay_worker', {
      p_worker_id: workerId, p_date: date, p_attendance_ids: attendanceIds, p_note: note,
    })
    if (error) friendlyError(error)
  }

  deletePayment(id: string) {
    return this.run(this.sb.from('wage_payments').delete().eq('id', id))
  }

  async uploadReceipt(file: Blob) {
    const path = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.jpg`
    const { error } = await this.sb.storage.from('nota').upload(path, file, { contentType: 'image/jpeg' })
    if (error) friendlyError(error)
    return this.sb.storage.from('nota').getPublicUrl(path).data.publicUrl
  }
}

/* ------------------------------------------------------------------ */
/* Mode demo: data tersimpan di browser HP ini saja                    */
/* ------------------------------------------------------------------ */

const DEMO_KEY = 'kas-jembatan-demo-v1'
const DEMO_SESSION_KEY = 'kas-jembatan-demo-session'

function readLS(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}
function writeLS(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch { /* penyimpanan tidak tersedia */ }
}

class DemoStore implements Store {
  mode = 'demo' as const
  private data: DataSet
  private listeners = new Set<(s: Session | null) => void>()

  constructor() {
    const saved = readLS(DEMO_KEY)
    this.data = saved ? JSON.parse(saved) : demoSeed()
  }

  private commit() {
    writeLS(DEMO_KEY, JSON.stringify(this.data))
  }

  private stamp() {
    return { id: crypto.randomUUID(), created_at: new Date().toISOString() }
  }

  async load() {
    return structuredClone(this.data)
  }

  async getSession() {
    const email = readLS(DEMO_SESSION_KEY)
    return email ? { email } : null
  }

  onAuthChange(cb: (s: Session | null) => void) {
    this.listeners.add(cb)
    return () => { this.listeners.delete(cb) }
  }

  async signIn(email: string, password: string) {
    if (!email.trim() || !password) throw new StoreError('Isi email dan kata sandi.')
    writeLS(DEMO_SESSION_KEY, email.trim())
    this.listeners.forEach((cb) => cb({ email: email.trim() }))
  }

  async signOut() {
    writeLS(DEMO_SESSION_KEY, null)
    this.listeners.forEach((cb) => cb(null))
  }

  async saveSettings(s: Omit<Settings, 'updated_at'>) {
    this.data.settings = { ...s, updated_at: new Date().toISOString() }
    this.commit()
  }

  async saveIncome(i: IncomeInput) {
    const list = this.data.incomes
    const idx = i.id ? list.findIndex((x) => x.id === i.id) : -1
    if (idx >= 0) list[idx] = { ...list[idx], ...i, id: list[idx].id }
    else list.push({ ...i, ...this.stamp() })
    this.commit()
  }

  async deleteIncome(id: string) {
    this.data.incomes = this.data.incomes.filter((x) => x.id !== id)
    this.commit()
  }

  async saveExpense(e: ExpenseInput) {
    const list = this.data.expenses
    const idx = e.id ? list.findIndex((x) => x.id === e.id) : -1
    if (idx >= 0) list[idx] = { ...list[idx], ...e, id: list[idx].id }
    else list.push({ ...e, ...this.stamp() })
    this.commit()
  }

  async deleteExpense(id: string) {
    this.data.expenses = this.data.expenses.filter((x) => x.id !== id)
    this.commit()
  }

  async saveWorker(w: WorkerInput) {
    const list = this.data.workers
    const idx = w.id ? list.findIndex((x) => x.id === w.id) : -1
    let id: string
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...w, id: list[idx].id }
      id = list[idx].id
    } else {
      const s = this.stamp()
      list.push({ ...w, ...s })
      id = s.id
    }
    this.commit()
    return id
  }

  async deleteWorker(id: string) {
    if (this.data.attendance.some((a) => a.worker_id === id) || this.data.payments.some((p) => p.worker_id === id))
      throw new StoreError('Pekerja ini sudah punya catatan kerja/pembayaran, jadi tidak bisa dihapus. Nonaktifkan saja.')
    this.data.workers = this.data.workers.filter((x) => x.id !== id)
    this.commit()
  }

  async saveAttendanceDay(date: string, entries: AttendanceEntry[]) {
    const keep = new Map(entries.map((e) => [e.worker_id, e]))
    const next = this.data.attendance.filter((a) => a.date !== date || a.payment_id || keep.has(a.worker_id))
    for (const e of entries) {
      const amount = Math.round(e.portion * e.wage)
      const existing = next.find((a) => a.date === date && a.worker_id === e.worker_id)
      if (existing) {
        if (!existing.payment_id) Object.assign(existing, { portion: e.portion, wage: e.wage, amount })
      } else {
        next.push({ ...this.stamp(), worker_id: e.worker_id, date, portion: e.portion, wage: e.wage, amount, payment_id: null, note: '' })
      }
    }
    this.data.attendance = next
    this.commit()
  }

  async payWorker(workerId: string, date: string, attendanceIds: string[], note: string) {
    const rows = this.data.attendance.filter((a) => attendanceIds.includes(a.id) && a.worker_id === workerId && !a.payment_id)
    if (!rows.length || rows.length !== attendanceIds.length)
      throw new StoreError('Hari kerja yang dipilih tidak valid atau sudah dibayar.')
    const s = this.stamp()
    this.data.payments.push({ ...s, worker_id: workerId, date, amount: rows.reduce((t, a) => t + a.amount, 0), note })
    rows.forEach((a) => { a.payment_id = s.id })
    this.commit()
  }

  async deletePayment(id: string) {
    this.data.payments = this.data.payments.filter((p) => p.id !== id)
    this.data.attendance.forEach((a) => { if (a.payment_id === id) a.payment_id = null })
    this.commit()
  }

  async uploadReceipt(file: Blob) {
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve(r.result as string)
      r.onerror = () => reject(new StoreError('Gagal membaca foto.'))
      r.readAsDataURL(file)
    })
  }

  reset() {
    this.data = demoSeed()
    this.commit()
  }
}

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const store: Store = url && key ? new SupabaseStore(url, key) : new DemoStore()

export function resetDemo() {
  if (store instanceof DemoStore) store.reset()
}
