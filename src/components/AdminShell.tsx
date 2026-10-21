import { useState, type ReactNode } from 'react'
import {
  ArrowDownLeft, CalendarCheck, Coffee, HandCoins, History, Home, Package, Plus, Receipt, Settings, Users,
} from 'lucide-react'
import { navigate, useRoute } from '../lib/router'
import type { LedgerEntry } from '../lib/calc'
import type { DataSet } from '../lib/types'
import { Sheet, cx } from './ui'

export const RECORD_ACTIONS = [
  { to: '/admin/hadir', label: 'Kehadiran Pekerja', desc: 'Siapa yang kerja hari ini', icon: CalendarCheck, tone: 'bg-violet-100 text-violet-700' },
  { to: '/admin/bayar', label: 'Bayar Upah', desc: 'Pekerja menerima uang', icon: HandCoins, tone: 'bg-violet-100 text-violet-700' },
  { to: '/admin/catat/material', label: 'Belanja Material', desc: 'Semen, pasir, besi…', icon: Package, tone: 'bg-sky-100 text-sky-700' },
  { to: '/admin/catat/konsumsi', label: 'Konsumsi', desc: 'Kopi, rokok, snack…', icon: Coffee, tone: 'bg-amber-100 text-amber-700' },
  { to: '/admin/dana', label: 'Dana Masuk', desc: 'Uang yang diterima', icon: ArrowDownLeft, tone: 'bg-emerald-100 text-emerald-700' },
  { to: '/admin/catat/lainnya', label: 'Lain-lain', desc: 'Sewa alat, ongkos…', icon: Receipt, tone: 'bg-rose-100 text-rose-700' },
]

export function ActionGrid({ onPick }: { onPick?: () => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {RECORD_ACTIONS.map((a) => (
        <button
          key={a.to}
          onClick={() => { onPick?.(); navigate(a.to) }}
          className="card flex flex-col items-start gap-3 p-4 text-left transition active:scale-[0.97]"
        >
          <span className={cx('grid size-12 place-items-center rounded-2xl', a.tone)}>
            <a.icon className="size-6" strokeWidth={2.2} />
          </span>
          <span>
            <span className="block font-bold leading-tight">{a.label}</span>
            <span className="mt-0.5 block text-[13px] text-slate-500">{a.desc}</span>
          </span>
        </button>
      ))}
    </div>
  )
}

const NAV = [
  { to: '/admin', label: 'Beranda', icon: Home },
  { to: '/admin/pekerja', label: 'Pekerja', icon: Users },
  null,
  { to: '/admin/riwayat', label: 'Riwayat', icon: History },
  { to: '/admin/atur', label: 'Atur', icon: Settings },
]

export function AdminShell({ children }: { children: ReactNode }) {
  const { path } = useRoute()
  const [open, setOpen] = useState(false)
  return (
    <div className="min-h-dvh pb-28">
      {children}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/70 bg-white/90 pb-safe backdrop-blur-xl">
        <div className="mx-auto grid max-w-xl grid-cols-5 items-end px-2 pt-2">
          {NAV.map((n) =>
            n ? (
              <button
                key={n.to}
                onClick={() => navigate(n.to, { replace: true })}
                className={cx('flex flex-col items-center gap-1 py-1 text-[11px] font-semibold', path === n.to ? 'text-brand-700' : 'text-slate-500')}
              >
                <span className={cx('grid h-8 w-14 place-items-center rounded-full transition', path === n.to && 'bg-brand-100')}>
                  <n.icon className="size-5" strokeWidth={path === n.to ? 2.5 : 2} />
                </span>
                {n.label}
              </button>
            ) : (
              <div key="fab" className="flex justify-center">
                <button
                  onClick={() => setOpen(true)}
                  className="hero-bg -mt-7 flex size-16 flex-col items-center justify-center rounded-[22px] text-white shadow-xl shadow-brand-800/40 ring-4 ring-white transition active:scale-95"
                  aria-label="Catat"
                >
                  <Plus className="size-7" strokeWidth={2.6} />
                  <span className="-mt-0.5 text-[10px] font-bold">Catat</span>
                </button>
              </div>
            ),
          )}
        </div>
      </nav>
      <Sheet open={open} onClose={() => setOpen(false)} title="Mau catat apa?">
        <ActionGrid onPick={() => setOpen(false)} />
      </Sheet>
    </div>
  )
}

/** Buka layar ubah untuk satu catatan di riwayat. */
export function openEntry(data: DataSet, e: LedgerEntry) {
  if (e.kind === 'income') navigate(`/admin/dana?id=${e.id}`)
  else if (e.kind === 'upah') {
    const p = data.payments.find((x) => x.id === e.id)
    if (p) navigate(`/admin/pekerja/${p.worker_id}`)
  } else navigate(`/admin/catat/${e.kind}?id=${e.id}`)
}
