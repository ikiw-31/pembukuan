import { useState } from 'react'
import { BookOpen, LogOut, RotateCcw, Share2 } from 'lucide-react'
import { useLoaded } from '../../lib/data'
import { navigate } from '../../lib/router'
import { resetDemo, store } from '../../lib/store'
import { AdminShell } from '../../components/AdminShell'
import { Button, Field, PageHeader, TextArea, TextInput, useAction, useFeedback } from '../../components/ui'

export default function SettingsPage() {
  const { data, reload, session } = useLoaded()
  const { confirm, toast } = useFeedback()
  const [name, setName] = useState(data.settings.project_name)
  const [location, setLocation] = useState(data.settings.location)
  const [description, setDescription] = useState(data.settings.description)
  const { busy, run } = useAction()

  const save = () =>
    run(async () => {
      await store.saveSettings({ project_name: name.trim(), location: location.trim(), description: description.trim() })
      await reload()
    }, 'Pengaturan tersimpan')

  const share = async () => {
    const url = `${location_origin()}#/`
    const text = `Laporan keuangan ${data.settings.project_name} bisa dilihat di sini:`
    if (navigator.share) {
      await navigator.share({ title: data.settings.project_name, text, url }).catch(() => {})
    } else {
      await navigator.clipboard?.writeText(`${text} ${url}`).catch(() => {})
      toast('Tautan disalin')
    }
  }

  const logout = async () => {
    if (!(await confirm({ title: 'Keluar dari akun?', ok: 'Keluar' }))) return
    await store.signOut()
    navigate('/', { replace: true })
  }

  return (
    <AdminShell>
      <PageHeader title="Pengaturan" subtitle={session?.email} back={false} />
      <main className="mx-auto max-w-xl space-y-6 px-4 pt-5">
        <section className="card space-y-5 p-5">
          <h2 className="font-bold">Info proyek (tampil di halaman warga)</h2>
          <Field label="Nama proyek">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Lokasi">
            <TextInput value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Contoh: Kampung Cibeureum RT 02" />
          </Field>
          <Field label="Keterangan singkat">
            <TextArea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <Button className="w-full" loading={busy} disabled={!name.trim()} onClick={save}>Simpan</Button>
        </section>

        <section className="card divide-y divide-slate-100 overflow-hidden">
          <Row icon={<Share2 className="size-5" />} label="Bagikan halaman warga" onClick={share} />
          <Row icon={<BookOpen className="size-5" />} label="Cara pakai" onClick={() => document.getElementById('panduan')?.scrollIntoView({ behavior: 'smooth' })} />
          {store.mode === 'demo' && (
            <Row
              icon={<RotateCcw className="size-5" />}
              label="Kembalikan data contoh"
              onClick={async () => {
                if (!(await confirm({ title: 'Kembalikan data contoh?', text: 'Semua data percobaan di HP ini diganti contoh awal.', ok: 'Ya', danger: true }))) return
                resetDemo()
                await reload()
                toast('Data contoh dikembalikan')
              }}
            />
          )}
          <Row icon={<LogOut className="size-5" />} label="Keluar" danger onClick={logout} />
        </section>

        <Guide />
      </main>
    </AdminShell>
  )
}

function location_origin() {
  return window.location.href.split('#')[0]
}

function Row({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-3 px-5 py-4 text-left font-semibold active:bg-slate-50 ${danger ? 'text-rose-600' : ''}`}>
      <span className={danger ? '' : 'text-slate-500'}>{icon}</span>
      {label}
    </button>
  )
}

function Guide() {
  const steps = [
    ['Tambah pekerja', 'Buka menu Pekerja → Tambah. Isi nama dan upah per hari. Cukup sekali per orang.'],
    ['Catat kehadiran setiap hari', 'Tekan tombol Catat → Kehadiran Pekerja. Centang siapa saja yang bekerja hari itu, lalu Simpan. Bisa pilih setengah hari.'],
    ['Bayar upah kapan saja', 'Tekan Catat → Bayar Upah, pilih pekerja. Semua hari yang belum dibayar muncul. Hilangkan centang hari yang belum mau dibayar, lalu Bayar.'],
    ['Catat belanja', 'Material, konsumsi (kopi, rokok, snack), atau lain-lain. Isi nama barang, jumlah, dan harga. Foto nota bila ada.'],
    ['Catat uang masuk', 'Setiap ada dana dari desa, swadaya, atau donatur, catat di Dana Masuk agar sisa kas benar.'],
    ['Salah catat?', 'Buka Riwayat, ketuk catatannya, lalu ubah atau hapus. Pembayaran upah dibatalkan dari halaman pekerja.'],
  ]
  return (
    <section id="panduan" className="card p-5">
      <h2 className="mb-4 font-bold">Cara pakai</h2>
      <ol className="space-y-4">
        {steps.map(([t, d], i) => (
          <li key={t} className="flex gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">{i + 1}</span>
            <span>
              <span className="block font-semibold">{t}</span>
              <span className="block text-[15px] text-slate-600">{d}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
