'use client'

import { useEffect, useState } from 'react'
import { 
  Settings, 
  Store, 
  Clock, 
  MapPin, 
  Phone, 
  Save,
  CheckCircle2,
  Image as ImageIcon,
  ExternalLink,
  MessageSquare,
  Link as LinkIcon,
  Copy,
  Zap,
  Activity
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { testEvolutionConnection } from '@/app/actions/admin'

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  const [qrCode, setQrCode] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [qrLoading, setQrLoading] = useState(false)

  useEffect(() => {
    async function fetchProfile() {
      // Tentar profiles ou perfil
      let { data, error } = await supabase.from('profiles').select('*').single()
      if (error) {
        const { data: d2 } = await supabase.from('perfil').select('*').single()
        data = d2
      }
      
      if (data) setProfile(data)
      setLoading(false)
    }
    fetchProfile()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    try {
       const { updateProfile: updateSrv } = await import('@/app/actions/admin')
       await updateSrv(profile)
       setSuccess(true)
       setTimeout(() => setSuccess(false), 3000)
    } catch (error: any) {
       alert('Erro ao salvar: ' + error.message)
    } finally {
       setSaving(false)
    }
  }


  const handleTestVPS = async () => {
    setQrLoading(true)
    setQrCode(null)
    setStatus(null)
    try {
       const res = await testEvolutionConnection()
       setStatus(res.status)
       if (res.qrcode) {
          setQrCode(res.qrcode)
       } else if (res.status === 'open' || res.status === 'CONNECTED') {
          alert('WhatsApp Conectado com Sucesso! ✅')
       }
    } catch (error: any) {
       alert('Erro: ' + error.message)
    } finally {
       setQrLoading(false)
    }
  }

  const handleCopyLink = async () => {
     try {
        const url = window.location.origin
        await navigator.clipboard.writeText(url)
        alert('Link de agendamento copiado! 📋')
     } catch (err) {
        alert('Link: ' + window.location.origin)
     }
  }

  if (loading) return <div className="p-10 text-center text-gray-500 font-medium italic">Carregando configurações...</div>

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestão do Salão</h1>
          <p className="text-sm text-gray-400 mt-1">Configure o perfil e integrações do seu negócio.</p>
        </div>
        {(status === 'open' || status === 'CONNECTED') && (
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-bold text-emerald-500 uppercase tracking-tighter">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
             WhatsApp Online
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Perfil do Salão Card */}
        <div className="p-8 rounded-[2.5rem] bg-[#121021]/50 border border-white/5 space-y-6 shadow-2xl backdrop-blur-xl">
           <div className="flex items-center gap-3 mb-4">
              <Store className="text-[#5E41FF]" size={20} />
              <h2 className="text-lg font-bold uppercase tracking-wider text-white/90 text-[14px]">Perfil do Salão</h2>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                 <label className="text-[10px] uppercase tracking-widest font-bold text-gray-500 px-1">Nome do Salão</label>
                 <input 
                   type="text" 
                   value={profile?.name || ''} 
                   onChange={(e) => setProfile({...profile, name: e.target.value})}
                   className="w-full p-4 rounded-2xl bg-[#141414] border border-white/5 focus:border-[#5E41FF]/50 outline-none transition-all font-medium text-white"
                 />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] uppercase tracking-widest font-bold text-gray-500 px-1">WhatsApp de Contato</label>
                 <input 
                   type="text" 
                   value={profile?.whatsapp_number || ''} 
                   onChange={(e) => setProfile({...profile, whatsapp_number: e.target.value})}
                   className="w-full p-4 rounded-2xl bg-[#141414] border border-white/5 focus:border-[#5E41FF]/50 outline-none transition-all font-medium text-white"
                 />
              </div>

               <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-gray-500 px-1">Nome da Profissional</label>
                  <div className="relative">
                     <Settings className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                     <input 
                       type="text" 
                       placeholder="Ex: Suanne Chagas"
                       value={profile?.professional_name || ''} 
                       onChange={(e) => setProfile({...profile, professional_name: e.target.value})}
                       className="w-full pl-12 pr-4 py-4 rounded-2xl bg-[#141414] border border-white/5 focus:border-[#5E41FF]/50 outline-none transition-all font-medium text-white"
                     />
                  </div>
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-gray-500 px-1">Foto de Perfil (URL)</label>
                  <div className="relative">
                     <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                     <input 
                       type="text" 
                       placeholder="Link da imagem"
                       value={profile?.image_url || ''} 
                       onChange={(e) => setProfile({...profile, image_url: e.target.value})}
                       className="w-full pl-12 pr-4 py-4 rounded-2xl bg-[#141414] border border-white/5 focus:border-[#5E41FF]/50 outline-none transition-all font-medium text-white"
                     />
                  </div>
               </div>

              <div className="md:col-span-2 space-y-2">
                 <label className="text-[10px] uppercase tracking-widest font-bold text-gray-500 px-1">Endereço Completo</label>
                 <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input 
                      type="text" 
                      placeholder="Rua, Número, Bairro, Cidade"
                      value={profile?.address || ''} 
                      onChange={(e) => setProfile({...profile, address: e.target.value})}
                      className="w-full pl-12 pr-4 py-4 rounded-2xl bg-[#141414] border border-white/5 focus:border-[#5E41FF]/50 outline-none transition-all font-medium text-white"
                    />
                 </div>
              </div>
           </div>
        </div>

        {/* Funcionamento Card */}
        <div className="p-8 rounded-[2.5rem] bg-[#121021]/50 border border-white/5 space-y-6 shadow-2xl backdrop-blur-xl">
           <div className="flex items-center gap-3 mb-4">
              <Clock className="text-[#5E41FF]" size={20} />
              <h2 className="text-lg font-bold uppercase tracking-wider text-white/90 text-[14px]">Horário de Funcionamento</h2>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                 <label className="text-[10px] uppercase tracking-widest font-bold text-gray-500 px-1">Abertura</label>
                 <input 
                   type="time" 
                   value={profile?.opening_time || ''} 
                   onChange={(e) => setProfile({...profile, opening_time: e.target.value})}
                   className="w-full p-4 rounded-2xl bg-[#141414] border border-white/5 focus:border-[#5E41FF]/50 outline-none transition-all font-medium text-white"
                 />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] uppercase tracking-widest font-bold text-gray-500 px-1">Fechamento</label>
                 <input 
                   type="time" 
                   value={profile?.closing_time || ''} 
                   onChange={(e) => setProfile({...profile, closing_time: e.target.value})}
                   className="w-full p-4 rounded-2xl bg-[#141414] border border-white/5 focus:border-[#5E41FF]/50 outline-none transition-all font-medium text-white"
                 />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] uppercase tracking-widest font-bold text-gray-500 px-1">Intervalo slots</label>
                 <select 
                   value={profile?.slot_interval || 60} 
                   onChange={(e) => setProfile({...profile, slot_interval: parseInt(e.target.value)})}
                   className="w-full p-4 rounded-2xl bg-[#141414] border border-white/5 focus:border-[#5E41FF]/50 outline-none transition-all font-medium appearance-none text-white"
                 >
                    <option value={15}>15 minutos</option>
                    <option value={30}>30 minutos</option>
                    <option value={60}>1 hora</option>
                 </select>
              </div>
           </div>
         </div>

        {/* Links e Integrações Card */}
        <div className="p-8 rounded-[2.5rem] bg-[#121021]/50 border border-white/5 space-y-6 shadow-2xl backdrop-blur-xl mb-12">
           <div className="flex items-center gap-3 mb-4">
              <LinkIcon className="text-[#5E41FF]" size={20} />
              <h2 className="text-lg font-bold uppercase tracking-wider text-white/90 text-[14px]">Links e Integrações</h2>
           </div>

           <div className="space-y-6">
              {/* Link de Agendamento */}
              <div className="p-6 rounded-3xl bg-white/5 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#5E41FF]/10 flex items-center justify-center text-[#5E41FF]">
                       <ExternalLink size={24} />
                    </div>
                    <div>
                       <p className="font-bold text-sm text-white">Link de Agendamento Público</p>
                       <p className="text-xs text-gray-400">Suas clientes agendam por aqui.</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-2">
                    <code className="bg-black/60 px-4 py-2 rounded-xl text-[11px] text-[#5E41FF] font-mono border border-white/5">
                       {typeof window !== 'undefined' ? window.location.origin : '...'}
                    </code>
                    <button 
                      type="button"
                      onClick={handleCopyLink}
                      className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 transition-all border border-white/5 hover:border-[#5E41FF]/30"
                    >
                       <Copy size={18} />
                    </button>
                 </div>
              </div>

              {/* Evolution API Connection Card */}
              <div className="p-6 rounded-[2rem] bg-white/5 border border-white/5 flex flex-col gap-6">
                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                       <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${(status === 'open' || status === 'CONNECTED') ? 'bg-emerald-500/20 text-emerald-500' : 'bg-[#5E41FF]/10 text-[#5E41FF]'}`}>
                          {(status === 'open' || status === 'CONNECTED') ? <CheckCircle2 size={24} /> : <Zap size={24} />}
                       </div>
                       <div>
                          <p className="font-bold text-sm text-white">Conexão WhatsApp (VPS)</p>
                          <p className="text-xs text-gray-400">
                             {(status === 'open' || status === 'CONNECTED') ? 'Seu WhatsApp está conectado e ativo.' : 'Sincronize seu WhatsApp para notificações.'}
                          </p>
                       </div>
                    </div>
                    <button 
                      type="button"
                      onClick={handleTestVPS}
                      disabled={qrLoading}
                      className="flex items-center gap-2 px-6 py-3 bg-[#5E41FF] hover:bg-[#4D35D1] rounded-2xl text-[11px] font-bold uppercase tracking-widest text-white transition-all shadow-lg shadow-[#5E41FF]/20 disabled:opacity-50"
                    >
                       {qrLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Activity size={16} />}
                       {(status === 'open' || status === 'CONNECTED') ? 'Atualizar Status' : 'Testar & Conectar'}
                    </button>
                 </div>

                 {qrCode && (
                    <div className="flex flex-col items-center gap-6 p-10 bg-white rounded-[3rem] animate-in zoom-in-95 duration-500 shadow-2xl">
                       <div className="text-center space-y-2">
                          <h3 className="text-[#121021] font-black text-2xl uppercase italic tracking-tighter">Escaneie o QR Code</h3>
                          <p className="text-gray-500 text-sm font-medium">Abra o WhatsApp {'>'} Dispositivos Conectados</p>
                       </div>
                       <div className="relative group p-6 bg-white border-[12px] border-gray-50 rounded-[2.5rem] shadow-inner">
                          <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64 grayscale-0 hover:grayscale-0 transition-all" />
                          <div className="absolute inset-0 border-2 border-[#5E41FF]/20 rounded-[2rem] pointer-events-none" />
                       </div>
                       <div className="flex items-center gap-3 px-6 py-2 bg-gray-50 rounded-full border border-gray-100">
                          <div className="w-2 h-2 rounded-full bg-[#5E41FF] animate-pulse" />
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Aguardando Sincronização</p>
                       </div>
                    </div>
                 )}

                 {(status === 'open' || status === 'CONNECTED') && !qrCode && (
                    <div className="flex items-center gap-4 p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl self-start">
                       <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                          <CheckCircle2 size={20} />
                       </div>
                       <div>
                          <p className="text-emerald-500 font-bold text-sm">WhatsApp Ativo</p>
                          <p className="text-[10px] text-emerald-500/60 uppercase font-black tracking-widest">Tudo pronto para mensagens</p>
                       </div>
                    </div>
                 )}
              </div>
           </div>
        </div>

        {/* Botão Salvar (Fixo) */}
        <div className="fixed bottom-8 right-8 z-50">
           <button 
             type="submit"
             disabled={saving}
             className="flex items-center gap-4 px-12 py-5 bg-[#5E41FF] text-white rounded-3xl font-black text-lg shadow-2xl shadow-[#5E41FF]/50 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 group border-b-4 border-[#3D28B8]"
           >
              {saving ? <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" /> : (
                <>
                   <Save size={24} className="group-hover:rotate-12 transition-transform" />
                   SALVAR ALTERAÇÕES
                </>
              )}
           </button>
           {success && (
              <div className="absolute -top-14 left-0 right-0 text-center">
                 <span className="bg-emerald-500 text-white px-6 py-2 rounded-2xl text-xs font-black shadow-xl animate-in slide-in-from-bottom-2 fade-in uppercase tracking-widest">
                    Salvo com Sucesso! ✨
                 </span>
              </div>
           )}
        </div>
      </form>
    </div>
  )
}
