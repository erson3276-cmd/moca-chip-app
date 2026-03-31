import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET() {
  try {
    const address = "Avenida João Ribeiro 444 Loja D, Pilares RJ"
    const tables = ['profiles', 'perfil']
    let updated = false

    for (const table of tables) {
      // 1. Tenta encontrar um perfil existente
      const { data: existing } = await supabaseAdmin.from(table).select('id').maybeSingle()
      
      if (existing) {
        // 2. Atualiza o endereço
        const { error } = await supabaseAdmin
          .from(table)
          .update({ address })
          .eq('id', existing.id)
        
        if (!error) updated = true
      } else {
        // 3. Se não existir, tenta criar um padrão
        const { error } = await supabaseAdmin
          .from(table)
          .insert([{ name: 'Moça Chiq', address }])
        
        if (!error) updated = true
      }
    }

    return NextResponse.json({ 
      success: updated, 
      message: updated ? "Endereço atualizado com sucesso em Pilares!" : "Não foi possível localizar as tabelas de perfil.",
      address 
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
