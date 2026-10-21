import { useMemo, useRef, useState } from 'react'
import { Camera, Loader2, Trash2, X } from 'lucide-react'
import { CATEGORY_LABEL } from '../../lib/calc'
import { rupiah, today } from '../../lib/format'
import { useLoaded } from '../../lib/data'
import { goBack } from '../../lib/router'
import { store } from '../../lib/store'
import { compressImage } from '../../lib/image'
import type { Category } from '../../lib/types'
import {
  BottomBar, Button, Chips, DateField, Field, KindIcon, MoneyInput, PageHeader, Stepper, TextArea, TextInput, cx, useAction, useFeedback,
} from '../../components/ui'

const PRESETS: Record<Category, { items: string[]; units: string[]; placeholder: string }> = {
  material: {
    items: ['Semen', 'Pasir', 'Batu split', 'Besi beton', 'Kawat bendrat', 'Papan kayu', 'Paku', 'Batu kali'],
    units: ['sak', 'm³', 'batang', 'kg', 'lembar', 'buah', 'rit', 'truk'],
    placeholder: 'Contoh: Semen 50 kg',
  },
  konsumsi: {
    items: ['Kopi & gula', 'Rokok', 'Snack', 'Nasi bungkus', 'Air mineral', 'Teh', 'Gorengan'],
    units: ['bungkus', 'paket', 'porsi', 'dus', 'buah', 'kg'],
    placeholder: 'Contoh: Kopi & gula',
  },
  lainnya: {
    items: ['Sewa molen', 'Ongkos angkut', 'Bensin', 'Sewa alat', 'Fotokopi'],
    units: ['hari', 'kali', 'liter', 'buah'],
    placeholder: 'Contoh: Ongkos angkut pasir',
  },
}

export default function ExpenseForm({ category, id }: { category: Category; id?: string }) {
  const { data, reload } = useLoaded()
  const { confirm } = useFeedback()
  const existing = id ? data.expenses.find((e) => e.id === id) : undefined
  const preset = PRESETS[category]

  const [date, setDate] = useState(existing?.date ?? today())
  const [item, setItem] = useState(existing?.item ?? '')
  const [qty, setQty] = useState(existing?.qty ?? 1)
  const [unit, setUnit] = useState(existing?.unit ?? '')
  const [byTotal, setByTotal] = useState(existing ? existing.unit_price * existing.qty !== existing.amount : category === 'konsumsi')
  const [unitPrice, setUnitPrice] = useState(existing?.unit_price ?? 0)
  const [total, setTotal] = useState(existing?.amount ?? 0)
  const [note, setNote] = useState(existing?.note ?? '')
  const [receipt, setReceipt] = useState<string | null>(existing?.receipt_url ?? null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const { busy, run } = useAction()

  const amount = byTotal ? total : Math.round(qty * unitPrice)

  // Barang yang pernah dicatat muncul sebagai pilihan cepat juga
  const suggestions = useMemo(() => {
    const used = data.expenses.filter((e) => e.category === category).map((e) => e.item)
    return [...new Set([...used.reverse(), ...preset.items])].slice(0, 12)
  }, [data, category, preset.items])
  const units = useMemo(() => [...new Set([...(unit ? [unit] : []), ...preset.units])], [unit, preset.units])

  const pickItem = (name: string) => {
    setItem(name)
    // Isi otomatis satuan & harga terakhir untuk barang yang sama
    const last = [...data.expenses].reverse().find((e) => e.item.toLowerCase() === name.toLowerCase())
    if (last && !existing) {
      if (last.unit) setUnit(last.unit)
      if (!byTotal && last.unit_price) setUnitPrice(last.unit_price)
    }
  }

  const onPhoto = async (file?: File) => {
    if (!file) return
    setUploading(true)
    const ok = await run(async () => {
      const blob = await compressImage(file)
      setReceipt(await store.uploadReceipt(blob))
    })
    if (!ok) setReceipt(existing?.receipt_url ?? null)
    setUploading(false)
  }

  const valid = item.trim() && amount > 0 && qty > 0

  const save = async (again: boolean) => {
    const ok = await run(async () => {
      await store.saveExpense({
        id, date, category, item: item.trim(), qty, unit,
        unit_price: byTotal ? Math.round(total / (qty || 1)) : unitPrice,
        amount, note: note.trim(), receipt_url: receipt,
      })
      await reload()
    }, existing ? 'Perubahan tersimpan' : `${CATEGORY_LABEL[category]} tercatat`)
    if (!ok) return
    if (again) {
      setItem(''); setQty(1); setUnitPrice(0); setTotal(0); setNote(''); setReceipt(null)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      goBack()
    }
  }

  const remove = async () => {
    if (!existing) return
    const yes = await confirm({ title: 'Hapus catatan ini?', text: `${existing.item} · ${rupiah(existing.amount)}`, ok: 'Hapus', danger: true })
    if (!yes) return
    const ok = await run(async () => { await store.deleteExpense(existing.id); await reload() }, 'Catatan dihapus')
    if (ok) goBack()
  }

  return (
    <div className="min-h-dvh pb-40">
      <PageHeader
        title={existing ? `Ubah ${CATEGORY_LABEL[category]}` : CATEGORY_LABEL[category]}
        subtitle={existing ? undefined : 'Catat pengeluaran baru'}
        right={<KindIcon kind={category} size="sm" />}
      />
      <main className="mx-auto max-w-xl space-y-6 px-4 pt-5">
        <DateField value={date} onChange={setDate} />

        <Field label="Nama barang">
          <TextInput value={item} onChange={(e) => setItem(e.target.value)} placeholder={preset.placeholder} />
          <Chips className="mt-3" options={suggestions.map((s) => ({ value: s, label: s }))} value={item} onChange={pickItem} />
        </Field>

        <div className="grid gap-6">
          <Field label="Jumlah">
            <Stepper value={qty} onChange={setQty} step={category === 'material' && unit === 'm³' ? 0.5 : 1} />
          </Field>
          <Field label="Satuan">
            <Chips options={units.map((u) => ({ value: u, label: u }))} value={unit} onChange={(u) => setUnit(u === unit ? '' : u)} />
          </Field>
        </div>

        <div className="card p-4">
          <div className="mb-4 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
            {[false, true].map((v) => (
              <button
                key={String(v)}
                type="button"
                onClick={() => { setByTotal(v); if (v) setTotal(amount); else setUnitPrice(Math.round(amount / (qty || 1))) }}
                className={cx('h-10 rounded-xl text-sm font-semibold transition', byTotal === v ? 'bg-white shadow-sm' : 'text-slate-500')}
              >
                {v ? 'Isi total harga' : 'Isi harga satuan'}
              </button>
            ))}
          </div>
          {byTotal ? (
            <Field label="Total harga yang dibayar">
              <MoneyInput value={total} onChange={setTotal} large />
            </Field>
          ) : (
            <Field label={`Harga per ${unit || 'satuan'}`}>
              <MoneyInput value={unitPrice} onChange={setUnitPrice} large />
            </Field>
          )}
          {!byTotal && qty > 0 && unitPrice > 0 && (
            <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600 tabular">
              {qty.toLocaleString('id-ID')} {unit} × {rupiah(unitPrice)} = <b className="text-ink">{rupiah(amount)}</b>
            </p>
          )}
        </div>

        <Field label="Foto nota (tidak wajib)" hint="Foto struk/nota agar warga bisa melihat bukti belanja.">
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
          {receipt ? (
            <div className="relative overflow-hidden rounded-2xl ring-1 ring-slate-200">
              <img src={receipt} alt="Foto nota" className="max-h-64 w-full bg-slate-100 object-contain" />
              <button
                type="button"
                onClick={() => setReceipt(null)}
                className="absolute top-2 right-2 grid size-10 place-items-center rounded-full bg-slate-900/70 text-white"
                aria-label="Hapus foto"
              >
                <X className="size-5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex h-24 w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-white font-semibold text-slate-500 active:bg-slate-50"
            >
              {uploading ? <Loader2 className="size-6 animate-spin" /> : <Camera className="size-6" />}
              {uploading ? 'Mengunggah foto…' : 'Ambil foto nota'}
            </button>
          )}
        </Field>

        <Field label="Catatan (tidak wajib)">
          <TextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Contoh: beli di Toko Jaya" />
        </Field>

        {existing && (
          <Button variant="danger" className="w-full" onClick={remove}>
            <Trash2 className="size-5" /> Hapus catatan ini
          </Button>
        )}
      </main>

      <BottomBar>
        <div className="mb-2 flex items-baseline justify-between px-1">
          <span className="text-sm text-slate-500">Total</span>
          <span className="text-xl font-extrabold tabular">{rupiah(amount)}</span>
        </div>
        <div className="flex gap-2">
          {!existing && (
            <Button variant="secondary" size="lg" className="flex-1 px-3 text-[15px]" disabled={!valid || uploading} loading={busy} onClick={() => save(true)}>
              Simpan &amp; tambah lagi
            </Button>
          )}
          <Button size="lg" className="flex-1" disabled={!valid || uploading} loading={busy} onClick={() => save(false)}>
            Simpan
          </Button>
        </div>
      </BottomBar>
    </div>
  )
}
