import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || ''

const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('vendas')
      .select(`
        *,
        customers:customer_id(id, name),
        services:service_id(id, name, price)
      `)
      .order('date', { ascending: false })
    
    if (error) throw error
    
    return Response.json({ data: data || [], success: true })
  } catch (error: any) {
    console.error('Erro ao buscar vendas:', error)
    return Response.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { customer_id, service_id, appointment_id, amount, payment_method, date } = body
    
    const { data, error } = await supabase
      .from('vendas')
      .insert([{ 
        customer_id, 
        service_id, 
        appointment_id, 
        amount: amount || 0, 
        payment_method,
        date: date || new Date().toISOString() 
      }])
      .select()
      .single()
    
    if (error) throw error
    
    return Response.json({ data, success: true })
  } catch (error: any) {
    console.error('Erro ao criar venda:', error)
    return Response.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, customer_id, service_id, appointment_id, amount, payment_method, date } = body
    
    if (!id) {
      return Response.json({ error: 'ID é obrigatório' }, { status: 400 })
    }
    
    const updateData: any = {}
    if (customer_id !== undefined) updateData.customer_id = customer_id
    if (service_id !== undefined) updateData.service_id = service_id
    if (appointment_id !== undefined) updateData.appointment_id = appointment_id
    if (amount !== undefined) updateData.amount = amount
    if (payment_method !== undefined) updateData.payment_method = payment_method
    if (date !== undefined) updateData.date = date
    
    const { data, error } = await supabase
      .from('vendas')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    
    return Response.json({ data, success: true })
  } catch (error: any) {
    console.error('Erro ao atualizar venda:', error)
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
      .from('vendas')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    return Response.json({ success: true })
  } catch (error: any) {
    console.error('Erro ao deletar venda:', error)
    return Response.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}
