import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || ''

const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        customers:customer_id(id, name, whatsapp),
        services:service_id(id, name, price, duration_minutes)
      `)
      .order('start_time', { ascending: true })
    
    if (error) throw error
    
    return Response.json({ data: data || [], success: true })
  } catch (error: any) {
    console.error('Erro ao buscar agendamentos:', error)
    return Response.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { customer_id, service_id, start_time, end_time, status } = body
    
    // Validar campos obrigatórios
    if (!customer_id || !service_id || !start_time || !end_time) {
      return Response.json({ error: 'Campos obrigatórios faltando' }, { status: 400 })
    }
    
    // Verificar se o horário já passou (Brasília = UTC-3)
    const nowBrasilia = new Date()
    nowBrasilia.setHours(nowBrasilia.getHours() - 3) // Converter para UTC
    const appointmentTime = new Date(start_time)
    
    if (appointmentTime <= nowBrasilia) {
      return Response.json({ error: 'Não é possível agendar em horários que já passaram' }, { status: 400 })
    }
    
    // Verificar conflito de horário
    const { data: conflicts } = await supabase
      .from('appointments')
      .select('id')
      .neq('status', 'cancelado')
      .or(`and(start_time.lte.${start_time},end_time.gt.${start_time}),and(start_time.lt.${end_time},end_time.gte.${end_time})`)
    
    if (conflicts && conflicts.length > 0) {
      return Response.json({ error: 'Horário já reservado' }, { status: 400 })
    }
    
    // Inserir
    const { data, error } = await supabase
      .from('appointments')
      .insert([{ customer_id, service_id, start_time, end_time, status: status || 'agendado' }])
      .select(`
        *,
        customers:customer_id(id, name, whatsapp),
        services:service_id(id, name, price, duration_minutes)
      `)
      .single()
    
    if (error) throw error
    
    return Response.json({ data, success: true })
  } catch (error: any) {
    console.error('Erro ao criar agendamento:', error)
    return Response.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}
