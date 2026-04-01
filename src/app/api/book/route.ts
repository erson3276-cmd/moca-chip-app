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

    if (!customer) {
      return NextResponse.json({ 
        success: false, 
        error: 'Acesso Restrito: Seu número não foi encontrado em nossa base VIP. Entre em contato com o salão para realizar seu cadastro.' 
      }, { status: 403 })
    }

    // 1. Verificação de Sobreposição (Anti-Overlap)
    const aptTables = ['agendamentos', 'appointments']
    for (const table of aptTables) {
      const { data: overlaps, error: overlapError } = await supabase
        .from(table)
        .select('id')
        .neq('status', 'cancelado')
        .filter('start_time', 'lt', endTime)
        .filter('end_time', 'gt', startTime)
        .limit(1)

      if (overlaps && overlaps.length > 0) {
        return NextResponse.json({ 
          success: false, 
          error: 'Desculpe, este horário acabou de ser preenchido ou conflita com outro agendamento. Por favor, escolha outro horário.' 
        }, { status: 409 })
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

    let appointment = null
    let appointmentError = null

    for (const table of aptTables) {
      const { data, error } = await supabase
        .from(table)
        .insert(aptData)
        .select('*')
        .maybeSingle()
      
      if (!error && data) {
        appointment = data
        break
      }
      appointmentError = error
    }

    if (!appointment) throw appointmentError || new Error('Não foi possível gravar o agendamento.')
    
    // Buscar o nome do serviço separadamente para evitar erro de relacionamento
    const { data: serviceData } = await supabase
      .from('servicos')
      .select('name')
      .eq('id', serviceId)
      .maybeSingle()
    
    const serviceName = serviceData?.name || 'Serviço'

    // 3. Disparar WhatsApp via Evolution API (Fase Final)
    const dateStr = new Date(startTime).toLocaleDateString('pt-BR')
    const timeStr = new Date(startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    
    const message = `Olá *${name}*! ✨\n\nSeu agendamento de *${serviceName}* no *Moça Chiq* foi recebido com sucesso! ✅\n\n🗓️ *Data:* ${dateStr}\n🕒 *Horário:* ${timeStr}\n\nTe esperamos para te deixar ainda mais linda! 🌸`

    try {
      const { sendWhatsAppMessage } = await import('@/app/actions/admin')
      await sendWhatsAppMessage(message, cleanWhatsapp)
    } catch (waError) {
      console.error('Erro ao enviar mensagem de WhatsApp:', waError)
    }

    return NextResponse.json({ success: true, appointment: appointment })
  } catch (error: any) {
    console.error('Booking Error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
