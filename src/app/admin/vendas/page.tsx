'use client'

import { useEffect, useState, useCallback } from 'react'
import { 
  DollarSign,
  Plus,
  Search,
  Trash2,
  Edit2,
  X,
  CreditCard,
  Smartphone,
  Banknote,
  Calendar,
  User,
  Scissors,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  ShoppingCart
} from 'lucide-react'
import { 
  format, 
  parseISO, 
  startOfMonth, 
  endOfMonth, 
  eachMonthOfInterval,
  subMonths,
  addMonths,
  isSameMonth,
  isToday,
  startOfDay,
  setHours,
  setMinutes
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatInTimeZone } from 'date-fns-tz'

const TIMEZONE = 'America/Sao_Paulo'

interface Sale {
  id: string
  customer_id: string
  service_id: string
  amount: number
  payment_method: string
  date: string
  created_at: string
  customers?: { id: string; name: string }
  services?: { id: string; name: string }
}

interface Customer {
  id: string
  name: string
}

interface Service {
  id: string
  name: string
  price: number
}

interface FormData {
  customer_id: string
  service_id: string
  amount: string
  payment_method: string
  date: string
  time: string
}

export default function VendasPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [search, setSearch] = useState('')
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSale, setEditingSale] = useState<Sale | null>(null)
  
  const [formData, setFormData] = useState<FormData>({
    customer_id: '',
    service_id: '',
    amount: '',
    payment_method: 'Pix',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: format(new Date(), 'HH:mm')
  })
  
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [salesRes, custsRes, servsRes] = await Promise.all([
        fetch('/api/vendas'),
        fetch('/api/customers'),
        fetch('/api/services')
      ])
      
      const salesData = await salesRes.json()
      const custsData = await custsRes.json()
      const servsData = await servsRes.json()
      
      setSales(salesData.data || [])
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

  const filteredSales = sales.filter(sale => {
    const saleDate = sale.date || sale.created_at
    const saleMonth = formatInTimeZone(parseISO(saleDate), TIMEZONE, 'yyyy-MM-dd')
    const monthStr = format(currentMonth, 'yyyy-MM-dd')
    const matchesMonth = formatInTimeZone(currentMonth, TIMEZONE, 'yyyy-MM') === formatInTimeZone(parseISO(saleDate), TIMEZONE, 'yyyy-MM')
    const matchesSearch = !search || 
      sale.customers?.name?.toLowerCase().includes(search.toLowerCase()) ||
      sale.services?.name?.toLowerCase().includes(search.toLowerCase()) ||
      sale.payment_method?.toLowerCase().includes(search.toLowerCase())
    return matchesMonth && matchesSearch
  })

  const totalReceita = filteredSales.reduce((sum, s) => sum + (Number(s.amount) || 0), 0)
  const totalVendas = filteredSales.length

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'Pix': return <Smartphone size={16} />
      case 'Crédito': return <CreditCard size={16} />
      case 'Débito': return <Banknote size={16} />
      case 'Dinheiro': return <Banknote size={16} />
      default: return <DollarSign size={16} />
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const dateTime = new Date(`${formData.date}T${formData.time}:00`)
      
      if (editingSale) {
        const response = await fetch('/api/vendas', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingSale.id,
            customer_id: formData.customer_id,
            service_id: formData.service_id,
            amount: Number(formData.amount),
            payment_method: formData.payment_method,
            date: dateTime.toISOString()
          })
        })
        if (!response.ok) throw new Error('Erro ao atualizar')
        showMessage('success', 'Venda atualizada!')
      } else {
        const response = await fetch('/api/vendas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_id: formData.customer_id,
            service_id: formData.service_id,
            amount: Number(formData.amount),
            payment_method: formData.payment_method,
            date: dateTime.toISOString()
          })
        })
        if (!response.ok) throw new Error('Erro ao salvar')
        showMessage('success', 'Venda registrada!')
      }
      
      setIsModalOpen(false)
      setEditingSale(null)
      setFormData({
        customer_id: '',
        service_id: '',
        amount: '',
        payment_method: 'Pix',
        date: format(new Date(), 'yyyy-MM-dd'),
        time: format(new Date(), 'HH:mm')
      })
      fetchData()
    } catch (error: any) {
      showMessage('error', error.message)
    }

    setSaving(false)
  }

  const handleEdit = (sale: Sale) => {
    setEditingSale(sale)
    const saleDate = sale.date || sale.created_at
    const date = parseISO(saleDate)
    setFormData({
      customer_id: sale.customer_id || '',
      service_id: sale.service_id || '',
      amount: String(sale.amount || ''),
      payment_method: sale.payment_method || 'Pix',
      date: format(date, 'yyyy-MM-dd'),
      time: format(date, 'HH:mm')
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta venda?')) return

    try {
      const response = await fetch(`/api/vendas?id=${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Erro ao excluir')

      showMessage('success', 'Venda excluída!')
      fetchData()
    } catch (error) {
      showMessage('error', 'Erro ao excluir venda')
    }
  }

  const handleServiceChange = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId)
    setFormData({
      ...formData,
      service_id: serviceId,
      amount: service ? String(service.price) : formData.amount
    })
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
      
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center">
              <ShoppingCart size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Vendas</h1>
              <p className="text-gray-500 text-sm">{format(currentMonth, 'MMMM yyyy', { locale: ptBR })}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Navegação de mês */}
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-3 bg-[#1a1a2e] rounded-xl hover:bg-[#2a2a4e] transition-all">
              <ChevronLeft size={20} />
            </button>
            <button onClick={() => setCurrentMonth(new Date())} className="px-4 py-2 bg-[#1a1a2e] rounded-xl text-sm hover:bg-[#2a2a4e] transition-all">
              Hoje
            </button>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-3 bg-[#1a1a2e] rounded-xl hover:bg-[#2a2a4e] transition-all">
              <ChevronRight size={20} />
            </button>
            
            {/* Nova venda */}
            <button
              onClick={() => { setEditingSale(null); setIsModalOpen(true); }}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-500 rounded-xl font-medium hover:brightness-110 transition-all"
            >
              <Plus size={20} />
              Nova Venda
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

      {/* Cards de resumo */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#121021] rounded-2xl p-6 border border-white/10">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign size={20} className="text-emerald-400" />
            <span className="text-gray-400 text-sm">Receita do Mês</span>
          </div>
          <p className="text-3xl font-bold text-emerald-400">
            R$ {totalReceita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        
        <div className="bg-[#121021] rounded-2xl p-6 border border-white/10">
          <div className="flex items-center gap-3 mb-2">
            <ShoppingCart size={20} className="text-blue-400" />
            <span className="text-gray-400 text-sm">Total de Vendas</span>
          </div>
          <p className="text-3xl font-bold text-blue-400">{totalVendas}</p>
        </div>
        
        <div className="bg-[#121021] rounded-2xl p-6 border border-white/10">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign size={20} className="text-purple-400" />
            <span className="text-gray-400 text-sm">Ticket Médio</span>
          </div>
          <p className="text-3xl font-bold text-purple-400">
            R$ {totalVendas > 0 ? (totalReceita / totalVendas).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
          </p>
        </div>
      </div>

      {/* Busca */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-[#121021] rounded-2xl p-4 border border-white/10">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar por cliente ou serviço..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 outline-none focus:border-emerald-500 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Tabela de vendas */}
      <div className="max-w-7xl mx-auto bg-[#121021] rounded-2xl border border-white/10 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando...</div>
        ) : filteredSales.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Nenhuma venda encontrada neste período
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-sm font-medium text-gray-400">Data</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-400">Cliente</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-400">Serviço</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-400">Pagamento</th>
                  <th className="text-right p-4 text-sm font-medium text-gray-400">Valor</th>
                  <th className="text-right p-4 text-sm font-medium text-gray-400">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((sale, index) => {
                  const saleDate = sale.date || sale.created_at
                  return (
                    <tr key={sale.id} className={`border-b border-white/5 ${index % 2 === 0 ? '' : 'bg-white/[0.02]'}`}>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-gray-500" />
                          <span className="text-sm">
                            {formatInTimeZone(parseISO(saleDate), TIMEZONE, 'dd/MM/yyyy HH:mm')}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-gray-500" />
                          <span className="text-sm">{sale.customers?.name || '-'}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Scissors size={14} className="text-gray-500" />
                          <span className="text-sm">{sale.services?.name || '-'}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/10">
                          {getPaymentIcon(sale.payment_method)}
                          {sale.payment_method}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-lg font-bold text-emerald-400">
                          R$ {Number(sale.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(sale)}
                            className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-all"
                            title="Editar"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(sale.id)}
                            className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setIsModalOpen(false)}>
          <div className="bg-[#121021] rounded-3xl w-full max-w-md p-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                {editingSale ? 'Editar Venda' : 'Nova Venda'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-lg">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Cliente */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Cliente</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                  <select
                    required
                    value={formData.customer_id}
                    onChange={e => setFormData({...formData, customer_id: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-4 outline-none focus:border-emerald-500 transition-all"
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
                    value={formData.service_id}
                    onChange={e => handleServiceChange(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-4 outline-none focus:border-emerald-500 transition-all"
                  >
                    <option value="">Selecione o serviço</option>
                    {services.map(s => (
                      <option key={s.id} value={s.id}>{s.name} - R$ {s.price.toFixed(2)}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Valor */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Valor (R$)</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.amount}
                    onChange={e => setFormData({...formData, amount: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-4 outline-none focus:border-emerald-500 transition-all"
                    placeholder="0,00"
                  />
                </div>
              </div>
              
              {/* Forma de pagamento */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-3">Forma de Pagamento</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'Pix', icon: <Smartphone size={18} /> },
                    { id: 'Crédito', icon: <CreditCard size={18} /> },
                    { id: 'Débito', icon: <Banknote size={18} /> },
                    { id: 'Dinheiro', icon: <Banknote size={18} /> }
                  ].map(method => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setFormData({...formData, payment_method: method.id})}
                      className={`p-3 rounded-xl border transition-all flex flex-col items-center gap-1 ${
                        formData.payment_method === method.id 
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                          : 'border-white/10 hover:border-white/30 text-gray-500'
                      }`}
                    >
                      {method.icon}
                      <span className="text-[10px] font-medium">{method.id}</span>
                    </button>
                  ))}
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
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 outline-none focus:border-emerald-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Hora</label>
                  <input
                    type="time"
                    required
                    value={formData.time}
                    onChange={e => setFormData({...formData, time: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 outline-none focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>
              
              {/* Botão */}
              <button
                type="submit"
                disabled={saving}
                className="w-full py-4 bg-emerald-500 text-black font-bold rounded-xl hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
                {saving ? 'Salvando...' : editingSale ? 'Atualizar Venda' : 'Registrar Venda'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
