'use client'

import { useState, useEffect } from 'react'
import { getProfile } from '@/app/actions/admin'
import { CheckCircle2, XCircle, Loader2, Database } from 'lucide-react'

export default function DBTestPage() {
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function runDiagnosis() {
    setLoading(true)
    const tables = ['customers', 'services', 'appointments', 'sales', 'vendas', 'agendamentos', 'perfil', 'profiles']
    const diagnostic = []

    try {
      // Teste de Perfil (usando Server Action)
      const profile = await getProfile()
      diagnostic.push({ table: 'Conexão Server Action', status: profile ? 'OK' : 'Vazio', details: profile ? 'Conectado com sucesso' : 'Retornou nulo' })
    } catch (e: any) {
      diagnostic.push({ table: 'Conexão Server Action', status: 'ERRO', details: e.message })
    }

    setResults(diagnostic)
    setLoading(false)
  }

  useEffect(() => {
    runDiagnosis()
  }, [])

  return (
    <div className="p-8 bg-[#0A0A0A] min-h-screen text-white font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-8">
           <Database className="text-[#5E41FF]" size={32} />
           <div>
              <h1 className="text-2xl font-bold">Diagnóstico de Sistema</h1>
              <p className="text-gray-500 text-sm">Verificando saúde do Banco de Dados e Conexão Vercel.</p>
           </div>
        </div>

        <div className="bg-[#121021] border border-white/5 rounded-3xl overflow-hidden">
           <table className="w-full text-left">
              <thead className="bg-white/5 text-[10px] uppercase font-bold text-gray-500 tracking-widest">
                 <tr>
                    <th className="px-6 py-4">Componente</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Detalhes</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                 {loading ? (
                   <tr>
                      <td colSpan={3} className="px-6 py-12 text-center">
                         <Loader2 className="animate-spin mx-auto text-[#5E41FF]" size={32} />
                         <p className="mt-2 text-sm text-gray-500 italic">Executando varredura analítica...</p>
                      </td>
                   </tr>
                 ) : results.map((res, i) => (
                   <tr key={i} className="hover:bg-white/2 transition-colors">
                      <td className="px-6 py-4 font-bold text-sm">{res.table}</td>
                      <td className="px-6 py-4">
                         {res.status === 'OK' ? (
                           <span className="flex items-center gap-1.5 text-emerald-500 text-[10px] font-black uppercase"><CheckCircle2 size={14}/> {res.status}</span>
                         ) : (
                           <span className="flex items-center gap-1.5 text-red-500 text-[10px] font-black uppercase"><XCircle size={14}/> {res.status}</span>
                         )}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400">{res.details}</td>
                   </tr>
                 ))}
              </tbody>
           </table>
        </div>

        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl">
           <p className="text-xs text-red-400 font-bold leading-relaxed">
             ⚠️ IMPORTANTE: Se o status for ERRO, verifique as Variáveis de Ambiente no Vercel (SUPABASE_SERVICE_KEY e NEXT_PUBLIC_SUPABASE_URL).
           </p>
        </div>
      </div>
    </div>
  )
}
