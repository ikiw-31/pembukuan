import { useMemo, useState, type ReactNode } from 'react'
import { CalendarDays, ChevronRight, HardHat, ImageIcon, Search, Users } from 'lucide-react'
import {
  CATEGORY_LABEL, attendanceByDate, formatQty, groupByDate, ledger,
  type EntryKind, type LedgerEntry, type Summary, type WorkerStat,
} from '../lib/calc'
import { dateFriendly, monthLabel, rupiah, rupiahShort } from '../lib/format'
import type { DataSet } from '../lib/types'
import { Empty, KIND_STYLE, KindIcon, Sheet, cx } from './ui'

/* ---------------- Komposisi pengeluaran ---------------- */

export function CompositionCard({ s }: { s: Summary }) {
  const parts: { kind: EntryKind; value: number }[] = [
    { kind: 'material', value: s.material },
    { kind: 'upah', value: s.wagesPaid },
    { kind: 'konsumsi', value: s.konsumsi },
    { kind: 'lainnya', value: s.lainnya },
  ]
  const total = s.expense || 1
  return (
    <section className="card p-5">
      <h2 className="font-bold">Uangnya dipakai untuk apa?</h2>
      <p className="text-sm text-slate-500">Total pengeluaran {rupiah(s.expense)}</p>
      <div className="mt-4 flex h-4 gap-1 overflow-hidden rounded-full bg-slate-100">
        {parts.filter((p) => p.value > 0).map((p) => (
          <div key={p.kind} className={cx('h-full rounded-full', KIND_STYLE[p.kind].bar)} style={{ width: `${(p.value / total) * 100}%` }} />
        ))}
      </div>
      <ul className="mt-4 space-y-3">
        {parts.map((p) => (
          <li key={p.kind} className="flex items-center gap-3">
            <KindIcon kind={p.kind} size="sm" />
            <span className="flex-1 text-[15px] font-medium">{CATEGORY_LABEL[p.kind]}</span>
            <span className="text-right">
              <span className="block font-semibold tabular">{rupiah(p.value)}</span>
              <span className="block text-xs text-slate-500 tabular">{s.expense ? Math.round((p.value / total) * 100) : 0}%</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ---------------- Daftar transaksi ---------------- */

type LedgerFilter = 'all' | EntryKind

export function LedgerBrowser({ data, onOpen, showSearch = true }: { data: DataSet; onOpen?: (e: LedgerEntry) => void; showSearch?: boolean }) {
  const all = useMemo(() => ledger(data), [data])
  const [filter, setFilter] = useState<LedgerFilter>('all')
  const [month, setMonth] = useState('all')
  const [q, setQ] = useState('')
  const [detail, setDetail] = useState<LedgerEntry | null>(null)

  const months = useMemo(() => [...new Set(all.map((e) => e.date.slice(0, 7)))], [all])
  const list = all.filter((e) =>
    (filter === 'all' || e.kind === filter) &&
    (month === 'all' || e.date.startsWith(month)) &&
    (!q || `${e.title} ${e.subtitle} ${e.note}`.toLowerCase().includes(q.toLowerCase())),
  )
  const totalIn = list.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0)
  const totalOut = list.filter((e) => e.amount < 0).reduce((s, e) => s - e.amount, 0)

  return (
    <div>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {(['all', 'income', 'material', 'konsumsi', 'upah', 'lainnya'] as LedgerFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cx(
              'h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition active:scale-95',
              filter === f ? 'bg-ink text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200',
            )}
          >
            {f === 'all' ? 'Semua' : CATEGORY_LABEL[f]}
          </button>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        {showSearch && (
          <div className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-2xl bg-white px-3 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-brand-500">
            <Search className="size-4 shrink-0 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari: semen, rokok…" className="h-full min-w-0 flex-1 bg-transparent outline-none" />
          </div>
        )}
        {months.length > 1 && (
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="h-11 shrink-0 rounded-2xl bg-white px-3 text-sm font-medium ring-1 ring-slate-200 outline-none"
          >
            <option value="all">Semua bulan</option>
            {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
        )}
      </div>

      {(filter !== 'all' || month !== 'all' || q) && list.length > 0 && (
        <div className="mt-3 flex gap-4 rounded-2xl bg-white/70 px-4 py-2.5 text-sm ring-1 ring-slate-200">
          {totalIn > 0 && <span>Masuk <b className="text-emerald-700 tabular">{rupiah(totalIn)}</b></span>}
          {totalOut > 0 && <span>Keluar <b className="text-rose-700 tabular">{rupiah(totalOut)}</b></span>}
          <span className="ml-auto text-slate-500">{list.length} catatan</span>
        </div>
      )}

      {list.length === 0 ? (
        <Empty icon={<Search className="size-7" />} title="Belum ada catatan" text="Coba ganti pilihan di atas." />
      ) : (
        <div className="mt-4 space-y-5">
          {groupByDate(list).map(([date, entries]) => {
            const net = entries.reduce((s, e) => s + e.amount, 0)
            return (
              <section key={date}>
                <div className="mb-2 flex items-baseline justify-between px-1">
                  <h3 className="text-sm font-bold text-slate-700">{dateFriendly(date)}</h3>
                  <span className={cx('text-xs font-semibold tabular', net >= 0 ? 'text-emerald-700' : 'text-slate-500')}>
                    {net >= 0 ? '+' : '−'}{rupiah(Math.abs(net)).replace('Rp ', 'Rp')}
                  </span>
                </div>
                <div className="card divide-y divide-slate-100 overflow-hidden">
                  {entries.map((e) => (
                    <LedgerRow key={e.key} e={e} onClick={() => (onOpen ? onOpen(e) : setDetail(e))} />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      <EntryDetail entry={detail} onClose={() => setDetail(null)} />
    </div>
  )
}

export function LedgerRow({ e, onClick }: { e: LedgerEntry; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition active:bg-slate-50">
      <KindIcon kind={e.kind} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate font-semibold">{e.title}</span>
          {e.receipt_url && <ImageIcon className="size-3.5 shrink-0 text-slate-400" />}
        </span>
        <span className="block truncate text-sm text-slate-500">{e.subtitle}</span>
      </span>
      <span className={cx('shrink-0 text-right font-bold tabular', e.amount > 0 ? 'text-emerald-600' : 'text-ink')}>
        {e.amount > 0 ? '+' : '−'}{rupiah(Math.abs(e.amount)).replace('Rp ', 'Rp')}
      </span>
    </button>
  )
}

function EntryDetail({ entry, onClose }: { entry: LedgerEntry | null; onClose: () => void }) {
  return (
    <Sheet open={!!entry} onClose={onClose} title="Rincian">
      {entry && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <KindIcon kind={entry.kind} size="lg" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-500">{CATEGORY_LABEL[entry.kind]}</p>
              <p className="text-xl font-bold leading-snug">{entry.title}</p>
            </div>
          </div>
          <div className="card divide-y divide-slate-100">
            <DetailRow label="Jumlah" value={<b className={cx('text-lg tabular', entry.amount > 0 ? 'text-emerald-600' : '')}>{rupiah(Math.abs(entry.amount))}</b>} />
            <DetailRow label="Tanggal" value={dateFriendly(entry.date)} />
            <DetailRow label="Keterangan" value={entry.subtitle} />
            {entry.note && <DetailRow label="Catatan" value={entry.note} />}
          </div>
          {entry.receipt_url && (
            <a href={entry.receipt_url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-3xl ring-1 ring-slate-200">
              <img src={entry.receipt_url} alt="Foto nota" className="max-h-96 w-full bg-slate-100 object-contain" />
              <span className="block bg-white px-4 py-2 text-center text-sm text-slate-500">Foto nota — ketuk untuk memperbesar</span>
            </a>
          )}
        </div>
      )}
    </Sheet>
  )
}

export function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <span className="shrink-0 text-slate-500">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}

/* ---------------- Pekerja ---------------- */

export function WorkerCard({ st, onClick, action }: { st: WorkerStat; onClick?: () => void; action?: ReactNode }) {
  const pct = st.earned ? (st.paid / st.earned) * 100 : 0
  return (
    <div className="card p-4">
      <button onClick={onClick} className="flex w-full items-center gap-3 text-left">
        <Avatar name={st.worker.name} muted={!st.worker.active} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold">{st.worker.name}</span>
          <span className="block text-sm text-slate-500">
            {formatQty(st.days)} hari kerja · {rupiahShort(st.worker.daily_wage)}/hari
          </span>
        </span>
        {onClick && <ChevronRight className="size-5 text-slate-400" />}
      </button>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <MiniStat label="Total upah" value={rupiah(st.earned)} />
        <MiniStat label="Sudah dibayar" value={rupiah(st.paid)} tone="ok" />
        <MiniStat label="Belum dibayar" value={rupiah(st.owed)} tone={st.owed ? 'warn' : undefined} sub={st.unpaid.length ? `${formatQty(st.unpaid.reduce((s, a) => s + a.portion, 0))} hari` : 'Lunas'} />
      </div>
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

function MiniStat({ label, value, tone, sub }: { label: string; value: string; tone?: 'ok' | 'warn'; sub?: string }) {
  return (
    <div className={cx('rounded-2xl px-2 py-2', tone === 'warn' ? 'bg-amber-50' : tone === 'ok' ? 'bg-emerald-50' : 'bg-slate-50')}>
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className={cx('text-[13px] font-bold tabular', tone === 'warn' ? 'text-amber-700' : tone === 'ok' ? 'text-emerald-700' : '')}>
        {value.replace('Rp ', 'Rp')}
      </p>
      {sub && <p className={cx('text-[11px]', tone === 'warn' ? 'text-amber-700' : 'text-slate-500')}>{sub}</p>}
    </div>
  )
}

const AVATAR_COLORS = ['bg-sky-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-emerald-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500']

export function Avatar({ name, muted, size = 'md' }: { name: string; muted?: boolean; size?: 'md' | 'lg' }) {
  const initials = name.replace(/^(pak|bu|mang|kang|bang|mas|mbak|teh|a)\.?\s+/i, '').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  const color = AVATAR_COLORS[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_COLORS.length]
  return (
    <span className={cx('grid shrink-0 place-items-center rounded-2xl font-bold text-white', size === 'lg' ? 'size-16 text-xl' : 'size-12', muted ? 'bg-slate-300' : color)}>
      {initials || '?'}
    </span>
  )
}

/** Riwayat hari kerja satu pekerja: lunas / belum. */
export function WorkerDays({ st }: { st: WorkerStat }) {
  if (!st.records.length) return <Empty icon={<CalendarDays className="size-7" />} title="Belum ada hari kerja" />
  return (
    <div className="card divide-y divide-slate-100">
      {[...st.records].reverse().map((a) => (
        <div key={a.id} className="flex items-center gap-3 px-4 py-3">
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{dateFriendly(a.date)}</span>
            <span className="block text-sm text-slate-500">{a.portion === 1 ? '1 hari penuh' : 'Setengah hari'} · {rupiah(a.amount)}</span>
          </span>
          <span className={cx('rounded-full px-3 py-1 text-xs font-bold', a.payment_id ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800')}>
            {a.payment_id ? 'Sudah dibayar' : 'Belum dibayar'}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ---------------- Kehadiran per hari (untuk warga) ---------------- */

export function AttendanceLog({ data }: { data: DataSet }) {
  const days = useMemo(() => attendanceByDate(data), [data])
  const names = new Map(data.workers.map((w) => [w.id, w.name]))
  if (!days.length) return <Empty icon={<HardHat className="size-7" />} title="Belum ada catatan kehadiran" />
  return (
    <div className="space-y-3">
      {days.map(([date, rows]) => (
        <div key={date} className="card p-4">
          <div className="flex items-center justify-between">
            <p className="font-bold">{dateFriendly(date)}</p>
            <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              <Users className="size-3.5" /> {rows.length} orang
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {rows.map((a) => (
              <span key={a.id} className="rounded-full bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-800">
                {names.get(a.worker_id) ?? '—'}{a.portion !== 1 && <span className="text-violet-500"> · ½ hari</span>}
              </span>
            ))}
          </div>
          <p className="mt-2 text-sm text-slate-500">Upah hari ini {rupiah(rows.reduce((s, a) => s + a.amount, 0))}</p>
        </div>
      ))}
    </div>
  )
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="grid rounded-2xl bg-slate-200/70 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cx('h-10 rounded-xl text-sm font-semibold transition', value === o.value ? 'bg-white text-ink shadow-sm' : 'text-slate-600')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
