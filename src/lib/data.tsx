import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { store, type Session } from './store'
import type { DataSet } from './types'

interface DataCtx {
  data: DataSet | null
  error: string | null
  session: Session | null
  sessionReady: boolean
  reload: () => Promise<void>
}

const Ctx = createContext<DataCtx | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DataSet | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [sessionReady, setSessionReady] = useState(false)

  const reload = useCallback(async () => {
    try {
      setData(await store.load())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat data')
    }
  }, [])

  useEffect(() => {
    reload()
    store.getSession().then((s) => { setSession(s); setSessionReady(true) })
    const off = store.onAuthChange(setSession)
    // Muat ulang saat aplikasi dibuka kembali agar angka selalu terbaru
    const onVisible = () => { if (document.visibilityState === 'visible') reload() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { off(); document.removeEventListener('visibilitychange', onVisible) }
  }, [reload])

  return <Ctx.Provider value={{ data, error, session, sessionReady, reload }}>{children}</Ctx.Provider>
}

export function useData() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useData di luar DataProvider')
  return ctx
}

/** Data yang pasti sudah dimuat (dipakai di halaman setelah layar loading). */
export function useLoaded() {
  const ctx = useData()
  return { ...ctx, data: ctx.data as DataSet }
}
