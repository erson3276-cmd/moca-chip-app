'use client'

import { useEffect, useState } from 'react'
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  User,
  CheckCircle2,
  X,
  Save,
  Loader2,
  Scissors,
  MoreVertical,
  QrCode,
  CreditCard,
  Banknote,
  DollarSign,
  Trash2,
  Check,
  RefreshCw,
  Zap,
  Phone
} from 'lucide-react'
import { 
  addAppointment, 
  getAppointments, 
  getCustomers, 
  getServices, 
  completeAppointmentCheckout,
  updateAppointmentStatus,
  deleteAppointment
} from '@/app/actions/admin'
import { 
  format, 
  addDays, 
  startOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  parseISO, 
  addMinutes,
  isToday,
  startOfDay,
  endOfDay,
  toUTCString
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function AgendaPage() {
  const [appointments, setAppointments] = useState<any[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'dia' | 'semana'>('semana')
  
  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  
  const [saving, setSaving] = useState(false)
  const [customers, setCustomers] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [selectedApt, setSelectedApt] = useState<any>(null)

  const [formData, setFormData] = useState({
    customerId: '',
    serviceId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '10:00'
  })

  const [checkoutData, setCheckoutData] = useState({
    paymentMethod: 'Pix'
  })

  // Configuração da Grade Premium
  const start = startOfWeek(currentDate, { weekStartsOn: 1 })
  const end = addDays(start, 6)
  const days = eachDayOfInterval({ start, end })
  const hours = Array.from({ length: 24 * 2 }, (_, i) => ({
    h: Math.floor(i / 2), // Das 00h às 23h
    m: i % 2 === 0 ? '00' : '30'
  }))

  async function fetchData() {
    setLoading(true)
    try {
      const [apts, custs, servs] = await Promise.all([
        getAppointments(),
        getCustomers(),
        getServices()
      ])
      // Filter out invalid dates or parse properly
      setAppointments(apts || [])
      setCustomers(custs || [])
      setServices(servs || [])
    } catch(e) {
      console.error("Fetch error:", e)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [currentDate])

  // Fuso horário de Brasília (UTC-3)
  const TIMEZONE = 'America/Sao_Paulo'

  // Converter UTC para Brasília e obter hora
  const getBrasiliaHour = (dateStr: string) => {
    const d = parseISO(dateStr)
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: TIMEZONE,
      hour: '2-digit',
      hour12: false,
      minute: '2-digit'
    })
    const parts = formatter.formatToParts(d)
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0')
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0')
    return { hour, minute }
  }

  // Formatar data para Brasília
  const formatBrasilia = (dateStr: string, formatStr: string) => {
    return format(parseISO(dateStr), formatStr, { timeZone: TIMEZONE })
  }

  // Lógica de Renderização de Cartões (Top e Height) - usando hora de Brasília
  const getCardPosition = (startTimeStr: string, duration: number) => {
    const { hour, minute } = getBrasiliaHour(startTimeStr)
    const hourStart = 0
    const minutesFromStartOfDay = (hour - hourStart) * 60 + minute
    
    const top = (minutesFromStartOfDay / 30) * 64
    const height = (duration / 30) * 64
    return { top: `${top}px`, height: `${Math.max(height - 2, 20)}px` }
  }

  // Filtrar agendamentos do dia (usando Brasília)
  const isSameDayBrasilia = (dateStr: string, day: Date) => {
    const aptDateStr = formatBrasilia(dateStr, 'yyyy-MM-dd')
    const dayStr = format(day, 'yyyy-MM-dd', { timeZone: TIMEZONE })
    return aptDateStr === dayStr
  }

  // Nova lógica de detecção de sobreposição - agrupa agendamentos que conflitam
  const getDailyAppointments = (day: Date) => {
    const dayApts = appointments.filter(apt => isSameDayBrasilia(apt.start_time, day))
    
    // Ordenar por horário de início
    dayApts.sort((a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime())
    
    // Calcular end_time para cada agendamento baseado na duração do serviço
    const aptsWithEnd = dayApts.map(apt => {
      const duration = apt.services?.duration_minutes || 60
      const startMs = parseISO(apt.start_time).getTime()
      const endMs = apt.end_time ? parseISO(apt.end_time).getTime() : startMs + (duration * 60 * 1000)
      return { ...apt, aptStart: startMs, aptEnd: endMs, duration }
    })

    // Agrupar agendamentos em "tracks" (faixas) para evitar sobreposição
    const tracks: any[] = []
    const results: any[] = []

    aptsWithEnd.forEach(apt => {
      // Encontrar uma track onde este agendamento cabe (não conflita)
      let placedInTrack = -1
      
      for (let i = 0; i < tracks.length; i++) {
        const trackEnd = tracks[i]
        // Se o início deste apt é >= ao fim da última track, cabe nela
        if (apt.aptStart >= trackEnd) {
          placedInTrack = i
          break
        }
      }

      if (placedInTrack === -1) {
        // Criar nova track
        tracks.push(apt.aptEnd)
        placedInTrack = tracks.length - 1
      } else {
        // Atualizar fim da track existente
        tracks[placedInTrack] = Math.max(tracks[placedInTrack], apt.aptEnd)
      }

      results.push({ ...apt, trackIndex: placedInTrack, totalTracks: tracks.length })
    })

    return results
  }

  const handleCancelApt = async (id: string) => {
    if (!confirm('Deseja realmente cancelar este agendamento?')) return
    try {
      await updateAppointmentStatus(id, 'cancelado')
      await fetchData()
    } catch(e) { alert("Erro ao cancelar") }
  }

  const handleDeleteApt = async (id: string) => {
    if (!confirm('Deseja EXCLUIR permanentemente este registro?')) return
    try {
      await deleteAppointment(id)
      await fetchData()
    } catch(e) { alert("Erro ao excluir") }
  }

  const handleCheckout = async () => {
    if (!selectedApt) return
    setSaving(true)
    try {
      await completeAppointmentCheckout(selectedApt.id, {
        customer_id: selectedApt.customer_id,
        service_id: selectedApt.service_id,
        amount: selectedApt.services?.price || 0,
        payment_method: checkoutData.paymentMethod,
        date: new Date().toISOString()
      })
      setIsCheckoutOpen(false)
      setSelectedApt(null)
      await fetchData()
    } catch(e) { alert("Erro no checkout") }
    setSaving(false)
  }

  const handleSaveAppointment = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const selectedService = services.find(s => s.id === formData.serviceId)
      const startIso = `${formData.date}T${formData.time}:00`
      const endIso = addMinutes(parseISO(startIso), selectedService?.duration_minutes || 60).toISOString()
      
      const res = await addAppointment({
        customer_id: formData.customerId,
        service_id: formData.serviceId,
        start_time: startIso,
        end_time: endIso,
        status: 'agendado'
      })
      
      if (res.error) throw new Error(res.error)
      
      setIsModalOpen(false)
      await fetchData()
    } catch(e: any) { alert("Erro: " + e.message) }
    setSaving(false)
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-1000 pb-20">
      
      {/* Premium Agenda Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-[#121021] p-8 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group">
         <div className="absolute inset-0 bg-gradient-to-tr from-[#5E41FF]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
         
         <div className="flex items-center gap-6 relative z-10">
            <div className="w-16 h-16 rounded-[2rem] bg-[#5E41FF] flex items-center justify-center shadow-2xl shadow-[#5E41FF]/40 border border-white/10 ring-4 ring-[#5E41FF]/10">
               <CalendarIcon size={32} className="text-white" />
            </div>
            <div>
               <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white">Agenda Executiva</h1>
               <div className="flex items-center gap-3 mt-1.5">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">Sincronizado</span>
                  <div className="w-1 h-1 rounded-full bg-white/20" />
                  <p className="text-sm font-bold text-gray-500 italic">{format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}</p>
               </div>
            </div>
         </div>

         <div className="flex flex-wrap items-center gap-4 relative z-10">
            <div className="flex items-center bg-black/40 p-1.5 rounded-2xl border border-white/5 mr-4">
               <button onClick={() => setView('dia')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'dia' ? 'bg-[#5E41FF] text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Dia</button>
               <button onClick={() => setView('semana')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'semana' ? 'bg-[#5E41FF] text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Semana</button>
            </div>
            
            <div className="flex items-center gap-2">
               <button onClick={() => setCurrentDate(addDays(currentDate, -1))} className="p-4 bg-white/5 text-white rounded-2xl hover:bg-white/10 border border-white/5 transition-all"><ChevronLeft size={20} /></button>
               <button onClick={() => setCurrentDate(new Date())} className="px-6 py-4 bg-white/5 text-[10px] font-black uppercase tracking-widest text-white rounded-2xl border border-white/5 hover:bg-white/10 transition-all">Hoje</button>
               <button onClick={() => setCurrentDate(addDays(currentDate, 1))} className="p-4 bg-white/5 text-white rounded-2xl hover:bg-white/10 border border-white/5 transition-all"><ChevronRight size={20} /></button>
            </div>
            
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-3 px-8 py-4 bg-[#5E41FF] text-white rounded-3xl text-[11px] font-black uppercase tracking-widest shadow-2xl shadow-[#5E41FF]/30 hover:scale-[1.02] active:scale-95 transition-all outline-none"
            >
              <Plus size={20} /> Novo Atendimento
            </button>
         </div>
      </div>

      {/* Main Agenda Grid */}
      <div className="bg-[#121021] border border-white/5 rounded-[3.5rem] shadow-2xl overflow-hidden relative">
         
          {/* Days Header */}
          <div className="grid grid-cols-[100px_1fr] border-b border-white/5 bg-black/20">
             <div className="h-20 border-r border-white/5 flex items-center justify-center">
                <Clock size={20} className="text-gray-600" />
             </div>
             <div className={`grid ${view === 'dia' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-7'}`}>
                {(view === 'semana' ? days : [currentDate]).map(day => (
                 <div key={day.toString()} className={`py-6 flex flex-col items-center justify-center border-r border-white/5 relative ${isToday(day) ? 'bg-[#5E41FF]/5' : ''}`}>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-1">{format(day, 'EEE', { locale: ptBR })}</span>
                    <span className={`text-2xl font-black italic tracking-tighter ${isToday(day) ? 'text-[#5E41FF]' : 'text-white'}`}>{format(day, 'dd')}</span>
                    {isToday(day) && <div className="absolute bottom-2 w-1 h-1 rounded-full bg-[#5E41FF]" />}
                 </div>
               ))}
            </div>
         </div>

          {/* Time Grid with Scroll */}
          <div className="h-[1500px] overflow-y-auto no-scrollbar relative select-none bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
            
            <div className="grid grid-cols-[100px_1fr] relative">
               
               {/* Time Column */}
               <div className="relative z-20 bg-[#121021]/80 backdrop-blur-sm border-r border-white/5">
                  {hours.map(h => (
                    <div key={`${h.h}:${h.m}`} className="h-[64px] flex items-start justify-center pt-2">
                       <span className={`text-[11px] font-bold tracking-tight ${h.m === '00' ? 'text-gray-400' : 'text-gray-700'}`}>{h.h}:{h.m}</span>
                    </div>
                  ))}
               </div>

               {/* Appointments Cells */}
               <div className={`grid ${view === 'dia' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-7'} relative`}>
                  
                  {/* Grid Lines Overlay */}
                  <div className="absolute inset-0 pointer-events-none">
                     {hours.map(h => (
                        <div key={`line-${h.h}:${h.m}`} className={`h-[64px] border-b border-white/${h.m === '00' ? '5' : '1'}`} />
                     ))}
                  </div>

                   {(view === 'semana' ? days : [currentDate]).map((day, dIdx) => (
                     <div key={`col-${dIdx}`} className="relative group/col border-r border-white/[0.03]">
                        {getDailyAppointments(day).map(apt => {
                           const style = getCardPosition(apt.start_time, apt.duration || 60)
                           const isCancelled = apt.status === 'cancelado'
                           const isFinished = apt.status === 'finalizado'
                           
                           // Calcular largura e posição baseados nas tracks
                           const width = apt.totalTracks > 1 ? (100 / apt.totalTracks) : 100
                           const left = apt.trackIndex * width

                           return (
                             <div 
                               key={apt.id}
                               style={{ ...style, width: `${width}%`, left: `${left}%` }}
                               className={`absolute p-1 z-30 transition-all duration-300 group/card ${isCancelled ? 'opacity-40 grayscale' : 'hover:z-50 hover:scale-[1.02]'}`}
                             >
                               <div className={`h-full w-full rounded-2xl border p-3 flex flex-col justify-between overflow-hidden shadow-xl
                                  ${isFinished ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-100 shadow-emerald-500/10' : 
                                    isCancelled ? 'bg-gray-800/20 border-gray-700 text-gray-500' : 
                                    'bg-[#5E41FF]/20 border-[#5E41FF]/30 text-white shadow-[#5E41FF]/10'}
                               `}>
                                  
                                  {/* Card Header */}
                                  <div className="space-y-1">
                                     <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1 opacity-70">
                                           <Clock size={10} /> {formatBrasilia(apt.start_time, 'HH:mm')}
                                        </span>
                                        {isFinished && <CheckCircle2 size={14} className="text-emerald-500" />}
                                     </div>
                                     <h4 className="text-[13px] font-black italic uppercase leading-none tracking-tight truncate">{apt.services?.name || 'Serviço'}</h4>
                                     <div className="flex items-center gap-1.5 mt-1">
                                        <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center border border-white/5 scale-90">
                                           <User size={10} />
                                        </div>
                                        <span className="text-[10px] font-bold truncate opacity-80">{apt.customers?.name || 'Cliente'}</span>
                                     </div>
                                  </div>

                                  {/* Card Actions (Premium & High Contrast) */}
                                  {!isFinished && !isCancelled && (
                                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5">
                                       <button 
                                         onClick={() => { setSelectedApt(apt); setIsCheckoutOpen(true); }}
                                         className="flex-1 h-9 bg-white text-black rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-400 hover:text-black transition-all flex items-center justify-center gap-1 shadow-lg active:scale-90"
                                       >
                                          Checkout
                                       </button>
                                       <button 
                                         onClick={() => handleCancelApt(apt.id)}
                                         className="w-9 h-9 bg-red-600 text-white rounded-xl flex items-center justify-center hover:bg-red-500 transition-all shadow-lg active:scale-90"
                                       >
                                          <X size={16} />
                                       </button>
                                       <button 
                                         onClick={() => handleDeleteApt(apt.id)}
                                         className="w-9 h-9 bg-white/10 text-gray-400 rounded-xl flex items-center justify-center hover:text-white hover:bg-white/20 transition-all border border-white/5 active:scale-90"
                                       >
                                          <Trash2 size={14} />
                                       </button>
                                    </div>
                                  )}
                               </div>
                            </div>
                          )
                       })}
                    </div>
                  ))}
               </div>
            </div>
         </div>
      </div>

      {/* MODAL: NOVO AGENDAMENTO PREMIUM */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center lg:justify-end animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setIsModalOpen(false)} />
           
           <div className="relative w-full h-full lg:w-[500px] bg-[#121021] border-l border-white/10 shadow-2xl flex flex-col slide-in-from-right duration-500">
              
              <div className="p-8 border-b border-white/5 text-white bg-black/20 flex items-center justify-between">
                 <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-[1.5rem] bg-[#5E41FF]/10 flex items-center justify-center text-[#5E41FF] border border-[#5E41FF]/20 shadow-inner">
                       <Zap size={28} />
                    </div>
                    <div>
                       <h2 className="text-2xl font-black italic uppercase tracking-tighter">Entrada Agendada</h2>
                       <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Gestão de Agenda VIP</p>
                    </div>
                 </div>
                 <button onClick={() => setIsModalOpen(false)} className="p-3 text-gray-500 hover:text-white rounded-full bg-white/5 transition-all"><X size={24} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-12 no-scrollbar text-white">
                 <form onSubmit={handleSaveAppointment} className="space-y-10">
                    
                    <div className="space-y-4">
                       <label className="text-[11px] font-black uppercase tracking-widest text-[#5E41FF]">Identificação da Cliente</label>
                       <div className="relative group">
                          <select 
                            required
                            value={formData.customerId}
                            onChange={e => setFormData({...formData, customerId: e.target.value})}
                            className="w-full bg-black/40 text-white border border-white/5 rounded-3xl px-8 py-6 outline-none focus:border-[#5E41FF]/40 transition-all text-sm font-bold appearance-none cursor-pointer shadow-inner"
                          >
                             <option value="">Selecione sua Cliente VIP...</option>
                             {customers.map(c => (
                               <option key={c.id} value={c.id} className="bg-[#121021]">{c.name} {c.whatsapp ? `(${c.whatsapp})` : ''}</option>
                             ))}
                          </select>
                          <User className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-600 group-hover:text-[#5E41FF] transition-colors pointer-events-none" size={20} />
                       </div>
                    </div>

                    <div className="space-y-4">
                       <label className="text-[11px] font-black uppercase tracking-widest text-[#5E41FF]">Seleção de Serviço</label>
                       <div className="relative group">
                          <select 
                            required
                            value={formData.serviceId}
                            onChange={e => setFormData({...formData, serviceId: e.target.value})}
                            className="w-full bg-black/40 text-white border border-white/5 rounded-3xl px-8 py-6 outline-none focus:border-[#5E41FF]/40 transition-all text-sm font-bold appearance-none cursor-pointer shadow-inner"
                          >
                             <option value="">Escolha o Procedimento...</option>
                             {services.map(s => (
                               <option key={s.id} value={s.id} className="bg-[#121021]">{s.name} - R$ {s.price?.toLocaleString()} ({s.duration_minutes}m)</option>
                             ))}
                          </select>
                          <Scissors className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-600 group-hover:text-[#5E41FF] transition-colors pointer-events-none" size={20} />
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                       <div className="space-y-4">
                          <label className="text-[11px] font-black uppercase tracking-widest text-emerald-500">Data Master</label>
                          <input 
                            required
                            type="date"
                            value={formData.date}
                            onChange={e => setFormData({...formData, date: e.target.value})}
                            className="w-full bg-black/40 border border-white/5 rounded-3xl px-8 py-6 outline-none focus:border-[#5E41FF]/40 transition-all text-sm font-bold shadow-inner color-scheme-dark"
                          />
                       </div>
                       <div className="space-y-4">
                          <label className="text-[11px] font-black uppercase tracking-widest text-orange-500">Horário Nobre</label>
                          <input 
                            required
                            type="time"
                            value={formData.time}
                            onChange={e => setFormData({...formData, time: e.target.value})}
                            className="w-full bg-black/40 border border-white/5 rounded-3xl px-8 py-6 outline-none focus:border-[#5E41FF]/40 transition-all text-sm font-bold shadow-inner color-scheme-dark"
                          />
                       </div>
                    </div>
                 </form>
              </div>

              <div className="p-10 bg-black/40 border-t border-white/5">
                 <button 
                   onClick={handleSaveAppointment}
                   disabled={saving || !formData.customerId || !formData.serviceId}
                   className="w-full py-7 bg-[#5E41FF] text-white rounded-[2rem] text-[12px] font-black uppercase tracking-[0.2em] shadow-[0_20px_50px_-20px_rgba(94,65,255,0.8)] hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:grayscale transition-all flex items-center justify-center gap-4"
                 >
                    {saving ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />}
                    Confirmar Reserva Executiva
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL: CHECKOUT PREMIUM */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center lg:justify-end animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setIsCheckoutOpen(false)} />
           
           <div className="relative w-full h-full lg:w-[500px] bg-[#121021] border-l border-white/10 shadow-2xl flex flex-col slide-in-from-right duration-500">
              
              <div className="p-10 border-b border-white/5 text-white bg-black/20 flex flex-col gap-2">
                 <div className="flex items-center justify-between">
                    <h2 className="text-3xl font-black italic uppercase tracking-tighter">Finalizar Venda</h2>
                    <button onClick={() => setIsCheckoutOpen(false)} className="p-3 text-gray-500 hover:text-white rounded-full bg-white/5 transition-all"><X size={24} /></button>
                 </div>
                 <p className="text-[10px] text-[#5E41FF] font-black uppercase tracking-[0.2em] mt-2">Emissão de Comprovante & Venda Digital</p>
              </div>

              <div className="flex-1 overflow-y-auto p-12 space-y-12 no-scrollbar text-white">
                 <div className="bg-black/40 p-8 rounded-[2.5rem] border border-white/5 shadow-inner">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-600 mb-2">Total a Receber</p>
                    <div className="flex items-center justify-between">
                       <span className="text-4xl font-black italic tracking-tighter text-emerald-400">
                          {selectedApt?.services?.price?.toLocaleString('pt-BR', { minimumFractionDigits: 2, style: 'currency', currency: 'BRL' })}
                       </span>
                       <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                          <DollarSign size={28} />
                       </div>
                    </div>
                 </div>

                 <div className="space-y-6">
                    <label className="text-[11px] font-black uppercase tracking-widest text-[#5E41FF]">Forma de Pagamento</label>
                    <div className="grid grid-cols-2 gap-4">
                       {[
                         { id: 'Pix', icon: <QrCode size={18}/> },
                         { id: 'Crédito', icon: <CreditCard size={18}/> },
                         { id: 'Débito', icon: <Banknote size={18}/> },
                         { id: 'Dinheiro', icon: <DollarSign size={18}/> }
                       ].map(method => (
                         <button 
                           key={method.id}
                           onClick={() => setCheckoutData({...checkoutData, paymentMethod: method.id})}
                           className={`p-6 rounded-3xl border transition-all flex flex-col items-center gap-3 ${checkoutData.paymentMethod === method.id ? 'bg-[#5E41FF] border-[#5E41FF] text-white shadow-xl shadow-[#5E41FF]/30' : 'bg-black/20 border-white/5 text-gray-500 hover:border-white/20'}`}
                         >
                            {method.icon}
                            <span className="text-[10px] font-black uppercase tracking-widest">{method.id}</span>
                         </button>
                       ))}
                    </div>
                 </div>
              </div>

              <div className="p-12 bg-black/40 border-t border-white/5">
                 <button 
                   onClick={handleCheckout}
                   disabled={saving}
                   className="w-full py-7 bg-emerald-500 text-black rounded-[2rem] text-[12px] font-black uppercase tracking-[0.2em] shadow-[0_20px_50px_-20px_rgba(16,185,129,0.8)] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-4"
                 >
                    {saving ? <Loader2 size={24} className="animate-spin" /> : <CheckCircle2 size={24} />}
                    Marcar como Pago & Finalizar
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  )
}
