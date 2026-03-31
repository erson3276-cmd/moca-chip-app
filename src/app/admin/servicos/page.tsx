'use client'

import { useEffect, useState } from 'react'

export const dynamic = 'force-dynamic'
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
  Loader2
} from 'lucide-react'
import { addService, getServices } from '@/app/actions/admin'

export default function ServicesPage() {
  const [services, setServices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
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

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      await addService({
        name: formData.name,
        category: formData.category,
        duration_minutes: formData.duration_minutes,
        price: formData.price,
        description: formData.description
      })
      await fetchServices()
      setIsModalOpen(false)
      setFormData({ name: '', category: '', duration_minutes: 30, price: 0, description: '' })
    } catch (error: any) {
      alert('Erro ao salvar serviço (Servidor): ' + error.message)
    }
    
    setSaving(false)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      {/* Header Area */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Serviços</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie seu catálogo de serviços, preços e tempos.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm font-semibold hover:bg-white/10 transition-all text-gray-400">
            <RefreshCw size={16} /> Sincronizar serviços
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#5E41FF] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#5E41FF]/20 hover:brightness-110 active:scale-95 transition-all"
          >
            <Plus size={18} /> Adicionar serviço
          </button>
        </div>
      </div>

      {/* Tabs Categorias Colavo Style */}
      <div className="flex items-center gap-6 border-b border-white/5 px-2 overflow-x-auto no-scrollbar">
         {categories.map(cat => (
           <button 
             key={cat}
             onClick={() => setSelectedCategory(cat)}
             className={`pb-4 text-sm font-bold transition-all whitespace-nowrap ${selectedCategory === cat ? 'text-[#5E41FF] border-b-2 border-[#5E41FF]' : 'text-gray-500 hover:text-gray-300'}`}
           >
             {cat}
           </button>
         ))}
         <button className="pb-4 text-sm font-medium text-[#5E41FF] hover:opacity-80 flex items-center gap-1">
            <Plus size={14} /> Categoria
         </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center justify-between">
         <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-80">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
               <input 
                 type="text" 
                 placeholder="Pesquisar serviço..." 
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 className="w-full pl-10 pr-4 py-2 bg-[#141414] border border-white/5 rounded-xl text-sm focus:border-[#5E41FF]/50 outline-none transition-all placeholder-gray-500 text-white"
               />
            </div>
            <button className="p-2.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl hover:bg-blue-600/30 transition-all">
               <Filter size={18} />
            </button>
         </div>
      </div>

      {/* Table Colavo Style */}
      <div className="bg-[#121021]/30 border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
         <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-white/5 text-[10px] uppercase tracking-widest font-bold text-gray-500">
                     <th className="px-6 py-4 w-10 text-center"><CheckSquare size={14} className="mx-auto opacity-30" /></th>
                     <th className="px-6 py-4">Nome do Serviço</th>
                     <th className="px-6 py-4 text-right">Preço (R$)</th>
                     <th className="px-6 py-4 text-center">Tempo (Min)</th>
                     <th className="px-6 py-4">Anotação / Descrição</th>
                     <th className="px-6 py-4 text-center">Status</th>
                     <th className="px-6 py-4 text-center w-10"><MoreVertical size={14} className="mx-auto" /></th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-20 text-center text-gray-500 italic">Carregando catálogo...</td>
                    </tr>
                  ) : filteredServices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-20 text-center text-gray-500">Nenhum serviço encontrado nesta categoria.</td>
                    </tr>
                  ) : filteredServices.map((service) => (
                    <tr key={service.id} className="group hover:bg-white/5 transition-colors cursor-pointer text-white">
                       <td className="px-6 py-4 text-center"><input type="checkbox" className="rounded bg-black border-white/10 text-[#5E41FF] focus:ring-0" /></td>
                       <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#5E41FF]/20 to-transparent flex items-center justify-center border border-[#5E41FF]/10 ring-1 ring-[#5E41FF]/5">
                                <Package size={14} className="text-[#5E41FF]" />
                             </div>
                             <span className="font-bold text-white group-hover:text-[#5E41FF] transition-colors">{service.name}</span>
                          </div>
                       </td>
                       <td className="px-6 py-4 text-right font-bold text-white tracking-tight">
                          {service.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, style: 'currency', currency: 'BRL' })}
                       </td>
                       <td className="px-6 py-4 text-center">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 text-gray-400 text-[10px] font-bold ring-1 ring-white/5">
                             <Clock size={12} /> {service.duration_minutes} min
                          </div>
                       </td>
                       <td className="px-6 py-4 text-xs text-gray-500 italic max-w-xs">{service.description || 'Sem descrição adicional.'}</td>
                       <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center gap-1 text-emerald-500 text-[10px] font-bold uppercase tracking-widest"><CheckCircle2 size={12} /> Ativo</span>
                       </td>
                       <td className="px-6 py-4 text-center">
                          <button className="p-2 text-gray-600 hover:text-white transition-colors"><MoreVertical size={16} /></button>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

      {/* MÓDULO: MODAL ADICIONAR SERVIÇO (Colavo Clone Funcional) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center lg:justify-end animate-in fade-in duration-300">
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          />
          
          <div className="relative w-full h-[90vh] mt-[10vh] rounded-t-3xl lg:h-full lg:mt-0 lg:w-[480px] lg:rounded-none bg-[#121021] border-t lg:border-t-0 lg:border-l border-white/5 shadow-2xl flex flex-col slide-in-from-bottom lg:slide-in-from-right duration-300">
             
             <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 text-white">
                <div className="flex items-center gap-3">
                   <button onClick={() => setIsModalOpen(false)} className="p-2 -ml-2 text-gray-400 hover:text-white rounded-full hover:bg-white/5 transition-colors">
                      <X size={20} />
                   </button>
                   <h2 className="text-lg font-bold tracking-tight">Serviço</h2>
                </div>
                <button 
                  onClick={handleSaveService}
                  disabled={saving || !formData.name || formData.price <= 0}
                  className="px-4 py-2 bg-[#5E41FF] text-white text-sm font-bold rounded-xl shadow-lg shadow-[#5E41FF]/20 hover:brightness-110 disabled:opacity-50 disabled:grayscale transition-all flex items-center gap-2"
                >
                   {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                   Salvar
                </button>
             </div>

             <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar text-white">
                <form onSubmit={handleSaveService} className="space-y-6">
                  
                  <div className="space-y-1.5 px-1">
                     <label className="text-[13px] font-bold text-gray-400">Categoria</label>
                     <select 
                       value={formData.category}
                       onChange={e => setFormData({...formData, category: e.target.value})}
                       className="w-full bg-[#18181a] text-white border-b-2 border-transparent hover:border-gray-700 focus:border-[#5E41FF] py-2 outline-none transition-all text-[15px] cursor-pointer"
                     >
                        <option value="">Selecione a Categoria...</option>
                        {categories.filter(c => c !== 'Todos').map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                        <option value="Nova Categoria">Criar Nova Categoria</option>
                     </select>
                  </div>

                  <div className="space-y-1.5 px-1">
                     <label className="text-[13px] font-bold text-gray-400">Nome do serviço <span className="text-[#5E41FF]">*</span></label>
                     <input 
                       autoFocus
                       required
                       type="text" 
                       value={formData.name}
                       onChange={e => setFormData({...formData, name: e.target.value})}
                       placeholder="Ex: Luzes + Retoque"
                       className="w-full bg-[#18181a] border-b-2 border-transparent hover:border-gray-700 focus:border-[#5E41FF] py-2 outline-none transition-all placeholder-gray-600 text-[15px] font-medium"
                     />
                  </div>

                  <div className="grid grid-cols-2 gap-4 px-1">
                     <div className="space-y-1.5">
                       <label className="text-[13px] font-bold text-gray-400">Duração <span className="text-[#5E41FF]">*</span></label>
                       <select 
                         value={formData.duration_minutes}
                         onChange={e => setFormData({...formData, duration_minutes: Number(e.target.value)})}
                         className="w-full bg-[#18181a] text-white border-b-2 border-transparent hover:border-gray-700 focus:border-[#5E41FF] py-2 outline-none transition-all text-[15px] cursor-pointer"
                       >
                          <option value={15}>15 minutos</option>
                          <option value={30}>30 minutos</option>
                          <option value={45}>45 minutos</option>
                          <option value={60}>1 hora</option>
                          <option value={90}>1h 30m</option>
                          <option value={120}>2 horas</option>
                          <option value={180}>3 horas</option>
                          <option value={240}>4 horas</option>
                       </select>
                     </div>
                     <div className="space-y-1.5">
                       <label className="text-[13px] font-bold text-gray-400">Preço (R$) <span className="text-[#5E41FF]">*</span></label>
                       <input 
                         required
                         type="number" 
                         min="0"
                         step="0.01"
                         value={formData.price || ''}
                         onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                         placeholder="0.00"
                         className="w-full bg-[#18181a] border-b-2 border-transparent hover:border-gray-700 focus:border-[#5E41FF] py-2 outline-none transition-all placeholder-gray-600 text-[15px] font-medium text-right"
                       />
                     </div>
                  </div>

                  <div className="space-y-1.5 px-1 pt-4 border-t border-white/5">
                     <label className="text-[13px] font-bold text-gray-400">Descrição do Serviço</label>
                     <textarea 
                       rows={4}
                       value={formData.description}
                       onChange={e => setFormData({...formData, description: e.target.value})}
                       placeholder="Detalhe o que inclui este serviço para orientar os clientes pelo App..."
                       className="w-full bg-[#18181a] border border-white/5 rounded-xl hover:border-gray-700 focus:border-[#5E41FF] p-3 outline-none transition-all placeholder-gray-600 text-[14px] resize-none mt-1"
                     />
                  </div>

                </form>
             </div>
          </div>
        </div>
      )}

    </div>
  )
}
