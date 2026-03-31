'use client'

import { useState } from 'react'
import { 
  Search, 
  MoreVertical, 
  Paperclip, 
  Smile, 
  Send,
  Phone,
  Video,
  Check,
  CheckCheck,
  Loader2
} from 'lucide-react'
import { sendManagerTalkMessage } from '@/app/actions/admin'

const contacts = [
  { id: 1, name: 'Aline Santos', phone: '5521982755539', time: '14:23', lastMessage: 'Queria saber se tem horário amanhã?', unread: 2, avatar: 'A' },
  { id: 2, name: 'Bruna Lima', phone: '5511900000000', time: '11:40', lastMessage: 'Obrigada pelo atendimento, amei!', unread: 0, avatar: 'B' },
  { id: 3, name: 'Camila Teixeira', phone: '5511900000000', time: 'Ontem', lastMessage: 'Ok, combinado.', unread: 0, avatar: 'C' },
  { id: 4, name: 'Daniela Costa', phone: '5511900000000', time: 'Ontem', lastMessage: 'Vou me atrasar 5 minutinhos...', unread: 0, avatar: 'D' },
]

export default function ManagerTalkPage() {
  const [activeContact, setActiveContact] = useState(contacts[0])
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  
  // Local fake history for immediate feedback
  const [chatHistory, setChatHistory] = useState([
    { id: 101, fromUser: true, text: activeContact.lastMessage, time: activeContact.time }
  ])

  const handleSendMessage = async () => {
    if (!message.trim() || sending) return
    setSending(true)
    const currentMsg = message
    
    // Add to Local UI First
    setChatHistory(prev => [...prev, { id: Date.now(), fromUser: false, text: currentMsg, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }])
    setMessage('')

    try {
      // 1. Send via Evolution API Action
      await sendManagerTalkMessage(currentMsg, activeContact.phone)
      // Success! Message effectively sent.
    } catch (error: any) {
      alert("Erro no envio pelo Evolution API: " + error.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="h-[calc(100vh-140px)] animate-in fade-in duration-500 rounded-3xl overflow-hidden border border-white/5 bg-[#121021]/30 flex shadow-2xl">
      <div className="w-[320px] lg:w-[400px] border-r border-white/5 flex flex-col bg-[#0A0A0A]/50">
         <div className="h-16 px-4 py-3 flex items-center justify-between bg-[#121021]/80">
            <h2 className="font-bold text-lg tracking-tight">ManagerTalk</h2>
            <div className="flex gap-2">
               <button className="p-2 text-gray-400 hover:text-white transition"><MoreVertical size={20}/></button>
            </div>
         </div>

         <div className="p-3 border-b border-white/5">
            <div className="relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
               <input 
                 type="text" 
                 placeholder="Buscar conversa..." 
                 className="w-full pl-10 pr-4 py-2 bg-[#18181a] border border-white/5 rounded-xl text-sm focus:border-[#5E41FF]/50 outline-none transition-all placeholder:text-gray-600 text-white"
               />
            </div>
         </div>

         <div className="flex-1 overflow-y-auto no-scrollbar">
            {contacts.map((contact) => (
               <div 
                 key={contact.id}
                 onClick={() => {
                   setActiveContact(contact)
                   setChatHistory([{ id: contact.id * 100, fromUser: true, text: contact.lastMessage, time: contact.time }])
                 }}
                 className={`flex items-start gap-3 p-4 cursor-pointer transition-colors border-b border-white/5 ${activeContact.id === contact.id ? 'bg-[#5E41FF]/10' : 'hover:bg-white/5'}`}
               >
                  <div className="w-12 h-12 rounded-full shrink-0 flex items-center justify-center font-bold text-lg text-white bg-gradient-to-br from-gray-700 to-gray-900 border border-white/10">
                     {contact.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                     <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-[15px] truncate text-white">{contact.name}</span>
                        <span className={`text-xs ${contact.unread > 0 ? 'text-[#5E41FF] font-bold' : 'text-gray-500'}`}>{contact.time}</span>
                     </div>
                     <div className="flex justify-between items-center">
                        <p className="text-sm text-gray-400 truncate pr-2">{contact.lastMessage}</p>
                        {contact.unread > 0 && (
                           <span className="shrink-0 bg-[#5E41FF] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg shadow-[#5E41FF]/30">
                              {contact.unread}
                           </span>
                        )}
                     </div>
                  </div>
               </div>
            ))}
         </div>
      </div>

      <div className="flex-1 flex flex-col bg-[#0A0A0A] relative">
         <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "url('https://static.whatsapp.net/rsrc.php/v3/yl/r/gi_DckOUM5a.png')" }} />
         
         <div className="h-16 px-6 py-3 flex items-center justify-between bg-[#121021]/80 z-10 border-b border-white/5">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white bg-gradient-to-br from-[#5E41FF] to-[#3a25a8] shadow-[#5E41FF]/20 shadow-lg border border-[#5E41FF]/50">
                  {activeContact.avatar}
               </div>
               <div className="flex flex-col">
                  <span className="font-bold text-white">{activeContact.name}</span>
                  <span className="text-xs text-emerald-400 font-medium tracking-wide">online</span>
               </div>
            </div>
            <div className="flex items-center gap-4">
               <button className="text-gray-400 hover:text-white transition"><Phone size={20}/></button>
               <button className="text-gray-400 hover:text-white transition"><Video size={20}/></button>
               <button className="text-gray-400 hover:text-white transition"><MoreVertical size={20}/></button>
            </div>
         </div>

         <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4 z-10 no-scrollbar">
            {chatHistory.map(chat => (
              <div key={chat.id} className={`flex ${chat.fromUser ? 'justify-start' : 'justify-end'}`}>
                 <div className={`max-w-[70%] border rounded-2xl p-3 shadow-lg flex flex-col relative
                    ${chat.fromUser ? 'bg-[#18181a] border-white/5 rounded-tl-sm text-gray-100' : 'bg-[#5E41FF]/20 border-[#5E41FF]/30 rounded-tr-sm text-blue-50 backdrop-blur-md'}`}
                 >
                    <span className="text-[14px] leading-relaxed break-words whitespace-pre-wrap">
                       {chat.text}
                    </span>
                    <div className={`flex items-center gap-1 mt-1 text-[10px] font-medium ${chat.fromUser ? 'text-gray-500 self-end' : 'text-[#5E41FF]/80 justify-end'}`}>
                       <span>{chat.time}</span>
                       {!chat.fromUser && <CheckCheck size={14} className="text-[#5E41FF]" />}
                    </div>
                 </div>
              </div>
            ))}
         </div>

         <div className="p-4 bg-[#121021]/80 z-10 flex items-center gap-3 border-t border-white/5">
            <button className="text-gray-400 hover:text-white transition p-2"><Smile size={24}/></button>
            <button className="text-gray-400 hover:text-white transition p-2"><Paperclip size={24}/></button>
            <div className="flex-1 relative">
               <input 
                 type="text" 
                 placeholder="Digite uma mensagem..." 
                 value={message}
                 onChange={(e) => setMessage(e.target.value)}
                 className="w-full pl-5 pr-5 py-3.5 bg-[#18181a] border border-white/5 rounded-2xl text-sm focus:border-[#5E41FF]/40 outline-none transition-all text-white"
                 onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                 disabled={sending}
               />
            </div>
            <button 
              onClick={handleSendMessage} 
              disabled={sending}
              className={`p-3.5 rounded-full transition-all ${message ? 'bg-[#5E41FF] text-white shadow-lg shadow-[#5E41FF]/30 scale-100' : 'bg-white/5 text-gray-500 scale-95'} disabled:opacity-50`}
            >
               {sending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} className={message ? 'ml-1' : ''} />}
            </button>
         </div>
      </div>
    </div>
  )
}
