import { useMemo, useState } from 'react'
import { Check, ChevronRight, PartyPopper } from 'lucide-react'
import { workerStats } from '../../lib/calc'
import { dateFriendly, days, rupiah, today } from '../../lib/format'
import { useLoaded } from '../../lib/data'
import { goBack, navigate } from '../../lib/router'
import { store } from '../../lib/store'
import { Avatar } from '../../components/report'
import { BottomBar, Button, DateField, Empty, Field, PageHeader, TextInput, cx, useAction, useFeedback } from '../../components/ui'

export default function PayPage({ workerId }: { workerId?: string }) {
  const { data } = useLoaded()
  const stats = useMemo(() => workerStats(data), [data])
  const st = workerId ? stats.find((s) => s.worker.id === workerId) : undefined

  if (st) return <PayWorker key={st.worker.id} workerId={st.worker.id} />

  const owed = stats.filter((s) => s.owed > 0)
  return (
    <div className="min-h-dvh pb-10">
      <PageHeader title="Bayar Upah" subtitle="Pilih pekerja yang dibayar" />
      <main className="mx-auto max-w-xl px-4 pt-4">
        {owed.length === 0 ? (
          <Empty icon={<PartyPopper className="size-7" />} title="Semua upah sudah lunas" text="Tidak ada pekerja yang perlu dibayar." />
        ) : (
          <div className="card divide-y divide-slate-100 overflow-hidden">
            {owed.map((s) => (
              <button
                key={s.worker.id}
                onClick={() => navigate(`/admin/bayar?pekerja=${s.worker.id}`, { replace: true })}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-slate-50"
              >
                <Avatar name={s.worker.name} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[17px] font-bold">{s.worker.name}</span>
                  <span className="block text-sm text-slate-500">Belum dibayar {days(s.unpaid.reduce((x, a) => x + a.portion, 0))}</span>
                </span>
                <span className="font-bold text-amber-700 tabular">{rupiah(s.owed)}</span>
                <ChevronRight className="size-5 text-slate-400" />
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function PayWorker({ workerId }: { workerId: string }) {
  const { data, reload } = useLoaded()
  const { confirm } = useFeedback()
  const st = workerStats(data).find((s) => s.worker.id === workerId)!
  const [date, setDate] = useState(today())
  const [picked, setPicked] = useState<Set<string>>(() => new Set(st.unpaid.map((a) => a.id)))
  const [note, setNote] = useState('')
  const { busy, run } = useAction()

  const chosen = st.unpaid.filter((a) => picked.has(a.id))
  const total = chosen.reduce((s, a) => s + a.amount, 0)
  const dayCount = chosen.reduce((s, a) => s + a.portion, 0)
  const allPicked = chosen.length === st.unpaid.length

  const toggle = (id: string) =>
    setPicked((p) => {
      const n = new Set(p)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const pay = async () => {
    const yes = await confirm({
      title: `Bayar ${rupiah(total)}?`,
      text: `Kepada ${st.worker.name} untuk ${days(dayCount)} kerja.`,
      ok: 'Ya, bayar',
    })
    if (!yes) return
    const ok = await run(async () => {
      await store.payWorker(workerId, date, chosen.map((a) => a.id), note.trim())
      await reload()
    }, `Upah ${st.worker.name} tercatat dibayar`)
    if (ok) goBack()
  }

  return (
    <div className="min-h-dvh pb-40">
      <PageHeader title="Bayar Upah" subtitle={st.worker.name} />
      <main className="mx-auto max-w-xl space-y-5 px-4 pt-4">
        <div className="card flex items-center gap-4 p-4">
          <Avatar name={st.worker.name} size="lg" />
          <div>
            <p className="text-lg font-bold">{st.worker.name}</p>
            <p className="text-sm text-slate-500">Belum dibayar: {days(st.unpaid.reduce((s, a) => s + a.portion, 0))}</p>
            <p className="text-lg font-extrabold text-amber-700 tabular">{rupiah(st.owed)}</p>
          </div>
        </div>

        {st.unpaid.length === 0 ? (
          <Empty icon={<PartyPopper className="size-7" />} title="Upah sudah lunas" />
        ) : (
          <>
            <section>
              <div className="mb-2 flex items-center justify-between px-1">
                <h2 className="font-bold">Hari yang dibayar</h2>
                <button
                  onClick={() => setPicked(allPicked ? new Set() : new Set(st.unpaid.map((a) => a.id)))}
                  className="text-sm font-semibold text-brand-700"
                >
                  {allPicked ? 'Kosongkan' : 'Pilih semua'}
                </button>
              </div>
              <div className="card divide-y divide-slate-100 overflow-hidden">
                {st.unpaid.map((a) => {
                  const on = picked.has(a.id)
                  return (
                    <button key={a.id} onClick={() => toggle(a.id)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-slate-50">
                      <span className={cx('grid size-7 shrink-0 place-items-center rounded-lg border-2 transition', on ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300')}>
                        {on && <Check className="size-4" strokeWidth={3} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{dateFriendly(a.date)}</span>
                        <span className="block text-sm text-slate-500">{a.portion === 1 ? 'Sehari penuh' : 'Setengah hari'}</span>
                      </span>
                      <span className="font-semibold tabular">{rupiah(a.amount)}</span>
                    </button>
                  )
                })}
              </div>
              <p className="mt-2 px-1 text-sm text-slate-500">Hilangkan centang pada hari yang belum mau dibayar sekarang.</p>
            </section>

            <DateField label="Tanggal dibayar" value={date} onChange={setDate} />

            <Field label="Catatan (tidak wajib)">
              <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Contoh: dibayar tunai" />
            </Field>
          </>
        )}
      </main>

      {st.unpaid.length > 0 && (
        <BottomBar>
          <div className="mb-2 flex items-baseline justify-between px-1">
            <span className="text-sm text-slate-500">{days(dayCount)} dipilih</span>
            <span className="text-xl font-extrabold tabular">{rupiah(total)}</span>
          </div>
          <Button size="lg" className="w-full" disabled={!chosen.length} loading={busy} onClick={pay}>
            Bayar {rupiah(total)}
          </Button>
        </BottomBar>
      )}
    </div>
  )
}
