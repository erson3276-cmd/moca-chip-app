'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Calendar, 
  Calculator, 
  Users, 
  Package, 
  BarChart3, 
  MessageSquare, 
  DollarSign, 
  Settings, 
  Menu, 
  X,
  ChevronLeft,
  Bell,
  HelpCircle,
  LogOut
} from 'lucide-react'

// Cores Oficiais Colavo (Dark Luxo)
// Sidebar: #121021
// Active: #5E41FF

import { useRouter } from 'next/navigation'
import { adminLogout } from '@/app/actions/admin'
import { supabase } from '@/lib/supabase'

import FAB from '@/components/admin/FAB'

const sidebarItems = [
  { name: 'Agenda', icon: Calendar, path: '/admin/agenda' },
  { name: 'Vendas', icon: Calculator, path: '/admin/vendas' },
  { name: 'Clientes', icon: Users, path: '/admin/clientes' },
  { name: 'Serviços', icon: Package, path: '/admin/servicos' },
  { name: 'ManagerTalk', icon: MessageSquare, path: '/admin/managertalk' },
  { name: 'Relatórios', icon: BarChart3, path: '/admin/relatorios' },
  { name: 'Comissão', icon: Calculator, path: '/admin/comissao' },
  { name: 'Gestão do salão', icon: Settings, path: '/admin/gestao' },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [profile, setProfile] = useState<any>(null)

  React.useEffect(() => {
    async function loadProfile() {
      const { data } = await supabase.from('profiles').select('professional_name, image_url').maybeSingle()
      if (data) setProfile(data)
      else {
        const { data: d2 } = await supabase.from('perfil').select('professional_name, image_url').maybeSingle()
        if (d2) setProfile(d2)
      }
    }
    loadProfile()
  }, [])

  const handleLogout = async () => {
    await adminLogout()
    router.push('/admin/login')
  }

  return (
    <div className="flex min-h-screen bg-[#0A0A0A] text-white selection:bg-[#5E41FF]/30">
      {/* FAB: Botão de Acesso Rápido - Sempre Visível */}
      <FAB />

      {/* Mobile Toggle */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed top-4 right-4 z-50 p-2 bg-[#121021] border border-white/5 rounded-lg lg:hidden"
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Oficial Colavo Style */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-[#121021] border-r border-white/5
        transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Header da Sidebar */}
        <div className="p-6 flex items-center justify-between border-b border-white/5">
           <div className="flex items-center gap-3">
             <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#5E41FF] to-[#3a28a3] flex items-center justify-center font-black italic text-white shadow-lg shadow-[#5E41FF]/20 border border-white/10">
               M
             </div>
             <div className="flex flex-col">
               <span className="text-sm font-black tracking-tight leading-none uppercase italic">Moça Chiq</span>
               <span className="text-[9px] text-[#5E41FF] uppercase font-black tracking-[0.2em] mt-1.5 animate-pulse">Enterprise</span>
             </div>
           </div>
        </div>

        {/* Navigation Items (Colavo Deep Mapping Order) */}
        <nav className="px-4 mt-6 space-y-1.5 overflow-y-auto max-h-[calc(100vh-280px)] no-scrollbar">
          {sidebarItems.map((item) => {
            const isActive = pathname.startsWith(item.path)
            return (
              <Link 
                key={item.name}
                href={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`
                  flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative overflow-hidden
                  ${isActive ? 'bg-[#5E41FF] text-white shadow-xl shadow-[#5E41FF]/20 border border-white/10' : 'text-gray-400 hover:bg-white/5 hover:text-white'}
                `}
              >
                {isActive && <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-50" />}
                <item.icon size={18} className={isActive ? 'text-white' : 'text-gray-500 group-hover:text-[#5E41FF] transition-colors'} />
                <span className={`text-[11px] font-black uppercase tracking-widest ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-white'}`}>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* Bottom Sidebar Info */}
        <div className="absolute bottom-8 left-4 right-4">
           <div className="p-4 rounded-3xl bg-black/40 border border-white/5 space-y-4 shadow-inner">
             <button className="flex items-center gap-3 text-[10px] uppercase font-black tracking-widest text-gray-500 hover:text-white w-full transition-colors">
               <HelpCircle size={14} className="text-[#5E41FF]" /> Suporte VIP
             </button>
             <button 
               onClick={handleLogout}
               className="flex items-center gap-3 text-[10px] uppercase font-black tracking-widest text-red-500/80 hover:text-red-500 w-full transition-colors"
             >
               <LogOut size={14} /> Encerrar Sessão
             </button>
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Topbar Desktop (Cyber-Premium Style) */}
        <header className="h-20 flex items-center justify-between px-10 bg-[#0A0A0A]/40 backdrop-blur-2xl border-b border-white/[0.03] sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-6">
             <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600">Sistema Administrativo</span>
                <div className="flex items-center gap-3 mt-1">
                   <h2 className="text-xl font-black italic uppercase tracking-tighter text-white">{sidebarItems.find(i => pathname.startsWith(i.path))?.name || 'Visão Geral'}</h2>
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/40" />
                </div>
             </div>
          </div>

          <div className="flex items-center gap-8">
             <div className="hidden md:flex flex-col items-end">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">Status do Servidor</span>
                <span className="text-[11px] font-bold text-emerald-500">Online & Sincronizado</span>
             </div>
             <button className="relative p-3 bg-white/5 border border-white/5 rounded-2xl text-gray-400 hover:text-white transition-all hover:bg-white/10 group">
                <Bell size={20} className="group-hover:rotate-12 transition-transform" />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#5E41FF] rounded-full border-2 border-[#121021]" />
             </button>
             <div className="w-px h-10 bg-white/5" />
             <div className="flex items-center gap-5 group cursor-pointer">
                <div className="flex flex-col items-end">
                   <span className="text-xs font-black text-white group-hover:text-[#5E41FF] transition-colors">{profile?.professional_name || 'Admin'}</span>
                   <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Acesso Master</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center overflow-hidden shadow-2xl group-hover:scale-105 transition-transform">
                   {profile?.image_url ? (
                     <img src={profile.image_url} alt="Profile" className="w-full h-full object-cover" />
                   ) : (
                     <Users size={20} className="text-gray-500" />
                   )}
                </div>
             </div>
          </div>
        </header>

        {/* Content Body with Independent Scroll */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
           <div className="p-6 lg:p-12 animate-in slide-in-from-bottom-4 fade-in duration-1000 max-w-[1920px] mx-auto">
             {children}
           </div>
        </div>
      </main>
    </div>
  )
}
