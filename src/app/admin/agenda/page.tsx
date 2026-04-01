'use client'

import { useEffect, useState, useCallback } from 'react'
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  User,
  X,
  Save,
  Loader2,
  Scissors,
  CreditCard,
  DollarSign,
  Check,
  Trash2
} from 'lucide-react'
import { 
  format, 
  addDays, 
  startOfWeek, 
  eachDayOfInterval, 
  parseISO, 
  addMinutes,
  isToday
} from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale'

// Tipos
interface Service {
  id: string
  name: string
  price: number
  duration_minutes: number
}

interface Customer {
  id: string
  name: string
  whatsapp?: string
}

interface Appointment {
  id: string
  customer_id: string
  service_id: string
  start_time: string
  end_time: string
  status: 'agendado' | 'confirmado' | 'finalizado' | 'cancelado' | 'falta'
  customers?: Customer
  services?: Service
}

interface FormData {
  customerId: string
  serviceId: string
  date: string
  time: string
}

// Config
const TIMEZONE = 'America/Sao_Paulo'

// Funções utilitárias
const toBrasilia = (dateStr: string) => {
  const date = new Date(dateStr)
  return new Date(date.toLocaleString('en-US', { timeZone: TIMEZONE }))
}

const formatTimeBrasilia = (dateStr: string) => {
  const date = toBrasilia(dateStr)
  return format(date, 'HH:mm')
}

const formatDateBrasilia = (dateStr: string) => {
  const date = toBrasilia(dateStr)
  return format(date, 'yyyy-MM-dd')
}

export default function AgendaPage() {
  // States
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'dia' | 'semana'>('semana')
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null)
  
  const [formData, setFormData] = useState<FormData>({
    customerId: '',
    serviceId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '10:00'
  })
  
  const [paymentMethod, setPaymentMethod] = useState('Pix')
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)

  // Configuração da grade
  const start = startOfWeek(currentDate, { weekStartsOn: 1 })
  const end = addDays(start, 6)
  const days = eachDayOfInterval({ start, end })
  const hours = Array.from({ length: 24 * 2 }, (_, i) => ({
    h: Math.floor(i / 2),
    m: i % 2 === 0 ? '00' : '30'
  }))

  // API Calls
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [aptsRes, custsRes, servsRes] = await Promise.all([
        fetch('/api/appointments'),
        fetch('/api/customers'),
        fetch('/api/services')
      ])
      
      const aptsData = await aptsRes.json()
      const custsData = await custsRes.json()
      const servsData = await servsRes.json()
      
      setAppointments(aptsData.data || [])
      setCustomers(custsData.data || [])
      setServices(servsData.data || [])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      showMessage('error', 'Erro ao carregar dados')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Mostrar mensagem
  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  // Filtrar agendamentos do dia (Brasília)
  const getAppointmentsForDay = (day: Date) => {
    const dayStr = formatInTimeZone(day, TIMEZONE, 'yyyy-MM-dd')
    return appointments.filter(apt => {
      const aptDate = formatInTimeZone(parseISO(apt.start_time), TIMEZONE, 'yyyy-MM-dd')
      return aptDate === dayStr && apt.status !== 'cancelado'
    })
  }

  // Calcular posição do card
  const getCardPosition = (startTimeStr: string, duration: number) => {
    const hour = toBrasilia(startTimeStr).getHours()
    const minute = toBrasilia(startTimeStr).getMinutes()
    const minutesFromStart = hour * 60 + minute
    const top = (minutesFromStart / 30) * 64
    const height = (duration / 30) * 64
    return { top: `${top}px`, height: `${Math.max(height - 4, 40)}px` }
  }

  // Agrupar por conflito (mesmos horários)
  const groupByConflict = (apts: Appointment[]) => {
    if (apts.length === 0) return []
    
    const sorted = [...apts].sort((a, b) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    )
    
    const groups: Appointment[][] = []
    const assigned = new Set<string>()
    
    sorted.forEach(apt => {
      if (assigned.has(apt.id)) return
      
      const group = [apt]
      assigned.add(apt.id)
      
      sorted.forEach(other => {
        if (assigned.has(other.id)) return
        
        const aptStart = new Date(apt.start_time).getTime()
        const aptEnd = new Date(apt.end_time).getTime()
        const otherStart = new Date(other.start_time).getTime()
        const otherEnd = new Date(other.end_time).getTime()
        
        if (otherStart < aptEnd && otherEnd > aptStart) {
          group.push(other)
          assigned.add(other.id)
        }
      })
      
      groups.push(group)
    })
    
    return groups
  }

  // Criar agendamento
  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    try {
      const service = services.find(s => s.id === formData.serviceId)
      if (!service) throw new Error('Selecione um serviço')
      
      const startDateTime = new Date(`${formData.date}T${formData.time}:00`)
      const endDateTime = addMinutes(startDateTime, service.duration_minutes)
      
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: formData.customerId,
          service_id: formData.serviceId,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          status: 'agendado'
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar agendamento')
      }
      
      showMessage('success', 'Agendamento criado com sucesso!')
      setIsModalOpen(false)
      setFormData({
        customerId: '',
        serviceId: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        time: '10:00'
      })
      fetchData()
    } catch (error: any) {
      showMessage('error', error.message)
    }
    
    setSaving(false)
  }

  // Cancelar agendamento
  const handleCancel = async (id: string) => {
    if (!confirm('Cancelar este agendamento?')) return
    
    try {
      const response = await fetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelado' })
      })
      
      if (!response.ok) throw new Error('Erro ao cancelar')
      
      showMessage('success', 'Agendamento cancelado')
      fetchData()
    } catch (error) {
      showMessage('error', 'Erro ao cancelar agendamento')
    }
  }

  // Excluir agendamento
  const handleDelete = async (id: string) => {
    if (!confirm('Excluir permanentemente?')) return
    
    try {
      const response = await fetch(`/api/appointments/${id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) throw new Error('Erro ao excluir')
      
      showMessage('success', 'Agendamento excluído')
      fetchData()
    } catch (error) {
      showMessage('error', 'Erro ao excluir')
    }
  }

  // Finalizar (checkout)
  const handleCheckout = async () => {
    if (!selectedApt) return
    setSaving(true)
    
    try {
      // Criar venda
      await fetch('/api/vendas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: selectedApt.customer_id,
          service_id: selectedApt.service_id,
          appointment_id: selectedApt.id,
          amount: selectedApt.services?.price || 0,
          payment_method: paymentMethod,
          date: new Date().toISOString()
        })
      })
      
      // Atualizar status
      await fetch(`/api/appointments/${selectedApt.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'finalizado' })
      })
      
      showMessage('success', 'Atendimento finalizado!')
      setIsCheckoutOpen(false)
      setSelectedApt(null)
      fetchData()
    } catch (error) {
      showMessage('error', 'Erro ao finalizar')
    }
    
    setSaving(false)
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
      
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#5E41FF] flex items-center justify-center">
              <CalendarIcon size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Agenda</h1>
              <p className="text-gray-500 text-sm">{format(currentDate, 'MMMM yyyy', { locale: ptBR })}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex bg-[#1a1a2e] rounded-xl p-1">
              <button
                onClick={() => setView('dia')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === 'dia' ? 'bg-[#5E41FF] text-white' : 'text-gray-400 hover:text-white'}`}
              >
                Dia
              </button>
              <button
                onClick={() => setView('semana')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === 'semana' ? 'bg-[#5E41FF] text-white' : 'text-gray-400 hover:text-white'}`}
              >
                Semana
              </button>
            </div>
            
            {/* Navegação */}
            <button onClick={() => setCurrentDate(addDays(currentDate, -1))} className="p-3 bg-[#1a1a2e] rounded-xl hover:bg-[#2a2a4e] transition-all">
              <ChevronLeft size={20} />
            </button>
            <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 bg-[#1a1a2e] rounded-xl text-sm hover:bg-[#2a2a4e] transition-all">
              Hoje
            </button>
            <button onClick={() => setCurrentDate(addDays(currentDate, 1))} className="p-3 bg-[#1a1a2e] rounded-xl hover:bg-[#2a2a4e] transition-all">
              <ChevronRight size={20} />
            </button>
            
            {/* Novo */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-[#5E41FF] rounded-xl font-medium hover:brightness-110 transition-all"
            >
              <Plus size={20} />
              Novo
            </button>
          </div>
        </div>
      </div>

      {/* Mensagem */}
      {message && (
        <div className={`max-w-7xl mx-auto mb-4 p-4 rounded-xl ${message.type === 'success' ? 'bg-green-600/20 text-green-400 border border-green-600/30' : 'bg-red-600/20 text-red-400 border border-red-600/30'}`}>
          {message.text}
        </div>
      )}

      {/* Agenda */}
      <div className="max-w-7xl mx-auto bg-[#121021] rounded-3xl overflow-hidden">
        
        {/* Header dos dias */}
        <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-white/10">
          <div className="p-4 flex items-center justify-center border-r border-white/10">
            <Clock size={20} className="text-gray-500" />
          </div>
          {(view === 'semana' ? days : [currentDate]).map((day, i) => (
            <div key={i} className={`p-4 text-center border-r border-white/10 ${isToday(day) ? 'bg-[#5E41FF]/10' : ''}`}>
              <p className="text-xs text-gray-500 uppercase">{format(day, 'EEE', { locale: ptBR })}</p>
              <p className={`text-2xl font-bold mt-1 ${isToday(day) ? 'text-[#5E41FF]' : ''}`}>{format(day, 'dd')}</p>
            </div>
          ))}
        </div>

        {/* Grade de horários */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
          <div className="grid grid-cols-[80px_repeat(7,1fr)] relative">
            
            {/* Coluna de horários */}
            <div className="border-r border-white/10">
              {hours.map((h, i) => (
                <div key={i} className="h-16 flex items-start justify-center pt-2 border-b border-white/5">
                  <span className={`text-xs ${h.m === '00' ? 'text-gray-400 font-medium' : 'text-gray-600'}`}>
                    {h.h.toString().padStart(2, '0')}:{h.m}
                  </span>
                </div>
              ))}
            </div>

            {/* Colunas dos dias */}
            {(view === 'semana' ? days : [currentDate]).map((day, dayIdx) => {
              const dayAppointments = getAppointmentsForDay(day)
              const groups = groupByConflict(dayAppointments)
              
              return (
                <div key={dayIdx} className="relative border-r border-white/10">
                  {/* Linhas de grade */}
                  {hours.map((h, i) => (
                    <div key={i} className={`h-16 border-b border-white/5 ${h.m === '00' ? 'border-white/10' : ''}`} />
                  ))}
                  
                  {/* Agendamentos */}
                  {groups.map((group, groupIdx) => (
                    group.map((apt, aptIdx) => {
                      const style = getCardPosition(apt.start_time, apt.services?.duration_minutes || 60)
                      const width = 100 / group.length
                      const left = aptIdx * width
                      const isFinalizado = apt.status === 'finalizado'
                      
                      return (
                        <div
                          key={apt.id}
                          style={{
                            ...style,
                            width: `${width}%`,
                            left: `${left}%`,
                            top: style.top
                          }}
                          className={`absolute p-2 z-10 ${isFinalizado ? 'opacity-60' : ''}`}
                        >
                          <div className={`h-full rounded-xl p-3 border ${
                            isFinalizado 
                              ? 'bg-emerald-600/20 border-emerald-600/40' 
                              : 'bg-[#5E41FF]/20 border-[#5E41FF]/40'
                          }`}>
                            <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                              <Clock size={12} />
                              {formatTimeBrasilia(apt.start_time)}
                              {isFinalizado && <Check size={12} className="text-emerald-400 ml-auto" />}
                            </div>
                            <p className="font-bold text-sm truncate">{apt.services?.name || 'Serviço'}</p>
                            <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                              <User size={12} />
                              <span className="truncate">{apt.customers?.name || 'Cliente'}</span>
                            </div>
                            
                            {/* Botões de ação */}
                            {!isFinalizado && (
                              <div className="flex gap-1 mt-2 pt-2 border-t border-white/10">
                                <button
                                  onClick={() => { setSelectedApt(apt); setIsCheckoutOpen(true); }}
                                  className="flex-1 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-400 transition-all"
                                >
                                  Finalizar
                                </button>
                                <button
                                  onClick={() => handleCancel(apt.id)}
                                  className="px-2 py-1.5 bg-orange-500/20 text-orange-400 text-xs rounded-lg hover:bg-orange-500/30 transition-all"
                                  title="Cancelar"
                                >
                                  <X size={14} />
                                </button>
                                <button
                                  onClick={() => handleDelete(apt.id)}
                                  className="px-2 py-1.5 bg-red-500/20 text-red-400 text-xs rounded-lg hover:bg-red-500/30 transition-all"
                                  title="Excluir"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Modal Novo Agendamento */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setIsModalOpen(false)}>
          <div className="bg-[#121021] rounded-3xl w-full max-w-md p-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Novo Agendamento</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-lg">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreateAppointment} className="space-y-6">
              {/* Cliente */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Cliente</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                  <select
                    required
                    value={formData.customerId}
                    onChange={e => setFormData({...formData, customerId: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-4 outline-none focus:border-[#5E41FF] transition-all"
                  >
                    <option value="">Selecione o cliente</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Serviço */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Serviço</label>
                <div className="relative">
                  <Scissors className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                  <select
                    required
                    value={formData.serviceId}
                    onChange={e => setFormData({...formData, serviceId: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-4 outline-none focus:border-[#5E41FF] transition-all"
                  >
                    <option value="">Selecione o serviço</option>
                    {services.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} - R$ {s.price.toFixed(2)} ({s.duration_minutes}min)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Data e Hora */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Data</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 outline-none focus:border-[#5E41FF] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Hora</label>
                  <select
                    required
                    value={formData.time}
                    onChange={e => setFormData({...formData, time: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 outline-none focus:border-[#5E41FF] transition-all"
                  >
                    {Array.from({ length: 48 }, (_, i) => {
                      const h = Math.floor(i / 2)
                      const m = i % 2 === 0 ? '00' : '30'
                      return (
                        <option key={i} value={`${h.toString().padStart(2, '0')}:${m}`}>
                          {h.toString().padStart(2, '0')}:{m}
                        </option>
                      )
                    })}
                  </select>
                </div>
              </div>
              
              {/* Botão */}
              <button
                type="submit"
                disabled={saving}
                className="w-full py-4 bg-[#5E41FF] text-white font-bold rounded-xl hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                {saving ? 'Salvando...' : 'Confirmar Agendamento'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Checkout */}
      {isCheckoutOpen && selectedApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setIsCheckoutOpen(false)}>
          <div className="bg-[#121021] rounded-3xl w-full max-w-md p-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Finalizar Atendimento</h2>
              <button onClick={() => setIsCheckoutOpen(false)} className="p-2 hover:bg-white/10 rounded-lg">
                <X size={24} />
              </button>
            </div>
            
            {/* Total */}
            <div className="bg-black/40 rounded-2xl p-6 mb-6">
              <p className="text-sm text-gray-400 mb-2">Total a Receber</p>
              <p className="text-4xl font-bold text-emerald-400">
                R$ {selectedApt.services?.price?.toFixed(2) || '0,00'}
              </p>
            </div>
            
            {/* Forma de pagamento */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-400 mb-3">Forma de Pagamento</label>
              <div className="grid grid-cols-2 gap-3">
                {['Pix', 'Crédito', 'Débito', 'Dinheiro'].map(method => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`p-4 rounded-xl border transition-all ${
                      paymentMethod === method 
                        ? 'bg-[#5E41FF] border-[#5E41FF]' 
                        : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    {method === 'Pix' && <DollarSign size={20} className="mx-auto mb-1" />}
                    {method === 'Crédito' && <CreditCard size={20} className="mx-auto mb-1" />}
                    {method !== 'Pix' && method !== 'Crédito' && <DollarSign size={20} className="mx-auto mb-1" />}
                    <span className="text-sm font-medium">{method}</span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Botão */}
            <button
              onClick={handleCheckout}
              disabled={saving}
              className="w-full py-4 bg-emerald-500 text-black font-bold rounded-xl hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
              {saving ? 'Processando...' : 'Confirmar Pagamento'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
