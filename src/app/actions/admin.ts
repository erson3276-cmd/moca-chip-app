'use server'

import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin'
import { revalidatePath } from 'next/cache'

async function revalidateAdmin() {
  revalidatePath('/admin', 'layout')
}

export async function getAppointments() {
  const { data, error } = await supabase
    .from('appointments')
    .select('*, customers:customer_id(name, whatsapp), services:service_id(name, price, duration_minutes)')
    .order('start_time', { ascending: true })
  
  if (error) {
    console.error('Erro ao buscar agendamentos:', error)
    return []
  }
  
  return data || []
}

export async function getCustomers() {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('name', { ascending: true })
  
  if (error) {
    console.error('Erro ao buscar clientes:', error)
    return []
  }
  
  return data || []
}

export async function getServices() {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .order('name', { ascending: true })
  
  if (error) {
    console.error('Erro ao buscar serviços:', error)
    return []
  }
  
  return data || []
}

export async function addAppointment(appointmentData: any) {
  // Validar horário :00 ou :30
  const startDate = new Date(appointmentData.start_time)
  const minutes = startDate.getUTCMinutes()
  if (minutes !== 0 && minutes !== 30) {
    throw new Error('Agendamentos só podem ser em horários :00 ou :30')
  }

  // Não permitir horários passados
  const now = new Date()
  if (startDate <= now) {
    throw new Error('Não é possível agendar em horários passados')
  }

  // Verificar conflito
  const { data: conflicts } = await supabase
    .from('appointments')
    .select('id, start_time, end_time, customers:customer_id(name)')
    .neq('status', 'cancelado')
    .or(`and(start_time.lte.${appointmentData.start_time},end_time.gt.${appointmentData.start_time}),and(start_time.lt.${appointmentData.end_time},end_time.gte.${appointmentData.end_time})`)

  if (conflicts && conflicts.length > 0) {
    throw new Error('Horário já reservado')
  }

  // Inserir
  const { data, error } = await supabase
    .from('appointments')
    .insert([appointmentData])
    .select('*, customers:customer_id(name), services:service_id(name, price, duration_minutes)')
    .single()
  
  if (error) {
    console.error('Erro ao criar agendamento:', error)
    throw new Error('Falha ao criar agendamento')
  }

  await revalidateAdmin()
  revalidatePath('/admin/agenda')
  return data
}

export async function updateAppointmentStatus(id: string, status: string) {
  const { error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', id)
  
  if (error) {
    console.error('Erro ao atualizar status:', error)
    throw new Error('Falha ao atualizar status')
  }

  await revalidateAdmin()
  revalidatePath('/admin/agenda')
  return { success: true }
}

export async function deleteAppointment(id: string) {
  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Erro ao excluir:', error)
    throw new Error('Falha ao excluir')
  }

  await revalidateAdmin()
  revalidatePath('/admin/agenda')
  return { success: true }
}

export async function completeAppointmentCheckout(appointmentId: string, saleData: any) {
  // Criar venda
  const { error: saleError } = await supabase
    .from('vendas')
    .insert([{
      customer_id: saleData.customer_id,
      service_id: saleData.service_id,
      amount: saleData.amount,
      payment_method: saleData.payment_method,
      date: saleData.date
    }])
  
  if (saleError) {
    console.error('Erro ao criar venda:', saleError)
    // Continua mesmo se falhar venda
  }

  // Marcar como finalizado
  await updateAppointmentStatus(appointmentId, 'finalizado')
  
  await revalidateAdmin()
  revalidatePath('/admin/agenda')
  return { success: true }
}
