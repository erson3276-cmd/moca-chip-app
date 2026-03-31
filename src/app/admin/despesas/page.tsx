'use client'

import { useEffect, useState } from 'react'
import { 
  DollarSign, 
  Plus, 
  Trash2, 
  Calendar as CalendarIcon,
  Tag,
  Loader2,
  TrendingDown,
  PieChart,
  Save,
  X,
  Edit2
} from 'lucide-react'
import { addExpense, getExpenses, updateExpense, deleteExpense } from '@/app/actions/admin'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function DespesasPage() {
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: 'Outros',
    date: format(new Date(), 'yyyy-MM-dd')
  })

  async function loadData() {
    setLoading(true)
    const data = await getExpenses()
    setExpenses(data)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount.toString().replace(',', '.'))
      }

      if (editingId) {
        await updateExpense(editingId, payload)
      } else {
        await addExpense(payload)
      }

      await loadData()
      setIsModalOpen(false)
      setEditingId(null)
      setFormData({ description: '', amount: '', category: 'Outros', date: format(new Date(), 'yyyy-MM-dd') })
    } catch (error: any) {
      alert('Erro ao salvar despesa: ' + error.message)
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta despesa?')) return
    try {
      const { deleteExpense } = await import('@/app/actions/admin')
      await deleteExpense(id)
      await loadData()
      window.location.reload()
    } catch (e: any) {
      alert('Erro ao excluir: ' + e.message)
    }
  }

  const openEdit = (expense: any) => {
    setEditingId(expense.id)
    setFormData({
      description: expense.description,
      amount: expense.amount.toString(),
      category: expense.category,
      date: expense.date ? format(parseISO(expense.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
    })
    setIsModalOpen(true)
  }

  const totalDespesas = expenses.reduce((acc, exp) => acc + (exp.amount || 0), 0)

  if (loading) return <div className="p-10 text-center text-gray-500 font-medium italic">Carregando despesas...</div>

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">Despesas</h1>
          <p className="text-sm text-gray-400 mt-1 uppercase tracking-widest font-bold opacity-60 text-[10px]">Controle de saídas e custos fixos</p>
        </div>
        <button 
          onClick={() => {
            setEditingId(null)
            setFormData({ description: '', amount: '', category: 'Outros', date: format(new Date(), 'yyyy-MM-dd') })
            setIsModalOpen(true)
          }}
          className="flex items-center gap-3 px-8 py-4 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl shadow-red-500/10"
        >
          <Plus size={18} /> Lançar Despesa
        </button>
      </div>

      {/* Card de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="p-10 rounded-[3rem] bg-[#121021] border border-white/5 space-y-4 shadow-2xl relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-32 h-32 bg-red-500/10 rounded-full blur-3xl group-hover:bg-red-500/20 transition-all duration-500" />
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 ring-1 ring-red-500/20">
               <TrendingDown size={28} />
            </div>
            <div>
               <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mb-1">Total de Gastos (Mês)</p>
               <h3 className="text-4xl font-black text-white tracking-tighter">R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            </div>
         </div>

         <div className="p-10 rounded-[3rem] bg-[#121021] border border-white/5 space-y-4 shadow-2xl relative overflow-hidden group flex items-center justify-between">
            <div className="space-y-4">
               <div className="w-14 h-14 rounded-2xl bg-[#5E41FF]/10 flex items-center justify-center text-[#5E41FF] ring-1 ring-[#5E41FF]/20">
                  <PieChart size={28} />
               </div>
               <div>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">Gastos Recentes</p>
                  <p className="text-white text-sm font-bold mt-1">Sincronizado com Relatórios</p>
               </div>
            </div>
         </div>
      </div>

      {/* Tabela de Despesas */}
      <div className="bg-[#121021] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
         <div className="p-8 border-b border-white/5 flex items-center justify-between bg-black/20">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Histórico de Movimentações</h3>
         </div>
         
         <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left">
               <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                     <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Data</th>
                     <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Descrição</th>
                     <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Categoria</th>
                     <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Valor</th>
                     <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">Ações</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                  {expenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-white/[0.01] transition-colors group">
                       <td className="p-6">
                          <span className="text-xs font-bold text-gray-500 group-hover:text-white transition-all">
                             {expense.date ? format(parseISO(expense.date), 'dd/MM/yyyy') : '--/--/----'}
                          </span>
                       </td>
                       <td className="p-6">
                          <span className="text-sm font-bold text-white uppercase tracking-tight">{expense.description}</span>
                       </td>
                       <td className="p-6">
                          <span className="px-3 py-1 bg-white/5 text-gray-400 rounded-lg text-[9px] font-black uppercase tracking-tighter border border-white/5">
                             {expense.category}
                          </span>
                       </td>
                       <td className="p-6 text-right text-red-400 font-black text-sm">
                          - R$ {(expense.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                       </td>
                       <td className="p-6">
                          <div className="flex items-center justify-center gap-2">
                             <button 
                               type="button"
                               onClick={(e) => { e.preventDefault(); openEdit(expense); }}
                               className="p-3 text-gray-400 hover:text-[#5E41FF] hover:bg-[#5E41FF]/10 rounded-xl transition-all border border-transparent hover:border-[#5E41FF]/20"
                               title="Editar"
                             >
                                <Edit2 size={18} />
                             </button>
                             <button 
                               type="button"
                               onClick={(e) => { e.preventDefault(); handleDelete(expense.id); }}
                               className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20"
                               title="Excluir"
                             >
                                <Trash2 size={18} />
                             </button>
                          </div>
                       </td>
                    </tr>
                  ))}
                  {expenses.length === 0 && (
                    <tr>
                       <td colSpan={5} className="p-24 text-center text-gray-600 font-medium italic opacity-40 uppercase tracking-widest text-xs">
                          Nenhuma despesa registrada.
                       </td>
                    </tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>

      {/* Modal - Lançar/Editar Despesa */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-[500px] bg-[#121021] rounded-[3rem] border border-white/10 shadow-2xl p-10 space-y-8 zoom-in-95 duration-500">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 ring-1 ring-red-500/20">
                    <TrendingDown size={24} />
                  </div>
                   <h2 className="text-xl font-black italic uppercase tracking-tighter text-white">{editingId ? 'Editar Despesa' : 'Nova Despesa'}</h2>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-3 text-gray-500 hover:text-white transition-all"><X size={24} /></button>
             </div>

             <form onSubmit={handleSaveExpense} className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 px-1">Descrição</label>
                   <input 
                     required
                     placeholder="Ex: Aluguel da Loja"
                     value={formData.description}
                     onChange={e => setFormData({...formData, description: e.target.value})}
                     className="w-full px-6 py-4 rounded-2xl bg-black/40 border border-white/5 focus:border-red-500 outline-none transition-all text-sm font-bold text-white placeholder-gray-700"
                   />
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 px-1">Valor (R$)</label>
                      <input 
                        required
                        placeholder="0,00"
                        value={formData.amount}
                        onChange={e => setFormData({...formData, amount: e.target.value})}
                        className="w-full px-6 py-4 rounded-2xl bg-black/40 border border-white/5 focus:border-red-500 outline-none transition-all text-sm font-bold text-white placeholder-gray-700"
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 px-1">Data</label>
                      <input 
                        required
                        type="date" 
                        value={formData.date}
                        onChange={e => setFormData({...formData, date: e.target.value})}
                        className="w-full px-6 py-4 rounded-2xl bg-black/40 border border-white/5 focus:border-red-500 outline-none transition-all text-sm font-bold text-white"
                      />
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 px-1">Categoria</label>
                   <div className="relative">
                      <Tag className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                      <select 
                        value={formData.category}
                        onChange={e => setFormData({...formData, category: e.target.value})}
                        className="w-full pl-14 pr-6 py-4 rounded-2xl bg-black/40 border border-white/5 focus:border-red-500 outline-none transition-all text-sm font-bold text-white appearance-none"
                      >
                         <option value="Aluguel">Aluguel</option>
                         <option value="Produtos">Produtos / Insumos</option>
                         <option value="Eletricidade">Energia / Água</option>
                         <option value="Marketing">Marketing / Tráfego</option>
                         <option value="Manutenção">Manutenção</option>
                         <option value="Outros">Outros Gastos</option>
                      </select>
                   </div>
                </div>

                <button 
                  type="submit"
                  disabled={saving}
                  className="w-full py-5 bg-red-600 text-white rounded-3xl text-sm font-black uppercase tracking-widest shadow-2xl shadow-red-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                   {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                   {editingId ? 'Salvar Alterações' : 'Confirmar Saída'}
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  )
}
