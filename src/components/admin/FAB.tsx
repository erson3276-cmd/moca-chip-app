'use client'

import React, { useState } from 'react'
import { Plus, Calendar, Calculator, UserPlus, X } from 'lucide-react'
import Link from 'next/link'

export default function FAB() {
  const [isOpen, setIsOpen] = useState(false)

  const actions = [
    { label: 'Novo Agendamento', icon: Calendar, color: 'bg-[#5E41FF]', path: '/admin/agenda?action=new' },
    { label: 'Nova Venda', icon: Calculator, color: 'bg-emerald-500', path: '/admin/vendas?action=new' },
    { label: 'Novo Cliente', icon: UserPlus, color: 'bg-blue-500', path: '/admin/clientes?action=new' },
  ]

  return (
    <div className="fixed bottom-8 right-8 z-[100] flex flex-col items-end gap-4">
      {/* Menu de Ações */}
      <div className={`flex flex-col items-end gap-3 transition-all duration-300 transform ${isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-0 opacity-0 translate-y-10 pointer-events-none'}`}>
        {actions.map((action, index) => (
          <div key={index} className="flex items-center gap-3 group">
            <span className="px-3 py-1.5 bg-[#121021] text-white text-[10px] font-black uppercase tracking-widest rounded-lg border border-white/10 shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity">
              {action.label}
            </span>
            <Link 
              href={action.path}
              onClick={() => setIsOpen(false)}
              className={`w-12 h-12 ${action.color} text-white rounded-2xl flex items-center justify-center shadow-xl hover:scale-110 active:scale-90 transition-all border border-white/10`}
            >
              <action.icon size={20} />
            </Link>
          </div>
        ))}
      </div>

      {/* Botão Principal */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl transition-all duration-500 hover:rotate-12 active:scale-95 border-2 border-white/10 ${isOpen ? 'bg-red-500 rotate-90' : 'bg-[#5E41FF]'}`}
      >
        {isOpen ? <X size={32} /> : <Plus size={32} />}
      </button>

      {/* Overlay para fechar ao clicar fora */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-[2px] -z-10" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}
