import { useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { rupiah, today } from '../../lib/format'
import { useLoaded } from '../../lib/data'
import { goBack } from '../../lib/router'
import { store } from '../../lib/store'
import {
  BottomBar, Button, Chips, DateField, Field, KindIcon, MoneyInput, PageHeader, TextArea, TextInput, useAction, useFeedback,
} from '../../components/ui'

const SOURCES = ['Dana Desa', 'Swadaya Warga', 'Donatur', 'Kas RT/RW', 'Bantuan Pemerintah']

export default function IncomeForm({ id }: { id?: string }) {
  const { data, reload } = useLoaded()
  const { confirm } = useFeedback()
  const existing = id ? data.incomes.find((i) => i.id === id) : undefined
  const [date, setDate] = useState(existing?.date ?? today())
  const [source, setSource] = useState(existing?.source ?? '')
  const [amount, setAmount] = useState(existing?.amount ?? 0)
  const [note, setNote] = useState(existing?.note ?? '')
  const { busy, run } = useAction()

  const suggestions = useMemo(() => [...new Set([...data.incomes.map((i) => i.source).reverse(), ...SOURCES])].slice(0, 8), [data])

  const save = async () => {
    const ok = await run(async () => {
      await store.saveIncome({ id, date, source: source.trim(), amount, note: note.trim() })
      await reload()
    }, existing ? 'Perubahan tersimpan' : 'Dana masuk tercatat')
    if (ok) goBack()
  }

  const remove = async () => {
    if (!existing) return
    if (!(await confirm({ title: 'Hapus catatan ini?', text: `${existing.source} · ${rupiah(existing.amount)}`, ok: 'Hapus', danger: true }))) return
    const ok = await run(async () => { await store.deleteIncome(existing.id); await reload() }, 'Catatan dihapus')
    if (ok) goBack()
  }

  return (
    <div className="min-h-dvh pb-36">
      <PageHeader title={existing ? 'Ubah Dana Masuk' : 'Dana Masuk'} subtitle={existing ? undefined : 'Uang yang diterima untuk proyek'} right={<KindIcon kind="income" size="sm" />} />
      <main className="mx-auto max-w-xl space-y-6 px-4 pt-5">
        <Field label="Jumlah uang diterima">
          <MoneyInput value={amount} onChange={setAmount} large autoFocus={!existing} />
        </Field>
        <Field label="Dari mana?">
          <TextInput value={source} onChange={(e) => setSource(e.target.value)} placeholder="Contoh: Dana Desa" />
          <Chips className="mt-3" options={suggestions.map((s) => ({ value: s, label: s }))} value={source} onChange={setSource} />
        </Field>
        <DateField value={date} onChange={setDate} />
        <Field label="Catatan (tidak wajib)">
          <TextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Contoh: termin pertama" />
        </Field>
        {existing && (
          <Button variant="danger" className="w-full" onClick={remove}><Trash2 className="size-5" /> Hapus catatan ini</Button>
        )}
      </main>
      <BottomBar>
        <Button size="lg" className="w-full" disabled={!source.trim() || amount <= 0} loading={busy} onClick={save}>
          Simpan {amount > 0 && rupiah(amount)}
        </Button>
      </BottomBar>
    </div>
  )
}
