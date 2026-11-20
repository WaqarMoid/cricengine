import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { getTournamentDetail } from '@/lib/tournament/service'
import { TournamentView } from '@/components/tournament/TournamentView'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TournamentPage({ params }: PageProps) {
  const { id } = await params
  const data = await getTournamentDetail(id)

  if (!data) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
        <Navbar />
        <div className="max-w-md mx-auto px-4 py-24 text-center space-y-4">
          <h2 className="text-xl text-[#001838]">Tournament not found</h2>
          <Link href="/tournaments" className="inline-block bg-[#001838] px-5 py-2.5 rounded-xl text-xs font-medium uppercase tracking-wider text-white">All tournaments</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] pb-24">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-3">
        <Link href="/tournaments" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-[#0066CC]">
          <ArrowLeft className="w-3 h-3" /> Tournaments
        </Link>
        {/* JSON round-trip guarantees only plain data crosses into the client component */}
        <TournamentView data={JSON.parse(JSON.stringify({ ...data, matches: data.matches }))} />
      </main>
    </div>
  )
}
