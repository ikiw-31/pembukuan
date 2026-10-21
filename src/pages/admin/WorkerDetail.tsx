import { useMemo, useState } from 'react'
import { HandCoins, Pencil, Trash2, Undo2, UserCheck, UserX, Wallet } from 'lucide-react'
import { workerStats } from '../../lib/calc'
import { dateFriendly, dateShort, days, rupiah } from '../../lib/format'
import { useLoaded } from '../../lib/data'
import { goBack, navigate } from '../../lib/router'
import { store } from '../../lib/store'
import { Avatar, Segmented, WorkerCard, WorkerDays } from '../../components/report'
import { Button, Empty, PageHeader, useAction, useFeedback } from '../../components/ui'
import { WorkerFormSheet } from './WorkersPage'

export default function WorkerDetail({ id }: { id: string }) {
  const { data, reload } = useLoaded()
  const { confirm } = useFeedback()
  const { run } = useAction()
  const st = useMemo(() => workerStats(data).find((s) => s.worker.id === id), [data, id])
  const [tab, setTab] = useState<'hari' | 'bayar'>('hari')
  const [editing, setEditing] = useState(false)

  if (!st) return <div><PageHeader title="Pekerja" back="/admin/pekerja" /><Empty icon={<UserX className="size-7" />} title="Pekerja tidak ditemukan" /></div>

  const w = st.worker
  const payments = data.payments.filter((p) => p.worker_id === id).sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))

  const toggleActive = () =>
    run(async () => {
      await store.saveWorker({ ...w, active: !w.active })
      await reload()
    }, w.active ? `${w.name} dinonaktifkan` : `${w.name} aktif lagi`)

  const remove = async () => {
    if (!(await confirm({ title: `Hapus ${w.name}?`, text: 'Data pekerja ini akan dihapus permanen.', ok: 'Hapus', danger: true }))) return
    const ok = await run(async () => { await store.deleteWorker(w.id); await reload() }, 'Pekerja dihapus')
    if (ok) goBack('/admin/pekerja')
  }

  const cancelPayment = async (pid: string, amount: number) => {
    const yes = await confirm({
      title: 'Batalkan pembayaran ini?',
      text: `Pembayaran ${rupiah(amount)} akan dihapus dan hari kerjanya kembali menjadi "belum dibayar".`,
      ok: 'Batalkan', danger: true,
    })
    if (yes) await run(async () => { await store.deletePayment(pid); await reload() }, 'Pembayaran dibatalkan')
  }

  return (
    <div className="min-h-dvh pb-10">
      <PageHeader
        title={w.name}
        subtitle={w.active ? 'Pekerja aktif' : 'Tidak aktif'}
        back="/admin/pekerja"
        right={<button onClick={() => setEditing(true)} className="grid size-11 place-items-center rounded-full active:bg-slate-200" aria-label="Ubah"><Pencil className="size-5" /></button>}
      />
      <main className="mx-auto max-w-xl space-y-4 px-4 pt-4">
        <div className="flex items-center gap-4 px-1">
          <Avatar name={w.name} size="lg" muted={!w.active} />
          <div>
            <p className="text-xl font-bold">{w.name}</p>
            <p className="text-slate-500">{rupiah(w.daily_wage)} / hari{w.phone && ` · ${w.phone}`}</p>
          </div>
        </div>

        <WorkerCard st={st} />

        {st.owed > 0 && (
          <Button size="lg" className="w-full" onClick={() => navigate(`/admin/bayar?pekerja=${w.id}`)}>
            <HandCoins className="size-5" /> Bayar upah ({rupiah(st.owed)})
          </Button>
        )}

        <Segmented value={tab} onChange={setTab} options={[{ value: 'hari', label: 'Hari kerja' }, { value: 'bayar', label: `Pembayaran (${payments.length})` }]} />

        {tab === 'hari' ? (
          <WorkerDays st={st} />
        ) : payments.length === 0 ? (
          <Empty icon={<Wallet className="size-7" />} title="Belum pernah dibayar" />
        ) : (
          <div className="space-y-3">
            {payments.map((p) => {
              const covered = data.attendance.filter((a) => a.payment_id === p.id).sort((a, b) => a.date.localeCompare(b.date))
              return (
                <div key={p.id} className="card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold tabular">{rupiah(p.amount)}</p>
                      <p className="text-sm text-slate-500">Dibayar {dateFriendly(p.date)}</p>
                    </div>
                    <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">
                      {days(covered.reduce((s, a) => s + a.portion, 0))}
                    </span>
                  </div>
                  {covered.length > 0 && (
                    <p className="mt-2 text-sm text-slate-600">
                      Untuk tanggal: {covered.map((a) => `${dateShort(a.date)}${a.portion !== 1 ? ' (½)' : ''}`).join(', ')}
                    </p>
                  )}
                  {p.note && <p className="mt-1 text-sm text-slate-500">Catatan: {p.note}</p>}
                  <button onClick={() => cancelPayment(p.id, p.amount)} className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-rose-600">
                    <Undo2 className="size-4" /> Batalkan pembayaran
                  </button>
                </div>
              )
            })}
          </div>
        )}

        <div className="grid gap-2 pt-4">
          <Button variant="secondary" onClick={toggleActive}>
            {w.active ? <><UserX className="size-5" /> Nonaktifkan (sudah tidak bekerja)</> : <><UserCheck className="size-5" /> Aktifkan lagi</>}
          </Button>
          {st.records.length === 0 && payments.length === 0 && (
            <Button variant="danger" onClick={remove}><Trash2 className="size-5" /> Hapus pekerja</Button>
          )}
        </div>
      </main>
      <WorkerFormSheet open={editing} onClose={() => setEditing(false)} worker={w} />
    </div>
  )
}
