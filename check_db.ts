import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkTables() {
  console.log("Checking tables in database...")
  
  const tables = ['customers', 'services', 'appointments', 'sales', 'vendas', 'agendamentos', 'servicos', 'clientes']
  
  for (const table of tables) {
    const { error } = await supabase.from(table).select('*').limit(1)
    if (error) {
      console.log(`❌ Table '${table}' error: ${error.message}`)
    } else {
      console.log(`✅ Table '${table}' exists and is accessible.`)
    }
  }
}

checkTables()
