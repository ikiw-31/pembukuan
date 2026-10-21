import { useEffect, useMemo, useState } from 'react'
import { HandCoins, UserPlus, Users } from 'lucide-react'
import { workerStats } from '../../lib/calc'
import { rupiah } from '../../lib/format'
import { useLoaded } from '../../lib/data'
import { navigate } from '../../lib/router'
import { store } from '../../lib/store'
import type { Worker } from '../../lib/types'
import { AdminShell } from '../../components/AdminShell'
import { WorkerCard } from '../../components/report'
import { Button, Chips, Empty, Field, MoneyInput, PageHeader, Sheet, TextInput, useAction } from '../../components/ui'

export default function WorkersPage() {
  const { data } = useLoaded()
  const stats = useMemo(() => workerStats(data), [data])
  const [adding, setAdding] = useState(false)
  const active = stats.filter((s) => s.worker.active)
  const inactive = stats.filter((s) => !s.worker.active)
  const owed = stats.reduce((s, w) => s + w.owed, 0)

  return (
    <AdminShell>
      <PageHeader
        title="Pekerja"
        subtitle={owed ? `Upah belum dibayar ${rupiah(owed)}` : 'Semua upah sudah lunas'}
        back={false}
        right={<Button size="sm" onClick={() => setAdding(true)}><UserPlus className="size-4" /> Tambah</Button>}
      />
      <main className="mx-auto max-w-xl space-y-3 px-4 pt-4">
        {stats.length === 0 && (
          <Empty
            icon={<Users className="size-7" />}
            title="Belum ada pekerja"
            text="Tambahkan nama & upah harian setiap pekerja."
            action={<Button onClick={() => setAdding(true)}><UserPlus className="size-5" /> Tambah pekerja</Button>}
          />
        )}
        {active.map((s) => (
          <WorkerCard
            key={s.worker.id}
            st={s}
            onClick={() => navigate(`/admin/pekerja/${s.worker.id}`)}
            action={s.owed > 0 && (
              <Button size="sm" className="w-full" onClick={() => navigate(`/admin/bayar?pekerja=${s.worker.id}`)}>
                <HandCoins className="size-4" /> Bayar upah {rupiah(s.owed)}
              </Button>
            )}
          />
        ))}
        {inactive.length > 0 && (
          <>
            <h2 className="px-1 pt-4 text-sm font-bold text-slate-500">Tidak aktif lagi</h2>
            {inactive.map((s) => <WorkerCard key={s.worker.id} st={s} onClick={() => navigate(`/admin/pekerja/${s.worker.id}`)} />)}
          </>
        )}
      </main>
      <WorkerFormSheet open={adding} onClose={() => setAdding(false)} />
    </AdminShell>
  )
}

const WAGE_PRESETS = [80000, 90000, 100000, 120000, 150000]

export function WorkerFormSheet({
  open, onClose, worker, onSaved,
}: { open: boolean; onClose: () => void; worker?: Worker; onSaved?: (id: string) => void }) {
  const { reload } = useLoaded()
  const [name, setName] = useState('')
  const [wage, setWage] = useState(100000)
  const [phone, setPhone] = useState('')
  const { busy, run } = useAction()

  useEffect(() => {
    if (!open) return
    setName(worker?.name ?? '')
    setWage(worker?.daily_wage ?? 100000)
    setPhone(worker?.phone ?? '')
  }, [open, worker])

  const save = async () => {
    let id = ''
    const ok = await run(async () => {
      id = await store.saveWorker({ id: worker?.id, name: name.trim(), daily_wage: wage, phone: phone.trim(), active: worker?.active ?? true })
      await reload()
    }, worker ? 'Data pekerja diperbarui' : `${name.trim()} ditambahkan`)
    if (ok) { onSaved?.(id); onClose() }
  }

  return (
    <Sheet open={open} onClose={onClose} title={worker ? 'Ubah data pekerja' : 'Pekerja baru'}>
      <div className="space-y-5">
        <Field label="Nama pekerja">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Pak Darto" autoFocus={!worker} />
        </Field>
        <Field
          label="Upah per hari"
          hint={worker ? 'Upah baru berlaku untuk hari kerja berikutnya. Hari yang sudah dicatat tidak berubah.' : undefined}
        >
          <MoneyInput value={wage} onChange={setWage} />
          <Chips
            className="mt-3"
            options={WAGE_PRESETS.map((w) => ({ value: String(w), label: `${w / 1000} rb` }))}
            value={String(wage)}
            onChange={(v) => setWage(Number(v))}
          />
        </Field>
        <Field label="No. HP (tidak wajib)">
          <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="08…" />
        </Field>
        <Button size="lg" className="w-full" disabled={!name.trim() || wage <= 0} loading={busy} onClick={save}>
          Simpan
        </Button>
      </div>
    </Sheet>
  )
}
