'use client'

import { useEffect, useState, useCallback } from 'react'
import { 
  Users,
  Plus,
  Search,
  Trash2,
  Edit2,
  X,
  Phone,
  Mail,
  Calendar,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  User,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Customer {
  id: string
  name: string
  whatsapp: string | null
  phone: string | null
  email: string | null
  notes: string | null
  active: boolean
  created_at: string
}

interface FormData {
  name: string
  whatsapp: string
  phone: string
  email: string
  notes: string
}

export default function ClientesPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [showBlocked, setShowBlocked] = useState(true)
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    whatsapp: '',
    phone: '',
    email: '',
    notes: ''
  })
  
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/customers')
      const data = await response.json()
      
      if (!response.ok) throw new Error(data.error)
      
      setCustomers(data.data || [])
    } catch (error: any) {
      console.error('Erro ao carregar clientes:', error)
      showMessage('error', 'Erro ao carregar clientes')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = !search || 
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.whatsapp?.includes(search) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
    const matchesBlocked = showBlocked ? true : c.active
    return matchesSearch && matchesBlocked
  })

  const totalCustomers = customers.length
  const activeCustomers = customers.filter(c => c.active).length
  const blockedCustomers = customers.filter(c => !c.active).length
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage)
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (editingCustomer) {
        const response = await fetch('/api/customers', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingCustomer.id,
            name: formData.name,
            whatsapp: formData.whatsapp || null,
            phone: formData.phone || null,
            email: formData.email || null,
            notes: formData.notes || null
          })
        })
        
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Erro ao atualizar')
        }
        
        showMessage('success', 'Cliente atualizado com sucesso!')
      } else {
        const response = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            whatsapp: formData.whatsapp || null,
            phone: formData.phone || null,
            email: formData.email || null,
            notes: formData.notes || null
          })
        })
        
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Erro ao criar')
        }
        
        showMessage('success', 'Cliente cadastrado com sucesso!')
      }
      
      setIsModalOpen(false)
      setEditingCustomer(null)
      setFormData({ name: '', whatsapp: '', phone: '', email: '', notes: '' })
      fetchCustomers()
    } catch (error: any) {
      showMessage('error', error.message)
    }

    setSaving(false)
  }

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer)
    setFormData({
      name: customer.name || '',
      whatsapp: customer.whatsapp || '',
      phone: customer.phone || '',
      email: customer.email || '',
      notes: customer.notes || ''
    })
    setIsModalOpen(true)
  }

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    const action = currentActive ? 'desativar' : 'reativar'
    if (!confirm(`Deseja ${action} este cliente?`)) return

    try {
      const response = await fetch('/api/customers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          active: !currentActive
        })
      })
      
      if (!response.ok) throw new Error('Erro ao atualizar')
      
      showMessage('success', `Cliente ${action === 'desativar' ? 'desativado' : 'reativado'}!`)
      fetchCustomers()
    } catch (error) {
      showMessage('error', 'Erro ao atualizar cliente')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('⚠️ Excluir permanentemente este cliente? Esta ação não pode ser desfeita.')) return

    try {
      const response = await fetch(`/api/customers?id=${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Erro ao excluir')

      showMessage('success', 'Cliente excluído!')
      fetchCustomers()
    } catch (error) {
      showMessage('error', 'Erro ao excluir cliente')
    }
  }

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    }
    return value
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value)
    setFormData({ ...formData, whatsapp: formatted })
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
      
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#5E41FF] flex items-center justify-center">
              <Users size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Clientes</h1>
              <p className="text-gray-500 text-sm">{totalCustomers} clientes ({activeCustomers} ativos, {blockedCustomers} bloqueados)</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowBlocked(!showBlocked)}
              className={`p-3 rounded-xl transition-all ${
                showBlocked 
                  ? 'bg-emerald-500/20 text-emerald-400' 
                  : 'bg-[#1a1a2e] text-gray-400 hover:text-white'
              }`}
              title={showBlocked ? 'Ocultar bloqueados' : 'Mostrar bloqueados'}
            >
              {showBlocked ? <ShieldAlert size={20} /> : <ShieldCheck size={20} />}
            </button>
            
            <button
              onClick={() => { setEditingCustomer(null); setFormData({ name: '', whatsapp: '', phone: '', email: '', notes: '' }); setIsModalOpen(true); }}
              className="flex items-center gap-2 px-6 py-3 bg-[#5E41FF] rounded-xl font-medium hover:brightness-110 transition-all"
            >
              <Plus size={20} />
              Novo Cliente
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
            <Users size={20} className="text-[#5E41FF]" />
            <span className="text-gray-400 text-sm">Total de Clientes</span>
          </div>
          <p className="text-3xl font-bold">{totalCustomers}</p>
        </div>
        
        <div className="bg-[#121021] rounded-2xl p-6 border border-white/10">
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck size={20} className="text-emerald-400" />
            <span className="text-gray-400 text-sm">Clientes Ativos</span>
          </div>
          <p className="text-3xl font-bold text-emerald-400">{activeCustomers}</p>
        </div>
        
        <div className="bg-[#121021] rounded-2xl p-6 border border-white/10">
          <div className="flex items-center gap-3 mb-2">
            <ShieldAlert size={20} className="text-red-400" />
            <span className="text-gray-400 text-sm">Bloqueados</span>
          </div>
          <p className="text-3xl font-bold text-red-400">{blockedCustomers}</p>
        </div>
      </div>

      {/* Busca */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-[#121021] rounded-2xl p-4 border border-white/10">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar por nome, WhatsApp ou e-mail..."
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 outline-none focus:border-[#5E41FF] transition-all"
            />
          </div>
        </div>
      </div>

      {/* Tabela de clientes */}
      <div className="max-w-7xl mx-auto bg-[#121021] rounded-2xl border border-white/10 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <Loader2 size={32} className="animate-spin mx-auto mb-4" />
            Carregando clientes...
          </div>
        ) : paginatedCustomers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {search ? 'Nenhum cliente encontrado para esta busca' : 'Nenhum cliente cadastrado'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-sm font-medium text-gray-400">Cliente</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-400">WhatsApp</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-400">E-mail</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-400">Cadastro</th>
                  <th className="text-center p-4 text-sm font-medium text-gray-400">Status</th>
                  <th className="text-right p-4 text-sm font-medium text-gray-400">Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCustomers.map((customer, index) => (
                  <tr 
                    key={customer.id} 
                    className={`border-b border-white/5 ${customer.active ? '' : 'bg-red-500/5'} ${index % 2 === 0 ? '' : 'bg-white/[0.02]'}`}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#5E41FF]/20 flex items-center justify-center">
                          <User size={18} className="text-[#5E41FF]" />
                        </div>
                        <div>
                          <p className={`font-bold ${!customer.active ? 'text-red-400/70 line-through' : ''}`}>{customer.name}</p>
                          {customer.notes && (
                            <p className="text-xs text-gray-500 truncate max-w-[200px]">{customer.notes}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {customer.whatsapp ? (
                        <a 
                          href={`https://wa.me/55${customer.whatsapp.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300"
                        >
                          <MessageCircle size={16} />
                          {customer.whatsapp}
                        </a>
                      ) : (
                        <span className="text-gray-500 text-sm">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      {customer.email ? (
                        <a 
                          href={`mailto:${customer.email}`}
                          className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
                        >
                          <Mail size={16} />
                          {customer.email}
                        </a>
                      ) : (
                        <span className="text-gray-500 text-sm">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Calendar size={14} />
                        {format(parseISO(customer.created_at), 'dd/MM/yyyy')}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      {customer.active ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
                          <ShieldCheck size={14} />
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
                          <ShieldAlert size={14} />
                          Inativo
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(customer)}
                          className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-all"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleToggleActive(customer.id, customer.active)}
                          className={`p-2 rounded-lg transition-all ${
                            customer.active 
                              ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30' 
                              : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                          }`}
                          title={customer.active ? 'Desativar' : 'Reativar'}
                        >
                          {customer.active ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}
                        </button>
                        <button
                          onClick={() => handleDelete(customer.id)}
                          className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-white/10">
            <p className="text-sm text-gray-400">
              Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, totalCustomers)} de {totalCustomers}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 bg-white/5 rounded-lg disabled:opacity-30 hover:bg-white/10 transition-all"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="px-4 py-2 text-sm">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 bg-white/5 rounded-lg disabled:opacity-30 hover:bg-white/10 transition-all"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setIsModalOpen(false)}>
          <div className="bg-[#121021] rounded-3xl w-full max-w-md p-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                {editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-lg">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Nome *</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-4 outline-none focus:border-[#5E41FF] transition-all"
                    placeholder="Nome completo"
                  />
                </div>
              </div>
              
              {/* WhatsApp */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">WhatsApp</label>
                <div className="relative">
                  <MessageCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                  <input
                    type="tel"
                    value={formData.whatsapp}
                    onChange={handlePhoneChange}
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-4 outline-none focus:border-[#5E41FF] transition-all"
                    placeholder="(11) 99999-9999"
                    maxLength={15}
                  />
                </div>
              </div>
              
              {/* Telefone */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Telefone</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-4 outline-none focus:border-[#5E41FF] transition-all"
                    placeholder="(11) 3333-3333"
                  />
                </div>
              </div>
              
              {/* E-mail */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-4 outline-none focus:border-[#5E41FF] transition-all"
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>
              
              {/* Observações */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Observações</label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 outline-none focus:border-[#5E41FF] transition-all resize-none"
                  placeholder="Preferências, alergias, notas..."
                />
              </div>
              
              {/* Botão */}
              <button
                type="submit"
                disabled={saving || !formData.name}
                className="w-full py-4 bg-[#5E41FF] text-white font-bold rounded-xl hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
                {saving ? 'Salvando...' : editingCustomer ? 'Atualizar Cliente' : 'Cadastrar Cliente'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
