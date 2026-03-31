'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, ShieldCheck, ArrowRight, User } from 'lucide-react'
import { adminLogin } from '@/app/actions/admin'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await adminLogin(password)
      if (res.success) {
        router.push('/admin/agenda')
      } else {
        setError(res.error || 'Senha inválida')
      }
    } catch (err) {
      setError('Erro ao conectar ao servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6 selection:bg-[#5E41FF]/30">
      <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in-95 duration-700">
        
        {/* Logo/Header Section */}
        <div className="text-center space-y-4">
          <div className="w-24 h-24 mx-auto bg-[#121021] border border-white/5 rounded-[2.5rem] flex items-center justify-center shadow-2xl relative group">
             <div className="absolute inset-0 bg-[#5E41FF] rounded-[2.5rem] blur-2xl opacity-10 group-hover:opacity-20 transition-opacity" />
             <ShieldCheck className="w-12 h-12 text-[#5E41FF] relative z-10" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter italic uppercase text-white/90">Moça <span className="text-[#5E41FF]">Chic</span></h1>
            <p className="text-[10px] uppercase font-bold tracking-[0.4em] text-gray-500 mt-2">Acesso Administrativo</p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-[#121021]/50 border border-white/5 rounded-[3rem] p-10 shadow-3xl backdrop-blur-xl relative overflow-hidden">
           {/* Subtle glow effect */}
           <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#5E41FF]/10 blur-[80px]" />
           
           <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
              <div className="space-y-2">
                 <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 px-1">Olá, Suanne! 👋</label>
                 <p className="text-sm text-gray-500 px-1 pb-4">Digite sua senha de segurança para continuar.</p>
                 
                 <div className="relative group">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-[#5E41FF] transition-colors" size={20} />
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoFocus
                      required
                      className="w-full pl-14 pr-6 py-5 bg-black/40 border border-white/5 rounded-2xl outline-none focus:border-[#5E41FF]/50 focus:ring-1 focus:ring-[#5E41FF]/20 transition-all font-mono text-xl tracking-widest text-white placeholder:text-gray-800"
                    />
                 </div>
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold text-center animate-shake">
                   {error}
                </div>
              )}

              <button 
                type="submit"
                disabled={loading || !password}
                className="w-full py-5 bg-[#5E41FF] text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-xl shadow-[#5E41FF]/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 group border-b-4 border-[#3D28B8]"
              >
                 {loading ? <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" /> : (
                   <>
                      Acessar Sistema
                      <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                   </>
                 )}
              </button>
           </form>
        </div>

        {/* Footer Info */}
        <p className="text-center text-[10px] text-gray-600 uppercase font-bold tracking-widest">
           Protegido por Criptografia de Ponta a Ponta
        </p>

      </div>

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out; }
      `}</style>
    </main>
  )
}
