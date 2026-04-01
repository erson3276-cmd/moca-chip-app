'use client'

import { useEffect, useState } from 'react'
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react'
import { getSales } from '@/app/actions/admin'
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function ComissaoPage() {
  const [sales, setSales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  })

  async function loadData() {
    setLoading(true)
    const data = await getSales()
    setSales(data)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handlePrevMonth = () => {
    const newStart = startOfMonth(subMonths(dateRange.start, 1))
    const newEnd = endOfMonth(newStart)
    setDateRange({ start: newStart, end: newEnd })
  }

  const handleNextMonth = () => {
    const newStart = startOfMonth(addMonths(dateRange.start, 1))
    const newEnd = endOfMonth(newStart)
    setDateRange({ start: newStart, end: newEnd })
  }

  const exportToCSV = () => {
    const headers = ['Data', 'Cliente', 'Valor Venda', 'Comissão (50%)', 'Status']
    const rows = filteredSales.map(sale => [
      format(parseISO(sale.created_at), 'dd/MM/yyyy HH:mm'),
      sale.customers?.name || 'Cliente',
      sale.amount,
      (sale.amount || 0) * 0.5,
      'Liquidado'
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `comissoes_${format(dateRange.start, 'MM_yyyy')}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Filtrar vendas pelo período selecionado
  const filteredSales = sales.filter(sale => {
    const saleDate = parseISO(sale.created_at || new Date().toISOString())
    return isWithinInterval(saleDate, { start: dateRange.start, end: dateRange.end })
  })

  // Cálculos
  const totalVendido = filteredSales.reduce((acc, s) => acc + (s.amount || 0), 0)
  const totalComissao = totalVendido * 0.5 // Exemplo: 50% de comissão
  const totalSalao = totalVendido - totalComissao

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 space-y-4">
       <div className="w-8 h-8 border-2 border-[#5E41FF]/30 border-t-[#5E41FF] rounded-full animate-spin" />
       <p className="text-gray-500 font-medium italic opacity-60">Calculando comissões...</p>
    </div>
  )

  return (
    <div className="max-w-6xl space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">Comissões</h1>
          <p className="text-[10px] text-gray-500 font-extrabold uppercase tracking-[0.2em] mt-1">Gestão de repasses para profissionais (Base: 50%)</p>
        </div>
        
        <div className="flex items-center gap-3 bg-[#121021] border border-white/5 p-1.5 rounded-2xl shadow-xl">
           <button onClick={handlePrevMonth} className="p-2 hover:bg-white/5 rounded-xl text-gray-500 transition-all hover:text-white"><ChevronLeft size={18} /></button>
           <div className="px-4 flex items-center gap-2">
              <CalendarIcon size={14} className="text-[#5E41FF]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white">
                 {format(dateRange.start, "MMMM yyyy", { locale: ptBR })}
              </span>
           </div>
           <button onClick={handleNextMonth} className="p-2 hover:bg-white/5 rounded-xl text-gray-500 transition-all hover:text-white"><ChevronRight size={18} /></button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="p-8 rounded-[2.5rem] bg-[#121021] border border-white/5 space-y-4 shadow-2xl relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-all" />
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-emerald-500">
               <TrendingUp size={24} />
            </div>
            <div>
               <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">Faturamento Total</p>
               <h3 className="text-3xl font-black text-white mt-1">R$ {totalVendido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            </div>
         </div>

         <div className="p-8 rounded-[2.5rem] bg-[#121021] border border-white/5 space-y-4 shadow-2xl relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#5E41FF]/5 rounded-full blur-3xl group-hover:bg-[#5E41FF]/10 transition-all" />
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-[#5E41FF]">
               <DollarSign size={24} />
            </div>
            <div>
               <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">Pagar Profissionais</p>
               <h3 className="text-3xl font-black text-white mt-1">R$ {totalComissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            </div>
         </div>

         <div className="p-8 rounded-[2.5rem] bg-[#121021] border border-white/5 space-y-4 shadow-2xl relative overflow-hidden group">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-gray-400">
               <CheckCircle2 size={24} />
            </div>
            <div>
               <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">Líquido Salão</p>
               <h3 className="text-3xl font-black text-gray-300 mt-1">R$ {totalSalao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            </div>
         </div>
      </div>

      {/* Lista de Vendas e Repasses */}
      <div className="bg-[#121021] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
         <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-white/50">Detalhamento de Repasses</h3>
            <button 
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-[#5E41FF]/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5"
            >
               <FileSpreadsheet size={14} className="text-[#5E41FF]" /> Exportar Relatório
            </button>
         </div>
         
         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                     <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Data</th>
                     <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Cliente</th>
                     <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Valor Venda</th>
                     <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Comissão (50%)</th>
                     <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Status</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                  {filteredSales.map((sale, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.01] transition-colors group">
                       <td className="p-6">
                          <span className="text-xs font-bold text-gray-400 group-hover:text-white transition-colors">
                             {format(parseISO(sale.created_at), 'dd/MM/yyyy HH:mm')}
                          </span>
                       </td>
                       <td className="p-6">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center font-bold text-[10px] border border-white/5 group-hover:border-[#5E41FF]/30 transition-all">
                                {sale.customers?.name?.charAt(0) || 'C'}
                             </div>
                             <span className="text-sm font-bold text-white/90 group-hover:text-white">{sale.customers?.name || 'Cliente'}</span>
                          </div>
                       </td>
                       <td className="p-6">
                          <span className="text-sm font-bold text-white">R$ {(sale.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                       </td>
                       <td className="p-6">
                          <span className="text-sm font-extrabold text-[#5E41FF]">R$ {((sale.amount || 0) * 0.5).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                       </td>
                       <td className="p-6 text-right">
                          <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[9px] font-black uppercase tracking-tighter">Liquidado</span>
                       </td>
                    </tr>
                  ))}
                  {filteredSales.length === 0 && (
                    <tr>
                       <td colSpan={5} className="p-20 text-center text-gray-600 font-bold uppercase tracking-widest text-[10px] italic">Nenhuma venda encontrada no período.</td>
                    </tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  )
}

