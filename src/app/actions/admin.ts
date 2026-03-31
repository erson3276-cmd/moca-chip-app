'use server'

import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin'
import { revalidatePath } from 'next/cache'

/**
 * Utilitário para revalidar cache do Admin
 */
async function revalidateAdmin() {
  revalidatePath('/admin/agenda')
  revalidatePath('/admin/vendas')
  revalidatePath('/admin/despesas')
  revalidatePath('/admin/clientes')
  revalidatePath('/admin/servicos')
  revalidatePath('/admin/relatorios')
  revalidatePath('/admin/gestao')
}

// --- CLIENTES ---
export async function getCustomers() {
  const tables = ['clientes', 'customers']
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').order('name')
    if (!error && data) return data
  }
  return []
}

export async function addCustomer(data: any) {
  const tables = ['clientes', 'customers']
  for (const table of tables) {
    const { error } = await supabase.from(table).insert([data])
    if (!error) {
      await revalidateAdmin()
      return { success: true }
    }
  }
  throw new Error('Falha ao adicionar cliente')
}

// --- SERVIÇOS ---
export async function getServices() {
  const tables = ['servicos', 'services']
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').order('name')
    if (!error && data) return data
  }
  return []
}

export async function addService(data: any) {
  const tables = ['servicos', 'services']
  for (const table of tables) {
    const { error } = await supabase.from(table).insert([data])
    if (!error) {
      await revalidateAdmin()
      return { success: true }
    }
  }
  throw new Error('Falha ao adicionar serviço')
}

// --- AGENDAMENTOS (CALENDÁRIO) ---
export async function getAppointments() {
  // 1. Tentar buscar Agendamentos (PT ou EN)
  let { data: appointments, error: aptError } = await supabase.from('agendamentos').select('*')
  if (aptError || !appointments) {
    const { data: d2 } = await supabase.from('appointments').select('*')
    appointments = d2 || []
  }

  // 2. Buscar Clientes e Serviços separadamente para unificação manual (Imune a erros de Join)
  const customersList = await getCustomers()
  const servicesList = await getServices()

  // 3. Mapeamento Inteligente (Estilo Colavo: nomes garantidos)
  return appointments.map((apt: any) => {
    const customer = customersList.find(c => c.id === (apt.customer_id || apt.cliente_id))
    const service = servicesList.find(s => s.id === (apt.service_id || apt.servico_id))
    
    return {
      ...apt,
      customers: customer || { name: 'Cliente' },
      services: service || { name: 'Serviço', color: '#5E41FF', duration_minutes: 60 }
    }
  })
}

export async function addAppointment(data: any) {
  const tables = ['agendamentos', 'appointments']
  
  // 1. Verificar Conflitos (Overlap)
  const startTime = new Date(data.start_time)
  const endTime = new Date(data.end_time)

  for (const table of tables) {
     const { data: existing, error: checkError } = await supabase
       .from(table)
       .select('*')
       .neq('status', 'cancelado') // Ignorar cancelados
       .lt('start_time', endTime.toISOString())
       .gt('end_time', startTime.toISOString())

     if (existing && existing.length > 0) {
        throw new Error('Este horário já está ocupado ou o serviço escolhido conflita com o tempo de outro agendamento.')
     }
  }


  // 2. Inserir Agendamento
  for (const table of tables) {
    const { error } = await supabase.from(table).insert([data])
    if (!error) {
      await revalidateAdmin()
      return { success: true }
    }
  }
  throw new Error('Falha ao adicionar agendamento')
}


// --- VENDAS ---
export async function addSale(data: { customer_id: string; amount: number; payment_method: string; status: string }) {
  const { error } = await supabase.from('vendas').insert([data])
  if (error) throw new Error(`Erro ao salvar venda: ${error.message}`)
  
  await revalidateAdmin()
  return { success: true }
}

export async function getSales() {
  // Tentar Join com clientes ou customers
  let { data, error } = await supabase.from('vendas').select('*, clientes(name)').order('created_at', { ascending: false })
  
  if (error) {
    const { data: d2, error: e2 } = await supabase.from('vendas').select('*, customers(name)').order('created_at', { ascending: false })
    if (e2) {
       // Fallback sem join se as relações de FK forem complexas
       const { data: d3 } = await supabase.from('vendas').select('*').order('created_at', { ascending: false })
       data = d3 || []
    } else {
       data = d2
    }
  }

  // Unificação manual se o join falhar internamente
  const customersList = await getCustomers()
  
  return (data || []).map((item: any) => ({
    ...item,
    customers: item.clientes || item.customers || customersList.find(c => c.id === item.customer_id) || { name: 'Cliente' }
  }))
}

// --- DESPESAS ---
export async function addExpense(data: { description: string; amount: number; category: string; date: string }) {
  const { error } = await supabase.from('despesas').insert([data])
  if (error) throw new Error(`Erro ao salvar despesa: ${error.message}`)
  
  await revalidateAdmin()
  return { success: true }
}

export async function getExpenses() {
  const { data, error } = await supabase.from('despesas').select('*').order('date', { ascending: false })
  if (error) return []
  return data || []
}

export async function updateAppointmentStatus(id: string, status: string) {
  const tables = ['agendamentos', 'appointments']
  for (const table of tables) {
    const { error } = await supabase.from(table).update({ status }).eq('id', id)
    if (!error) {
       await revalidateAdmin()
       return { success: true }
    }
  }
  throw new Error('Falha ao atualizar status do agendamento')
}

export async function completeAppointmentCheckout(appointmentId: string, saleData: any) {
  // 1. Criar a Venda
  const { error: saleError } = await supabase.from('vendas').insert([saleData])
  if (saleError) throw new Error(`Erro ao registrar venda: ${saleError.message}`)

  // 2. Marcar Agendamento como Finalizado
  await updateAppointmentStatus(appointmentId, 'finalizado')
  
  await revalidateAdmin()
  return { success: true }
}


// --- EVOLUTION API / WHATSAPP ---
export async function testEvolutionConnection() {
  const url = process.env.EVOLUTION_API_URL
  const apiKey = process.env.EVOLUTION_API_KEY
  const instance = process.env.EVOLUTION_INSTANCE || 'salao'
  
  if (!url || !apiKey || !instance) {
    return { status: 'error', message: 'Config .env incompleta' }
  }

  try {
    const resStatus = await fetch(`${url}/instance/connectionState/${instance}`, {
       headers: { 'apikey': apiKey }
    })
    const dataStatus = await resStatus.json()

    if (dataStatus.instance.state === 'open') {
       return { status: 'open' }
    }

    const resConnect = await fetch(`${url}/instance/connect/${instance}`, {
       headers: { 'apikey': apiKey }
    })
    const dataConnect = await resConnect.json()
    return { status: 'connecting', qrcode: dataConnect.base64 || dataConnect.code }

  } catch (error: any) {
    return { status: 'error', message: error.message }
  }
}

export async function sendWhatsAppMessage(text: string, number: string) {
  const url = process.env.EVOLUTION_API_URL
  const apiKey = process.env.EVOLUTION_API_KEY
  const instance = process.env.EVOLUTION_INSTANCE || 'salao'
  
  if (!url || !apiKey || !instance) return { success: false }

  let cleanNumber = number.replace(/\D/g, '')
  if (cleanNumber.length >= 10 && !cleanNumber.startsWith('55')) {
    cleanNumber = '55' + cleanNumber
  }

  try {
    const response = await fetch(`${url}/message/sendText/${instance}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
      body: JSON.stringify({ number: cleanNumber, text, delay: 1200 })
    })
    return { success: response.ok }
  } catch (error) {
    return { success: false }
  }
}

// Compatibilidade com página ManagerTalk
export async function sendManagerTalkMessage(text: string, number: string) {
   return sendWhatsAppMessage(text, number)
}
