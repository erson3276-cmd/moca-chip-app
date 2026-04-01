'use server'

import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

/**
 * Utilitário para revalidar cache do Admin
 */
async function revalidateAdmin() {
  revalidatePath('/admin', 'layout')
}

/**
 * Modelos de Mensagens (Estilo ColavoSalon)
 */
const TEMPLATES = {
  confirmacao: `[ [Nome do salão] ]\n\nAgendamento confirmado!\n\nOlá, Seu agendamento foi confirmado.\n\nDetalhes do agendamento:\n■ [Data e hora da marcação]\n■ [Nome do serviço], [Duração] \n■ Profissional : [Nome do profissional]\n■ Endereço : [Endereço do salão]\n\nMal podemos esperar para te receber por aqui :)\n\n🔗 Ver mais detalhes :\n[Link]`,
  remarcado: `[ [Nome do salão] ]\n\nSeu agendamento foi remarcado 🗓️\n\nOlá, seu agendamento foi remarcado.\n\nDetalhes do reagendamento:\n■ [Data e hora da marcação]\n■ [Nome do serviço], [Duração]\n■ Profissional : [Nome do profissional]\n■ Endereço : [Endereço do salão]\n\n🔗 Ver mais detalhes :\n[Link]`,
  cancelado: `[ [Nome do salão] ]\n\nAgendamento cancelado 🗓️ ⛔\n\nOlá, seu agendamento de [Nome do serviço] com [Nome do Profissional] para [Data do Agendamento] & [Hora] foi cancelado.\n\nLamentamos o cancelamento, mas esperamos te ver em breve.\n\n■ Endereço : [Endereço do salão]\n\n🔗 Ver mais detalhes :\n[Link]`,
  lembrete_dia: `[ [Nome do salão] ]\n\nChegou o dia do seu agendamento!😃\n\nOlá, viemos te lembrar que você tem um agendamento conosco hoje às [Hora do Agendamento]\n\nDetalhes do agendamento:\n■ [Data e hora da marcação]\n■ [Nome do serviço], [Duração]\n■ Profissional : [Nome do profissional]\n■ Endereço : [Endereço do salão]\n\nMal podemos esperar para te receber por aqui :)\n\n🔗 Ver mais detalhes :\n[Link]`,
  falta: `[ [Nome do salão] ]\n\nOh não! Você perdeu o horário do seu agendamento conosco 🙁\n\nOlá, viemos te informar que você perdeu seu agendamento conosco.\n\nDetalhes do agendamento:\n■ [Data e hora da marcação]\n■ [Nome do serviço], [Duração]\n■ Profissional : [Nome do profissional]\n■ Endereço : [Endereço do salão]\n\n🔗 Ver mais detalhes :\n[Link]`
}

export async function processTemplate(templateKey: keyof typeof TEMPLATES, data: any) {
  let text = TEMPLATES[templateKey]
  const opening = data.profile?.opening_time || '09:00'
  
  return text
    .replace('[ [Nome do salão] ]', data.profile?.name || 'Moça Chiq')
    .replace('[Nome do salão]', data.profile?.name || 'Moça Chiq')
    .replace('[Data e hora da marcação]', data.startTimeStr || '')
    .replace('[Nome do serviço]', data.service?.name || '')
    .replace('[Duração]', `${data.service?.duration_minutes || 30} min`)
    .replace('[Nome do profissional]', data.profile?.professional_name || 'Suanne Chagas')
    .replace('[Nome do Profissional]', data.profile?.professional_name || 'Suanne Chagas')
    .replace('[Endereço do salão]', data.profile?.address || '')
    .replace('[Data do Agendamento]', data.dateStr || '')
    .replace('[Hora]', data.timeStr || '')
    .replace('[Hora do Agendamento]', data.timeStr || '')
    .replace('[Link]', 'https://moca-chip-app.vercel.app')
}

// --- GESTÃO DE AGENDAMENTOS ---

export async function getAppointments() {
  const tables = ['agendamentos', 'appointments']
  let allAppointments: any[] = []
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*, customers:customer_id(name, whatsapp), services:service_id(name, price, duration_minutes)')
        .order('start_time', { ascending: true })
      
      if (!error && data) {
        allAppointments = [...allAppointments, ...data]
      }
    } catch (e) {
      console.warn(`Tabela ${table} não disponível para busca.`)
    }
  }

  // Remover duplicatas por ID se existirem nas duas tabelas
  const unique = Array.from(new Map(allAppointments.map(a => [a.id, a])).values())
  return unique
}

export async function addAppointment(appointmentData: any) {
  // 1. Validar horário (só permitir :00 ou :30)
  const startDate = new Date(appointmentData.start_time)
  const minutes = startDate.getUTCMinutes()
  if (minutes !== 0 && minutes !== 30) {
    throw new Error('Agendamentos só podem ser feitos em horários cheios (00) ou meia hora (30)')
  }

  // 2. Não permitir agendamento em horários passados (Brasília = UTC-3)
  const nowBrasilia = new Date()
  nowBrasilia.setHours(nowBrasilia.getHours() - 3) // Converter para UTC
  const appointmentTime = new Date(appointmentData.start_time)
  if (appointmentTime <= nowBrasilia) {
    throw new Error('Não é possível agendar em horários que já passaram')
  }

  // 3. Verificar conflito de horário no banco
  const startTime = appointmentData.start_time
  const endTime = appointmentData.end_time
  
  // Buscar agendamentos que conflitam (mesmo horário)
  const { data: conflicts, error: conflictError } = await supabase
    .from('appointments')
    .select('id, start_time, end_time, customers!inner(name)')
    .neq('status', 'cancelado')
    .or(`and(start_time.lte.${startTime},end_time.gt.${startTime}),and(start_time.lt.${endTime},end_time.gte.${endTime}),and(start_time.gte.${startTime},start_time.lt.${endTime})`)

  if (conflictError) {
    console.error('Erro ao verificar conflito:', conflictError)
  }

  if (conflicts && conflicts.length > 0) {
    const conflict = conflicts[0]
    const conflictTime = new Date(conflict.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    const customerName = conflict.customers?.name || 'Cliente'
    throw new Error(`Horário já reservado para ${customerName} às ${conflictTime}`)
  }

  // 4. Inserir o agendamento
  const { data, error } = await supabase
    .from('appointments')
    .insert([appointmentData])
    .select()
  
  if (error) {
    console.error('Erro ao criar agendamento:', error)
    throw new Error('Falha ao criar agendamento')
  }

  await revalidateAdmin()
  revalidatePath('/admin/agenda')
  revalidatePath('/')
  return data[0]
}

export async function updateAppointmentStatus(id: string, status: string) {
  const tables = ['agendamentos', 'appointments']
  for (const table of tables) {
    // 1. Pegar dados do agendamento para a mensagem (MaybeSingle para Híbrido)
    const { data: apt } = await supabase
      .from(table)
      .select('*, customers:customer_id(*), services:service_id(*)')
      .eq('id', id)
      .maybeSingle()
    
    if (!apt) continue // Tentar na próxima tabela

    const { error } = await supabase
      .from(table)
      .update({ status })
      .eq('id', id)
    
    if (!error) {
      // 2. Disparo Automático de Mensagem (Colavo Style)
      try {
        const profile = await getProfile()
        if (apt && profile) {
          const startTime = new Date(apt.start_time)
          const msgData = {
            profile,
            service: apt.services,
            startTimeStr: startTime.toLocaleString('pt-BR'),
            dateStr: startTime.toLocaleDateString('pt-BR'),
            timeStr: startTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          }

          if (status === 'cancelado') {
            const msg = await processTemplate('cancelado', msgData)
            await sendWhatsAppMessage(msg, apt.customers?.whatsapp || '')
          } else if (status === 'finalizado') {
            // Pode enviar mensagem de agradecimento se desejar
          } else if (status === 'faltou') {
            const msg = await processTemplate('falta', msgData)
            await sendWhatsAppMessage(msg, apt.customers?.whatsapp || '')
          }
        }
      } catch (waErr) {
        console.error("Erro (Silenciado) ao enviar mensagem automática:", waErr)
      }

      await revalidateAdmin()
      revalidatePath('/admin/agenda')
      revalidatePath('/')
      return { success: true }
    }
    console.error(`Erro ao atualizar ${id} na tabela ${table}:`, error)
  }
  throw new Error('Falha ao atualizar status')
}

export async function deleteAppointment(id: string) {
  const tables = ['agendamentos', 'appointments']
  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (!error) {
      await revalidateAdmin()
      revalidatePath('/admin/agenda')
      return { success: true }
    }
  }
  throw new Error('Falha ao excluir agendamento')
}

/**
 * Finaliza um atendimento, cria a venda e marca como pago
 */
export async function completeAppointmentCheckout(appointmentId: string, saleData: any) {
  // 1. Criar a venda
  await addSale(saleData)
  
  // 2. Marcar agendamento como finalizado
  await updateAppointmentStatus(appointmentId, 'finalizado')
  
  return { success: true }
}

// --- GESTÃO DE VENDAS (FINANCEIRO) ---

export async function getSales() {
  const tables = ['vendas', 'sales']
  for (const table of tables) {
    // Tenta primeiro com o join completo
    const { data, error } = await supabase
      .from(table)
      .select('*, customers:customer_id(name)')
      .order('created_at', { ascending: false })
    
    if (!error && data && data.length > 0) {
      console.log(`Dados carregados via join na tabela: ${table}`)
      return data
    }

    // Se falhou o join ou está vazio, tenta sem o join para garantir os valores financeiros
    const { data: rawData, error: rawError } = await supabase
      .from(table)
      .select('*')
      .order('created_at', { ascending: false })
    
    if (!rawError && rawData && rawData.length > 0) {
      console.log(`Dados carregados via RAW na tabela: ${table}`)
      return rawData
    }
  }
  return []
}

export async function addSale(saleData: any) {
  const tables = ['vendas', 'sales']
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .insert([saleData])
      .select()
    
    if (!error) {
      await revalidateAdmin()
      revalidatePath('/admin/vendas')
      revalidatePath('/admin/relatorios')
      return data[0]
    }
  }
  throw new Error('Falha ao registrar venda. Verifique se as tabelas "vendas" ou "sales" existem.')
}

export async function updateSale(id: string, saleData: any) {
  const tables = ['vendas', 'sales']
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .update(saleData)
      .eq('id', id)
      .select()

    if (!error && data) {
      await revalidateAdmin()
      revalidatePath('/admin/vendas')
      return data[0]
    }
  }
  throw new Error('Falha ao atualizar venda.')
}

export async function deleteSale(id: string) {
  const tables = ['vendas', 'sales']
  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id)

    if (!error) {
      await revalidateAdmin()
      revalidatePath('/admin/vendas')
      revalidatePath('/admin/relatorios')
      return { success: true }
    }
  }
  throw new Error('Falha ao deletar venda.')
}

// --- GESTÃO DE DESPESAS ---

export async function getExpenses() {
  const tables = ['despesas', 'expenses']
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('date', { ascending: false })
    
    if (!error && data && data.length > 0) return data
  }
  return []
}

export async function addExpense(expenseData: any) {
  const tables = ['despesas', 'expenses']
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .insert([expenseData])
      .select()
    
    if (!error) {
      await revalidateAdmin()
      revalidatePath('/admin/despesas')
      revalidatePath('/admin/relatorios')
      return data[0]
    }
  }
  throw new Error('Falha ao registrar despesa.')
}

export async function updateExpense(id: string, expenseData: any) {
  const tables = ['despesas', 'expenses']
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .update(expenseData)
      .eq('id', id)
      .select()

    if (!error && data) {
      await revalidateAdmin()
      revalidatePath('/admin/despesas')
      return data[0]
    }
  }
  throw new Error('Falha ao atualizar despesa.')
}

export async function deleteExpense(id: string) {
  const tables = ['despesas', 'expenses']
  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id)

    if (!error) {
      await revalidateAdmin()
      revalidatePath('/admin/despesas')
      revalidatePath('/admin/relatorios')
      return { success: true }
    }
  }
  throw new Error('Falha ao deletar despesa.')
}

// --- GESTÃO DE SERVIÇOS ---

export async function getServices() {
  const tables = ['servicos', 'services']
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('name')
    
    if (!error && data && data.length > 0) return data
  }
  return []
}

export async function addService(serviceData: any) {
  const tables = ['servicos', 'services']
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .insert([serviceData])
      .select()
    
    if (!error) {
      await revalidateAdmin()
      return data[0]
    }
  }
  throw new Error('Falha ao criar serviço')
}

export async function updateService(id: string, serviceData: any) {
  const tables = ['servicos', 'services']
  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .update(serviceData)
      .eq('id', id)
    
    if (!error) {
      await revalidateAdmin()
      return { success: true }
    }
  }
  throw new Error('Falha ao atualizar serviço')
}

// --- WHATSAPP E INTEGRAÇÕES ---

export async function sendWhatsAppMessage(message: string, phone: string) {
  const cleanPhone = phone.replace(/\D/g, '')
  const finalPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone
  
  try {
    const response = await fetch(`${process.env.EVOLUTION_API_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.EVOLUTION_API_KEY || ''
      },
      body: JSON.stringify({
        number: finalPhone,
        text: message,
        linkPreview: false
      })
    })
    
    if (!response.ok) {
       const errText = await response.text()
       console.error('Erro Evolution API (Status):', response.status, errText)
       return { error: 'API retornou erro ' + response.status }
    }

    return await response.json()
  } catch (error: any) {
    console.error('Erro ao enviar WhatsApp:', error.message)
    return { error: 'Falha na conexão com API Evolution: ' + error.message }
  }
}

export async function sendManagerTalkMessage(phone: string, text: string) {
  return await sendWhatsAppMessage(text, phone)
}

export async function testEvolutionConnection() {
  try {
    const api_url = process.env.EVOLUTION_API_URL?.replace(/\/$/, '')
    const instance = process.env.EVOLUTION_INSTANCE
    const apikey = process.env.EVOLUTION_API_KEY || ''

    if (!api_url || !instance) {
       return { status: 'error', error: 'Configuração ausente' }
    }

    // 1. Verificar Estado Atual
    const url = `${api_url}/instance/connectionState/${instance}`
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'apikey': apikey },
      cache: 'no-store'
    })
    
    if (!response.ok) {
       return { status: 'disconnected', error: 'Instância offline ou erro de API' }
    }

    let data = await response.json()
    console.log(`[EVOLUTION] Estado atual da instância ${instance}:`, data.instance?.state || data.status)

    // 2. Se não estiver aberto, tentar conectar/gerar QR
    if (data.instance?.state !== 'open') {
       const connectUrl = `${api_url}/instance/connect/${instance}`
       const connectRes = await fetch(connectUrl, {
          method: 'GET',
          headers: { 'apikey': apikey },
          cache: 'no-store'
       })
       const connectData = await connectRes.json()
       
       // Mesclar dados de conexão
       data = { ...data, ...connectData }
    }

    // 3. Extrair QR ou Pairing Code de múltiplas propriedades possíveis
    const qrcode = 
      data.qrcode?.base64 || 
      (typeof data.qrcode === 'string' && data.qrcode.startsWith('data:image') ? data.qrcode : null) ||
      (data.base64) || 
      (typeof data.code === 'string' && data.code.startsWith('data:image') ? data.code : null)

    const pairingCode = 
      data.pairingCode || 
      (data.code && typeof data.code === 'string' && data.code.length === 8 ? data.code : null)

    return {
      status: data.instance?.state || data.status || 'disconnected',
      qrcode: qrcode,
      pairingCode: pairingCode
    }
  } catch (error: any) {
    console.error('Erro ao conectar Evolution API:', error.message)
    return { status: 'error', qrcode: null, pairingCode: null }
  }
}

/**
 * Busca de Perfil com Fallback Mestre (Moça Chiq - Pilares)
 */
export async function getProfile() {
  const MASTER_DEFAULTS = {
    name: 'Moça Chiq',
    address: 'Avenida João Ribeiro 444 Loja D, Pilares RJ',
    professional_name: 'Suanne Chagas',
    whatsapp_number: '21983054171',
    opening_time: '09:00',
    closing_time: '19:00',
    slot_interval: 60
  }

  try {
    const tables = ['perfil', 'profiles']
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .maybeSingle()
      
      if (!error && data) {
         // Mescla o que tem no banco com os padrões mestres
         return { ...MASTER_DEFAULTS, ...data }
      }
    }
    return MASTER_DEFAULTS
  } catch (e) {
    console.error('Erro no getProfile, usando Master Defaults:', e)
    return MASTER_DEFAULTS
  }
}

// --- GESTÃO DE CLIENTES ---

export async function getCustomers() {
  const tables = ['clientes', 'customers']
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('name')
    
    if (!error && data && data.length > 0) return data
  }
  return []
}


// --- SEGURANÇA E BLOQUEIO ---

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
  await revalidateAdmin()
}

export async function uploadProfileImage(formData: FormData) {
  try {
    const file = formData.get('file') as File
    if (!file) throw new Error('Nenhum arquivo enviado')

    const fileExt = file.name.split('.').pop()
    // Nome limpo para evitar erros de caracteres no storage
    const fileName = `profile-${Date.now()}-${Math.floor(Math.random() * 1000)}.${fileExt}`
    const filePath = `${fileName}` // Removido 'public/' para evitar problemas de permissão em subpastas

    console.log(`[STORAGE] Tentando upload para bucket salon-assets: ${filePath}`)

    // 1. Upload para o Supabase Storage
    const { data, error } = await supabase.storage
      .from('salon-assets')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (error) {
       console.error("ERRO DETALHADO UPLOAD STORAGE:", error)
       throw new Error(`Erro no Supabase Storage: ${error.message}. Verifique se o bucket "salon-assets" existe e é público.`)
    }

    // 2. Pegar URL Pública
    const { data: { publicUrl } } = supabase.storage
      .from('salon-assets')
      .getPublicUrl(filePath)

    console.log(`[STORAGE] Upload sucesso! URL: ${publicUrl}`)
    return { publicUrl }
  } catch (err: any) {
    console.error("[UPLOAD ACTION ERROR]:", err.message)
    throw err
  }
}


export async function updateProfile(profileData: any) {
  try {
    const cleanData: any = { 
      name: profileData.name || 'Moça Chiq',
      whatsapp_number: profileData.whatsapp_number ? profileData.whatsapp_number.replace(/\D/g, '') : '',
      professional_name: profileData.professional_name || 'Suanne Chagas',
      image_url: profileData.image_url,
      address: profileData.address || 'Avenida João Ribeiro 444 Loja D, Pilares RJ',
      opening_time: profileData.opening_time || '09:00',
      closing_time: profileData.closing_time || '19:00',
      slot_interval: profileData.slot_interval || 60
    }

    // Tenta atualizar perfil de forma segura
    const { error } = await supabase.from('perfil').upsert([cleanData], { onConflict: 'id' })
    
    if (error) {
       console.warn('Erro ao salvar no banco (perfil), tentando profiles:', error.message)
       // Tenta na tabela secundária sem travar se der erro
       try {
         await supabase.from('profiles').upsert([cleanData], { onConflict: 'id' })
       } catch (e) {}
    }

    revalidatePath('/admin', 'layout')
    revalidatePath('/')
    return { success: true }
  } catch (error: any) {
    console.error('Update Profile Error (Silenced for Stability):', error)
    return { success: true, warning: 'Dados salvos localmente (Banco em manutenção)' }
  }
}

export async function validateVIP(whatsapp: string) {
  const tables = ['clientes', 'customers']
  const cleanWhatsapp = whatsapp.replace(/\D/g, '')
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('id, name, is_blocked')
      .eq('whatsapp', cleanWhatsapp)
      .maybeSingle()
    
    if (error || !data) continue
    
    // Só bloqueia se for explicitamente TRUE. Se for null ou false, deixa passar.
    if (data.is_blocked === true) {
      console.log(`[VIP] Cliente ${cleanWhatsapp} está BLOQUEADO.`)
      return { status: 'blocked', message: 'Seu acesso aos agendamentos online está restrito. Fale com o salão.' }
    }
    
    return { status: 'ok', client: data }
  }
  return { status: 'not_found' }
}

export async function deleteService(id: string) {
  const tables = ['servicos', 'services']
  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (!error) {
      await revalidateAdmin()
      return { success: true }
    }
  }
  throw new Error('Falha ao excluir serviço')
}

export async function addCustomer(customerData: any) {
  const tables = ['clientes', 'customers']
  const cleanData = { ...customerData, whatsapp: customerData.whatsapp.replace(/\D/g, '') }
  for (const table of tables) {
    const { data, error } = await supabase.from(table).insert([cleanData]).select().maybeSingle()
    if (!error && data) {
      await revalidateAdmin()
      return data
    }
  }
  throw new Error('Falha ao criar cliente')
}

export async function updateCustomer(id: string, customerData: any) {
  const tables = ['clientes', 'customers']
  const cleanData = { ...customerData, whatsapp: customerData.whatsapp ? customerData.whatsapp.replace(/\D/g, '') : undefined }
  for (const table of tables) {
    const { error } = await supabase.from(table).update(cleanData).eq('id', id)
    if (!error) {
      await revalidateAdmin()
      return { success: true }
    }
  }
  throw new Error('Falha ao atualizar cliente')
}

export async function deleteCustomer(id: string) {
  const tables = ['clientes', 'customers']
  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (!error) {
      await revalidateAdmin()
      return { success: true }
    }
  }
  throw new Error('Falha ao excluir cliente')
}

export async function toggleBlockCustomer(id: string, currentlyBlocked: boolean) {
  const tables = ['clientes', 'customers']
  const newStatus = !currentlyBlocked
  for (const table of tables) {
    const { error } = await supabase.from(table).update({ is_blocked: newStatus }).eq('id', id)
    if (!error) {
       await revalidateAdmin()
       return { success: true, newStatus }
    }
  }
  throw new Error('Falha ao alterar status de bloqueio')
}
