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

export function processTemplate(templateKey: keyof typeof TEMPLATES, data: any) {
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
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*, customers:customer_id(name, whatsapp), services:service_id(name, price, duration_minutes, color)')
      .order('start_time', { ascending: true })
    
    if (!error && data) return data
  }
  return []
}

export async function addAppointment(appointmentData: any) {
  const tables = ['agendamentos', 'appointments']
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .insert([appointmentData])
      .select()
    
    if (!error) {
      await revalidateAdmin()
      revalidatePath('/admin/agenda')
      revalidatePath('/')
      return data[0]
    }
  }
  throw new Error('Falha ao criar agendamento. Tente novamente.')
}

export async function updateAppointmentStatus(id: string, status: string) {
  const tables = ['agendamentos', 'appointments']
  for (const table of tables) {
    // 1. Pegar dados do agendamento para a mensagem
    const { data: apt } = await supabase
      .from(table)
      .select('*, customers:customer_id(*), services:service_id(*)')
      .eq('id', id)
      .single()

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
            const msg = processTemplate('cancelado', msgData)
            await sendWhatsAppMessage(msg, apt.customers.whatsapp)
          } else if (status === 'finalizado') {
            // Pode enviar mensagem de agradecimento se desejar
          } else if (status === 'faltou') {
            const msg = processTemplate('falta', msgData)
            await sendWhatsAppMessage(msg, apt.customers.whatsapp)
          }
        }
      } catch (waErr) {
        console.error("Erro ao enviar mensagem automática:", waErr)
      }

      await revalidateAdmin()
      revalidatePath('/admin/agenda')
      revalidatePath('/')
      return { success: true }
    }
  }
  throw new Error('Falha ao atualizar status')
}

export async function deleteAppointment(id: string) {
  const tables = ['agendamentos', 'appointments']
  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id)
    
    if (!error) {
      await revalidateAdmin()
      return { success: true }
    }
  }
  throw new Error('Falha ao deletar agendamento')
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
    const { data, error } = await supabase
      .from(table)
      .select('*, customers:customer_id(name)')
      .order('created_at', { ascending: false })
    
    if (!error && data) return data
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
    
    if (!error && data) return data
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
    if (!error && data) return data
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
    return await response.json()
  } catch (error) {
    console.error('Erro ao enviar WhatsApp:', error)
    return { error: 'Falha na conexão com API Evolution' }
  }
}

export async function sendManagerTalkMessage(phone: string, text: string) {
  return await sendWhatsAppMessage(text, phone)
}

export async function testEvolutionConnection() {
  try {
    const api_url = process.env.EVOLUTION_API_URL?.replace(/\/$/, '') // Remove barra final se houver
    const instance = process.env.EVOLUTION_INSTANCE
    const apikey = process.env.EVOLUTION_API_KEY || ''

    if (!api_url || !instance) {
       return { success: false, error: 'Variáveis de ambiente EVOLUTION_API_URL ou EVOLUTION_INSTANCE não configuradas.' }
    }

    const url = `${api_url}/instance/connectionState/${instance}`
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'apikey': apikey },
      cache: 'no-store'
    })
    
    const data = await response.json()
    
    return {
      success: response.ok,
      status: data.instance?.state || 'close',
      qrcode: data.instance?.qrcode?.base64 || null
    }
  } catch (error) {
    console.error('Erro ao testar Evolution:', error)
    return { success: false, status: 'close', qrcode: null, error: 'Não foi possível conectar à Evolution API. Verifique a URL.' }
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
    if (!error && data) return data
  }
  return []
}

export async function addCustomer(customerData: any) {
  const tables = ['clientes', 'customers']
  // Limpando o telefone antes de salvar
  if (customerData.whatsapp) {
    customerData.whatsapp = customerData.whatsapp.replace(/\D/g, '')
  }
  
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .insert([customerData])
      .select()
    
    if (!error) {
      revalidatePath('/admin', 'layout')
      return data[0]
    }
  }
  throw new Error('Falha ao criar cliente')
}

export async function toggleBlockCustomer(id: string, isBlocked: boolean) {
  const tables = ['clientes', 'customers']
  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .update({ is_blocked: isBlocked })
      .eq('id', id)
    
    if (!error) {
      revalidatePath('/admin', 'layout')
      return { success: true }
    }
  }
  throw new Error('Falha ao atualizar status do cliente')
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

export async function getProfile() {
  const tables = ['perfil', 'profiles']
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .maybeSingle()
    if (!error && data) return data
  }
  return null
}

export async function uploadProfileImage(formData: FormData) {
  const file = formData.get('file') as File
  if (!file) throw new Error('Nenhum arquivo enviado')

  const fileExt = file.name.split('.').pop()
  const fileName = `profile-${Math.random()}.${fileExt}`
  const filePath = `public/${fileName}`

  // 1. Upload para o Supabase Storage com Bypass de Erros
  const { data, error } = await supabase.storage
    .from('salon-assets')
    .upload(filePath, file)

  if (error) {
     // Log no console da Vercel para debug
     console.error("ERRO UPLOAD STORAGE:", error.message)
     throw new Error('Erro ao subir imagem para o Storage: ' + error.message + '. Verifique se o bucket "salon-assets" é público/existe.')
  }

  // 2. Pegar URL Pública
  const { data: { publicUrl } } = supabase.storage
    .from('salon-assets')
    .getPublicUrl(filePath)

  return { publicUrl }
}

export async function updateProfile(profileData: any) {
  try {
    const cleanData = { 
      name: profileData.name,
      whatsapp_number: profileData.whatsapp_number ? profileData.whatsapp_number.replace(/\D/g, '') : '',
      professional_name: profileData.professional_name,
      image_url: profileData.image_url,
      address: profileData.address,
      opening_time: profileData.opening_time,
      closing_time: profileData.closing_time,
      slot_interval: profileData.slot_interval
    }

    // Tenta primeiro na tabela 'profiles', se falhar tenta na 'perfil'
    // Usamos o supabaseAdmin para ignorar RLS
    const { data: existing, error: fetchError } = await supabase
      .from('profiles')
      .select('id')
      .maybeSingle()

    if (fetchError && fetchError.code !== 'PGRST116') {
       // Se der erro de tabela não encontrada, tentamos a outra
       const { data: pExisting, error: pFetchError } = await supabase
         .from('perfil')
         .select('id')
         .maybeSingle()
       
       if (pExisting) {
         await supabase.from('perfil').update(cleanData).eq('id', pExisting.id)
       } else {
         await supabase.from('perfil').insert([cleanData])
       }
    } else if (existing) {
      await supabase.from('profiles').update(cleanData).eq('id', existing.id)
    } else {
      await supabase.from('profiles').insert([cleanData])
    }

    revalidatePath('/admin', 'layout')
    revalidatePath('/')
    return { success: true }
  } catch (error: any) {
    console.error('Update Profile Error:', error)
    return { success: false, error: error.message || 'Falha ao atualizar perfil' }
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
    if (data.is_blocked) return { status: 'blocked', message: 'Indisponível no momento' }
    return { status: 'ok', client: data }
  }
  return { status: 'not_found' }
}
