import { supabase } from './supabase'
import { addMinutes, parseISO } from 'date-fns'

export interface ConflictResult {
  has_conflict: boolean
  conflicting_appointment: {
    id: string
    start_time: string
    end_time: string
    status: string
    customer_name: string
    service_name: string
  } | null
}

export interface CreateAppointmentResult {
  success: boolean
  data?: any
  error?: string
  conflict?: ConflictResult['conflicting_appointment']
}

export interface AvailableSlot {
  slot_time: string
}

export async function checkConflict(
  startTime: string,
  endTime: string | null,
  serviceId?: string,
  excludeId?: string
): Promise<ConflictResult> {
  try {
    const { data, error } = await supabase.rpc('check_appointment_conflict', {
      p_start_time: startTime,
      p_end_time: endTime,
      p_service_id: serviceId || null,
      p_exclude_id: excludeId || null
    })
    
    if (error) throw error
    
    return data?.[0] || { has_conflict: false, conflicting_appointment: null }
  } catch (err: any) {
    console.error('Erro ao verificar conflito:', err)
    return { has_conflict: false, conflicting_appointment: null }
  }
}

export async function createAppointment(
  customerId: string,
  serviceId: string,
  startTime: string,
  endTime: string | null = null
): Promise<CreateAppointmentResult> {
  try {
    const { data, error } = await supabase.rpc('safe_create_appointment', {
      p_customer_id: customerId,
      p_service_id: serviceId,
      p_start_time: startTime,
      p_end_time: endTime
    })
    
    if (error) throw error
    
    return data
  } catch (err: any) {
    console.error('Erro ao criar agendamento:', err)
    return { success: false, error: err.message }
  }
}

export async function getAvailableSlots(
  date: string,
  serviceId: string,
  startHour: number = 8,
  endHour: number = 20
): Promise<AvailableSlot[]> {
  try {
    const { data, error } = await supabase.rpc('get_available_slots', {
      p_date: date,
      p_service_id: serviceId,
      p_start_hour: startHour,
      p_end_hour: endHour
    })
    
    if (error) throw error
    
    return data || []
  } catch (err: any) {
    console.error('Erro ao buscar slots disponíveis:', err)
    return []
  }
}

export function formatTimeForDisplay(time: string): string {
  const [hours, minutes] = time.split(':')
  return `${hours}:${minutes}`
}
