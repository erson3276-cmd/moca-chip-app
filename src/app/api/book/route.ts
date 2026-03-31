import { NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin'


export async function POST(request: Request) {
  try {
    const { name, whatsapp, serviceId, startTime, endTime } = await request.json()
    const cleanWhatsapp = whatsapp.replace(/\D/g, '')

    // 0. Verificação de Bloqueio (Segurança VIP)
    const tables = ['clientes', 'customers']
    for (const table of tables) {
      const { data: blockedData } = await supabase
        .from(table)
        .select('is_blocked')
        .eq('whatsapp', cleanWhatsapp)
        .maybeSingle()
      
      if (blockedData?.is_blocked) {
        return NextResponse.json({ 
          success: false, 
          error: 'Agendamento indisponível para este número. Entre em contato com Suanne Chagas.' 
        }, { status: 403 })
      }
    }

    // 1. Criar ou buscar o cliente no CRM (Tentativa PT/EN)
    let customerData = { name, whatsapp }
    let { data: customer, error: customerError } = await supabase
      .from('clientes')
      .upsert(customerData, { onConflict: 'whatsapp' })
      .select().single()

    if (customerError) {
       const { data: c2, error: ec2 } = await supabase
         .from('customers')
         .upsert(customerData, { onConflict: 'whatsapp' })
         .select().single()
       if (ec2) throw ec2
       customer = c2
    }

    // 2. Criar o agendamento (Tentativa PT/EN)
    let aptData = {
      customer_id: customer.id,
      service_id: serviceId,
      start_time: startTime,
      end_time: endTime,
      status: 'agendado'
    }

    let { data: appointment, error: appointmentError } = await supabase
      .from('agendamentos')
      .insert(aptData)
      .select('*, servicos(*)')
      .single()

    if (appointmentError) {
       const { data: a2, error: ea2 } = await supabase
         .from('appointments')
         .insert(aptData)
         .select('*, services(*)')
         .single()
       if (ea2) throw ea2
       appointment = a2
    }
    
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
