'use client'

import { useEffect, useState } from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Download,
  AlertCircle,
  CheckCircle2,
  PieChart,
  FileSpreadsheet
} from 'lucide-react'
import { getSales, getExpenses } from '@/app/actions/admin'
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function RelatoriosPage() {
  const [sales, setSales] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  })

  async function loadData() {
    setLoading(true)
    const [salesData, expensesData] = await Promise.all([
      getSales(),
      getExpenses()
    ])
    setSales(salesData)
    setExpenses(expensesData)
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
    const headers = ['Data', 'Tipo', 'Descrição', 'Valor']
    const rows = [
      ...filteredSales.map(s => [format(parseISO(s.created_at), 'dd/MM/yyyy'), 'Entrada', `Venda ${s.customers?.name || ''}`, s.amount]),
      ...filteredExpenses.map(e => [format(parseISO(e.date), 'dd/MM/yyyy'), 'Saída', e.description, e.amount])
    ]

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `relatorio_${format(dateRange.start, 'MM_yyyy')}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Filtragem por Período
  const filteredSales = sales.filter(s => isWithinInterval(parseISO(s.created_at), { start: dateRange.start, end: dateRange.end }))
  const filteredExpenses = expenses.filter(e => isWithinInterval(parseISO(e.date), { start: dateRange.start, end: dateRange.end }))

  // Cálculos Financeiros
  const faturamentoBruto = filteredSales.reduce((acc, s) => acc + (s.amount || 0), 0)
  const totalComissoes = faturamentoBruto * 0.5 // Base 50%
  const totalDespesas = filteredExpenses.reduce((acc, e) => acc + (e.amount || 0), 0)
  
  const totalSaidas = totalComissoes + totalDespesas
  const lucroLiquido = faturamentoBruto - totalSaidas
  const margemLucro = faturamentoBruto > 0 ? (lucroLiquido / faturamentoBruto) * 100 : 0

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 space-y-4">
       <div className="w-8 h-8 border-2 border-[#5E41FF]/30 border-t-[#5E41FF] rounded-full animate-spin" />
       <p className="text-gray-500 font-medium italic opacity-60">Gerando relatório financeiro...</p>
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">Relatório Financeiro</h1>
          <p className="text-[10px] text-gray-500 font-extrabold uppercase tracking-[0.2em] mt-1">DRE Completa: Entradas, Saídas e Lucratividade</p>
        </div>
        
        <div className="flex items-center gap-4 bg-[#121021] border border-white/5 p-2 rounded-3xl shadow-xl">
           <button onClick={handlePrevMonth} className="p-2 hover:bg-white/5 rounded-2xl text-gray-500 transition-all hover:text-white"><ChevronLeft size={20} /></button>
           <div className="px-6 flex items-center gap-3">
              <CalendarIcon size={16} className="text-[#5E41FF]" />
              <span className="text-[11px] font-black uppercase tracking-widest text-white">
                 {format(dateRange.start, "MMMM yyyy", { locale: ptBR })}
              </span>
           </div>
           <button onClick={handleNextMonth} className="p-2 hover:bg-white/5 rounded-2xl text-gray-500 transition-all hover:text-white"><ChevronRight size={20} /></button>
        </div>
      </div>

      {/* Grid de Performance Financeira */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         <div className="p-8 rounded-[2.5rem] bg-[#121021] border border-white/5 relative overflow-hidden group shadow-2xl">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-all" />
            <TrendingUp size={18} className="text-emerald-500 mb-4" />
            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Entradas Brutas</p>
            <h3 className="text-2xl font-black text-white">R$ {faturamentoBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
         </div>

         <div className="p-8 rounded-[2.5rem] bg-[#121021] border border-white/5 relative overflow-hidden group shadow-2xl">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-500/5 rounded-full blur-3xl group-hover:bg-red-500/10 transition-all" />
            <TrendingDown size={18} className="text-red-500 mb-4" />
            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Gastos Totais</p>
            <h3 className="text-2xl font-black text-white">R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
         </div>

         <div className="p-8 rounded-[2.5rem] bg-[#121021] border border-white/5 relative overflow-hidden group shadow-2xl">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-all" />
            <PieChart size={18} className="text-blue-500 mb-4" />
            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Comissões (50%)</p>
            <h3 className="text-2xl font-black text-white">R$ {totalComissoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
         </div>

         <div className={`p-8 rounded-[2.5rem] border relative overflow-hidden group shadow-2xl ${lucroLiquido >= 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
            <DollarSign size={18} className={`${lucroLiquido >= 0 ? 'text-emerald-500' : 'text-red-500'} mb-4`} />
            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Lucro Líquido</p>
            <h3 className={`text-2xl font-black ${lucroLiquido >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
               R$ {lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
         </div>
      </div>

      {/* Seção de Análise */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="bg-[#121021] border border-white/5 rounded-[3rem] p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-8">
               <h3 className="text-sm font-black uppercase tracking-widest text-white/80">Saúde do Negócio</h3>
               <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${margemLucro > 30 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                  {margemLucro.toFixed(1)}% Margem de Lucro
               </span>
            </div>
            
            <div className="space-y-6">
               <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase text-gray-500">
                     <span>Faturamento</span>
                     <span className="text-white">100%</span>
                  </div>
                  <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                     <div className="h-full bg-[#5E41FF]" style={{ width: '100%' }} />
                  </div>
               </div>

               <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase text-gray-500">
                     <span>Comissões</span>
                     <span className="text-white">{faturamentoBruto > 0 ? ((totalComissoes / faturamentoBruto) * 100).toFixed(0) : 0}%</span>
                  </div>
                  <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                     <div className="h-full bg-blue-500" style={{ width: faturamentoBruto > 0 ? `${(totalComissoes / faturamentoBruto) * 100}%` : '0%' }} />
                  </div>
               </div>

               <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase text-gray-500">
                     <span>Despesas Diretas</span>
                     <span className="text-white">{faturamentoBruto > 0 ? ((totalDespesas / faturamentoBruto) * 100).toFixed(0) : 0}%</span>
                  </div>
                  <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                     <div className="h-full bg-red-500" style={{ width: faturamentoBruto > 0 ? `${(totalDespesas / faturamentoBruto) * 100}%` : '0%' }} />
                  </div>
               </div>
            </div>
         </div>

         <div className="bg-[#121021] border border-white/5 rounded-[3rem] p-10 shadow-2xl flex flex-col justify-center items-center text-center space-y-6">
            <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center text-gray-500 border border-white/5">
               <BarChart3 size={32} />
            </div>
            <div className="space-y-2">
               <h4 className="text-xl font-black text-white italic uppercase tracking-tighter">Resumo de Performance</h4>
               <p className="text-xs text-gray-500 font-bold max-w-[300px] leading-relaxed mx-auto uppercase tracking-widest opacity-60">
                  Seu lucro este mês é de <span className="text-white">R$ {lucroLiquido.toLocaleString('pt-BR')}</span> após todas as deduções de equipe e custos operacionais.
               </p>
            </div>
            <button 
              onClick={exportToCSV}
              className="flex items-center gap-3 px-10 py-5 bg-white/5 hover:bg-[#5E41FF]/10 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all border border-white/5 hover:border-[#5E41FF]/20"
            >
               <FileSpreadsheet size={14} className="text-[#5E41FF]" /> Exportar Planilha (CSV)
            </button>
         </div>
      </div>
    </div>
  )
}

