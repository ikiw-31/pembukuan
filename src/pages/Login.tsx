import { useState } from 'react'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { navigate } from '../lib/router'
import { store } from '../lib/store'
import { Button, Field, PageHeader, useAction } from '../components/ui'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const { busy, run } = useAction()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const ok = await run(() => store.signIn(email, password), 'Berhasil masuk')
    if (ok) navigate('/admin', { replace: true })
  }

  return (
    <div className="min-h-dvh">
      <PageHeader title="Masuk Pengelola" back="/" />
      <main className="mx-auto max-w-md px-4 pt-6">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="hero-bg grid size-20 place-items-center rounded-[28px] text-white shadow-xl shadow-brand-800/30">
            <Lock className="size-9" />
          </div>
          <h2 className="mt-5 text-2xl font-extrabold">Selamat datang</h2>
          <p className="mt-1 text-slate-500">Khusus pengelola kas. Warga cukup melihat di halaman utama.</p>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <Field label="Email">
            <div className="flex h-13 items-center gap-2 rounded-2xl bg-white px-4 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-brand-500">
              <Mail className="size-5 text-slate-400" />
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="h-full min-w-0 flex-1 bg-transparent outline-none"
                required
              />
            </div>
          </Field>
          <Field label="Kata sandi">
            <div className="flex h-13 items-center gap-2 rounded-2xl bg-white px-4 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-brand-500">
              <Lock className="size-5 text-slate-400" />
              <input
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-full min-w-0 flex-1 bg-transparent outline-none"
                required
              />
              <button type="button" onClick={() => setShow(!show)} className="p-1 text-slate-400" aria-label="Tampilkan sandi">
                {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={busy}>Masuk</Button>
          {store.mode === 'demo' && (
            <p className="rounded-2xl bg-amber-100 px-4 py-3 text-center text-sm text-amber-900">
              Mode percobaan: isi email &amp; sandi apa saja untuk mencoba.
            </p>
          )}
        </form>
      </main>
    </div>
  )
}
