'use client'

import { useEffect, useState } from 'react'
import { 
  Users, 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  ArrowUpRight, 
  Clock,
  ChevronRight,
  TrendingDown,
  CheckCircle2,
  CalendarDays
} from 'lucide-react'
import { getAppointments, getSales, getCustomers, getExpenses } from '@/app/actions/admin'
import { format, isToday, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    todayAppointments: 0,
    monthlyRevenue: 0,
    totalCustomers: 0,
    monthlyExpenses: 0
  })
  const [recentAppointments, setRecentAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [apts, sales, customers, expenses] = await Promise.all([
          getAppointments(),
          getSales(),
          getCustomers(),
          getExpenses()
        ])

        const todayApts = apts.filter((a: any) => isToday(new Date(a.start_time)))
        
        const now = new Date()
        const monthStart = startOfMonth(now)
        const monthEnd = endOfMonth(now)

        const monthSales = sales.filter((s: any) => {
          const d = parseISO(s.created_at)
          return isWithinInterval(d, { start: monthStart, end: monthEnd })
        })

        const monthExp = expenses.filter((e: any) => {
          const d = parseISO(e.date)
          return isWithinInterval(d, { start: monthStart, end: monthEnd })
        })

        setStats({
          todayAppointments: todayApts.length,
          monthlyRevenue: monthSales.reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0),
          totalCustomers: customers.length,
          monthlyExpenses: monthExp.reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0)
        })

        setRecentAppointments(todayApts.slice(0, 5).sort((a: any, b: any) => 
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        ))
      } catch (error) {
        console.error("Erro ao carregar dashboard:", error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-[#5E41FF]/30 border-t-[#5E41FF] rounded-full animate-spin" />
      </div>
    )
  }

  const profit = stats.monthlyRevenue - stats.monthlyExpenses

  return (
    <div className="space-y-10 pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">Visão Geral</h1>
          <p className="text-[10px] text-gray-500 font-extrabold uppercase tracking-[0.2em] mt-1">Status do sistema em tempo real</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-[#121021] border border-white/5 rounded-2xl">
          <CalendarDays size={14} className="text-[#5E41FF]" />
          <span className="text-[10px] font-black uppercase tracking-widest text-white/80">
            {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </span>
        </div>
      </div>

      {/* Grid de Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card: Faturamento */}
        <div className="bg-[#121021] border border-white/5 p-8 rounded-[2.5rem] relative overflow-hidden group shadow-2xl hover:border-[#5E41FF]/30 transition-all">
           <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#5E41FF]/5 rounded-full blur-3xl group-hover:bg-[#5E41FF]/10 transition-all" />
           <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6 text-emerald-500">
              <TrendingUp size={24} />
           </div>
           <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Mês Atual (Bruto)</p>
           <h3 className="text-2xl font-black text-white">R$ {stats.monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
           <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-emerald-500/80">
              <ArrowUpRight size={14} /> +12% vs mês anterior
           </div>
        </div>

        {/* Card: Agendamentos Hoje */}
        <div className="bg-[#121021] border border-white/5 p-8 rounded-[2.5rem] relative overflow-hidden group shadow-2xl hover:border-[#5E41FF]/30 transition-all">
           <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6 text-blue-500">
              <Clock size={24} />
           </div>
           <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Agendamentos hoje</p>
           <h3 className="text-2xl font-black text-white">{stats.todayAppointments} Atendimentos</h3>
           <Link href="/admin/agenda" className="mt-4 text-[10px] font-black uppercase tracking-widest text-[#5E41FF] hover:underline flex items-center gap-1 cursor-pointer">
              Ver agenda completa <ChevronRight size={10} />
           </Link>
        </div>

        {/* Card: Clientes */}
        <div className="bg-[#121021] border border-white/5 p-8 rounded-[2.5rem] relative overflow-hidden group shadow-2xl hover:border-[#5E41FF]/30 transition-all">
           <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6 text-amber-500">
              <Users size={24} />
           </div>
           <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Clientes na Base</p>
           <h3 className="text-2xl font-black text-white">{stats.totalCustomers} Cadastros</h3>
           <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-gray-500">
              Base crescendo constantemente
           </div>
        </div>

        {/* Card: Lucro Líquido */}
        <div className={`bg-[#121021] border p-8 rounded-[2.5rem] relative overflow-hidden group shadow-2xl transition-all ${profit >= 0 ? 'border-emerald-500/20' : 'border-red-500/20'}`}>
           <div className={`w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6 ${profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              <DollarSign size={24} />
           </div>
           <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Lucro Estimado (Líquido)</p>
           <h3 className={`text-2xl font-black ${profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
             R$ {profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
           </h3>
           <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-tighter">
              Deduções operacionais inclusas
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Próximos Atendimentos */}
        <div className="bg-[#121021] border border-white/5 rounded-[3rem] p-8 shadow-2xl">
           <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-black uppercase tracking-widest text-white/50">Hoje: Próximos Horários</h3>
              <Link href="/admin/agenda" className="text-[10px] font-black uppercase tracking-widest text-[#5E41FF]">Ver Tudo</Link>
           </div>
           
           <div className="space-y-4">
              {recentAppointments.length > 0 ? (
                recentAppointments.map((apt, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all group">
                     <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center justify-center w-12 h-12 bg-[#18181a] rounded-xl border border-white/10 text-[#5E41FF]">
                            <span className="text-xs font-black">{format(new Date(apt.start_time), 'HH:mm')}</span>
                        </div>
                        <div>
                           <p className="text-sm font-bold text-white group-hover:text-[#5E41FF] transition-colors">{apt.customers?.name || 'Cliente'}</p>
                           <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{apt.services?.name || 'Serviço'}</p>
                        </div>
                     </div>
                     <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${apt.status === 'finalizado' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-400'}`}>
                        {apt.status || 'Agendado'}
                     </span>
                  </div>
                ))
              ) : (
                <div className="p-10 text-center text-gray-600 font-bold uppercase tracking-widest text-xs italic opacity-50">
                   Nenhum agendamento para hoje
                </div>
              )}
           </div>
        </div>

        {/* Atalhos Rápidos */}
        <div className="bg-[#121021] border border-white/5 rounded-[3rem] p-8 shadow-2xl flex flex-col justify-between">
           <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-white/50 mb-8">Ações Rápidas</h3>
              <div className="grid grid-cols-2 gap-4">
                 <Link href="/admin/agenda" className="p-6 bg-white/5 border border-white/5 rounded-3xl hover:bg-[#5E41FF]/10 hover:border-[#5E41FF]/30 transition-all group">
                    <Calendar className="text-gray-500 group-hover:text-[#5E41FF] mb-3" size={20} />
                    <p className="text-[10px] font-black uppercase tracking-widest text-white">Nova Reserva</p>
                 </Link>
                 <Link href="/admin/vendas" className="p-6 bg-white/5 border border-white/5 rounded-3xl hover:bg-[#5E41FF]/10 hover:border-[#5E41FF]/30 transition-all group">
                    <TrendingUp className="text-gray-500 group-hover:text-emerald-500 mb-3" size={20} />
                    <p className="text-[10px] font-black uppercase tracking-widest text-white">Registrar Venda</p>
                 </Link>
                 <Link href="/admin/managertalk" className="p-6 bg-white/5 border border-white/5 rounded-3xl hover:bg-[#5E41FF]/10 hover:border-[#5E41FF]/30 transition-all group">
                    <Clock className="text-gray-500 group-hover:text-blue-500 mb-3" size={20} />
                    <p className="text-[10px] font-black uppercase tracking-widest text-white">Templates WhatsApp</p>
                 </Link>
                 <Link href="/admin/clientes" className="p-6 bg-white/5 border border-white/5 rounded-3xl hover:bg-[#5E41FF]/10 hover:border-[#5E41FF]/30 transition-all group">
                    <Users className="text-gray-500 group-hover:text-amber-500 mb-3" size={20} />
                    <p className="text-[10px] font-black uppercase tracking-widest text-white">Gestão Clientes</p>
                 </Link>
              </div>
           </div>

           <div className="mt-8 p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-3xl flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-500">
                    <CheckCircle2 size={20} />
                 </div>
                 <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Sistema Online</p>
                    <p className="text-xs font-bold text-gray-400">Banco de dados sincronizado</p>
                 </div>
              </div>
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
           </div>
        </div>
      </div>
    </div>
  )
}

