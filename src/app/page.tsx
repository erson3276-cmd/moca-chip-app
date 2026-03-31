'use client'

import { useEffect, useState, useRef } from 'react'
import { Calendar as CalendarIcon, Clock, ChevronRight, Sparkles, CheckCircle2, ChevronLeft, User, MapPin, Star } from 'lucide-react'
import { supabase, type Service, type Profile } from '@/lib/supabase'
import { format, addDays, startOfToday, isSameDay, eachDayOfInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function BookingPage() {
  const [services, setServices] = useState<Service[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [step, setStep] = useState(1) // 1: Serviços, 2: Profissional, 3: Horário, 4: Dados, 5: Sucesso
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedDate, setSelectedDate] = useState(addDays(startOfToday(), 1))
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  
  // Form States
  const [name, setName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [allAppointments, setAllAppointments] = useState<any[]>([])

  const dateList = eachDayOfInterval({
    start: startOfToday(),
    end: addDays(startOfToday(), 14)
  })

  // Categorias únicas
  const categories = ['Todos', ...Array.from(new Set(services.map(s => s.category)))]

  // Gerar horários dinâmicos baseados no perfil
  const generateTimeSlots = () => {
    if (!profile) return { manha: [], tarde: [], noite: [] }
    const manha: string[] = []
    const tarde: string[] = []
    const noite: string[] = []
    
    const [startHour] = profile.opening_time.split(':').map(Number)
    const [endHour] = profile.closing_time.split(':').map(Number)
    const interval = profile.slot_interval || 30
    const svcDuration = selectedService?.duration_minutes || 30

    for (let hour = startHour; hour < endHour; hour++) {
      for (let min = 0; min < 60; min += interval) {
        const time = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`
        
        // --- MOTOR DE DISPONIBILIDADE ---
        const slotStart = new Date(selectedDate)
        slotStart.setHours(hour, min, 0, 0)
        const slotEnd = new Date(slotStart.getTime() + svcDuration * 60000)

        const hasConflict = allAppointments.some(apt => {
           const aptStart = new Date(apt.start_time)
           const aptEnd = new Date(apt.end_time)
           // Verifica se os intervalos se sobrepõem
           return slotStart < aptEnd && slotEnd > aptStart
        })

        if (!hasConflict) {
           if (hour < 12) manha.push(time)
           else if (hour < 18) tarde.push(time)
           else noite.push(time)
        }
      }
    }
    return { manha, tarde, noite }
  }


  const slots = generateTimeSlots()

  useEffect(() => {
    async function fetchData() {
      let { data: servicesData, error: sErr } = await supabase.from('services').select('*').order('name')
      if (sErr) {
        const { data: s2 } = await supabase.from('servicos').select('*').order('name')
        servicesData = s2
      }
      if (servicesData) setServices(servicesData)

      let { data: profileData, error: pErr } = await supabase.from('profiles').select('*').single()
      if (pErr) {
        const { data: p2 } = await supabase.from('perfil').select('*').single()
        profileData = p2
      }
      if (profileData) setProfile(profileData)

      // Carregar agendamentos do dia para filtro de disponibilidade
      const tables = ['agendamentos', 'appointments']
      for (const table of tables) {
         const { data: apts, error: aptErr } = await supabase.from(table).select('*').neq('status', 'cancelado')
         if (!aptErr && apts) {
            setAllAppointments(apts)
            break
         }
      }

      setInitialLoading(false)
    }
    fetchData()
  }, [])

  const handleBooking = async () => {
    if (!name || !whatsapp || !selectedService || !selectedTime) return
    setLoading(true)
    const [hours, minutes] = selectedTime.split(':')
    const startTime = new Date(selectedDate)
    startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)
    const endTime = new Date(startTime.getTime() + selectedService.duration_minutes * 60000)

    try {
      const response = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, whatsapp, serviceId: selectedService.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString()
        })
      })
      const result = await response.json()
      if (result.success) setStep(5)
      else alert('Erro ao agendar: ' + result.error)
    } catch (error) {
      alert('Erro de conexão.')
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#CBA64B]/30 border-t-[#CBA64B] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA] font-sans pb-24 selection:bg-[#CBA64B]/30">
      {/* Colavo Style Hero */}
      <header className="relative w-full p-6 pt-12 text-center bg-gradient-to-b from-[#111] to-[#0A0A0A]">
        <div className="w-20 h-20 mx-auto bg-[#18181a] border border-[#CBA64B]/30 rounded-full flex items-center justify-center mb-4 overflow-hidden shadow-xl ring-4 ring-[#CBA64B]/10">
           <User className="w-10 h-10 text-[#CBA64B]" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight leading-none mb-1">{profile?.name || 'Moça Chic'}</h1>
        <div className="flex items-center justify-center gap-1 text-xs text-gray-500 font-medium mb-4">
           <MapPin className="w-3 h-3" /> <span>{profile?.address || 'Endereço não configurado'}</span>
           <span className="mx-1 opacity-30">•</span>
           <Star className="w-3 h-3 text-[#CBA64B] fill-[#CBA64B]" /> <span>Novo Salão</span>
        </div>
        
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 max-w-[240px] mx-auto mt-6">
           {[1, 2, 3, 4].map(idx => (
             <div key={idx} className={`h-1 rounded-full transition-all duration-300 ${step >= idx ? 'bg-[#CBA64B] flex-1' : 'bg-white/5 w-4'}`} />
           ))}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-5 mt-4">
        {/* ETAPA 1: SELEÇÃO DE SERVIÇO */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Categorias (Colavo Style) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar">
              {categories.map(cat => (
                <button 
                  key={cat} 
                  onClick={() => setSelectedCategory(cat)}
                  className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedCategory === cat ? 'bg-[#CBA64B] text-black shadow-md' : 'bg-[#18181a] text-gray-400 border border-white/5 hover:border-white/10'}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3 mt-4">
              {services.filter(s => selectedCategory === 'Todos' || s.category === selectedCategory).map(service => (
                <div key={service.id} className="group p-5 rounded-2xl bg-[#141414] border border-white/5 flex items-center justify-between transition-all hover:bg-[#18181a]">
                  <div className="flex-1 pr-4">
                    <h3 className="font-semibold text-lg text-white/90 group-hover:text-[#CBA64B] transition-colors">{service.name}</h3>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-1">{service.description || 'Experiência luxuosa de autocuidado.'}</p>
                    <div className="flex items-center gap-3 mt-3 text-xs text-gray-500 uppercase tracking-widest font-bold">
                       <span>{service.duration_minutes} MIN</span>
                       <span className="w-1 h-1 rounded-full bg-[#CBA64B]/30" />
                       <span className="text-[#CBA64B]">R$ {service.price.toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                  <button onClick={() => { setSelectedService(service); setStep(2); }} className="px-5 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-[#CBA64B]/50 hover:text-[#CBA64B] transition-all font-semibold text-sm">Escoher</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ETAPA 2: SELEÇÃO DE PROFISSIONAL */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500 py-6">
            <h2 className="text-xl font-medium mb-6">Selecione o Profissional</h2>
            <div onClick={() => setStep(3)} className="p-4 rounded-3xl bg-[#141414] border border-[#CBA64B]/30 flex items-center gap-4 cursor-pointer hover:bg-[#18181a] group transition-all ring-1 ring-transparent hover:ring-[#CBA64B]/20">
               <div className="w-16 h-16 bg-[#18181a] rounded-full flex items-center justify-center flex-shrink-0 border border-white/10 group-hover:border-[#CBA64B]/50 transition-colors">
                  <User className="w-8 h-8 text-[#CBA64B]" />
               </div>
               <div className="flex-1">
                  <p className="font-bold text-lg">{profile?.name || 'Profissional'}</p>
                  <p className="text-sm text-gray-400">Atendimento Premium</p>
               </div>
               <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-[#CBA64B]" />
            </div>
            <button onClick={() => setStep(1)} className="mt-8 flex items-center gap-2 text-sm text-gray-500 hover:text-white mx-auto"><ChevronLeft className="w-4 h-4" /> Voltar para serviços</button>
          </div>
        )}


        {/* ETAPA 3: DATA E HORA (MODO COLAVO) */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500 py-4">
             {/* Data Scroll Horizontal */}
             <div className="flex gap-3 overflow-x-auto pb-6 no-scrollbar snap-x">
                {dateList.map(date => (
                  <button 
                    key={date.toISOString()}
                    onClick={() => { setSelectedDate(date); setSelectedTime(null); }}
                    className={`flex flex-col items-center min-w-[70px] p-4 rounded-2xl transition-all snap-start ${isSameDay(selectedDate, date) ? 'bg-[#CBA64B] text-black shadow-lg scale-105' : 'bg-[#141414] text-gray-500 border border-white/5 hover:border-white/10'}`}
                  >
                    <span className="text-[10px] uppercase font-bold mb-1 opacity-70">{format(date, 'eee', { locale: ptBR })}</span>
                    <span className="text-lg font-bold">{format(date, 'dd')}</span>
                  </button>
                ))}
             </div>

             <div className="mt-4 flex flex-col gap-8">
               {/* Seção Manhã */}
               {slots.manha.length > 0 && (
                 <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">🌄 Manhã</h4>
                    <div className="grid grid-cols-4 gap-2">
                       {slots.manha.map(time => (
                        <button key={time} onClick={() => { setSelectedTime(time); setStep(4); }} className={`py-3 rounded-xl text-center text-sm font-medium border transition-all ${selectedTime === time ? 'bg-[#CBA64B] border-[#CBA64B] text-black' : 'bg-[#141414] border-white/5 hover:border-[#CBA64B]/40'}`}>{time}</button>
                       ))}
                    </div>
                 </div>
               )}

                {/* Seção Tarde */}
                {slots.tarde.length > 0 && (
                 <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">☀️ Tarde</h4>
                    <div className="grid grid-cols-4 gap-2">
                       {slots.tarde.map(time => (
                        <button key={time} onClick={() => { setSelectedTime(time); setStep(4); }} className={`py-3 rounded-xl text-center text-sm font-medium border transition-all ${selectedTime === time ? 'bg-[#CBA64B] border-[#CBA64B] text-black' : 'bg-[#141414] border-white/5 hover:border-[#CBA64B]/40'}`}>{time}</button>
                       ))}
                    </div>
                 </div>
               )}

                {/* Seção Noite */}
                {slots.noite.length > 0 && (
                 <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">🌙 Noite</h4>
                    <div className="grid grid-cols-4 gap-2">
                       {slots.noite.map(time => (
                        <button key={time} onClick={() => { setSelectedTime(time); setStep(4); }} className={`py-3 rounded-xl text-center text-sm font-medium border transition-all ${selectedTime === time ? 'bg-[#CBA64B] border-[#CBA64B] text-black' : 'bg-[#141414] border-white/5 hover:border-[#CBA64B]/40'}`}>{time}</button>
                       ))}
                    </div>
                 </div>
               )}
             </div>
             <button onClick={() => setStep(2)} className="mt-8 flex items-center gap-2 text-sm text-gray-500 hover:text-white mx-auto"><ChevronLeft className="w-4 h-4" /> Escolher outro profissional</button>
          </div>
        )}

        {/* ETAPA 4: REVISÃO E CONFIRMAÇÃO */}
        {step === 4 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500 py-4 flex flex-col gap-6">
            <div className="p-6 rounded-3xl bg-[#141414] border border-[#CBA64B]/20">
               <h3 className="text-xs font-bold text-[#CBA64B] uppercase tracking-widest mb-4">Resumo da Reserva</h3>
               <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                     <div>
                        <p className="text-lg font-bold">{selectedService?.name}</p>
                        <p className="text-sm text-gray-500">{format(selectedDate, "dd 'de' MMMM", { locale: ptBR })} às {selectedTime}</p>
                     </div>
                     <p className="text-xl font-bold text-[#CBA64B]">R$ {selectedService?.price}</p>
                  </div>
                  <div className="pt-4 border-t border-white/5 flex items-center gap-3">
                     <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center"><User className="w-5 h-5 text-gray-500" /></div>
                     <p className="text-sm">Profissional: <span className="font-bold text-white">Bia Barros</span></p>
                  </div>
               </div>
            </div>

            <div className="flex flex-col gap-4">
               <div className="flex flex-col gap-2">
                  <label className="text-[10px] items-center gap-1 uppercase tracking-widest font-bold text-gray-600 block px-1">Seu Nome completo</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Como quer ser chamada?" className="w-full p-4 rounded-xl bg-[#141414] border border-white/5 focus:border-[#CBA64B]/50 outline-none transition-all" />
               </div>
               <div className="flex flex-col gap-2">
                  <label className="text-[10px] items-center gap-1 uppercase tracking-widest font-bold text-gray-600 block px-1">Número do WhatsApp</label>
                  <input type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(21) 98455-9663" className="w-full p-4 rounded-xl bg-[#141414] border border-white/5 focus:border-[#CBA64B]/50 outline-none transition-all" />
               </div>
            </div>

            <button 
              onClick={handleBooking}
              disabled={loading || !name || !whatsapp}
              className="w-full py-5 bg-[#CBA64B] disabled:opacity-50 text-black font-bold text-lg rounded-2xl shadow-xl shadow-[#CBA64B]/10 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
            >
              {loading ? <div className="w-6 h-6 border-3 border-black border-t-transparent rounded-full animate-spin" /> : 'Confirmar Agendamento'}
            </button>
            <button onClick={() => setStep(3)} className="text-sm text-center text-gray-500 hover:text-white">Alterar data ou hora</button>
          </div>
        )}

        {/* ETAPA 5: SUCESSO COVALO STYLE */}
        {step === 5 && (
          <div className="flex flex-col items-center justify-center py-24 text-center animate-in zoom-in duration-700">
            <div className="w-24 h-24 bg-[#CBA64B]/10 rounded-full flex items-center justify-center mb-8 ring-8 ring-[#CBA64B]/5">
              <CheckCircle2 className="w-12 h-12 text-[#CBA64B]" />
            </div>
            <h2 className="text-3xl font-bold mb-4 tracking-tight">Pedido Enviado!</h2>
            <p className="text-gray-400 mb-12 max-w-[300px] text-lg font-light leading-relaxed">Sua reserva foi enviada com sucesso. Verifique seu <span className="text-white font-medium">WhatsApp</span> em instantes.</p>
            <button onClick={() => { setStep(1); setName(''); setWhatsapp(''); }} className="px-10 py-4 bg-[#141414] border border-white/10 rounded-2xl text-[#CBA64B] font-bold hover:bg-[#CBA64B]/5 transition-all shadow-lg">Fazer novo agendamento</button>
          </div>
        )}
      </div>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </main>
  )
}
