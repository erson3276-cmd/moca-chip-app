'use client'

import { useEffect, useState } from 'react'

export const dynamic = 'force-dynamic'
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  MessageCircle,
  Calendar,
  CheckSquare,
  X,
  Camera,
  Save,
  Loader2
} from 'lucide-react'
import { addCustomer, getCustomers, toggleBlockCustomer } from '@/app/actions/admin'
import { ShieldAlert, ShieldCheck } from 'lucide-react'

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    whatsapp: '',
    notes: ''
  })

  async function fetchClients() {
    setLoading(true)
    try {
       const data = await getCustomers()
       setClients(data)
    } catch (error) {
       console.error(error)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchClients()
  }, [])

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.whatsapp && c.whatsapp.includes(search))
  )

  const handleToggleBlock = async (id: string, name: string, currentStatus: boolean) => {
    const action = currentStatus ? 'desbloquear' : 'bloquear'
    if (!confirm(`Deseja realmente ${action} a cliente ${name}?`)) return

    try {
      await toggleBlockCustomer(id, !currentStatus)
      await fetchClients()
    } catch (error: any) {
      alert('Erro ao alterar status: ' + error.message)
    }
  }

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      await addCustomer({
        name: formData.name,
        whatsapp: formData.whatsapp,
        notes: formData.notes
      })
      
      // Refresh list and close
      await fetchClients()
      setIsModalOpen(false)
      setFormData({ name: '', whatsapp: '', notes: '' })
    } catch (error: any) {
      alert('Erro ao salvar cliente (Servidor): ' + error.message)
    }
    
    setSaving(false)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      {/* Header Area */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie seu banco de dados de clientes e fidelidade.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm font-semibold hover:bg-white/10 transition-all text-white">
             Adicionar grupo
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#5E41FF] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#5E41FF]/20 hover:brightness-110 active:scale-95 transition-all"
          >
            <Plus size={18} /> Adicionar cliente
          </button>
        </div>
      </div>

      {/* Tabs Colavo Style */}
      <div className="flex items-center gap-8 border-b border-white/5 px-2">
         <button className="pb-4 text-sm font-bold text-[#5E41FF] border-b-2 border-[#5E41FF]">Clientes</button>
         <button className="pb-4 text-sm font-medium text-gray-500 hover:text-gray-300">Cliente removido</button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center justify-between">
         <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button className="px-4 py-1.5 rounded-full bg-[#5E41FF] text-white text-xs font-bold whitespace-nowrap">Tudo: {clients.length}</button>
            <button className="px-4 py-1.5 rounded-full bg-white/5 text-gray-400 text-xs font-medium border border-white/5 hover:border-white/10 whitespace-nowrap">Recentes</button>
            <button className="px-4 py-1.5 rounded-full bg-white/5 text-gray-400 text-xs font-medium border border-white/5 hover:border-white/10 whitespace-nowrap">Inativos</button>
         </div>

         <div className="flex items-center gap-3">
            <div className="relative flex-1 lg:w-64">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
               <input 
                 type="text" 
                 placeholder="Buscar nome, contato..." 
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 className="w-full pl-10 pr-4 py-2 text-white bg-[#141414] border border-white/5 rounded-xl text-sm focus:border-[#5E41FF]/50 outline-none transition-all placeholder-gray-500"
               />
            </div>
            <button className="p-2.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl hover:bg-blue-600/30 transition-all flex items-center gap-2 text-xs font-bold tracking-wider">
               <Filter size={16} /> FILTRO
            </button>
         </div>
      </div>

      {/* Table Colavo Style */}
      <div className="bg-[#121021]/30 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-sm shadow-2xl">
         <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-white/5 text-[10px] uppercase tracking-widest font-bold text-gray-500">
                     <th className="px-6 py-4 w-10 text-center"><CheckSquare size={14} className="mx-auto opacity-30" /></th>
                     <th className="px-6 py-4">Nome</th>
                     <th className="px-6 py-4">Status</th>
                     <th className="px-6 py-4">Contato</th>
                     <th className="px-6 py-4">Anotação</th>
                     <th className="px-6 py-4 text-center">Última Visita</th>
                     <th className="px-6 py-4 text-right">Saldo Pacote</th>
                     <th className="px-6 py-4 text-center">Fidelidade</th>
                     <th className="px-6 py-4 text-center w-10"><MoreHorizontal size={14} className="mx-auto" /></th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-20 text-center text-gray-500 italic">Carregando seus clientes...</td>
                    </tr>
                  ) : filteredClients.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-20 text-center text-gray-500">Nenhum cliente encontrado.</td>
                    </tr>
                  ) : filteredClients.map((client) => (
                    <tr key={client.id} className="group hover:bg-white/5 transition-colors cursor-pointer text-white">
                       <td className="px-6 py-4 text-center"><input type="checkbox" className="rounded bg-black border-white/10 text-[#5E41FF] focus:ring-0" /></td>
                        <td className="px-6 py-4 font-bold text-white/90 group-hover:text-white">
                          <div className="flex flex-col">
                            {client.name}
                            <span className="text-[10px] text-gray-500 font-normal">{client.notes ? 'Ver notas' : 'Sem notas'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                           {client.is_blocked ? (
                             <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest ring-1 ring-red-500/20">Bloqueada</span>
                           ) : (
                             <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-[10px] font-black uppercase tracking-widest ring-1 ring-green-500/20">Ativa</span>
                           )}
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-2 text-sm text-gray-400 group-hover:text-gray-300">
                              <MessageCircle size={14} /> {client.whatsapp}
                           </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500 italic max-w-xs truncate">{client.notes || '-'}</td>
                        <td className="px-6 py-4 text-center text-sm text-gray-400 flex items-center justify-center gap-2">
                           <Calendar size={14} className="opacity-40" />
                           {client.last_visit ? new Date(client.last_visit).toLocaleDateString() : 'Nunca'}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-[#5E41FF]">R$ {client.package_balance?.toLocaleString('pt-BR') || '0,00'}</td>
                        <td className="px-6 py-4 text-center">
                           <div className="flex items-center justify-center gap-2">
                             <span className="px-2 py-1 rounded bg-yellow-500/10 text-yellow-500 text-[10px] font-bold ring-1 ring-yellow-500/20">{client.loyalty_points || 0} pts</span>
                           </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                           <div className="flex items-center justify-center gap-2">
                              {client.is_blocked ? (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleToggleBlock(client.id, client.name, true); }}
                                  className="p-2 text-green-500 hover:bg-green-500/10 rounded-lg transition-colors border border-green-500/20 shadow-lg shadow-green-500/5 group/btn"
                                  title="Desbloquear Cliente"
                                >
                                   <ShieldCheck size={16} className="group-hover/btn:scale-110 transition-transform" />
                                </button>
                              ) : (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleToggleBlock(client.id, client.name, false); }}
                                  className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors border border-red-500/20 shadow-lg shadow-red-500/5 group/btn"
                                  title="Bloquear Cliente"
                                >
                                   <ShieldAlert size={16} className="group-hover/btn:scale-110 transition-transform" />
                                </button>
                              )}
                              <button className="p-2 text-gray-600 hover:text-white transition-colors"><MoreHorizontal size={16} /></button>
                           </div>
                        </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
         <div className="p-4 bg-white/5 text-[10px] text-gray-500 uppercase font-bold tracking-widest text-center">
            Total de {filteredClients.length} clientes listados no banco de dados.
         </div>
      </div>

      {/* MÓDULO: MODAL ADICIONAR CLIENTE (Colavo Clone Funcional) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center lg:justify-end animate-in fade-in duration-300">
          {/* Overlay Escuro */}
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          />
          
          {/* Caixa do Modal (Drawer no Desktop, Modal no Mobile) */}
          <div className="relative w-full h-[90vh] mt-[10vh] rounded-t-3xl lg:h-full lg:mt-0 lg:w-[480px] lg:rounded-none bg-[#121021] border-t lg:border-t-0 lg:border-l border-white/5 shadow-2xl flex flex-col slide-in-from-bottom lg:slide-in-from-right duration-300">
             
             {/* Header do Modal */}
             <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 text-white">
                <div className="flex items-center gap-3">
                   <button onClick={() => setIsModalOpen(false)} className="p-2 -ml-2 text-gray-400 hover:text-white rounded-full hover:bg-white/5 transition-colors">
                      <X size={20} />
                   </button>
                   <h2 className="text-lg font-bold tracking-tight">Informações do cliente</h2>
                </div>
                <button 
                  onClick={handleSaveClient}
                  disabled={saving || !formData.name}
                  className="px-4 py-2 bg-[#5E41FF] text-white text-sm font-bold rounded-xl shadow-lg shadow-[#5E41FF]/20 hover:brightness-110 disabled:opacity-50 disabled:grayscale transition-all flex items-center gap-2"
                >
                   {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                   Salvar
                </button>
             </div>

             {/* Corpo do Formulário */}
             <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar text-white">
                <form onSubmit={handleSaveClient} id="client-form" className="space-y-8">
                  
                  {/* Seção 1: Informação Básica */}
                  <section className="space-y-5">
                    <h3 className="text-xs uppercase tracking-widest text-gray-500 font-bold border-b border-white/5 pb-2">Informação Básica</h3>
                    
                    <div className="flex items-center gap-4">
                       <div className="w-16 h-16 rounded-full bg-[#18181a] border border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors group">
                          <Camera size={24} className="text-gray-500 group-hover:text-[#5E41FF]" />
                       </div>
                       <div className="text-sm text-gray-400 leading-tight">
                         <p className="font-medium text-gray-300">Foto de Perfil</p>
                         <p className="text-xs mt-1">Toque para adicionar foto</p>
                       </div>
                    </div>

                    <div className="space-y-1.5 px-1">
                       <label className="text-[13px] font-bold text-gray-400">Nome <span className="text-[#5E41FF]">*</span></label>
                       <input 
                         autoFocus
                         required
                         type="text" 
                         value={formData.name}
                         onChange={e => setFormData({...formData, name: e.target.value})}
                         placeholder="Ex: Amanda Silva"
                         className="w-full bg-[#18181a] border-b-2 border-transparent hover:border-gray-700 focus:border-[#5E41FF] py-2 outline-none transition-all placeholder-gray-600 text-[15px] font-medium"
                       />
                    </div>

                    <div className="space-y-1.5 px-1">
                       <label className="text-[13px] font-bold text-gray-400">Telefone / WhatsApp</label>
                       <input 
                         type="tel" 
                         value={formData.whatsapp}
                         onChange={e => setFormData({...formData, whatsapp: e.target.value})}
                         placeholder="(11) 90000-0000"
                         className="w-full bg-[#18181a] border-b-2 border-transparent hover:border-gray-700 focus:border-[#5E41FF] py-2 outline-none transition-all placeholder-gray-600 text-[15px] font-medium"
                       />
                    </div>

                    <div className="space-y-1.5 px-1">
                       <label className="text-[13px] font-bold text-gray-400">Anotações Internas</label>
                       <textarea 
                         rows={2}
                         value={formData.notes}
                         onChange={e => setFormData({...formData, notes: e.target.value})}
                         placeholder="Ex: É alérgica a produtos com amônia"
                         className="w-full bg-[#18181a] border border-white/5 rounded-xl hover:border-gray-700 focus:border-[#5E41FF] p-3 outline-none transition-all placeholder-gray-600 text-[14px] resize-none mt-1"
                       />
                    </div>
                  </section>

                  {/* Seção 2: Detalhes Extra (Estilo Colavo) */}
                  <section className="space-y-5">
                    <h3 className="text-xs uppercase tracking-widest text-gray-500 font-bold border-b border-white/5 pb-2">Detalhes</h3>
                    
                    <div className="grid grid-cols-2 gap-4 px-1">
                       <div className="space-y-1.5">
                         <label className="text-[13px] font-bold text-gray-400">Gênero</label>
                         <select className="w-full bg-[#18181a] text-white border-b-2 border-transparent hover:border-gray-700 focus:border-[#5E41FF] py-2 outline-none transition-all text-[14px]">
                            <option>Selecione...</option>
                            <option>Feminino</option>
                            <option>Masculino</option>
                            <option>Não informar</option>
                         </select>
                       </div>
                       <div className="space-y-1.5">
                         <label className="text-[13px] font-bold text-gray-400">Aniversário</label>
                         <input 
                           type="date" 
                           className="w-full bg-[#18181a] text-gray-400 border-b-2 border-transparent hover:border-gray-700 focus:border-[#5E41FF] py-2 outline-none transition-all text-[14px] color-scheme-dark"
                         />
                       </div>
                    </div>
                  </section>

                </form>
             </div>
          </div>
        </div>
      )}

    </div>
  )
}
