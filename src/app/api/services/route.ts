import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || ''

const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('name', { ascending: true })
    
    if (error) throw error
    
    return Response.json({ data: data || [], success: true })
  } catch (error: any) {
    console.error('Erro ao buscar serviços:', error)
    return Response.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, price, duration_minutes, description, category } = body
    
    if (!name || name.trim() === '') {
      return Response.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }
    
    if (price === undefined || price === null || Number(price) < 0) {
      return Response.json({ error: 'Preço inválido' }, { status: 400 })
    }
    
    const { data, error } = await supabase
      .from('services')
      .insert([{ 
        name: name.trim(),
        price: Number(price),
        duration_minutes: duration_minutes || 60,
        description: description || null,
        category: category || null,
        active: true
      }])
      .select()
      .single()
    
    if (error) throw error
    
    return Response.json({ data, success: true })
  } catch (error: any) {
    console.error('Erro ao criar serviço:', error)
    return Response.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, name, price, duration_minutes, description, category, active } = body
    
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
    if (price !== undefined) updateData.price = Number(price)
    if (duration_minutes !== undefined) updateData.duration_minutes = duration_minutes
    if (description !== undefined) updateData.description = description || null
    if (category !== undefined) updateData.category = category || null
    if (active !== undefined) updateData.active = active
    updateData.updated_at = new Date().toISOString()
    
    const { data, error } = await supabase
      .from('services')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    
    return Response.json({ data, success: true })
  } catch (error: any) {
    console.error('Erro ao atualizar serviço:', error)
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
      .from('services')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    return Response.json({ success: true })
  } catch (error: any) {
    console.error('Erro ao deletar serviço:', error)
    return Response.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}
