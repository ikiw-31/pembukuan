import {
  createContext, useCallback, useContext, useEffect, useRef, useState,
  type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode,
} from 'react'
import {
  ArrowDownLeft, Check, ChevronLeft, CircleAlert, Coffee, HandCoins, Loader2, Minus, Package, Plus, Receipt, X,
} from 'lucide-react'
import type { EntryKind } from '../lib/calc'
import { isoDate, parseMoney, shiftDate, today, dateLong } from '../lib/format'
import { goBack } from '../lib/router'

export function cx(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(' ')
}

/* ---------------- Ikon & warna per jenis transaksi ---------------- */

export const KIND_STYLE: Record<EntryKind, { bg: string; fg: string; bar: string; icon: typeof Package }> = {
  income: { bg: 'bg-emerald-100', fg: 'text-emerald-700', bar: 'bg-emerald-500', icon: ArrowDownLeft },
  material: { bg: 'bg-sky-100', fg: 'text-sky-700', bar: 'bg-sky-500', icon: Package },
  konsumsi: { bg: 'bg-amber-100', fg: 'text-amber-700', bar: 'bg-amber-400', icon: Coffee },
  upah: { bg: 'bg-violet-100', fg: 'text-violet-700', bar: 'bg-violet-500', icon: HandCoins },
  lainnya: { bg: 'bg-rose-100', fg: 'text-rose-700', bar: 'bg-rose-400', icon: Receipt },
}

export function KindIcon({ kind, size = 'md' }: { kind: EntryKind; size?: 'sm' | 'md' | 'lg' }) {
  const s = KIND_STYLE[kind]
  const Icon = s.icon
  const box = size === 'lg' ? 'size-14 rounded-2xl' : size === 'sm' ? 'size-9 rounded-xl' : 'size-11 rounded-2xl'
  const ic = size === 'lg' ? 'size-7' : size === 'sm' ? 'size-4' : 'size-5'
  return (
    <span className={cx('grid shrink-0 place-items-center', box, s.bg, s.fg)}>
      <Icon className={ic} strokeWidth={2.2} />
    </span>
  )
}

/* ---------------- Tombol ---------------- */

type BtnVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'dark'

export function Button({
  variant = 'primary', size = 'md', loading, className, children, disabled, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md' | 'lg'; loading?: boolean }) {
  const v = {
    primary: 'bg-brand-600 text-white shadow-lg shadow-brand-600/25 active:bg-brand-700',
    dark: 'bg-ink text-white shadow-lg shadow-slate-900/20 active:bg-slate-800',
    secondary: 'bg-white text-ink ring-1 ring-slate-200 active:bg-slate-50',
    danger: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200 active:bg-rose-100',
    ghost: 'text-slate-600 active:bg-slate-100',
  }[variant]
  const s = { sm: 'h-10 px-4 text-sm rounded-xl', md: 'h-12 px-5 rounded-2xl', lg: 'h-14 px-6 text-[17px] rounded-2xl' }[size]
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        'inline-flex select-none items-center justify-center gap-2 font-semibold transition active:scale-[0.98] disabled:opacity-50',
        v, s, className,
      )}
    >
      {loading && <Loader2 className="size-5 animate-spin" />}
      {children}
    </button>
  )
}

/* ---------------- Kolom isian ---------------- */

export function Field({ label, hint, children, className }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-2 block text-[15px] font-semibold text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-sm text-slate-500">{hint}</span>}
    </label>
  )
}

const inputCls =
  'w-full h-13 rounded-2xl bg-white px-4 text-[17px] text-ink ring-1 ring-slate-200 outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500'

export function TextInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={cx(inputCls, className)} />
}

export function TextArea({ className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={2} {...rest} className={cx(inputCls, 'h-auto py-3', className)} />
}

/** Isian uang: otomatis diberi titik ribuan, keyboard angka di HP. */
export function MoneyInput({
  value, onChange, placeholder = '0', autoFocus, large,
}: { value: number; onChange: (n: number) => void; placeholder?: string; autoFocus?: boolean; large?: boolean }) {
  return (
    <div className={cx('flex items-center rounded-2xl bg-white ring-1 ring-slate-200 transition focus-within:ring-2 focus-within:ring-brand-500', large ? 'h-16' : 'h-13')}>
      <span className={cx('pl-4 pr-1 font-semibold text-slate-400', large ? 'text-xl' : 'text-[17px]')}>Rp</span>
      <input
        inputMode="numeric"
        autoFocus={autoFocus}
        value={value ? value.toLocaleString('id-ID') : ''}
        onChange={(e) => onChange(parseMoney(e.target.value))}
        placeholder={placeholder}
        className={cx('h-full min-w-0 flex-1 bg-transparent pr-4 font-bold tabular outline-none placeholder:text-slate-300', large ? 'text-2xl' : 'text-[17px]')}
      />
    </div>
  )
}

/** Isian jumlah dengan tombol − dan + besar. */
export function Stepper({ value, onChange, step = 1, min = 0 }: { value: number; onChange: (n: number) => void; step?: number; min?: number }) {
  const [text, setText] = useState(String(value).replace('.', ','))
  useEffect(() => {
    if (Number(text.replace(',', '.')) !== value) setText(String(value).replace('.', ','))
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps
  const btn = 'grid size-13 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-700 active:bg-slate-200 active:scale-95 transition'
  return (
    <div className="flex items-center gap-2">
      <button type="button" className={btn} onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))} aria-label="Kurangi">
        <Minus className="size-5" />
      </button>
      <input
        inputMode="decimal"
        value={text}
        onChange={(e) => {
          const t = e.target.value.replace(/[^0-9.,]/g, '')
          setText(t)
          const n = Number(t.replace(',', '.'))
          if (!Number.isNaN(n)) onChange(n)
        }}
        className={cx(inputCls, 'text-center font-bold tabular')}
      />
      <button type="button" className={btn} onClick={() => onChange(+(value + step).toFixed(2))} aria-label="Tambah">
        <Plus className="size-5" />
      </button>
    </div>
  )
}

/** Pilihan cepat berbentuk tombol bulat. */
export function Chips<T extends string>({
  options, value, onChange, className,
}: { options: { value: T; label: ReactNode }[]; value?: T | null; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={cx('flex flex-wrap gap-2', className)}>
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'h-10 rounded-full px-4 text-[15px] font-medium transition active:scale-95',
            value === o.value ? 'bg-ink text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function DateField({ value, onChange, label = 'Tanggal' }: { value: string; onChange: (d: string) => void; label?: string }) {
  const t = today()
  const y = shiftDate(t, -1)
  return (
    <Field label={label} hint={dateLong(value)}>
      <div className="flex gap-2">
        <Chips
          options={[{ value: t, label: 'Hari ini' }, { value: y, label: 'Kemarin' }]}
          value={value}
          onChange={onChange}
          className="shrink-0 flex-nowrap"
        />
        <input
          type="date"
          value={value}
          max={isoDate(new Date(Date.now() + 86400000 * 365))}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          className={cx(inputCls, 'h-10 min-h-0! rounded-full px-3 text-[15px]!')}
        />
      </div>
    </Field>
  )
}

/* ---------------- Kerangka layar ---------------- */

export function PageHeader({ title, subtitle, back = '/admin', right }: { title: string; subtitle?: string; back?: string | false; right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-[#f3f6f8]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-xl items-center gap-2 px-3">
        {back !== false && (
          <button onClick={() => goBack(back)} className="grid size-11 place-items-center rounded-full active:bg-slate-200" aria-label="Kembali">
            <ChevronLeft className="size-6" />
          </button>
        )}
        <div className={cx('min-w-0 flex-1', back === false && 'pl-2')}>
          <h1 className="truncate text-lg font-bold leading-tight">{title}</h1>
          {subtitle && <p className="truncate text-sm text-slate-500">{subtitle}</p>}
        </div>
        {right}
      </div>
    </header>
  )
}

/** Tombol simpan yang menempel di bawah layar. */
export function BottomBar({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/70 bg-white/90 px-4 pt-3 pb-safe backdrop-blur-xl">
      <div className="mx-auto max-w-xl">{children}</div>
    </div>
  )
}

export function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-4 grid size-16 place-items-center rounded-3xl bg-slate-100 text-slate-400">{icon}</div>
      <p className="font-semibold text-slate-700">{title}</p>
      {text && <p className="mt-1 text-sm text-slate-500">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Spinner({ label = 'Memuat data…' }: { label?: string }) {
  return (
    <div className="grid min-h-[60dvh] place-items-center">
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <Loader2 className="size-8 animate-spin text-brand-600" />
        <span className="text-sm">{label}</span>
      </div>
    </div>
  )
}

/* ---------------- Lembar dari bawah (bottom sheet) ---------------- */

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 animate-fade bg-slate-900/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative max-h-[90dvh] w-full max-w-xl animate-sheet overflow-y-auto rounded-t-[28px] bg-[#f8fafb] pb-safe">
        <div className="sticky top-0 z-10 bg-[#f8fafb]/95 px-5 pt-3 pb-2 backdrop-blur">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-300" />
          {title && (
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{title}</h2>
              <button onClick={onClose} className="grid size-10 place-items-center rounded-full bg-slate-100 active:bg-slate-200" aria-label="Tutup">
                <X className="size-5" />
              </button>
            </div>
          )}
        </div>
        <div className="px-5 pb-4">{children}</div>
      </div>
    </div>
  )
}

/* ---------------- Notifikasi & konfirmasi ---------------- */

interface Toast { id: number; text: string; kind: 'ok' | 'error' }
interface ConfirmReq { title: string; text?: string; ok?: string; danger?: boolean; resolve: (v: boolean) => void }

const FeedbackCtx = createContext<{
  toast: (text: string, kind?: 'ok' | 'error') => void
  confirm: (o: Omit<ConfirmReq, 'resolve'>) => Promise<boolean>
} | null>(null)

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [req, setReq] = useState<ConfirmReq | null>(null)
  const seq = useRef(0)

  const toast = useCallback((text: string, kind: 'ok' | 'error' = 'ok') => {
    const id = ++seq.current
    setToasts((t) => [...t, { id, text, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 5000 : 2600)
  }, [])

  const confirm = useCallback((o: Omit<ConfirmReq, 'resolve'>) => new Promise<boolean>((resolve) => setReq({ ...o, resolve })), [])
  const close = (v: boolean) => { req?.resolve(v); setReq(null) }

  return (
    <FeedbackCtx.Provider value={{ toast, confirm }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[70] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cx(
              'flex max-w-md animate-rise items-center gap-2.5 rounded-2xl px-4 py-3 text-[15px] font-medium shadow-xl',
              t.kind === 'ok' ? 'bg-ink text-white' : 'bg-rose-600 text-white',
            )}
          >
            {t.kind === 'ok' ? <Check className="size-5 shrink-0 text-brand-300" /> : <CircleAlert className="size-5 shrink-0" />}
            {t.text}
          </div>
        ))}
      </div>
      {req && (
        <div className="fixed inset-0 z-[60] grid place-items-center p-6">
          <div className="absolute inset-0 animate-fade bg-slate-900/50" onClick={() => close(false)} />
          <div className="relative w-full max-w-sm animate-rise rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold">{req.title}</h3>
            {req.text && <p className="mt-2 text-[15px] text-slate-600">{req.text}</p>}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button variant="secondary" onClick={() => close(false)}>Batal</Button>
              <Button
                variant={req.danger ? 'primary' : 'primary'}
                className={req.danger ? 'bg-rose-600! shadow-rose-600/25! active:bg-rose-700!' : ''}
                onClick={() => close(true)}
              >
                {req.ok ?? 'Ya'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </FeedbackCtx.Provider>
  )
}

export function useFeedback() {
  const ctx = useContext(FeedbackCtx)
  if (!ctx) throw new Error('useFeedback di luar FeedbackProvider')
  return ctx
}

/** Jalankan aksi simpan dengan status loading + pesan error yang ramah. */
export function useAction() {
  const { toast } = useFeedback()
  const [busy, setBusy] = useState(false)
  const run = useCallback(async (fn: () => Promise<void>, okText?: string) => {
    setBusy(true)
    try {
      await fn()
      if (okText) toast(okText)
      return true
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Gagal menyimpan', 'error')
      return false
    } finally {
      setBusy(false)
    }
  }, [toast])
  return { busy, run }
}
