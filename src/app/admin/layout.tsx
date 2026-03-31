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

const sidebarItems = [
  { name: 'Agenda', icon: Calendar, path: '/admin/agenda' },
  { name: 'Vendas', icon: Calculator, path: '/admin/vendas' },
  { name: 'Despesas', icon: DollarSign, path: '/admin/despesas' },
  { name: 'Clientes', icon: Users, path: '/admin/clientes' },
  { name: 'Serviços', icon: Package, path: '/admin/servicos' },
  { name: 'Relatórios', icon: BarChart3, path: '/admin/relatorios' },
  { name: 'ManagerTalk', icon: MessageSquare, path: '/admin/managertalk' },
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
        <div className="p-6 flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-[#5E41FF] flex items-center justify-center font-bold text-white shadow-lg shadow-[#5E41FF]/20">
               {(profile?.professional_name || 'M')[0]}
             </div>
             <div className="flex flex-col">
               <span className="text-sm font-bold tracking-tight leading-none">Moça Chiq</span>
               <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mt-1">Premium</span>
             </div>
           </div>
        </div>

        {/* Navigation Items */}
        <nav className="px-3 mt-4 space-y-1 overflow-y-auto max-h-[calc(100vh-250px)] no-scrollbar">
          {sidebarItems.map((item) => {
            const isActive = pathname.startsWith(item.path)
            return (
              <Link 
                key={item.name}
                href={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`
                  flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group
                  ${isActive ? 'bg-[#5E41FF] text-white shadow-lg shadow-[#5E41FF]/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}
                `}
              >
                <item.icon size={20} className={isActive ? 'text-white' : 'text-gray-500 group-hover:text-[#5E41FF]'} />
                <span className="text-sm font-semibold">{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* Bottom Sidebar Info */}
        <div className="absolute bottom-6 left-6 right-6">
           <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-3">
             <button className="flex items-center gap-3 text-xs text-gray-400 hover:text-white w-full transition-colors font-medium">
               <HelpCircle size={14} /> Central de Ajuda
             </button>
             <button 
               onClick={handleLogout}
               className="flex items-center gap-3 text-xs text-red-400/80 hover:text-red-400 w-full transition-colors font-medium"
             >
               <LogOut size={14} /> Sair do Sistema
             </button>
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Topbar Desktop */}
        <header className="h-16 flex items-center justify-between px-6 bg-[#0A0A0A]/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-30">
          <div className="flex items-center gap-4">
             <h2 className="text-sm font-bold tracking-wide uppercase text-gray-500">Dashboard</h2>
             <span className="text-gray-800">/</span>
             <span className="text-sm font-semibold">{sidebarItems.find(i => pathname.startsWith(i.path))?.name || 'Início'}</span>
          </div>

          <div className="flex items-center gap-4">
             <button className="p-2 text-gray-500 hover:text-[#5E41FF] transition-colors"><Bell size={18} /></button>
             <div className="w-px h-6 bg-white/5 mx-2" />
             <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-gray-400">{profile?.professional_name || 'Suanne Chagas'}</span>
                <div className="w-8 h-8 rounded-full bg-[#18181a] border border-white/10 flex items-center justify-center overflow-hidden">
                   {profile?.image_url ? (
                     <img src={profile.image_url} alt="Profile" className="w-full h-full object-cover" />
                   ) : (
                     <Users size={14} className="text-gray-500" />
                   )}
                </div>
             </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="p-4 lg:p-8 animate-in fade-in duration-700 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
