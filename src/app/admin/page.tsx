import { redirect } from 'next/navigation'

export default function AdminIndex() {
  // Redireciona automaticamente para a Agenda ao acessar /admin
  redirect('/admin/agenda')
}
