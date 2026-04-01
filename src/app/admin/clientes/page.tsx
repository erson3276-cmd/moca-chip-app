'use client'

import { useEffect, useState } from 'react'
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
  Loader2,
  Trash2,
  Edit2,
  ShieldAlert,
  ShieldCheck,
  Star,
  Zap,
  RefreshCw
} from 'lucide-react'
import { addCustomer, getCustomers, toggleBlockCustomer, updateCustomer, deleteCustomer } from '@/app/actions/admin'

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<any>(null)
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
    (c.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (c.whatsapp && c.whatsapp.includes(search))
  )

  const handleToggleBlock = async (id: string, name: string, currentStatus: boolean) => {
    const action = currentStatus ? 'desbloquear' : 'bloquear'
    if (!confirm(`Deseja realmente ${action} a cliente ${name}?`)) return

    try {
      await toggleBlockCustomer(id, currentStatus)
      await fetchClients()
    } catch (error: any) {
      alert('Erro ao alterar status: ' + error.message)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`⚠ EXCLUSÃO DEFINITIVA: Tem certeza que deseja remover ${name} do banco de dados? Esta ação não pode ser desfeita.`)) return
    try {
      await deleteCustomer(id)
      await fetchClients()
    } catch (error: any) {
      alert('Erro ao excluir: ' + error.message)
    }
  }

  const openEditModal = (client: any) => {
    setEditingClient(client)
    setFormData({
      name: client.name,
      whatsapp: client.whatsapp || '',
      notes: client.notes || ''
    })
    setIsModalOpen(true)
  }

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (editingClient) {
        await updateCustomer(editingClient.id, formData)
      } else {
        await addCustomer(formData)
      }
      
      await fetchClients()
      setIsModalOpen(false)
      setEditingClient(null)
      setFormData({ name: '', whatsapp: '', notes: '' })
    } catch (error: any) {
      alert('Erro ao salvar: ' + error.message)
    }
    
    setSaving(false)
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Premium Header */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between bg-[#121021] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
        <div className="flex items-center gap-6">
           <div className="w-16 h-16 rounded-3xl bg-[#5E41FF] flex items-center justify-center shadow-lg shadow-[#5E41FF]/20">
              <Users size={32} className="text-white" />
           </div>
           <div>
              <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">Central de Clientes</h1>
              <p className="text-sm text-gray-500 mt-1 font-medium italic">Base VIP: {clients.length} pessoas cadastradas</p>
           </div>
        </div>
        <div className="flex items-center gap-4">
           <button 
             onClick={fetchClients}
             className="p-4 bg-white/5 text-gray-400 hover:text-white rounded-2xl border border-white/5 transition-all"
           >
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
           </button>
           <button 
             onClick={() => { setEditingClient(null); setFormData({ name: '', whatsapp: '', notes: '' }); setIsModalOpen(true); }}
             className="flex items-center gap-3 px-8 py-4 bg-[#5E41FF] text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-[#5E41FF]/20 hover:scale-[1.02] active:scale-95 transition-all"
           >
             <Plus size={20} /> Novo Cadastro VIP
           </button>
        </div>
      </div>

      {/* Filter Bar Premium */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
         <div className="relative flex-1 max-w-xl w-full">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
            <input 
              type="text" 
              placeholder="Pesquisar por nome ou WhatsApp... " 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-14 pr-8 py-5 bg-[#121021]/50 border border-white/5 rounded-[2rem] text-sm focus:border-[#5E41FF]/50 outline-none transition-all placeholder-gray-600 text-white font-bold"
            />
         </div>
         <div className="flex items-center gap-3 w-full lg:w-auto">
            <button className="flex-1 lg:flex-none px-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all">
               <Filter size={16} className="inline mr-2" /> Filtrar
            </button>
            <div className="h-10 w-[1px] bg-white/5 hidden lg:block" />
            <div className="flex items-center gap-2">
               <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Exibição:</span>
               <button className="p-3 bg-[#5E41FF]/10 text-[#5E41FF] rounded-xl border border-[#5E41FF]/20"><CheckSquare size={16} /></button>
            </div>
         </div>
      </div>

      {/* Modern Table Container */}
      <div className="bg-[#121021] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl relative">
         <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-white/5 text-[10px] uppercase tracking-widest font-black text-gray-500">
                     <th className="px-8 py-6 w-10 text-center"><CheckSquare size={14} className="mx-auto opacity-30" /></th>
                     <th className="px-8 py-6">Cliente VIP</th>
                     <th className="px-8 py-6">Status / Acesso</th>
                     <th className="px-8 py-6">Contato</th>
                     <th className="px-8 py-6 text-center">Fidelidade</th>
                     <th className="px-8 py-6 text-right pr-12">Ações</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/[0.03]">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-40 text-center">
                         <div className="flex flex-col items-center gap-6">
                            <Zap size={40} className="animate-pulse text-[#5E41FF]" />
                            <span className="text-[11px] font-black uppercase tracking-widest text-[#5E41FF] animate-bounce">Sincronizando Base de Dados...</span>
                         </div>
                      </td>
                    </tr>
                  ) : filteredClients.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-40 text-center">
                         <p className="text-gray-500 font-bold italic">Nenhum cliente localizado com estes critérios.</p>
                      </td>
                    </tr>
                  ) : filteredClients.map((client) => (
                    <tr key={client.id} className="group hover:bg-white/5 transition-all">
                       <td className="px-8 py-6 text-center"><input type="checkbox" className="w-4 h-4 rounded bg-black/40 border-white/10 text-[#5E41FF] focus:ring-0" /></td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-500/10 to-transparent flex items-center justify-center border border-white/5 relative">
                                <Users size={20} className="text-gray-400 group-hover:text-white transition-colors" />
                                {client.loyalty_points > 5 && <div className="absolute -top-2 -right-2 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center border-2 border-[#121021]"><Star size={10} className="text-[#121021] fill-[#121021]" /></div>}
                             </div>
                             <div className="flex flex-col">
                                <span className="font-black text-white text-[15px] tracking-tight group-hover:text-[#5E41FF] transition-colors">{client.name}</span>
                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5 max-w-[200px] truncate">{client.notes || 'Sem anotações internas'}</span>
                             </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                           {client.is_blocked ? (
                             <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 text-red-500 text-[9px] font-black uppercase tracking-tighter ring-1 ring-red-500/30">
                                <ShieldAlert size={12} /> Bloqueado no App
                             </div>
                           ) : (
                             <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase tracking-tighter ring-1 ring-emerald-500/30">
                                <ShieldCheck size={12} /> Liberado / VIP
                             </div>
                           )}
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-3 text-sm font-bold text-white/80">
                              <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 border border-green-500/20">
                                 <MessageCircle size={14} />
                              </div>
                              {client.whatsapp}
                           </div>
                        </td>
                        <td className="px-8 py-6 text-center">
                           <div className="inline-flex flex-col items-center">
                              <span className="text-lg font-black text-white tracking-tighter">{client.loyalty_points || 0}</span>
                              <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Pontos</span>
                           </div>
                        </td>
                        <td className="px-8 py-6 text-right space-x-2 pr-12">
                           {/* Botão de Bloqueio Rápido */}
                           <button 
                             onClick={(e) => { e.stopPropagation(); handleToggleBlock(client.id, client.name, client.is_blocked); }}
                             className={`p-3 rounded-2xl border transition-all ${client.is_blocked ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20'}`}
                             title={client.is_blocked ? "Desbloquear Acesso" : "Bloquear Acesso"}
                           >
                              {client.is_blocked ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
                           </button>
                           
                           {/* Botão de Edição */}
                           <button 
                             onClick={(e) => { e.stopPropagation(); openEditModal(client); }}
                             className="p-3 bg-white/5 text-gray-500 hover:text-blue-400 rounded-2xl border border-white/5 hover:bg-white/10 transition-all"
                           >
                              <Edit2 size={18} />
                           </button>

                           {/* Botão de Exclusão */}
                           <button 
                             onClick={(e) => { e.stopPropagation(); handleDelete(client.id, client.name); }}
                             className="p-3 bg-white/5 text-gray-500 hover:text-red-600 rounded-2xl border border-white/5 hover:bg-white/10 transition-all"
                           >
                              <Trash2 size={18} />
                           </button>
                        </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

      {/* MODAL CLIENTE VIP PREMIUM */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center lg:justify-end animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setIsModalOpen(false)} />
          
          <div className="relative w-full h-full lg:w-[500px] bg-[#121021] border-l border-white/10 shadow-2xl flex flex-col slide-in-from-right duration-500">
             
             <div className="p-8 border-b border-white/5 text-white bg-black/20 flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="w-14 h-14 rounded-3xl bg-[#5E41FF]/10 flex items-center justify-center text-[#5E41FF] border border-[#5E41FF]/20 shadow-inner">
                      <Users size={28} />
                   </div>
                   <div>
                      <h2 className="text-xl font-black italic uppercase tracking-tighter">{editingClient ? 'Editar Cadastro' : 'Novo Cliente VIP'}</h2>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Gerenciamento de Relacionamento</p>
                   </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-3 text-gray-500 hover:text-white rounded-full bg-white/5 transition-all"><X size={24} /></button>
             </div>

             <div className="flex-1 overflow-y-auto p-8 space-y-10 no-scrollbar text-white">
                <form onSubmit={handleSaveClient} className="space-y-10">
                  
                  <div className="flex flex-col items-center justify-center py-6 bg-black/20 rounded-[2.5rem] border border-white/5 group relative overflow-hidden">
                     <div className="absolute inset-0 bg-gradient-to-br from-[#5E41FF]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                     <div className="w-24 h-24 rounded-[2rem] bg-white/5 border-2 border-dashed border-white/10 flex items-center justify-center cursor-pointer hover:border-[#5E41FF]/40 transition-all relative z-10">
                        <Camera size={32} className="text-gray-600 group-hover:text-[#5E41FF]" />
                     </div>
                     <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mt-4 relative z-10">Adicionar Avatar</p>
                  </div>

                  <div className="space-y-8">
                     <div className="space-y-3">
                        <label className="text-[11px] font-black uppercase tracking-widest text-[#5E41FF]">Nome Completo</label>
                        <input 
                          required
                          type="text" 
                          value={formData.name}
                          onChange={e => setFormData({...formData, name: e.target.value})}
                          placeholder="Ex: Suanne Chagas"
                          className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-5 outline-none focus:border-[#5E41FF]/40 transition-all placeholder-gray-700 text-sm font-bold shadow-inner"
                        />
                     </div>

                     <div className="space-y-3">
                        <label className="text-[11px] font-black uppercase tracking-widest text-[#5E41FF]">WhatsApp / Telefone</label>
                        <div className="relative">
                           <input 
                             required
                             type="tel" 
                             value={formData.whatsapp}
                             onChange={e => setFormData({...formData, whatsapp: e.target.value})}
                             placeholder="(11) 90000-0000"
                             className="w-full bg-black/40 border border-white/5 rounded-2xl pl-14 pr-6 py-5 outline-none focus:border-[#5E41FF]/40 transition-all placeholder-gray-700 text-sm font-bold shadow-inner"
                           />
                           <MessageCircle className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                        </div>
                     </div>

                     <div className="space-y-3">
                        <label className="text-[11px] font-black uppercase tracking-widest text-[#5E41FF]">Observações do Perfil</label>
                        <textarea 
                          rows={4}
                          value={formData.notes}
                          onChange={e => setFormData({...formData, notes: e.target.value})}
                          placeholder="Preferências, alergias ou notas de estilo..."
                          className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-6 outline-none focus:border-[#5E41FF]/40 transition-all placeholder-gray-700 text-sm font-medium resize-none shadow-inner"
                        />
                     </div>
                  </div>
                </form>
             </div>

             <div className="p-8 bg-black/40 border-t border-white/5">
                <button 
                  onClick={handleSaveClient}
                  disabled={saving || !formData.name || !formData.whatsapp}
                  className="w-full py-6 bg-[#5E41FF] text-white rounded-3xl text-[11px] font-black uppercase tracking-widest shadow-2xl shadow-[#5E41FF]/40 hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:grayscale transition-all flex items-center justify-center gap-4"
                >
                   {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                   {editingClient ? 'Atualizar Perfil VIP' : 'Confirmar Cadastro VIP'}
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  )
}
