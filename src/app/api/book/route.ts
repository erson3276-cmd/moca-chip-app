import { NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin'


export async function POST(request: Request) {
  try {
    const { name, whatsapp, serviceId, startTime, endTime } = await request.json()
    const cleanWhatsapp = whatsapp.replace(/\D/g, '')

    // 0. Verificação de Segurança VIP (Modo Blocklist - Permite Novos)
    const tables = ['clientes', 'customers']
    let customer = null
    
    // Tentar encontrar o cliente (com e sem prefixo 55 se necessário)
    for (const table of tables) {
      const { data } = await supabase
        .from(table)
        .select('id, name, is_blocked')
        .or(`whatsapp.eq.${cleanWhatsapp},whatsapp.eq.55${cleanWhatsapp},whatsapp.eq.${cleanWhatsapp.replace(/^55/, '')}`)
        .maybeSingle()
      
      if (data) {
        if (data.is_blocked) {
          return NextResponse.json({ 
            success: false, 
            error: 'Agendamento indisponível para este número. Entre em contato com o salão.' 
          }, { status: 403 })
        }
        customer = data
        break
      }
    }

    // Se não existir, vamos criar um perfil básico para esta nova cliente
    if (!customer) {
       const createTable = 'clientes' // Tabela padrão
       const { data: newCust, error: createErr } = await supabase
         .from(createTable)
         .insert([{ name: name || 'Nova Cliente', whatsapp: cleanWhatsapp, is_blocked: false }])
         .select()
         .single()
       
       if (!createErr && newCust) {
          customer = newCust
       } else {
          // Fallback final: Se não conseguir criar agora, tenta agendar com um ID nulo ou UUID fake se a tabela permitir
          // Mas o ideal é ter o customer_id
          customer = { id: null } // Isso pode falhar dependendo da constraint
       }
    }

    // 2. Criar o agendamento (Motor Híbrido)
    let aptData = {
      customer_id: customer.id,
      service_id: serviceId,
      start_time: startTime,
      end_time: endTime,
      status: 'agendado'
    }

    const aptTables = ['agendamentos', 'appointments']
    let appointment = null
    let appointmentError = null

    for (const table of aptTables) {
      const { data, error } = await supabase
        .from(table)
        .insert(aptData)
        .select('*, servicos(*), services(*)')
        .maybeSingle()
      
      if (!error && data) {
        appointment = data
        break
      }
      appointmentError = error
    }

    if (!appointment) throw appointmentError || new Error('Não foi possível gravar o agendamento em nenhuma tabela.')
    
    // Normalizar retorno para o frontend
    const finalAppointment = {
       ...appointment,
       services: appointment.servicos || appointment.services
    }

    // 3. Disparar WhatsApp via Evolution API (Fase Final)
    const serviceName = finalAppointment.services?.name || 'Serviço'
    const dateStr = new Date(startTime).toLocaleDateString('pt-BR')
    const timeStr = new Date(startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    
    const message = `Olá *${name}*! ✨\n\nSeu agendamento de *${serviceName}* no *Moça Chiq* foi recebido com sucesso! ✅\n\n🗓️ *Data:* ${dateStr}\n🕒 *Horário:* ${timeStr}\n\nTe esperamos para te deixar ainda mais linda! 🌸`

    try {
      const { sendWhatsAppMessage } = await import('@/app/actions/admin')
      await sendWhatsAppMessage(message, cleanWhatsapp)
    } catch (waError) {
      console.error('Erro ao enviar mensagem de WhatsApp:', waError)
    }

    return NextResponse.json({ success: true, appointment: finalAppointment })
  } catch (error: any) {
    console.error('Booking Error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
