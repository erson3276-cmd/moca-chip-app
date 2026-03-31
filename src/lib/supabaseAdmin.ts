import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY! // Bypass RLS

// Este cliente deve ser usado APENAS no backend (API Routes)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
