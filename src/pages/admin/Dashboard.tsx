import { useMemo } from 'react'
import { CalendarCheck, ChevronRight, Eye, HandCoins, Sparkles } from 'lucide-react'
import { ledger, summarize, workerStats } from '../../lib/calc'
import { dateLong, days as formatQtyDays, rupiah, today } from '../../lib/format'
import { useLoaded } from '../../lib/data'
import { navigate } from '../../lib/router'
import { store } from '../../lib/store'
import { ActionGrid, AdminShell, openEntry } from '../../components/AdminShell'
import { LedgerRow, Avatar } from '../../components/report'
import { Button, cx } from '../../components/ui'
import { DemoBanner } from '../Public'

export default function Dashboard() {
  const { data, session } = useLoaded()
  const s = useMemo(() => summarize(data), [data])
  const owed = useMemo(() => workerStats(data).filter((w) => w.owed > 0), [data])
  const recent = useMemo(() => ledger(data).slice(0, 5), [data])
  const t = today()
  const todayAttendance = data.attendance.filter((a) => a.date === t)
  const todaySpend = data.expenses.filter((e) => e.date === t).reduce((x, e) => x + e.amount, 0)
  const hour = new Date().getHours()
  const greet = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam'

  return (
    <AdminShell>
      <header className="hero-bg px-4 pt-6 pb-24 text-white">
        <div className="mx-auto max-w-xl">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm text-white/70">{greet},</p>
              <p className="truncate text-lg font-bold">{session?.email.split('@')[0]}</p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-2 text-xs font-semibold backdrop-blur active:bg-white/25"
            >
              <Eye className="size-4" /> Halaman warga
            </button>
          </div>
          <p className="mt-6 text-sm text-white/70">Sisa uang kas</p>
          <p className="text-[36px] font-extrabold leading-tight tracking-tight tabular">{rupiah(s.balance)}</p>
          <p className="mt-1 text-sm text-white/70">{data.settings.project_name}</p>
        </div>
      </header>

      <main className="relative mx-auto -mt-16 max-w-xl space-y-5 px-4">
        <section className="card grid grid-cols-3 divide-x divide-slate-100 py-4 text-center">
          <Stat label="Dana masuk" value={rupiah(s.income)} tone="text-emerald-700" />
          <Stat label="Uang keluar" value={rupiah(s.expense)} />
          <Stat label="Upah belum dibayar" value={rupiah(s.wagesOwed)} tone={s.wagesOwed ? 'text-amber-700' : ''} />
        </section>

        {store.mode === 'demo' && <DemoBanner />}

        {/* ---------- Hari ini ---------- */}
        <section className={cx('card flex items-center gap-4 p-4', !todayAttendance.length && 'ring-2 ring-violet-200')}>
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-violet-100 text-violet-700">
            <CalendarCheck className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{dateLong(t)}</p>
            {todayAttendance.length ? (
              <p className="font-semibold">
                {todayAttendance.length} orang bekerja hari ini
                {todaySpend > 0 && <span className="block text-sm font-normal text-slate-500">Belanja hari ini {rupiah(todaySpend)}</span>}
              </p>
            ) : (
              <p className="font-semibold">Kehadiran hari ini belum dicatat</p>
            )}
          </div>
          <Button size="sm" variant={todayAttendance.length ? 'secondary' : 'primary'} onClick={() => navigate('/admin/hadir')}>
            {todayAttendance.length ? 'Ubah' : 'Catat'}
          </Button>
        </section>

        {/* ---------- Aksi cepat ---------- */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 px-1 font-bold">
            <Sparkles className="size-4 text-brand-600" /> Catat sesuatu
          </h2>
          <ActionGrid />
        </section>

        {/* ---------- Upah yang belum dibayar ---------- */}
        {owed.length > 0 && (
          <section>
            <h2 className="mb-3 px-1 font-bold">Upah belum dibayar</h2>
            <div className="card divide-y divide-slate-100 overflow-hidden">
              {owed.map((w) => (
                <div key={w.worker.id} className="flex items-center gap-3 px-4 py-3">
                  <Avatar name={w.worker.name} />
                  <button className="min-w-0 flex-1 text-left" onClick={() => navigate(`/admin/pekerja/${w.worker.id}`)}>
                    <span className="block truncate font-semibold">{w.worker.name}</span>
                    <span className="block text-sm text-slate-500">
                      {formatQtyDays(w.unpaid.reduce((x, a) => x + a.portion, 0))} · <b className="text-amber-700 tabular">{rupiah(w.owed)}</b>
                    </span>
                  </button>
                  <Button size="sm" onClick={() => navigate(`/admin/bayar?pekerja=${w.worker.id}`)}>
                    <HandCoins className="size-4" /> Bayar
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ---------- Catatan terakhir ---------- */}
        {recent.length > 0 && (
          <section>
            <div className="mb-3 flex items-center justify-between px-1">
              <h2 className="font-bold">Catatan terakhir</h2>
              <button onClick={() => navigate('/admin/riwayat', { replace: true })} className="flex items-center text-sm font-semibold text-brand-700">
                Semua <ChevronRight className="size-4" />
              </button>
            </div>
            <div className="card divide-y divide-slate-100 overflow-hidden">
              {recent.map((e) => <LedgerRow key={e.key} e={e} onClick={() => openEntry(data, e)} />)}
            </div>
          </section>
        )}
      </main>
    </AdminShell>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="px-2">
      <p className="text-[11px] font-medium leading-tight text-slate-500">{label}</p>
      <p className={cx('mt-1 text-sm font-bold tabular', tone)}>{value.replace('Rp ', 'Rp')}</p>
    </div>
  )
}
