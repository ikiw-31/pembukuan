import { useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Clock, HardHat, LayoutDashboard, Lock, MapPin, ShieldCheck, Wallet } from 'lucide-react'
import { summarize, workerStats } from '../lib/calc'
import { rupiah, timeAgo } from '../lib/format'
import { useLoaded } from '../lib/data'
import { navigate } from '../lib/router'
import { store } from '../lib/store'
import { AttendanceLog, CompositionCard, LedgerBrowser, Segmented, WorkerCard, WorkerDays } from '../components/report'
import { Sheet, cx } from '../components/ui'
import type { WorkerStat } from '../lib/calc'

type Tab = 'transaksi' | 'pekerja' | 'harian'

export default function Public() {
  const { data, session } = useLoaded()
  const s = useMemo(() => summarize(data), [data])
  const workers = useMemo(() => workerStats(data).filter((w) => w.records.length > 0), [data])
  const [tab, setTab] = useState<Tab>('transaksi')
  const [openWorker, setOpenWorker] = useState<WorkerStat | null>(null)

  return (
    <div className="min-h-dvh pb-10">
      {/* ---------- Kepala halaman ---------- */}
      <header className="hero-bg relative overflow-hidden px-4 pt-6 pb-28 text-white">
        <div className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-white/10 blur-3xl" />
        <BridgeArt />
        <div className="relative mx-auto max-w-xl">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
              <ShieldCheck className="size-3.5" /> Laporan Keuangan Terbuka
            </span>
            <button
              onClick={() => navigate(session ? '/admin' : '/masuk')}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur active:bg-white/25"
            >
              {session ? <><LayoutDashboard className="size-3.5" /> Kelola</> : <><Lock className="size-3.5" /> Pengelola</>}
            </button>
          </div>
          <h1 className="mt-5 text-[26px] font-extrabold leading-tight tracking-tight">{data.settings.project_name}</h1>
          {data.settings.location && (
            <p className="mt-1 flex items-center gap-1.5 text-white/80">
              <MapPin className="size-4" /> {data.settings.location}
            </p>
          )}
          {data.settings.description && <p className="mt-3 text-[15px] leading-relaxed text-white/75">{data.settings.description}</p>}
        </div>
      </header>

      <main className="relative mx-auto -mt-20 max-w-xl space-y-4 px-4">
        {/* ---------- Saldo ---------- */}
        <section className="card animate-rise overflow-hidden">
          <div className="p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-500">
              <Wallet className="size-4" /> Sisa uang kas saat ini
            </p>
            <p className={cx('mt-1 text-[38px] font-extrabold leading-none tracking-tight tabular', s.balance < 0 && 'text-rose-600')}>
              {rupiah(s.balance)}
            </p>
            {s.lastActivity && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                <Clock className="size-3.5" /> Diperbarui {timeAgo(s.lastActivity)}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 border-t border-slate-100">
            <div className="border-r border-slate-100 p-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <span className="grid size-5 place-items-center rounded-full bg-emerald-100 text-emerald-700"><ArrowDownLeft className="size-3.5" /></span>
                Dana masuk
              </p>
              <p className="mt-1 text-lg font-bold text-emerald-700 tabular">{rupiah(s.income)}</p>
            </div>
            <div className="p-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <span className="grid size-5 place-items-center rounded-full bg-rose-100 text-rose-700"><ArrowUpRight className="size-3.5" /></span>
                Uang keluar
              </p>
              <p className="mt-1 text-lg font-bold tabular">{rupiah(s.expense)}</p>
            </div>
          </div>
          {s.wagesOwed > 0 && (
            <div className="flex items-center gap-3 border-t border-amber-100 bg-amber-50 px-5 py-3">
              <HardHat className="size-5 shrink-0 text-amber-600" />
              <p className="text-sm text-amber-900">
                Upah pekerja yang <b>belum dibayar</b>: <b className="tabular">{rupiah(s.wagesOwed)}</b>
                <span className="block text-xs text-amber-700">Sisa kas setelah upah dilunasi: {rupiah(s.balance - s.wagesOwed)}</span>
              </p>
            </div>
          )}
        </section>

        {store.mode === 'demo' && <DemoBanner />}

        <CompositionCard s={s} />

        {/* ---------- Rincian ---------- */}
        <section className="pt-2">
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: 'transaksi', label: 'Transaksi' },
              { value: 'pekerja', label: 'Pekerja' },
              { value: 'harian', label: 'Kehadiran' },
            ]}
          />
          <div className="mt-4">
            {tab === 'transaksi' && <LedgerBrowser data={data} />}
            {tab === 'pekerja' && (
              <div className="space-y-3">
                <p className="px-1 text-sm text-slate-500">
                  {workers.length} orang pernah bekerja · total {s.workDays.toLocaleString('id-ID')} hari kerja
                </p>
                {workers.map((w) => <WorkerCard key={w.worker.id} st={w} onClick={() => setOpenWorker(w)} />)}
              </div>
            )}
            {tab === 'harian' && <AttendanceLog data={data} />}
          </div>
        </section>

        <footer className="pt-6 text-center text-xs text-slate-400">
          Semua angka dihitung otomatis dari catatan pengelola.
        </footer>
      </main>

      <Sheet open={!!openWorker} onClose={() => setOpenWorker(null)} title={openWorker?.worker.name}>
        {openWorker && (
          <div className="space-y-4">
            <WorkerCard st={openWorker} />
            <h3 className="px-1 font-bold">Hari kerja</h3>
            <WorkerDays st={openWorker} />
          </div>
        )}
      </Sheet>
    </div>
  )
}

export function DemoBanner() {
  return (
    <div className="rounded-2xl bg-amber-100 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
      <b>Mode percobaan.</b> Data di bawah hanya contoh dan tersimpan di HP ini saja. Hubungkan ke database agar bisa dilihat semua warga.
    </div>
  )
}

/** Hiasan garis jembatan di kepala halaman */
function BridgeArt() {
  return (
    <svg viewBox="0 0 400 120" className="pointer-events-none absolute right-0 bottom-0 left-0 w-full text-white/15" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
      <path d="M0 100 H400" />
      <path d="M20 100 Q200 -10 380 100" />
      {Array.from({ length: 13 }, (_, i) => {
        const x = 50 + i * 25
        const t = (x - 20) / 360
        const y = (1 - t) * (1 - t) * 100 + 2 * (1 - t) * t * -10 + t * t * 100
        return <path key={i} d={`M${x} ${y} V100`} strokeWidth="1.5" />
      })}
      <path d="M0 112 H400" strokeWidth="1.5" strokeDasharray="6 8" />
    </svg>
  )
}
