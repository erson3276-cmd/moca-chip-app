'use server'

import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

const ADMIN_PASSWORD = 'moca2024'
const COOKIE_NAME = 'admin_auth'

async function revalidateAdmin() {
  revalidatePath('/admin', 'layout')
}

// ============== LOGIN ==============

export async function adminLogin(password: string) {
  if (password === ADMIN_PASSWORD) {
    const cookieStore = await cookies()
    cookieStore.set(COOKIE_NAME, 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 // 24 hours
    })
    return { success: true }
  }
  return { success: false, error: 'Senha incorreta' }
}

export async function adminLogout() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
  return { success: true }
}

export async function checkAdminAuth() {
  const cookieStore = await cookies()
  const auth = cookieStore.get(COOKIE_NAME)
  return auth?.value === 'authenticated'
}

// ============== PROFILE ==============

export async function getProfile() {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .limit(1)
    .single()
  
  return data
}

export async function updateProfile(profileData: any) {
  const { data, error } = await supabase
    .from('profiles')
    .update(profileData)
    .eq('id', profileData.id)
    .select()
    .single()
  
  if (error) throw new Error('Falha ao atualizar perfil')
  
  await revalidateAdmin()
  revalidatePath('/admin/gestao')
  return data
}

// ============== MANAGER TALK ==============

export async function sendManagerTalkMessage(phone: string, message: string) {
  // Placeholder para integração com WhatsApp
  console.log(`Enviando mensagem para ${phone}: ${message}`)
  return { success: true }
}

// ============== EVOLUTION API ==============

export async function testEvolutionConnection() {
  return { 
    success: true, 
    message: 'Conexão OK (placeholder)',
    qrcode: null,
    pairingCode: null,
    status: 'connected'
  }
}

export async function uploadProfileImage(formData: FormData) {
  // Placeholder para upload de imagem
  return { publicUrl: '' }
}

export async function processTemplate(templateKey: string, data: any) {
  return `Template: ${templateKey}`
}

export async function sendWhatsAppMessage(message: string, phone: string) {
  console.log(`Enviando WhatsApp para ${phone}: ${message}`)
  return { success: true }
}

export async function validateVIP(whatsapp: string) {
  const { data } = await supabase
    .from('customers')
    .select('active')
    .eq('whatsapp', whatsapp)
    .single()
  
  return { 
    status: data?.active === false ? 'blocked' : 'active',
    message: data?.active === false ? 'Cliente bloqueado' : 'OK'
  }
}

// ============== AGENDA ==============

export async function getAppointments() {
  const { data, error } = await supabase
    .from('appointments')
    .select('*, customers:customer_id(name, whatsapp), services:service_id(name, price, duration_minutes)')
    .order('start_time', { ascending: true })
  
  if (error) return []
  return data || []
}

export async function addAppointment(appointmentData: any) {
  const startDate = new Date(appointmentData.start_time)
  const minutes = startDate.getUTCMinutes()
  if (minutes !== 0 && minutes !== 30) {
    throw new Error('Agendamentos só podem ser em horários :00 ou :30')
  }

  const now = new Date()
  if (startDate <= now) {
    throw new Error('Não é possível agendar em horários passados')
  }

  const { data: conflicts } = await supabase
    .from('appointments')
    .select('id')
    .neq('status', 'cancelado')
    .or(`and(start_time.lte.${appointmentData.start_time},end_time.gt.${appointmentData.start_time}),and(start_time.lt.${appointmentData.end_time},end_time.gte.${appointmentData.end_time})`)

  if (conflicts && conflicts.length > 0) {
    throw new Error('Horário já reservado')
  }

  const { data, error } = await supabase
    .from('appointments')
    .insert([appointmentData])
    .select()
    .single()
  
  if (error) throw new Error('Falha ao criar agendamento')

  await revalidateAdmin()
  revalidatePath('/admin/agenda')
  return data
}

export async function updateAppointmentStatus(id: string, status: string) {
  const { error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', id)
  
  if (error) throw new Error('Falha ao atualizar status')

  await revalidateAdmin()
  revalidatePath('/admin/agenda')
  return { success: true }
}

export async function deleteAppointment(id: string) {
  const { error } = await supabase.from('appointments').delete().eq('id', id)
  if (error) throw new Error('Falha ao excluir')

  await revalidateAdmin()
  revalidatePath('/admin/agenda')
  return { success: true }
}

export async function completeAppointmentCheckout(appointmentId: string, saleData: any) {
  await supabase.from('vendas').insert([{
    customer_id: saleData.customer_id,
    service_id: saleData.service_id,
    amount: saleData.amount,
    payment_method: saleData.payment_method,
    date: saleData.date
  }])

  await updateAppointmentStatus(appointmentId, 'finalizado')
  
  await revalidateAdmin()
  revalidatePath('/admin/agenda')
  return { success: true }
}

// ============== CLIENTES ==============

export async function getCustomers() {
  const { data } = await supabase
    .from('customers')
    .select('*')
    .order('name', { ascending: true })
  
  return data || []
}

export async function addCustomer(customerData: any) {
  const { data, error } = await supabase
    .from('customers')
    .insert([customerData])
    .select()
    .single()
  
  if (error) throw new Error('Falha ao criar cliente')
  
  await revalidateAdmin()
  revalidatePath('/admin/clientes')
  return data
}

export async function updateCustomer(id: string, customerData: any) {
  const { data, error } = await supabase
    .from('customers')
    .update(customerData)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw new Error('Falha ao atualizar cliente')
  
  await revalidateAdmin()
  revalidatePath('/admin/clientes')
  return data
}

export async function deleteCustomer(id: string) {
  const { error } = await supabase.from('customers').delete().eq('id', id)
  if (error) throw new Error('Falha ao excluir cliente')

  await revalidateAdmin()
  revalidatePath('/admin/clientes')
  return { success: true }
}

export async function toggleBlockCustomer(id: string, blocked: boolean) {
  const { error } = await supabase
    .from('customers')
    .update({ active: !blocked })
    .eq('id', id)
  
  if (error) throw new Error('Falha ao atualizar')

  await revalidateAdmin()
  revalidatePath('/admin/clientes')
  return { success: true }
}

// ============== SERVIÇOS ==============

export async function getServices() {
  const { data } = await supabase
    .from('services')
    .select('*')
    .order('name', { ascending: true })
  
  return data || []
}

export async function addService(serviceData: any) {
  const { data, error } = await supabase
    .from('services')
    .insert([serviceData])
    .select()
    .single()
  
  if (error) throw new Error('Falha ao criar serviço')
  
  await revalidateAdmin()
  revalidatePath('/admin/servicos')
  return data
}

export async function updateService(id: string, serviceData: any) {
  const { data, error } = await supabase
    .from('services')
    .update(serviceData)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw new Error('Falha ao atualizar serviço')
  
  await revalidateAdmin()
  revalidatePath('/admin/servicos')
  return data
}

export async function deleteService(id: string) {
  const { error } = await supabase.from('services').delete().eq('id', id)
  if (error) throw new Error('Falha ao excluir serviço')

  await revalidateAdmin()
  revalidatePath('/admin/servicos')
  return { success: true }
}

// ============== DESPESAS ==============

export async function getExpenses() {
  const { data } = await supabase
    .from('despesas')
    .select('*')
    .order('date', { ascending: false })
  
  return data || []
}

export async function addExpense(expenseData: any) {
  const { data, error } = await supabase
    .from('despesas')
    .insert([expenseData])
    .select()
    .single()
  
  if (error) throw new Error('Falha ao criar despesa')
  
  await revalidateAdmin()
  revalidatePath('/admin/despesas')
  return data
}

export async function updateExpense(id: string, expenseData: any) {
  const { data, error } = await supabase
    .from('despesas')
    .update(expenseData)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw new Error('Falha ao atualizar despesa')
  
  await revalidateAdmin()
  revalidatePath('/admin/despesas')
  return data
}

export async function deleteExpense(id: string) {
  const { error } = await supabase.from('despesas').delete().eq('id', id)
  if (error) throw new Error('Falha ao excluir despesa')

  await revalidateAdmin()
  revalidatePath('/admin/despesas')
  return { success: true }
}

// ============== VENDAS ==============

export async function getSales() {
  const { data } = await supabase
    .from('vendas')
    .select('*, customers:customer_id(name), services:service_id(name)')
    .order('created_at', { ascending: false })
  
  return data || []
}

export async function addSale(saleData: any) {
  const { data, error } = await supabase
    .from('vendas')
    .insert([saleData])
    .select()
    .single()
  
  if (error) throw new Error('Falha ao criar venda')
  
  await revalidateAdmin()
  revalidatePath('/admin/vendas')
  return data
}

export async function updateSale(id: string, saleData: any) {
  const { data, error } = await supabase
    .from('vendas')
    .update(saleData)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw new Error('Falha ao atualizar venda')
  
  await revalidateAdmin()
  revalidatePath('/admin/vendas')
  return data
}

export async function deleteSale(id: string) {
  const { error } = await supabase.from('vendas').delete().eq('id', id)
  if (error) throw new Error('Falha ao excluir venda')

  await revalidateAdmin()
  revalidatePath('/admin/vendas')
  return { success: true }
}
