'use client'

import { useEffect, useState, useRef } from 'react'
import { Calendar as CalendarIcon, Clock, ChevronRight, Sparkles, CheckCircle2, ChevronLeft, User, MapPin, Star, ShieldAlert, MessageCircle } from 'lucide-react'
import { supabase, type Service, type Profile } from '@/lib/supabase'
import { format, addDays, startOfToday, isSameDay, eachDayOfInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function BookingPage() {
  const [services, setServices] = useState<Service[]>([])
  const [profile, setProfile] = useState<Profile | any>(null)
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
  const [isBlocked, setIsBlocked] = useState(false)

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
    
    // Fallbacks para horários
    const opening = profile.opening_time || '09:00'
    const closing = profile.closing_time || '18:00'
    const [startHour] = opening.split(':').map(Number)
    const [endHour] = closing.split(':').map(Number)
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
      try {
        const { getServices, getProfile, getAppointments } = await import('@/app/actions/admin')
        
        const [servicesData, profileData, aptsData] = await Promise.all([
          getServices(),
          getProfile ? getProfile() : (async () => {
             // Fallback se getProfile não existir ainda ou falhar
             const { data } = await supabase.from('profiles').select('*').maybeSingle()
             return data || (await supabase.from('perfil').select('*').maybeSingle()).data
          })(),
          getAppointments()
        ])

        if (servicesData) setServices(servicesData)
        if (profileData) setProfile(profileData)
        if (aptsData) setAllAppointments(aptsData)

      } catch (err) {
        console.error("Erro ao carregar dados iniciais:", err)
      } finally {
        setInitialLoading(false)
      }
    }
    fetchData()
  }, [])

  // Verificação de Bloqueio em Tempo Real
  useEffect(() => {
    const checkBlocked = async () => {
      const cleanWhatsapp = whatsapp.replace(/\D/g, '')
      if (cleanWhatsapp.length >= 10) {
        const { validateVIP } = await import('@/app/actions/admin')
        const result = await validateVIP(cleanWhatsapp)
        if (result.status === 'blocked') {
          setIsBlocked(true)
        } else {
          setIsBlocked(false)
        }
      }
    }
    checkBlocked()
  }, [whatsapp])

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
      else if (response.status === 403) setIsBlocked(true)
      else alert('Erro ao agendar: ' + result.error)
    } catch (error) {
      alert('Erro de conexão.')
    } finally {
      setLoading(false)
    }
  }

  const handleContactSuanne = () => {
    const message = encodeURIComponent('Olá Suanne! Tentei realizar um agendamento e meu número consta como indisponível. Poderia me ajudar?')
    const phone = profile?.whatsapp_number || '5521984755539'
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank')
  }

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#CBA64B]/30 border-t-[#CBA64B] rounded-full animate-spin" />
      </div>
    )
  }

  // TELA DE BLOQUEIO (LOCK SCREEN)
  if (isBlocked) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA] flex items-center justify-center p-6">
        <div className="max-w-sm w-full animate-in zoom-in-95 duration-500">
           <div className="bg-[#141414] border border-red-500/20 rounded-[3rem] p-10 text-center shadow-2xl space-y-8 backdrop-blur-xl">
              <div className="relative">
                 <div className="w-32 h-32 mx-auto rounded-full border-4 border-red-500/20 overflow-hidden shadow-2xl relative z-10">
                    <img 
                      src={profile?.image_url || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=200&h=200'} 
                      alt={profile?.professional_name} 
                      className="w-full h-full object-cover grayscale opacity-50"
                    />
                 </div>
                 <div className="absolute top-0 right-1/2 translate-x-1/2 -mt-4 bg-red-600 p-2 rounded-full shadow-lg z-20 border-4 border-[#141414]">
                    <ShieldAlert className="w-6 h-6 text-white" />
                 </div>
              </div>

              <div className="space-y-2">
                 <h2 className="text-2xl font-black italic tracking-tighter uppercase">Acesso Restrito</h2>
                 <p className="text-gray-400 text-sm leading-relaxed">
                    Olá! No momento, o agendamento automático não está disponível para este número de WhatsApp.
                 </p>
              </div>

              <div className="pt-4 border-t border-white/5">
                 <p className="text-[10px] uppercase font-black tracking-[0.2em] text-[#CBA64B] mb-6">Para liberar seu agendamento:</p>
                 <button 
                   onClick={handleContactSuanne}
                   className="w-full flex items-center justify-center gap-3 py-5 bg-[#CBA64B] text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[#CBA64B]/10 group"
                 >
                    <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    Falar com Suanne
                 </button>
              </div>
              
              <button 
                onClick={() => { setIsBlocked(false); setStep(1); setWhatsapp(''); }}
                className="text-[10px] text-gray-600 uppercase font-bold tracking-widest hover:text-gray-400 underline underline-offset-4"
              >
                Tentar outro número
              </button>
           </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA] font-sans pb-24 selection:bg-[#CBA64B]/30">
      {/* Colavo Style Hero */}
      <header className="relative w-full p-6 pt-12 text-center bg-gradient-to-b from-[#111] to-[#0A0A0A]">
        <div className="w-20 h-20 mx-auto bg-[#18181a] border border-[#CBA64B]/30 rounded-full flex items-center justify-center mb-4 overflow-hidden shadow-xl ring-4 ring-[#CBA64B]/10">
           {profile?.image_url ? (
             <img src={profile.image_url} alt={profile.name} className="w-full h-full object-cover" />
           ) : (
             <User className="w-10 h-10 text-[#CBA64B]" />
           )}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight leading-none mb-1">{profile?.name || 'Moça Chiq'}</h1>
        <p className="text-[#CBA64B] text-[10px] font-black uppercase tracking-[0.3em] mb-3">{profile?.professional_name || 'Suanne Chagas'}</p>
        
        <div className="flex items-center justify-center gap-1 text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-4">
           <MapPin className="w-3 h-3" /> <span className="truncate max-w-[200px]">{profile?.address || 'Endereço não configurado'}</span>
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
            {/* Categorias */}
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
                  <button onClick={() => { setSelectedService(service); setStep(2); }} className="px-5 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-[#CBA64B]/50 hover:text-[#CBA64B] transition-all font-semibold text-sm">Escolher</button>
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
               <div className="w-16 h-16 bg-[#18181a] rounded-full flex items-center justify-center flex-shrink-0 border border-white/10 group-hover:border-[#CBA64B]/50 transition-colors overflow-hidden">
                  {profile?.image_url ? (
                    <img src={profile.image_url} alt={profile.professional_name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-[#CBA64B]" />
                  )}
               </div>
               <div className="flex-1">
                  <p className="font-bold text-lg">{profile?.professional_name || profile?.name || 'Profissional'}</p>
                  <p className="text-sm text-gray-400">Especialista Moça Chic</p>
               </div>
               <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-[#CBA64B]" />
            </div>
            <button onClick={() => setStep(1)} className="mt-8 flex items-center gap-2 text-sm text-gray-500 hover:text-white mx-auto"><ChevronLeft className="w-4 h-4" /> Voltar para serviços</button>
          </div>
        )}

         {/* ETAPA 3: DATA E HORA */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500 py-4 max-w-full overflow-hidden">
             <div className="flex gap-3 overflow-x-auto pb-6 no-scrollbar snap-x touch-pan-x px-1">
                {dateList.map(date => (
                  <button 
                    key={date.toISOString()}
                    onClick={() => { setSelectedDate(date); setSelectedTime(null); }}
                    className={`flex flex-col items-center min-w-[72px] p-4 rounded-2xl transition-all snap-start ${isSameDay(selectedDate, date) ? 'bg-[#CBA64B] text-black shadow-lg scale-105' : 'bg-[#141414] text-gray-500 border border-white/5 hover:border-white/10'}`}
                  >
                    <span className="text-[10px] uppercase font-bold mb-1 opacity-70">{format(date, 'eee', { locale: ptBR })}</span>
                    <span className="text-lg font-bold">{format(date, 'dd')}</span>
                  </button>
                ))}
             </div>

             <div className="mt-4 flex flex-col gap-8">
               {slots.manha.length > 0 && (
                 <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2 px-1">🌄 Manhã</h4>
                    <div className="grid grid-cols-4 sm:grid-cols-4 gap-2">
                       {slots.manha.map(time => (
                        <button key={time} onClick={() => { setSelectedTime(time); setStep(4); }} className={`py-3 px-1 rounded-xl text-center text-xs sm:text-sm font-medium border transition-all ${selectedTime === time ? 'bg-[#CBA64B] border-[#CBA64B] text-black' : 'bg-[#141414] border-white/5 hover:border-[#CBA64B]/40'}`}>{time}</button>
                       ))}
                    </div>
                 </div>
               )}
                {slots.tarde.length > 0 && (
                 <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2 px-1">☀️ Tarde</h4>
                    <div className="grid grid-cols-4 sm:grid-cols-4 gap-2">
                       {slots.tarde.map(time => (
                        <button key={time} onClick={() => { setSelectedTime(time); setStep(4); }} className={`py-3 px-1 rounded-xl text-center text-xs sm:text-sm font-medium border transition-all ${selectedTime === time ? 'bg-[#CBA64B] border-[#CBA64B] text-black' : 'bg-[#141414] border-white/5 hover:border-[#CBA64B]/40'}`}>{time}</button>
                       ))}
                    </div>
                 </div>
               )}
                {slots.noite.length > 0 && (
                 <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2 px-1">🌙 Noite</h4>
                    <div className="grid grid-cols-4 sm:grid-cols-4 gap-2">
                       {slots.noite.map(time => (
                        <button key={time} onClick={() => { setSelectedTime(time); setStep(4); }} className={`py-3 px-1 rounded-xl text-center text-xs sm:text-sm font-medium border transition-all ${selectedTime === time ? 'bg-[#CBA64B] border-[#CBA64B] text-black' : 'bg-[#141414] border-white/5 hover:border-[#CBA64B]/40'}`}>{time}</button>
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
            <div className="p-6 rounded-3xl bg-[#141414] border border-[#CBA64B]/20 shadow-xl">
               <h3 className="text-[10px] font-black text-[#CBA64B] uppercase tracking-[0.3em] mb-6">Resumo da Reserva</h3>
               <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                     <div>
                        <p className="text-xl font-bold text-white/90">{selectedService?.name}</p>
                        <p className="text-sm text-gray-400 mt-1">{format(selectedDate, "dd 'de' MMMM", { locale: ptBR })} às <span className="text-white font-bold">{selectedTime}</span></p>
                     </div>
                     <p className="text-2xl font-black text-[#CBA64B]">R$ {selectedService?.price}</p>
                  </div>
                  <div className="pt-6 mt-2 border-t border-white/5 flex items-center gap-4">
                     <div className="w-12 h-12 bg-[#18181a] rounded-full flex items-center justify-center border border-white/10 overflow-hidden">
                        {profile?.image_url ? (
                          <img src={profile.image_url} alt={profile.professional_name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-6 h-6 text-gray-700" />
                        )}
                     </div>
                     <div>
                        <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Profissional Especialista</p>
                        <p className="text-sm font-bold text-white">{profile?.professional_name || profile?.name || 'Suanne Chagas'}</p>
                     </div>
                  </div>
               </div>
            </div>

            <div className="flex flex-col gap-5">
               <div className="space-y-2">
                  <label className="text-[10px] items-center gap-1 uppercase tracking-widest font-black text-gray-600 block px-2">Seu Nome completo</label>
                  <input 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="Como quer ser chamada?" 
                    className="w-full p-4 rounded-2xl bg-[#141414] border border-white/5 focus:border-[#CBA64B]/50 outline-none transition-all text-white font-medium placeholder:text-gray-700" 
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] items-center gap-1 uppercase tracking-widest font-black text-gray-600 block px-2">Número do WhatsApp</label>
                  <input 
                    type="tel" 
                    value={whatsapp} 
                    onChange={(e) => setWhatsapp(e.target.value)} 
                    placeholder="(21) 98455-9663" 
                    className={`w-full p-4 rounded-2xl bg-[#141414] border border-white/5 focus:border-[#CBA64B]/50 outline-none transition-all text-white font-medium placeholder:text-gray-700 ${isBlocked ? 'border-red-500/50' : ''}`} 
                  />
                  {isBlocked && <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest ml-2">Agendamento restrito para este número.</p>}
               </div>
            </div>

            <button 
              type="button"
              onClick={() => {
                console.log("Clique no botão Prosseguir");
                handleBooking();
              }}
              disabled={loading || !name || whatsapp.length < 10 || isBlocked}
              className="w-full py-5 bg-[#CBA64B] disabled:opacity-50 text-black font-black text-lg uppercase tracking-widest rounded-2xl shadow-2xl shadow-[#CBA64B]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 mt-4"
            >
              {loading ? <div className="w-6 h-6 border-4 border-black border-t-transparent rounded-full animate-spin" /> : (
                <>
                   PROSSEGUIR <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
            <button onClick={() => setStep(3)} className="text-xs mt-2 text-center text-gray-600 uppercase font-bold tracking-widest hover:text-white transition-colors">Alterar data ou hora</button>
          </div>
        )}

        {/* ETAPA 5: SUCESSO */}
        {step === 5 && (
          <div className="flex flex-col items-center justify-center py-24 text-center animate-in zoom-in duration-700">
            <div className="w-24 h-24 bg-[#CBA64B]/10 rounded-full flex items-center justify-center mb-8 ring-8 ring-[#CBA64B]/5 relative">
              <CheckCircle2 className="w-12 h-12 text-[#CBA64B]" />
              <div className="absolute inset-0 rounded-full border-2 border-[#CBA64B] animate-ping opacity-20" />
            </div>
            <h2 className="text-3xl font-black italic tracking-tighter uppercase mb-4">Pedido Enviado!</h2>
            <p className="text-gray-400 mb-12 max-w-[300px] text-lg font-light leading-relaxed">Sua reserva foi enviada com sucesso. Verifique seu <span className="text-white font-bold">WhatsApp</span> em instantes para a confirmação.</p>
            <button onClick={() => { setStep(1); setName(''); setWhatsapp(''); }} className="px-12 py-5 bg-[#141414] border border-white/10 rounded-2xl text-[#CBA64B] font-black text-xs uppercase tracking-[0.2em] hover:bg-[#CBA64B]/5 transition-all shadow-2xl">Novo agendamento</button>
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
