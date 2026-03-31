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

// --- GESTÃO DE SERVIÇOS ---

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

export async function createService(serviceData: any) {
  const tables = ['servicos', 'services']
  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .insert([serviceData])
    
    if (!error) {
      await revalidateAdmin()
      return { success: true }
    }
  }
  throw new Error('Falha ao criar serviço')
}

// --- GESTÃO DE WHATSAPP (EVOLUTION API) ---

export async function sendWhatsAppMessage(message: string, phone: string) {
  const cleanPhone = phone.replace(/\D/g, '')
  // Suporte a números do Brasil (adicionando 55 se não houver)
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

// --- GESTÃO DE PERFIL E IDENTIDADE ---

export async function updateProfile(profileData: any) {
  const tables = ['profiles', 'perfil']
  for (const table of tables) {
    // 1. Tentar buscar se existe
    const { data: existing } = await supabase.from(table).select('id').single()
    
    if (existing) {
      // 2. Se existe, faz update
      const { error } = await supabase.from(table).update(profileData).eq('id', existing.id)
      if (!error) {
        await revalidateAdmin()
        return { success: true }
      }
    } else {
      // 3. Se não existe, faz insert (Upsert logic)
      const { error } = await supabase.from(table).insert([profileData])
      if (!error) {
        await revalidateAdmin()
        return { success: true }
      }
    }
  }
  throw new Error('Falha ao atualizar perfil no Supabase.')
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
  return { status: 'not_found' }
}

// --- AUTENTICAÇÃO ADMINISTRATIVA ---

export async function adminLogin(password: string) {
  const adminPwd = process.env.ADMIN_PASSWORD || 'moca2024'
  
  if (password === adminPwd) {
    const cookieStore = await cookies()
    cookieStore.set('admin_session', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 1 semana
    })
    return { success: true }
  }
  
  return { success: false, error: 'Senha incorreta' }
}

export async function adminLogout() {
  const cookieStore = await cookies()
  cookieStore.delete('admin_session')
}

// --- GESTÃO DE BLOQUEIO DE CLIENTES ---

export async function toggleBlockCustomer(id: string, isBlocked: boolean) {
  const tables = ['clientes', 'customers']
  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .update({ is_blocked: isBlocked })
      .eq('id', id)
    
    if (!error) {
       await revalidateAdmin()
       return { success: true }
    }
  }
  throw new Error('Falha ao alternar status de bloqueio')
}

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
  const cleanWhatsapp = customerData.whatsapp.replace(/\D/g, '')
  
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .upsert({ ...customerData, whatsapp: cleanWhatsapp }, { onConflict: 'whatsapp' })
      .select()
      .single()
    if (!error && data) return data
  }
  throw new Error('Falha ao adicionar cliente')
}
