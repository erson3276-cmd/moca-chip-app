import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types
export interface Service {
  id: string
  name: string
  category: string
  price: number
  duration_minutes: number
  description?: string
  created_at: string
}

export interface Customer {
  id: string
  name: string
  whatsapp: string
  notes?: string
  birthday?: string
  is_blocked?: boolean // Campo de segurança VIP
  created_at: string
}

export interface Appointment {
  id: string
  customer_id: string
  service_id: string
  start_time: string
  end_time: string
  status: 'agendado' | 'confirmado' | 'concluido' | 'cancelado' | 'falta'
  notes?: string
  created_at: string
  // Joined fields
  customer?: Customer
  service?: Service
}

export interface Profile {
  id: string
  name: string
  professional_name?: string // Nome da profissional (Suanne Chagas)
  image_url?: string // Foto do Salão/Profissional
  whatsapp_number: string
  opening_time: string
  closing_time: string
  slot_interval: number
  address?: string
  updated_at: string
}
