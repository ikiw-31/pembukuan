import { useLoaded } from '../../lib/data'
import { AdminShell, openEntry } from '../../components/AdminShell'
import { LedgerBrowser } from '../../components/report'
import { PageHeader } from '../../components/ui'

export default function HistoryPage() {
  const { data } = useLoaded()
  return (
    <AdminShell>
      <PageHeader title="Riwayat" subtitle="Ketuk catatan untuk mengubah atau menghapus" back={false} />
      <main className="mx-auto max-w-xl px-4 pt-4">
        <LedgerBrowser data={data} onOpen={(e) => openEntry(data, e)} />
      </main>
    </AdminShell>
  )
}
