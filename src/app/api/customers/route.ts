import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || ''

const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name', { ascending: true })
    
    if (error) throw error
    
    return Response.json({ data: data || [], success: true })
  } catch (error: any) {
    console.error('Erro ao buscar clientes:', error)
    return Response.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, whatsapp, phone, email, notes } = body
    
    if (!name || name.trim() === '') {
      return Response.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }
    
    const { data, error } = await supabase
      .from('customers')
      .insert([{ 
        name: name.trim(),
        whatsapp: whatsapp || null,
        phone: phone || null,
        email: email || null,
        notes: notes || null,
        active: true
      }])
      .select()
      .single()
    
    if (error) throw error
    
    return Response.json({ data, success: true })
  } catch (error: any) {
    console.error('Erro ao criar cliente:', error)
    return Response.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, name, whatsapp, phone, email, notes, active } = body
    
    if (!id) {
      return Response.json({ error: 'ID é obrigatório' }, { status: 400 })
    }
    
    const updateData: any = {}
    
    if (name !== undefined) {
      if (!name || name.trim() === '') {
        return Response.json({ error: 'Nome não pode ser vazio' }, { status: 400 })
      }
      updateData.name = name.trim()
    }
    if (whatsapp !== undefined) updateData.whatsapp = whatsapp || null
    if (phone !== undefined) updateData.phone = phone || null
    if (email !== undefined) updateData.email = email || null
    if (notes !== undefined) updateData.notes = notes || null
    if (active !== undefined) updateData.active = active
    updateData.updated_at = new Date().toISOString()
    
    const { data, error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    
    return Response.json({ data, success: true })
  } catch (error: any) {
    console.error('Erro ao atualizar cliente:', error)
    return Response.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return Response.json({ error: 'ID é obrigatório' }, { status: 400 })
    }
    
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    return Response.json({ success: true })
  } catch (error: any) {
    console.error('Erro ao deletar cliente:', error)
    return Response.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}
