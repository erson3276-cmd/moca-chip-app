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
      return data[0]
    }
  }
  throw new Error('Falha ao criar agendamento')
}

export async function updateAppointmentStatus(id: string, status: string) {
  const tables = ['agendamentos', 'appointments']
  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .update({ status })
      .eq('id', id)
    
    if (!error) {
      await revalidateAdmin()
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
      return data[0]
    }
  }
  throw new Error('Falha ao registrar venda')
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
      return data[0]
    }
  }
  throw new Error('Falha ao registrar despesa')
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
    const url = `${process.env.EVOLUTION_API_URL}/instance/connectionState/${process.env.EVOLUTION_INSTANCE}`
    const response = await fetch(url, {
      headers: { 'apikey': process.env.EVOLUTION_API_KEY || '' }
    })
    const data = await response.json()
    
    // O painel espera .status (ex: 'open', 'CONNECTED', 'close') 
    // e opcionalmente .qrcode (se o status for 'close')
    return {
      success: response.ok,
      status: data.instance?.state || 'close',
      qrcode: data.instance?.qrcode?.base64 || null
    }
  } catch (error) {
    console.error('Erro ao testar Evolution:', error)
    return { success: false, status: 'close', qrcode: null }
  }
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
  const file = formData.get('file') as File
  if (!file) throw new Error('Nenhum arquivo enviado')

  const fileExt = file.name.split('.').pop()
  const fileName = `profile-${Math.random()}.${fileExt}`
  const filePath = `public/${fileName}`

  // 1. Upload para o Supabase Storage
  const { data, error } = await supabase.storage
    .from('salon-assets')
    .upload(filePath, file)

  if (error) {
     // Se o bucket não existir, tentamos criar ou avisar
     throw new Error('Erro ao subir imagem: ' + error.message)
  }

  // 2. Pegar URL Pública
  const { data: { publicUrl } } = supabase.storage
    .from('salon-assets')
    .getPublicUrl(filePath)

  return { publicUrl }
}

export async function updateProfile(profileData: any) {
  try {
    const tables = ['profiles', 'perfil']
    const cleanData = { 
      name: profileData.name,
      whatsapp_number: profileData.whatsapp_number,
      professional_name: profileData.professional_name,
      image_url: profileData.image_url,
      address: profileData.address,
      opening_time: profileData.opening_time,
      closing_time: profileData.closing_time,
      slot_interval: profileData.slot_interval
    }

    for (const table of tables) {
      const { data: existing, error: fetchError } = await supabase.from(table).select('id').maybeSingle()
      
      if (existing) {
        const { error: updateError } = await supabase.from(table).update(cleanData).eq('id', existing.id)
        if (!updateError) { 
          revalidatePath('/admin', 'layout')
          return { success: true } 
        }
      } else {
        const { error: insertError } = await supabase.from(table).insert([cleanData])
        if (!insertError) { 
          revalidatePath('/admin', 'layout')
          return { success: true } 
        }
      }
    }
    throw new Error('Não foi possível salvar em nenhuma tabela de perfil.')
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
