'use client'

import { useEffect, useState } from 'react'
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  DollarSign, 
  MoreVertical,
  CheckCircle2,
  XCircle,
  RefreshCw,
  CheckSquare,
  X,
  Save,
  Loader2,
  Trash2,
  Edit2
} from 'lucide-react'
import { addService, getServices, updateService, deleteService } from '@/app/actions/admin'

export default function ServicesPage() {
  const [services, setServices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingService, setEditingService] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    duration_minutes: 30,
    price: 0,
    description: ''
  })

  async function fetchServices() {
    setLoading(true)
    try {
      const data = await getServices()
      setServices(data)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchServices()
  }, [])

  const categories = ['Todos', ...Array.from(new Set((services || []).map(s => s?.category).filter(Boolean)))]
  
  const filteredServices = (services || []).filter(s => {
    const matchesSearch = (s?.name || '').toLowerCase().includes(search.toLowerCase())
    const matchesCategory = selectedCategory === 'Todos' || s?.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const openEditModal = (service: any) => {
    setEditingService(service)
    setFormData({
      name: service.name,
      category: service.category || '',
      duration_minutes: service.duration_minutes,
      price: service.price,
      description: service.description || ''
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este serviço? Agendamentos existentes não serão afetados.')) return
    try {
      await deleteService(id)
      await fetchServices()
    } catch (error: any) {
      alert('Erro ao excluir: ' + error.message)
    }
  }

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (editingService) {
        await updateService(editingService.id, formData)
      } else {
        await addService(formData)
      }
      await fetchServices()
      setIsModalOpen(false)
      setEditingService(null)
      setFormData({ name: '', category: '', duration_minutes: 30, price: 0, description: '' })
    } catch (error: any) {
      alert('Erro ao salvar serviço: ' + error.message)
    }
    
    setSaving(false)
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Header Area */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between bg-[#121021] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">Catálogo de Serviços</h1>
          <p className="text-sm text-gray-500 mt-2 font-medium">Gestão de pacotes, precificação e tempos de execução.</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={fetchServices}
            className="p-4 bg-white/5 text-gray-400 hover:text-white rounded-2xl hover:bg-white/10 transition-all border border-white/5"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={() => { setEditingService(null); setFormData({ name: '', category: '', duration_minutes: 30, price: 0, description: '' }); setIsModalOpen(true); }}
            className="flex items-center gap-3 px-8 py-4 bg-[#5E41FF] text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-[#5E41FF]/20 hover:scale-[1.02] active:scale-95 transition-all"
          >
            <Plus size={20} /> Adicionar Serviço
          </button>
        </div>
      </div>

      {/* Tabs Categorias Premium */}
      <div className="flex items-center gap-4 bg-black/20 p-1.5 rounded-2xl border border-white/5 w-fit overflow-x-auto no-scrollbar">
         {categories.map(cat => (
           <button 
             key={cat}
             onClick={() => setSelectedCategory(cat)}
             className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedCategory === cat ? 'bg-[#5E41FF] text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
           >
             {cat}
           </button>
         ))}
      </div>

      {/* Main Table Container */}
      <div className="bg-[#121021] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
         {/* Filter Bar */}
         <div className="p-6 border-b border-white/5 flex flex-col lg:flex-row gap-4 justify-between bg-black/20">
            <div className="relative flex-1 max-w-md">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
               <input 
                 type="text" 
                 placeholder="O que você está procurando?" 
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 className="w-full pl-12 pr-6 py-4 bg-black/40 border border-white/5 rounded-2xl text-sm focus:border-[#5E41FF]/50 outline-none transition-all placeholder-gray-600 text-white"
               />
            </div>
         </div>

         <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-white/5 text-[10px] uppercase tracking-widest font-black text-gray-500">
                     <th className="px-8 py-5 w-10 text-center"><CheckSquare size={14} className="mx-auto opacity-30" /></th>
                     <th className="px-8 py-5">Serviço</th>
                     <th className="px-8 py-5 text-right font-black">Preço</th>
                     <th className="px-8 py-5 text-center font-black">Duração</th>
                     <th className="px-8 py-5">Categoria / Descrição</th>
                     <th className="px-8 py-5 text-right pr-12">Ações</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/[0.03]">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-32 text-center">
                         <div className="flex flex-col items-center gap-4">
                            <Loader2 size={32} className="animate-spin text-[#5E41FF]" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 italic">Consultando Catálogo...</span>
                         </div>
                      </td>
                    </tr>
                  ) : filteredServices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-32 text-center text-gray-500 italic font-medium">Nenhum serviço encontrado.</td>
                    </tr>
                  ) : filteredServices.map((service) => (
                    <tr key={service.id} className="group hover:bg-white/5 transition-all cursor-default">
                       <td className="px-8 py-6 text-center"><input type="checkbox" className="w-4 h-4 rounded bg-black/40 border-white/10 text-[#5E41FF] focus:ring-0" /></td>
                       <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#5E41FF]/20 to-transparent flex items-center justify-center border border-[#5E41FF]/20 shadow-inner">
                                <Package size={20} className="text-[#5E41FF]" />
                             </div>
                             <div>
                                <span className="block font-black text-white text-[15px] tracking-tight">{service.name}</span>
                                <span className="text-[9px] font-black text-[#5E41FF] uppercase mt-0.5 block tracking-widest opacity-80">{service.category || 'Geral'}</span>
                             </div>
                          </div>
                       </td>
                       <td className="px-8 py-6 text-right font-black text-white text-lg tracking-tighter">
                          {service.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, style: 'currency', currency: 'BRL' })}
                       </td>
                       <td className="px-8 py-6 text-center">
                          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-orange-500/10 text-orange-500 text-[10px] font-black uppercase ring-1 ring-orange-500/20">
                             <Clock size={12} /> {service.duration_minutes}m
                          </div>
                       </td>
                       <td className="px-8 py-6">
                          <p className="text-xs text-gray-500 italic line-clamp-1 max-w-[200px]">{service.description || 'Nenhuma descrição.'}</p>
                       </td>
                       <td className="px-8 py-6 text-right space-x-2 pr-12">
                          <button 
                            onClick={() => openEditModal(service)}
                            className="p-3 text-gray-500 hover:text-blue-400 bg-white/5 rounded-xl transition-all border border-white/5"
                          >
                             <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(service.id)}
                            className="p-3 text-gray-500 hover:text-red-500 bg-white/5 rounded-xl transition-all border border-white/5"
                          >
                             <Trash2 size={16} />
                          </button>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

      {/* MODAL SERVIÇO PREMIUM */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center lg:justify-end animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setIsModalOpen(false)} />
          
          <div className="relative w-full h-full lg:w-[500px] bg-[#121021] border-l border-white/10 shadow-2xl flex flex-col slide-in-from-right duration-500">
             
             <div className="p-8 border-b border-white/5 text-white bg-black/20 flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-[#5E41FF]/10 flex items-center justify-center text-[#5E41FF]">
                      <Package size={24} />
                   </div>
                   <div>
                      <h2 className="text-xl font-black italic uppercase tracking-tighter">{editingService ? 'Editar' : 'Novo'} Serviço</h2>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Definição de Catálogo</p>
                   </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-3 text-gray-500 hover:text-white rounded-full bg-white/5 transition-all"><X size={24} /></button>
             </div>

             <div className="flex-1 overflow-y-auto p-8 space-y-10 no-scrollbar text-white">
                <form onSubmit={handleSaveService} className="space-y-8">
                  
                  <div className="space-y-3">
                     <label className="text-[11px] font-black uppercase tracking-widest text-[#5E41FF]">Categoria do Serviço</label>
                     <div className="relative">
                        <select 
                          value={formData.category}
                          onChange={e => setFormData({...formData, category: e.target.value})}
                          className="w-full bg-black/40 text-white border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-[#5E41FF]/40 transition-all text-sm font-bold appearance-none cursor-pointer"
                        >
                           <option value="">Selecione...</option>
                           {categories.filter(c => c !== 'Todos').map(c => (
                             <option key={c} value={c}>{c}</option>
                           ))}
                           <option value="Cabelo">Cabelo</option>
                           <option value="Unhas">Unhas</option>
                           <option value="Estética">Estética</option>
                        </select>
                        <MoreVertical className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" size={16} />
                     </div>
                  </div>

                  <div className="space-y-3">
                     <label className="text-[11px] font-black uppercase tracking-widest text-[#5E41FF]">Nome Comercial</label>
                     <input 
                       required
                       type="text" 
                       value={formData.name}
                       onChange={e => setFormData({...formData, name: e.target.value})}
                       placeholder="Ex: Corte Designer + Hidratação"
                       className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-[#5E41FF]/40 transition-all placeholder-gray-700 text-sm font-bold"
                     />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                     <div className="space-y-3">
                        <label className="text-[11px] font-black uppercase tracking-widest text-orange-500">Tempo Estimado</label>
                        <select 
                          value={formData.duration_minutes}
                          onChange={e => setFormData({...formData, duration_minutes: Number(e.target.value)})}
                          className="w-full bg-black/40 text-white border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-[#5E41FF]/40 transition-all text-sm font-bold appearance-none"
                        >
                           <option value={15}>15 min</option>
                           <option value={30}>30 min</option>
                           <option value={45}>45 min</option>
                           <option value={60}>1h 00m</option>
                           <option value={90}>1h 30m</option>
                           <option value={120}>2h 00m</option>
                           <option value={180}>3h 00m</option>
                           <option value={240}>4h 00m</option>
                        </select>
                     </div>
                     <div className="space-y-3">
                        <label className="text-[11px] font-black uppercase tracking-widest text-emerald-500">Preço Base (R$)</label>
                        <input 
                          required
                          type="number" 
                          step="0.01"
                          value={formData.price || ''}
                          onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                          placeholder="0.00"
                          className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-[#5E41FF]/40 transition-all placeholder-gray-700 text-sm font-bold text-right"
                        />
                     </div>
                  </div>

                  <div className="space-y-3">
                     <label className="text-[11px] font-black uppercase tracking-widest text-[#5E41FF]">Detalhes do Especialista</label>
                     <textarea 
                       rows={4}
                       value={formData.description}
                       onChange={e => setFormData({...formData, description: e.target.value})}
                       placeholder="O que o cliente precisa saber sobre este serviço?"
                       className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-5 outline-none focus:border-[#5E41FF]/40 transition-all placeholder-gray-700 text-sm resize-none font-medium"
                     />
                  </div>
                </form>
             </div>

             <div className="p-8 bg-black/20 border-t border-white/5">
                <button 
                  onClick={handleSaveService}
                  disabled={saving || !formData.name || !formData.price}
                  className="w-full py-5 bg-[#5E41FF] text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-[#5E41FF]/20 hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:grayscale transition-all flex items-center justify-center gap-3"
                >
                   {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                   {editingService ? 'Salvar Alterações' : 'Criar Serviço'}
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  )
}
