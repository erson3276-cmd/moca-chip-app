'use server'

import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

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

// --- GESTÃO E PERFIL ---
export async function getProfile() {
  const tables = ['profiles', 'perfil']
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').single()
    if (!error && data) return data
  }
  // Fallback caso não exista perfil
  return { 
    name: 'Moça Chic', 
    whatsapp: '5521984755539', 
    professional_name: 'Suanne Chagas', 
    address: 'Avenida João Ribeiro 444 Loja D, Pilares RJ',
    image_url: ''
  }
}

export async function updateProfile(data: any) {
  const tables = ['profiles', 'perfil']
  
  for (const table of tables) {
    const profileData = { 
      ...data, 
      professional_name: data.professional_name || 'Suanne Chagas' 
    }

    // Tentar encontrar o registro existente para atualizar ou inserir
    const { data: existing } = await supabase.from(table).select('id').maybeSingle()
    
    if (existing?.id) {
      // Atualiza o existente
      const { id, ...updateData } = profileData
      const { error } = await supabase.from(table).update(updateData).eq('id', existing.id)
      if (!error) {
        await revalidateAdmin()
        return { success: true }
      }
    } else {
      // Cria novo registro
      const { error } = await supabase.from(table).insert([profileData])
      if (!error) {
        await revalidateAdmin()
        return { success: true }
      }
    }
  }
  throw new Error('Falha ao atualizar perfil no Supabase. Verifique se as colunas (address, professional_name, image_url) existem.')
}


// --- SEGURANÇA VIP E BLOQUEIO ---
export async function validateVIP(whatsapp: string) {
  const tables = ['clientes', 'customers']
  const cleanWhatsapp = whatsapp.replace(/\D/g, '')

  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('id, name, is_blocked')
      .eq('whatsapp', cleanWhatsapp)
      .single()

    if (error || !data) continue
    if (data.is_blocked) {
       return { status: 'blocked', message: 'Indisponível no momento' }
    }
    return { status: 'ok', client: data }
  }
  return { status: 'not_found', message: 'Cliente não cadastrado' }
}

export async function toggleBlockCustomer(id: string, blocked: boolean) {
  const tables = ['clientes', 'customers']
  for (const table of tables) {
    const { error } = await supabase.from(table).update({ is_blocked: blocked }).eq('id', id)
    if (!error) {
       await revalidateAdmin()
       return { success: true }
    }
  }
  return { success: false }
}


// --- AUTENTICA��O ADMINISTRATIVA ---
export async function adminLogin(password: string) {
  const adminPwd = process.env.ADMIN_PASSWORD || 'moca2024'
  if (password === adminPwd) {
    const cookieStore = await cookies()
    cookieStore.set('admin_session', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7
    })
    return { success: true }
  }
  return { success: false, error: 'Senha incorreta' }
}

export async function adminLogout() {
  const cookieStore = await cookies()
  cookieStore.delete('admin_session')
}
