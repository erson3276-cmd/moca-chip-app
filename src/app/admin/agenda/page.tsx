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
  DollarSign
} from 'lucide-react'
import { addAppointment, getAppointments, getCustomers, getServices, completeAppointmentCheckout } from '@/app/actions/admin'
import { 
  format, 
  addDays, 
  startOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  parseISO, 
  addMinutes,
  isToday
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

  // Configuração da Grade - 24 horas
  const start = startOfWeek(currentDate, { weekStartsOn: 1 })
  const end = addDays(start, 6)
  const days = eachDayOfInterval({ start, end })
  const hours = Array.from({ length: 48 }, (_, i) => ({
    h: Math.floor(i / 2),
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
      setAppointments(apts)
      setCustomers(custs)
      setServices(servs)
    } catch(e) {
      console.error("Fetch error:", e)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [currentDate])

  const getAppointmentStyle = (startTimeStr: string, duration: number) => {
    const d = parseISO(startTimeStr)
    const totalMinutes = d.getHours() * 60 + d.getMinutes()
    const top = (totalMinutes / 30) * 48
    const height = (duration / 30) * 48
    return { top: `${top}px`, height: `${height}px` }
  }

  const handleSaveAppointment = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const selectedService = services.find(s => s.id === formData.serviceId)
    const duration = selectedService?.duration_minutes || 60
    const startDateTime = new Date(`${formData.date}T${formData.time}:00`)
    const endDateTime = addMinutes(startDateTime, duration)

    try {
      await addAppointment({
        customer_id: formData.customerId,
        service_id: formData.serviceId,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        status: 'agendado'
      })
      await fetchData()
      setIsModalOpen(false)
      setFormData({ ...formData, customerId: '', serviceId: '' })
    } catch(error: any) {
      // Exibe o erro de conflito amigavelmente
      alert('⚠️ ATENÇÃO: ' + error.message)
    }
    setSaving(false)
  }


  const handleConfirmCheckout = async () => {
     if (!selectedApt) return
     setSaving(true)
     try {
        await completeAppointmentCheckout(selectedApt.id, {
           customer_id: selectedApt.customer_id || selectedApt.cliente_id,
           amount: selectedApt.services?.price || 0,
           payment_method: checkoutData.paymentMethod,
           status: 'pago'
        })
        await fetchData()
        setIsCheckoutOpen(false)
        setSelectedApt(null)
     } catch (error: any) {
        alert('Erro ao finalizar checkout: ' + error.message)
     }
     setSaving(false)
  }

  const handleCancelAppointment = async (id: string) => {
    if (!confirm('Deseja realmente cancelar este agendamento?')) return
    setSaving(true)
    try {
      const { updateAppointmentStatus } = await import('@/app/actions/admin')
      await updateAppointmentStatus(id, 'cancelado')
      await fetchData()
    } catch(error: any) {
      alert('Erro: ' + error.message)
    }
    setSaving(false)
  }

  const selectedSvc = services.find(s => s.id === formData.serviceId)

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-[#121021] p-4 lg:p-6 rounded-[2.5rem] border border-white/5 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 lg:gap-6">
          <h1 className="text-2xl font-black italic uppercase tracking-tighter text-white">Agenda</h1>
          <div className="flex items-center bg-black/40 rounded-2xl p-1 border border-white/5 w-full sm:w-auto">
            <button onClick={() => setView('dia')} className={`flex-1 sm:flex-none px-4 lg:px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'dia' ? 'bg-[#5E41FF] text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>Dia</button>
            <button onClick={() => setView('semana')} className={`flex-1 sm:flex-none px-4 lg:px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'semana' ? 'bg-[#5E41FF] text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>Semana</button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-2 bg-black/40 border border-white/5 p-1 rounded-2xl w-full sm:w-auto justify-between sm:justify-start">
            <button onClick={() => setCurrentDate(addDays(currentDate, -7))} className="p-3 text-gray-500"><ChevronLeft size={20} /></button>
            <span className="text-[10px] lg:text-[11px] font-black uppercase tracking-[0.1em] lg:tracking-[0.2em] px-2 lg:px-4 min-w-[140px] lg:min-w-[200px] text-center text-white truncate">
              {format(start, "dd MMM", { locale: ptBR })} - {format(end, "dd MMM yyyy", { locale: ptBR })}
            </span>
            <button onClick={() => setCurrentDate(addDays(currentDate, 7))} className="p-3 text-gray-500"><ChevronRight size={20} /></button>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="flex items-center justify-center gap-3 w-full sm:w-auto px-6 lg:px-8 py-4 bg-[#5E41FF] text-white rounded-2xl text-[10px] lg:text-[11px] font-black uppercase tracking-widest shadow-xl transition-all"><Plus size={18} /> Novo Agendamento</button>
        </div>
      </div>

      {/* Grid Calendário - Scroll Horizontal em Mobile */}
      <div className="bg-[#121021] border border-white/5 rounded-[2rem] lg:rounded-[3rem] overflow-hidden shadow-2xl flex flex-col h-[700px] lg:h-[800px]">
        <div className="overflow-x-auto no-scrollbar flex flex-col h-full">
          <div className="min-w-[900px] flex flex-col h-full"> 
            {/* Header da Grade */}
            <div className="flex border-b border-white/5 bg-black/20 sticky top-0 z-20">
          <div className="w-24 shrink-0 p-4 border-r border-white/5 flex items-center justify-center"><Clock size={18} className="text-[#5E41FF]" /></div>
          <div className="flex-1 grid grid-cols-7">
            {days.map((day, idx) => (
              <div key={idx} className={`p-6 text-center border-r border-white/5 last:border-0 ${isToday(day) ? 'bg-[#5E41FF]/5' : ''}`}>
                <p className="text-[10px] uppercase font-black text-gray-500 tracking-[0.2em] mb-2">{format(day, 'eee', { locale: ptBR })}</p>
                <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center text-lg font-black ${isToday(day) ? 'bg-[#5E41FF] text-white shadow-lg shadow-[#5E41FF]/40' : 'text-white'}`}>{format(day, 'dd')}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar relative flex">
          <div className="w-24 shrink-0 bg-black/10">
            {hours.map((time, i) => (
              <div key={i} className="h-12 flex items-start justify-center pt-1 text-[10px] font-black text-gray-600 border-r border-white/5 border-b border-white/[0.02]">
                {time.m === '00' ? `${time.h.toString().padStart(2, '0')}:00` : ''}
              </div>
            ))}
          </div>

          <div className="flex-1 grid grid-cols-7 relative bg-grid-white/[0.02]">
            {days.map((day, dIdx) => (
              <div key={dIdx} className="relative border-r border-white/5 last:border-0 h-full">
                {hours.map((_, hIdx) => <div key={hIdx} className="h-12 border-b border-white/5 opacity-30 cursor-crosshair" />)}

                {appointments
                  .filter(apt => isSameDay(parseISO(apt.start_time), day) && apt.status !== 'cancelado')
                  .map((apt) => {
                    const isFinalizado = apt.status === 'finalizado'
                    const duration = apt.services?.duration_minutes || 60
                    const style = getAppointmentStyle(apt.start_time, duration)
                    const color = isFinalizado ? '#4B5563' : (apt.services?.color || '#5E41FF')
                    
                    return (
                      <div 
                        key={apt.id}
                        style={{ 
                          ...style, 
                          backgroundColor: isFinalizado ? 'rgba(75, 85, 99, 0.1)' : `${color}15`, 
                          borderColor: color, 
                          color: color,
                          opacity: isFinalizado ? 0.6 : 1
                        }}
                        className={`absolute left-1 right-1 p-3 rounded-2xl border-l-4 shadow-xl group border border-white/5 overflow-hidden flex flex-col justify-between transition-all hover:z-20 cursor-default ${isFinalizado ? 'grayscale' : ''}`}
                      >
                        <div className="flex flex-col gap-0.5">
                           <div className="flex items-center justify-between">
                              <span className="text-[9px] font-black uppercase tracking-widest truncate opacity-80 flex items-center gap-1">
                                 {isFinalizado && <CheckCircle2 size={10} className="text-emerald-500" />}
                                 {apt.services?.name}
                              </span>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                 {!isFinalizado && (
                                   <>
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); setSelectedApt(apt); setIsCheckoutOpen(true); }}
                                        className="px-2 py-1 bg-white text-black text-[8px] font-black uppercase rounded-lg shadow-lg hover:scale-105 active:scale-95 transition-all"
                                      >
                                         Checkout
                                      </button>
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleCancelAppointment(apt.id); }}
                                        className="p-1 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all"
                                        title="Cancelar Agendamento"
                                      >
                                         <X size={10} />
                                      </button>
                                   </>
                                 )}
                              </div>
                           </div>
                           <h4 className="text-[13px] font-black text-white tracking-tight mt-1 truncate">{apt.customers?.name}</h4>
                        </div>
                        <div className="flex items-center justify-between mt-auto">
                           <div className="text-[10px] font-bold text-white/40 bg-black/20 w-fit px-2 py-0.5 rounded-lg border border-white/5">
                              {format(parseISO(apt.start_time), 'HH:mm')}
                           </div>
                           {isFinalizado && <span className="text-[8px] font-black uppercase tracking-tighter text-emerald-500/60 font-mono">PAGO</span>}
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
</div>


      {/* MODAL CHECKOUT - COLAVO STYLE */}
      {isCheckoutOpen && selectedApt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-end animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setIsCheckoutOpen(false)} />
          <div className="relative w-full max-w-[500px] h-full bg-[#121021] border-l border-white/10 shadow-2xl flex flex-col slide-in-from-right duration-500">
             
             {/* Header Checkout */}
             <div className="p-8 border-b border-white/5 text-white bg-black/20 flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                      <DollarSign size={24} />
                   </div>
                   <div>
                      <h2 className="text-xl font-black italic uppercase tracking-tighter">Finalizar Atendimento</h2>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Conclusão de Checkout</p>
                   </div>
                </div>
                <button onClick={() => setIsCheckoutOpen(false)} className="p-3 text-gray-500 hover:text-white rounded-full bg-white/5 transition-all"><X size={24} /></button>
             </div>

             <div className="flex-1 overflow-y-auto p-8 space-y-10 no-scrollbar">
                {/* Info Cliente */}
                <div className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 space-y-4">
                   <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-[#5E41FF]/10 flex items-center justify-center text-[#5E41FF] border border-[#5E41FF]/20 text-xl font-black italic">
                         {selectedApt.customers?.name?.charAt(0)}
                      </div>
                      <div>
                         <h3 className="text-lg font-black text-white italic truncate">{selectedApt.customers?.name}</h3>
                         <p className="text-xs text-gray-400 font-bold">{selectedApt.customers?.whatsapp || 'Sem contato'}</p>
                      </div>
                   </div>
                   <div className="pt-4 border-t border-white/5 grid grid-cols-2 gap-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                      <div>Data: <span className="text-white ml-1">{format(parseISO(selectedApt.start_time), 'dd/MM/yyyy')}</span></div>
                      <div>Hora: <span className="text-white ml-1">{format(parseISO(selectedApt.start_time), 'HH:mm')}</span></div>
                   </div>
                </div>

                {/* Detalhes do Pagamento */}
                <div className="space-y-6">
                   <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 px-2">Itens e Serviços</h4>
                   <div className="p-6 rounded-[2rem] bg-black/40 border border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-[#5E41FF]/10 flex items-center justify-center text-[#5E41FF] border border-[#5E41FF]/20">
                            <Scissors size={14} />
                         </div>
                         <span className="text-sm font-bold text-white uppercase">{selectedApt.services?.name}</span>
                      </div>
                      <span className="text-lg font-black text-white">R$ {(selectedApt.services?.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                   </div>

                   <hr className="border-white/5" />

                   <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 px-2">Meio de Pagamento</h4>
                   <div className="grid grid-cols-3 gap-4">
                      {[
                        { id: 'Pix', icon: <QrCode size={20}/> },
                        { id: 'Cartão', icon: <CreditCard size={20}/> },
                        { id: 'Dinheiro', icon: <Banknote size={20}/> }
                      ].map(method => (
                        <button
                          key={method.id}
                          onClick={() => setCheckoutData({...checkoutData, paymentMethod: method.id})}
                          className={`flex flex-col items-center gap-3 p-5 rounded-2xl border transition-all ${
                            checkoutData.paymentMethod === method.id 
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-xl shadow-emerald-500/10' 
                            : 'bg-white/[0.02] border-white/5 text-gray-500 hover:border-white/20'
                          }`}
                        >
                           {method.icon}
                           <span className="text-[10px] font-black uppercase tracking-widest">{method.id}</span>
                        </button>
                      ))}
                   </div>
                </div>
             </div>

             <div className="p-8 border-t border-white/5 bg-black/20 space-y-4">
                <div className="flex justify-between items-end mb-2">
                   <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">Liquido a Receber</p>
                   <p className="text-4xl font-black text-white tracking-tighter">
                      <span className="text-lg text-emerald-500 mr-2">R$</span>
                      {(selectedApt.services?.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                   </p>
                </div>
                <button 
                  onClick={handleConfirmCheckout}
                  disabled={saving}
                  className="w-full py-6 bg-emerald-500 text-black rounded-[2rem] text-sm font-black uppercase tracking-widest shadow-2xl shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                   {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                   Concluir Checkout
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Modal - Novo Agendamento */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-[500px] h-full bg-[#121021] border-l border-white/10 shadow-2xl flex flex-col slide-in-from-right duration-500">
             <div className="flex items-center justify-between p-8 border-b border-white/5">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-[#5E41FF]/10 flex items-center justify-center text-[#5E41FF]"><Plus size={24} /></div>
                   <h2 className="text-xl font-black italic uppercase tracking-tighter text-white">Novo Agendamento</h2>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-3 text-gray-500 hover:text-white rounded-full hover:bg-white/5 transition-all"><X size={24} /></button>
             </div>

             <form onSubmit={handleSaveAppointment} className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
                <div className="space-y-3">
                   <label className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-500 px-1">Cliente</label>
                   <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                      <select required value={formData.customerId} onChange={e => setFormData({...formData, customerId: e.target.value})} className="w-full pl-12 pr-4 py-4 rounded-2xl bg-black/40 border border-white/5 focus:border-[#5E41FF] outline-none transition-all text-sm font-bold text-white appearance-none">
                         <option value="">Selecione o cliente...</option>
                         {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-3">
                      <label className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-500 px-1">Data</label>
                      <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full p-4 rounded-2xl bg-black/40 border border-white/5 focus:border-[#5E41FF] outline-none transition-all text-sm font-bold text-white" />
                   </div>
                   <div className="space-y-3">
                      <label className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-500 px-1">Hora</label>
                      <input type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="w-full p-4 rounded-2xl bg-black/40 border border-white/5 focus:border-[#5E41FF] outline-none transition-all text-sm font-bold text-white" />
                   </div>
                </div>

                <div className="space-y-3">
                   <label className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-500 px-1">Serviço</label>
                   <div className="relative">
                      <Scissors className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                      <select required value={formData.serviceId} onChange={e => setFormData({...formData, serviceId: e.target.value})} className="w-full pl-12 pr-4 py-4 rounded-2xl bg-black/40 border border-white/5 focus:border-[#5E41FF] outline-none transition-all text-sm font-bold text-white appearance-none">
                         <option value="">Selecione o serviço...</option>
                         {services.map(s => <option key={s.id} value={s.id}>{s.name} - R$ {s.price}</option>)}
                      </select>
                   </div>
                </div>

                {selectedSvc && (
                   <div className="p-6 rounded-[2rem] bg-emerald-500/5 border border-emerald-500/20 space-y-4 animate-in zoom-in-95 duration-300">
                      <div className="flex justify-between items-end">
                         <div><p className="text-[9px] font-black uppercase tracking-widest text-emerald-500/60 mb-1">Duração</p><p className="text-xl font-black text-white">{selectedSvc.duration_minutes} min</p></div>
                         <div className="text-right"><p className="text-[9px] font-black uppercase tracking-widest text-emerald-500/60 mb-1">Valor</p><p className="text-3xl font-black text-emerald-500">R$ {selectedSvc.price}</p></div>
                      </div>
                   </div>
                )}
             </form>

             <div className="p-8 border-t border-white/5 bg-black/20">
                <button onClick={handleSaveAppointment} disabled={saving || !formData.customerId || !formData.serviceId} className="w-full py-5 bg-[#5E41FF] text-white rounded-[2rem] text-sm font-black uppercase tracking-widest shadow-2xl shadow-[#5E41FF]/30 hover:scale-[1.02] transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                   {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                   Concluir Agendamento
                </button>
             </div>
          </div>
        </div>
      )}
      {/* Botão Flutuante (FAB) - Estilo Colavo */}
      <div className="fixed bottom-6 right-6 lg:hidden z-50">
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-16 h-16 bg-[#5E41FF] text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
        >
          <Plus size={32} />
        </button>
      </div>
    </div>
  )
}
