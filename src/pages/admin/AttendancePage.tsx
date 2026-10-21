import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Copy, Lock, UserPlus } from 'lucide-react'
import { dateFriendly, dateLong, rupiah, shiftDate, today } from '../../lib/format'
import { useLoaded } from '../../lib/data'
import { goBack } from '../../lib/router'
import { store } from '../../lib/store'
import { Avatar } from '../../components/report'
import { BottomBar, Button, Empty, PageHeader, cx, useAction, useFeedback } from '../../components/ui'
import { WorkerFormSheet } from './WorkersPage'

type Portion = 0 | 0.5 | 1

export default function AttendancePage({ initialDate }: { initialDate?: string }) {
  const { data, reload } = useLoaded()
  const { confirm } = useFeedback()
  const [date, setDate] = useState(initialDate ?? today())
  const [marks, setMarks] = useState<Record<string, Portion>>({})
  const [dirty, setDirty] = useState(false)
  const [adding, setAdding] = useState(false)
  const { busy, run } = useAction()

  const dayRows = useMemo(() => data.attendance.filter((a) => a.date === date), [data, date])
  const rowByWorker = useMemo(() => new Map(dayRows.map((a) => [a.worker_id, a])), [dayRows])

  // Muat ulang centang setiap ganti tanggal atau data tanggal itu berubah
  const dayKey = `${date}|${dayRows.map((a) => `${a.id}:${a.portion}:${a.payment_id}`).join(',')}`
  useEffect(() => {
    setMarks(Object.fromEntries(dayRows.map((a) => [a.worker_id, a.portion as Portion])))
    setDirty(false)
  }, [dayKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const workers = data.workers
    .filter((w) => w.active || rowByWorker.has(w.id))
    .sort((a, b) => a.name.localeCompare(b.name))

  const wageOf = (wid: string) => rowByWorker.get(wid)?.wage ?? data.workers.find((w) => w.id === wid)?.daily_wage ?? 0
  const selected = Object.entries(marks).filter(([, p]) => p > 0)
  const total = selected.reduce((s, [wid, p]) => s + Math.round(p * wageOf(wid)), 0)

  const setMark = (wid: string, p: Portion) => {
    setMarks((m) => ({ ...m, [wid]: p }))
    setDirty(true)
  }

  const changeDate = async (d: string) => {
    if (d > today()) return
    if (dirty && !(await confirm({ title: 'Pindah tanggal?', text: 'Perubahan yang belum disimpan akan hilang.', ok: 'Pindah' }))) return
    setDate(d)
  }

  // Salin daftar pekerja dari hari kerja sebelumnya
  const prevDate = useMemo(
    () => data.attendance.map((a) => a.date).filter((d) => d < date).sort().pop(),
    [data, date],
  )
  const copyPrev = () => {
    if (!prevDate) return
    const prev = data.attendance.filter((a) => a.date === prevDate)
    setMarks((m) => {
      const next = { ...m }
      for (const a of prev) {
        const w = data.workers.find((x) => x.id === a.worker_id)
        if (w?.active && !rowByWorker.get(a.worker_id)?.payment_id) next[a.worker_id] = 1
      }
      return next
    })
    setDirty(true)
  }

  const save = async () => {
    const entries = selected.map(([worker_id, portion]) => ({ worker_id, portion, wage: wageOf(worker_id) }))
    const ok = await run(async () => {
      await store.saveAttendanceDay(date, entries)
      await reload()
    }, entries.length ? `Kehadiran ${entries.length} orang tersimpan` : 'Kehadiran dikosongkan')
    if (ok) goBack()
  }

  return (
    <div className="min-h-dvh pb-40">
      <PageHeader title="Kehadiran Pekerja" subtitle="Siapa yang bekerja?" />
      <main className="mx-auto max-w-xl space-y-4 px-4 pt-4">
        {/* ---------- Pilih tanggal ---------- */}
        <div className="card flex items-center gap-2 p-2">
          <button onClick={() => changeDate(shiftDate(date, -1))} className="grid size-12 place-items-center rounded-2xl bg-slate-100 active:bg-slate-200" aria-label="Hari sebelumnya">
            <ChevronLeft className="size-6" />
          </button>
          <label className="relative min-w-0 flex-1 text-center">
            <span className="block text-lg font-bold">{dateFriendly(date)}</span>
            <span className="block text-sm text-slate-500">{dateLong(date)}</span>
            <input
              type="date"
              value={date}
              max={today()}
              onChange={(e) => e.target.value && changeDate(e.target.value)}
              className="absolute inset-0 opacity-0"
              aria-label="Pilih tanggal"
            />
          </label>
          <button
            onClick={() => changeDate(shiftDate(date, 1))}
            disabled={date >= today()}
            className="grid size-12 place-items-center rounded-2xl bg-slate-100 active:bg-slate-200 disabled:opacity-30"
            aria-label="Hari berikutnya"
          >
            <ChevronRight className="size-6" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 px-1">
          <p className="text-sm text-slate-500">Ketuk nama pekerja yang <b>masuk kerja</b>.</p>
          {prevDate && (
            <button onClick={copyPrev} className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-2 text-sm font-semibold text-brand-700 ring-1 ring-slate-200 active:bg-slate-50">
              <Copy className="size-4" /> Sama spt {dateFriendly(prevDate) === 'Kemarin' ? 'kemarin' : 'sebelumnya'}
            </button>
          )}
        </div>

        {workers.length === 0 ? (
          <Empty
            icon={<UserPlus className="size-7" />}
            title="Belum ada pekerja"
            text="Tambahkan nama pekerja terlebih dahulu."
            action={<Button onClick={() => setAdding(true)}><UserPlus className="size-5" /> Tambah pekerja</Button>}
          />
        ) : (
          <div className="space-y-3">
            {workers.map((w) => {
              const p = marks[w.id] ?? 0
              const paid = !!rowByWorker.get(w.id)?.payment_id
              const wage = wageOf(w.id)
              return (
                <div
                  key={w.id}
                  className={cx('card overflow-hidden transition', p > 0 && 'ring-2 ring-brand-500')}
                >
                  <button
                    disabled={paid}
                    onClick={() => setMark(w.id, p > 0 ? 0 : 1)}
                    className="flex w-full items-center gap-3 p-3 text-left"
                  >
                    <Avatar name={w.name} muted={p === 0} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[17px] font-bold">{w.name}</span>
                      <span className="block text-sm text-slate-500">{rupiah(wage)} / hari</span>
                    </span>
                    {paid ? (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700">
                        <Lock className="size-3.5" /> Sudah dibayar
                      </span>
                    ) : (
                      <span className={cx('grid size-9 place-items-center rounded-full border-2 transition', p > 0 ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300')}>
                        {p > 0 && <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5L20 7" /></svg>}
                      </span>
                    )}
                  </button>
                  {p > 0 && !paid && (
                    <div className="grid grid-cols-2 gap-2 border-t border-slate-100 bg-slate-50 p-2">
                      {([1, 0.5] as Portion[]).map((v) => (
                        <button
                          key={v}
                          onClick={() => setMark(w.id, v)}
                          className={cx('h-10 rounded-xl text-sm font-semibold transition', p === v ? 'bg-ink text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200')}
                        >
                          {v === 1 ? 'Sehari penuh' : 'Setengah hari'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
            <button
              onClick={() => setAdding(true)}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-slate-300 font-semibold text-slate-600 active:bg-white"
            >
              <UserPlus className="size-5" /> Pekerja baru
            </button>
          </div>
        )}
      </main>

      <BottomBar>
        <div className="mb-2 flex items-baseline justify-between px-1">
          <span className="text-sm text-slate-500">{selected.length} orang bekerja</span>
          <span className="text-xl font-extrabold tabular">{rupiah(total)}</span>
        </div>
        <Button size="lg" className="w-full" loading={busy} disabled={!dirty} onClick={save}>
          Simpan kehadiran
        </Button>
      </BottomBar>

      <WorkerFormSheet
        open={adding}
        onClose={() => setAdding(false)}
        onSaved={(id) => { setMark(id, 1) }}
      />
    </div>
  )
}
