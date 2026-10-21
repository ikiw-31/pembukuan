import { useEffect } from 'react'
import { RefreshCw, WifiOff } from 'lucide-react'
import { DataProvider, useData } from './lib/data'
import { navigate, useRoute } from './lib/router'
import { Button, FeedbackProvider, Spinner } from './components/ui'
import Public from './pages/Public'
import Login from './pages/Login'
import Dashboard from './pages/admin/Dashboard'
import ExpenseForm from './pages/admin/ExpenseForm'
import IncomeForm from './pages/admin/IncomeForm'
import AttendancePage from './pages/admin/AttendancePage'
import PayPage from './pages/admin/PayPage'
import WorkersPage from './pages/admin/WorkersPage'
import WorkerDetail from './pages/admin/WorkerDetail'
import HistoryPage from './pages/admin/HistoryPage'
import SettingsPage from './pages/admin/SettingsPage'
import type { Category } from './lib/types'

export default function App() {
  return (
    <FeedbackProvider>
      <DataProvider>
        <Routes />
      </DataProvider>
    </FeedbackProvider>
  )
}

function Routes() {
  const { path, query } = useRoute()
  const { data, error, session, sessionReady, reload } = useData()
  const isAdmin = path.startsWith('/admin')

  useEffect(() => {
    if (isAdmin && sessionReady && !session) navigate('/masuk', { replace: true })
  }, [isAdmin, session, sessionReady])

  useEffect(() => {
    document.title = data ? `${data.settings.project_name} · Kas` : 'Kas Jembatan'
  }, [data])

  if (path === '/masuk') return <Login />

  if (!data) {
    if (error)
      return (
        <div className="grid min-h-dvh place-items-center p-6 text-center">
          <div>
            <WifiOff className="mx-auto size-10 text-slate-400" />
            <p className="mt-4 font-semibold">Data belum bisa dimuat</p>
            <p className="mt-1 text-sm text-slate-500">{error}</p>
            <Button className="mt-6" onClick={reload}><RefreshCw className="size-5" /> Coba lagi</Button>
          </div>
        </div>
      )
    return <Spinner />
  }

  if (!isAdmin) return <Public />
  if (!session) return <Spinner label="Memeriksa akun…" />

  const seg = path.split('/').filter(Boolean) // ['admin', ...]
  const id = query.get('id') ?? undefined
  switch (seg[1]) {
    case 'catat':
      if (['material', 'konsumsi', 'lainnya'].includes(seg[2])) return <ExpenseForm key={`${seg[2]}-${id}`} category={seg[2] as Category} id={id} />
      break
    case 'dana':
      return <IncomeForm key={id} id={id} />
    case 'hadir':
      return <AttendancePage initialDate={query.get('tanggal') ?? undefined} />
    case 'bayar':
      return <PayPage key={query.get('pekerja')} workerId={query.get('pekerja') ?? undefined} />
    case 'pekerja':
      return seg[2] ? <WorkerDetail id={seg[2]} /> : <WorkersPage />
    case 'riwayat':
      return <HistoryPage />
    case 'atur':
      return <SettingsPage />
  }
  return <Dashboard />
}
