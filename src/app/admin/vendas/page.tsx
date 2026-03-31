'use client'

import { useEffect, useState } from 'react'
import { 
  Calculator, 
  Plus, 
  Search, 
  Filter, 
  DollarSign, 
  Calendar,
  MoreVertical,
  CheckCircle2,
  Clock,
  TrendingUp,
  Receipt,
  X,
  User,
  Save,
  Loader2,
  CreditCard,
  Banknote,
  QrCode,
  Trash2,
  Edit2
} from 'lucide-react'
import { addSale, getSales, getCustomers, updateSale, deleteSale } from '@/app/actions/admin'

export default function SalesPage() {
  const [sales, setSales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Todos')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [customers, setCustomers] = useState<any[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form State
  const [formData, setFormData] = useState({
    customerId: '',
    amount: 0,
    paymentMethod: 'Pix',
    status: 'pago'
  })

  async function fetchData() {
    setLoading(true)
    try { 
      const vendas = await getSales()
      setSales(vendas) 
    } catch(e) { console.error("Sales fetch erro:", e) }
    
    try { 
      const clientes = await getCustomers()
      setCustomers(clientes) 
    } catch(e) { console.error("Customers fetch erro:", e) }
    
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filteredSales = sales.filter(s => {
    const customerName = s.customers?.name || 'Cliente Avulso'
    const matchesSearch = customerName.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'Todos' || s.status === statusFilter.toLowerCase()
    return matchesSearch && matchesStatus
  })

  const totalRevenue = filteredSales.reduce((acc, curr) => acc + Number(curr.amount), 0)

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const payload = {
        customer_id: formData.customerId,
        amount: formData.amount,
        payment_method: formData.paymentMethod,
        status: formData.status
      }

      if (editingId) {
        await updateSale(editingId, payload)
      } else {
        await addSale(payload)
      }

      await fetchData()
      setIsModalOpen(false)
      setEditingId(null)
      setFormData({ customerId: '', amount: 0, paymentMethod: 'Pix', status: 'pago' })
    } catch(error: any) {
      alert('Erro ao processar venda: ' + error.message)
    }

    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita.')) return
    try {
      const { deleteSale } = await import('@/app/actions/admin')
      await deleteSale(id)
      await fetchData()
      // Força a atualização do servidor para refletir nos relatórios
      window.location.reload()
    } catch (e: any) {
      alert('Erro ao excluir: ' + e.message)
    }
  }

  const openEdit = (sale: any) => {
    setEditingId(sale.id)
    setFormData({
      customerId: sale.customer_id,
      amount: sale.amount,
      paymentMethod: sale.payment_method || 'Pix',
      status: sale.status || 'pago'
    })
    setIsModalOpen(true)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vendas</h1>
          <p className="text-sm text-gray-500 mt-1">Histórico financeiro e faturamento do salão.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              setEditingId(null)
              setFormData({ customerId: '', amount: 0, paymentMethod: 'Pix', status: 'pago' })
              setIsModalOpen(true)
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#5E41FF] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#5E41FF]/20 hover:brightness-110 active:scale-95 transition-all"
          >
            <Plus size={18} /> Adicionar venda
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="p-6 rounded-3xl bg-[#121021]/50 border border-white/5 flex items-center justify-between group hover:bg-[#121021]/80 transition-all">
            <div>
               <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mb-1">Faturamento Total</p>
               <p className="text-2xl font-bold tracking-tight text-white">R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
               <TrendingUp className="text-emerald-500" size={24} />
            </div>
         </div>
         <div className="p-6 rounded-3xl bg-[#121021]/50 border border-white/5 flex items-center justify-between group hover:bg-[#121021]/80 transition-all">
            <div>
               <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mb-1">Vendas Hoje</p>
               <p className="text-2xl font-bold tracking-tight text-white">{filteredSales.length}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#5E41FF]/10 flex items-center justify-center border border-[#5E41FF]/20 group-hover:scale-110 transition-transform">
               <Receipt className="text-[#5E41FF]" size={24} />
            </div>
         </div>
         <div className="p-6 rounded-3xl bg-[#121021]/50 border border-white/5 flex items-center justify-between group hover:bg-[#121021]/80 transition-all">
            <div>
               <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mb-1">Ticket Médio</p>
               <p className="text-2xl font-bold tracking-tight text-white">R$ {(filteredSales.length ? totalRevenue / filteredSales.length : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform">
               <DollarSign className="text-amber-500" size={24} />
            </div>
         </div>
      </div>

      <div className="flex items-center gap-8 border-b border-white/5 px-2">
         {['Todos', 'Pago', 'Pendente'].map(tab => (
           <button 
             key={tab}
             onClick={() => setStatusFilter(tab)}
             className={`pb-4 text-sm font-bold transition-all ${statusFilter === tab ? 'text-[#5E41FF] border-b-2 border-[#5E41FF]' : 'text-gray-500 hover:text-gray-300'}`}
           >
             {tab}
           </button>
         ))}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center justify-between">
         <div className="flex items-center gap-3">
            <div className="relative flex-1 lg:w-64">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
               <input 
                 type="text" 
                 placeholder="Cliente..." 
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 className="w-full pl-10 pr-4 py-2 bg-[#141414] border border-white/5 rounded-xl text-sm focus:border-[#5E41FF]/50 outline-none transition-all text-white placeholder-gray-500"
               />
            </div>
            <button className="p-2.5 bg-white/5 text-gray-400 border border-white/10 rounded-xl hover:bg-white/10 transition-all">
               <Filter size={18} />
            </button>
         </div>
      </div>

      <div className="bg-[#121021]/30 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
         <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-white/5 text-[10px] uppercase tracking-widest font-bold text-gray-500">
                     <th className="px-8 py-5">Data e Hora</th>
                     <th className="px-8 py-5">Cliente</th>
                     <th className="px-8 py-5 text-right">Valor Líquido</th>
                     <th className="px-8 py-5">Pagamento</th>
                     <th className="px-8 py-5 text-center">Status</th>
                     <th className="px-8 py-5 text-center w-10">Ações</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-20 text-center text-gray-500 italic">Carregando faturamento...</td>
                    </tr>
                  ) : filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-20 text-center text-gray-500">Nenhuma venda encontrada.</td>
                    </tr>
                  ) : filteredSales.map((sale) => (
                    <tr key={sale.id} className="group hover:bg-white/5 transition-colors cursor-pointer">
                       <td className="px-8 py-5 flex items-center gap-3 text-white">
                          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-500 group-hover:text-[#5E41FF] transition-colors">
                             <Calendar size={16} />
                          </div>
                          <div className="flex flex-col">
                             <span className="text-sm font-bold text-white/90">{new Date(sale.created_at).toLocaleDateString('pt-BR')}</span>
                             <span className="text-[10px] text-gray-500 font-bold">{new Date(sale.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                       </td>
                       <td className="px-8 py-5 text-white">
                          <div className="flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-[#5E41FF]" />
                             <span className="text-sm font-semibold">{sale.customers?.name || 'Cliente Avulso'}</span>
                          </div>
                       </td>
                       <td className="px-8 py-5 text-right text-lg font-bold text-[#5E41FF] tracking-tight">
                          {Number(sale.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, style: 'currency', currency: 'BRL' })}
                       </td>
                       <td className="px-8 py-5">
                          <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">{sale.payment_method || 'Cartão'}</span>
                       </td>
                       <td className="px-8 py-5 text-center">
                          {sale.status === 'pago' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-500 text-[10px] font-bold uppercase tracking-[0.2em] bg-emerald-500/5 px-3 py-1.5 rounded-full ring-1 ring-emerald-500/20"><CheckCircle2 size={12} /> Pago</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-500 text-[10px] font-bold uppercase tracking-[0.2em] bg-amber-500/5 px-3 py-1.5 rounded-full ring-1 ring-amber-500/20"><Clock size={12} /> Pendente</span>
                          )}
                       </td>
                       <td className="px-8 py-5 text-center">
                          <div className="flex items-center justify-center gap-2">
                             <button 
                                type="button"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEdit(sale); }}
                                className="p-3 text-gray-500 hover:text-[#5E41FF] hover:bg-[#5E41FF]/10 rounded-xl transition-all border border-transparent hover:border-[#5E41FF]/20"
                                title="Editar Venda"
                             >
                                <Edit2 size={18} />
                             </button>
                             <button 
                                type="button"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(sale.id); }}
                                className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20"
                                title="Excluir Venda"
                             >
                                <Trash2 size={18} />
                             </button>
                          </div>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

      {/* MÓDULO: MODAL CHECKOUT / NOVA VENDA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center lg:justify-end animate-in fade-in duration-300">
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          />
          
          <div className="relative w-full h-[90vh] mt-[10vh] rounded-t-3xl lg:h-full lg:mt-0 lg:w-[500px] lg:rounded-none bg-[#121021] border-t lg:border-t-0 lg:border-l border-white/5 shadow-2xl flex flex-col slide-in-from-bottom lg:slide-in-from-right duration-300">
             
             {/* Header */}
             <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 text-white bg-[#0A0A0A]/50">
                <div className="flex items-center gap-3">
                   <button onClick={() => setIsModalOpen(false)} className="p-2 -ml-2 text-gray-400 hover:text-white rounded-full hover:bg-white/5 transition-colors">
                      <X size={20} />
                   </button>
                   <h2 className="text-lg font-bold tracking-tight">{editingId ? 'Editar Venda' : 'Checkout'}</h2>
                </div>
                <button 
                  onClick={handleCheckout}
                  disabled={saving || !formData.customerId}
                  className="px-5 py-2.5 bg-emerald-500 text-black text-sm font-bold rounded-xl shadow-lg shadow-emerald-500/20 hover:brightness-110 disabled:opacity-50 disabled:grayscale transition-all flex items-center gap-2"
                >
                   {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                   {editingId ? 'Salvar' : 'Concluir Venda'}
                </button>
             </div>

             {/* Corpo do Checkout */}
             <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar text-white flex flex-col bg-[#0A0A0A]">
                
                {/* 1. Selecionar Cliente */}
                <div className="space-y-1.5">
                   <label className="text-[13px] font-bold text-gray-400 flex items-center gap-2"><User size={14}/> Cliente pagador <span className="text-[#5E41FF]">*</span></label>
                   <select 
                     value={formData.customerId}
                     onChange={e => setFormData({...formData, customerId: e.target.value})}
                     className="w-full bg-[#18181a] text-white border-b-2 border-transparent hover:border-gray-700 focus:border-[#5E41FF] py-3 outline-none transition-all text-[15px] cursor-pointer shadow-inner"
                   >
                      <option value="">Pesquisar cliente...</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                   </select>
                </div>

                {/* 2. Valor da Venda */}
                <div className="space-y-1.5 p-4 rounded-2xl bg-[#18181a] border border-white/5 hover:border-white/10 transition-colors">
                   <label className="text-[13px] font-bold text-gray-400 flex items-center gap-2"><Calculator size={14}/> Valor Total da Venda</label>
                   <div className="flex items-center gap-3">
                      <span className="text-xl font-bold text-gray-500">R$</span>
                      <input 
                        type="number" 
                        min="0"
                        step="0.01"
                        value={formData.amount || ''}
                        onChange={e => setFormData({...formData, amount: Number(e.target.value)})}
                        placeholder="0.00"
                        className="w-full bg-transparent text-2xl font-bold text-white outline-none placeholder-gray-700"
                      />
                   </div>
                </div>

                {/* 3. Status da Venda */}
                <div className="space-y-3">
                   <label className="text-[13px] font-bold text-gray-400">Status de Recebimento</label>
                   <div className="grid grid-cols-2 gap-3">
                      <button 
                         onClick={() => setFormData({...formData, status: 'pago'})}
                         className={`py-3 rounded-xl border text-xs font-bold transition-all ${formData.status === 'pago' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-black/20 border-white/5 text-gray-500'}`}
                      >
                         PAGO
                      </button>
                      <button 
                         onClick={() => setFormData({...formData, status: 'pendente'})}
                         className={`py-3 rounded-xl border text-xs font-bold transition-all ${formData.status === 'pendente' ? 'bg-amber-500/10 border-amber-500/50 text-amber-400' : 'bg-black/20 border-white/5 text-gray-500'}`}
                      >
                         PENDENTE
                      </button>
                   </div>
                </div>

                {/* 4. Forma de Pagamento */}
                <div className="space-y-3 pt-2">
                   <label className="text-[13px] font-bold text-gray-400">Meio de Pagamento</label>
                   <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'Pix', icon: <QrCode size={18}/> },
                        { id: 'Cartão', icon: <CreditCard size={18}/> },
                        { id: 'Dinheiro', icon: <Banknote size={18}/> }
                      ].map(method => (
                        <button
                          key={method.id}
                          onClick={() => setFormData({...formData, paymentMethod: method.id})}
                          className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                            formData.paymentMethod === method.id 
                            ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-xl shadow-emerald-500/10' 
                            : 'bg-[#18181a] border-white/5 text-gray-500 hover:border-white/20'
                          }`}
                        >
                           {method.icon}
                           <span className="text-xs font-bold">{method.id}</span>
                        </button>
                      ))}
                   </div>
                </div>

                <div className="flex-1" />

                <div className="p-5 rounded-2xl bg-gradient-to-br from-[#121021] to-[#0A0A0A] border border-white/10 shadow-2xl flex flex-col gap-1">
                   <div className="flex justify-between items-end">
                      <span className="text-sm text-gray-500 font-bold uppercase tracking-widest">Valor Final</span>
                      <span className="text-4xl font-black text-white tracking-tighter">
                         <span className="text-lg text-emerald-500 mr-1">R$</span>
                         {formData.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                   </div>
                </div>

             </div>
          </div>
        </div>
      )}

    </div>
  )
}
