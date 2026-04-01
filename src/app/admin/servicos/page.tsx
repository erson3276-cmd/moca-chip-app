'use client'

import { useEffect, useState, useCallback } from 'react'
import { 
  Scissors,
  Plus,
  Search,
  Trash2,
  Edit2,
  X,
  Clock,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  Package,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react'

interface Service {
  id: string
  name: string
  price: number
  duration_minutes: number
  description: string | null
  category: string | null
  active: boolean
  created_at: string
}

interface FormData {
  name: string
  price: string
  duration_minutes: number
  description: string
  category: string
}

const CATEGORIES = ['Cabelo', 'Unhas', 'Estética', 'Maquiagem', 'Depilação', 'Geral']
const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120, 150, 180, 240]

export default function ServicosPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [formData, setFormData] = useState<FormData>({
    name: '',
    price: '',
    duration_minutes: 60,
    description: '',
    category: ''
  })
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const fetchServices = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/services')
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setServices(data.data || [])
    } catch (error: any) {
      showMessage('error', 'Erro ao carregar serviços')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchServices()
  }, [fetchServices])

  const filteredServices = services.filter(s => {
    if (!s) return false
    const searchLower = search.toLowerCase()
    const matchesSearch = !search || 
      s.name?.toLowerCase().includes(searchLower) ||
      s.description?.toLowerCase().includes(searchLower) ||
      s.category?.toLowerCase().includes(searchLower)
    const serviceCat = (s.category || '').toLowerCase().trim()
    const matchesCategory = !selectedCategory || serviceCat === selectedCategory.toLowerCase()
    const matchesActive = showInactive || s.active
    return matchesSearch && matchesCategory && matchesActive
  })

  const activeServices = services.filter(s => s && s.active).length
  const totalServices = services.length
  const totalPages = Math.ceil(filteredServices.length / itemsPerPage)
  const paginatedServices = filteredServices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) { showMessage('error', 'Nome é obrigatório'); return }
    if (!formData.price || Number(formData.price) <= 0) { showMessage('error', 'Preço é obrigatório'); return }
    setSaving(true)
    try {
      const payload = {
        name: formData.name.trim(),
        price: Number(formData.price),
        duration_minutes: formData.duration_minutes,
        description: formData.description || null,
        category: formData.category || null
      }
      const response = await fetch('/api/services', {
        method: editingService ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingService ? { ...payload, id: editingService.id } : payload)
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      showMessage('success', editingService ? 'Serviço atualizado!' : 'Serviço criado!')
      setIsModalOpen(false)
      setEditingService(null)
      setFormData({ name: '', price: '', duration_minutes: 60, description: '', category: '' })
      fetchServices()
    } catch (error: any) {
      showMessage('error', error.message)
    }
    setSaving(false)
  }

  const handleEdit = (service: Service) => {
    setEditingService(service)
    setFormData({
      name: service.name || '',
      price: String(service.price || ''),
      duration_minutes: service.duration_minutes || 60,
      description: service.description || '',
      category: service.category || ''
    })
    setIsModalOpen(true)
  }

  const handleToggleActive = async (service: Service) => {
    if (!confirm(`Deseja ${service.active ? 'desativar' : 'ativar'} este serviço?`)) return
    try {
      const response = await fetch('/api/services', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: service.id, active: !service.active })
      })
      if (!response.ok) throw new Error('Erro ao atualizar')
      showMessage('success', service.active ? 'Serviço desativado!' : 'Serviço ativado!')
      fetchServices()
    } catch (error) {
      showMessage('error', 'Erro ao atualizar serviço')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('⚠️ Excluir permanentemente este serviço?')) return
    try {
      const response = await fetch(`/api/services?id=${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Erro ao excluir')
      showMessage('success', 'Serviço excluído!')
      fetchServices()
    } catch (error) {
      showMessage('error', 'Erro ao excluir serviço')
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#5E41FF] flex items-center justify-center">
              <Scissors size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Serviços</h1>
              <p className="text-gray-500 text-sm">{activeServices} de {totalServices} serviços ativos</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowInactive(!showInactive)} className={`p-3 rounded-xl transition-all ${showInactive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#1a1a2e] text-gray-400 hover:text-white'}`}>
              {showInactive ? <ShieldAlert size={20} /> : <ShieldCheck size={20} />}
            </button>
            <button onClick={() => { setEditingService(null); setFormData({ name: '', price: '', duration_minutes: 60, description: '', category: '' }); setIsModalOpen(true); }} className="flex items-center gap-2 px-6 py-3 bg-[#5E41FF] rounded-xl font-medium hover:brightness-110 transition-all">
              <Plus size={20} /> Novo Serviço
            </button>
          </div>
        </div>
      </div>

      {message && (
        <div className={`max-w-7xl mx-auto mb-4 p-4 rounded-xl ${message.type === 'success' ? 'bg-green-600/20 text-green-400 border border-green-600/30' : 'bg-red-600/20 text-red-400 border border-red-600/30'}`}>
          {message.text}
        </div>
      )}

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#121021] rounded-2xl p-6 border border-white/10">
          <div className="flex items-center gap-3 mb-2">
            <Package size={20} className="text-[#5E41FF]" />
            <span className="text-gray-400 text-sm">Total de Serviços</span>
          </div>
          <p className="text-3xl font-bold">{totalServices}</p>
        </div>
        <div className="bg-[#121021] rounded-2xl p-6 border border-white/10">
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck size={20} className="text-emerald-400" />
            <span className="text-gray-400 text-sm">Serviços Ativos</span>
          </div>
          <p className="text-3xl font-bold text-emerald-400">{activeServices}</p>
        </div>
        <div className="bg-[#121021] rounded-2xl p-6 border border-white/10">
          <div className="flex items-center gap-3 mb-2">
            <Clock size={20} className="text-orange-400" />
            <span className="text-gray-400 text-sm">Inativos</span>
          </div>
          <p className="text-3xl font-bold text-orange-400">{totalServices - activeServices}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <button onClick={() => { setSelectedCategory(null); setCurrentPage(1); }} className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${!selectedCategory ? 'bg-[#5E41FF] text-white' : 'bg-[#121021] text-gray-400 hover:text-white border border-white/10'}`}>Todos</button>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => { setSelectedCategory(cat); setCurrentPage(1); }} className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-[#5E41FF] text-white' : 'bg-[#121021] text-gray-400 hover:text-white border border-white/10'}`}>{cat}</button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-[#121021] rounded-2xl p-4 border border-white/10">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input type="text" placeholder="Buscar por nome, categoria ou descrição..." value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 outline-none focus:border-[#5E41FF] transition-all" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto bg-[#121021] rounded-2xl border border-white/10 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500"><Loader2 size={32} className="animate-spin mx-auto mb-4" />Carregando serviços...</div>
        ) : paginatedServices.length === 0 ? (
          <div className="p-8 text-center text-gray-500">{search || selectedCategory ? 'Nenhum serviço encontrado' : 'Nenhum serviço cadastrado'}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-sm font-medium text-gray-400">Serviço</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-400">Categoria</th>
                  <th className="text-center p-4 text-sm font-medium text-gray-400">Duração</th>
                  <th className="text-right p-4 text-sm font-medium text-gray-400">Preço</th>
                  <th className="text-center p-4 text-sm font-medium text-gray-400">Status</th>
                  <th className="text-right p-4 text-sm font-medium text-gray-400">Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginatedServices.map((service, index) => (
                  <tr key={service.id} className={`border-b border-white/5 ${service.active ? '' : 'bg-red-500/5'} ${index % 2 === 0 ? '' : 'bg-white/[0.02]'}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#5E41FF]/20 flex items-center justify-center"><Package size={18} className="text-[#5E41FF]" /></div>
                        <div>
                          <p className={`font-bold ${!service.active ? 'text-red-400/70' : ''}`}>{service.name}</p>
                          {service.description && <p className="text-xs text-gray-500 truncate max-w-[250px]">{service.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="p-4"><span className="px-3 py-1 rounded-full text-xs font-medium bg-white/10">{service.category || 'Geral'}</span></td>
                    <td className="p-4 text-center"><div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400"><Clock size={14} />{service.duration_minutes} min</div></td>
                    <td className="p-4 text-right"><span className="text-lg font-bold text-emerald-400">R$ {Number(service.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></td>
                    <td className="p-4 text-center">
                      {service.active ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400"><ShieldCheck size={14} />Ativo</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400"><ShieldAlert size={14} />Inativo</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEdit(service)} className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-all" title="Editar"><Edit2 size={16} /></button>
                        <button onClick={() => handleToggleActive(service)} className={`p-2 rounded-lg transition-all ${service.active ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'}`} title={service.active ? 'Desativar' : 'Ativar'}>
                          {service.active ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}
                        </button>
                        <button onClick={() => handleDelete(service.id)} className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all" title="Excluir"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-white/10">
            <p className="text-sm text-gray-400">Mostrando {Math.min((currentPage - 1) * itemsPerPage + 1, filteredServices.length)} a {Math.min(currentPage * itemsPerPage, filteredServices.length)} de {filteredServices.length}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 bg-white/5 rounded-lg disabled:opacity-30 hover:bg-white/10 transition-all"><ChevronLeft size={18} /></button>
              <span className="px-4 py-2 text-sm">{currentPage} / {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 bg-white/5 rounded-lg disabled:opacity-30 hover:bg-white/10 transition-all"><ChevronRight size={18} /></button>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setIsModalOpen(false)}>
          <div className="bg-[#121021] rounded-3xl w-full max-w-md p-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">{editingService ? 'Editar Serviço' : 'Novo Serviço'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-lg"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Nome do Serviço *</label>
                <div className="relative">
                  <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                  <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-4 outline-none focus:border-[#5E41FF] transition-all" placeholder="Ex: Corte Feminino" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Categoria</label>
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 outline-none focus:border-[#5E41FF] transition-all">
                  <option value="">Selecione...</option>
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Preço (R$) *</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                    <input type="number" step="0.01" required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-4 outline-none focus:border-[#5E41FF] transition-all" placeholder="0,00" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Duração</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                    <select value={formData.duration_minutes} onChange={e => setFormData({...formData, duration_minutes: Number(e.target.value)})} className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-4 outline-none focus:border-[#5E41FF] transition-all appearance-none">
                      {DURATION_OPTIONS.map(mins => <option key={mins} value={mins}>{mins} min</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Descrição</label>
                <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 outline-none focus:border-[#5E41FF] transition-all resize-none" placeholder="Detalhes sobre o serviço..." />
              </div>
              <button type="submit" disabled={saving} className="w-full py-4 bg-[#5E41FF] text-white font-bold rounded-xl hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
                {saving ? 'Salvando...' : editingService ? 'Atualizar Serviço' : 'Criar Serviço'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
