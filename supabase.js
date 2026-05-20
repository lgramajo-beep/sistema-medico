import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('⚠️ Faltan las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// ─── Database helpers ───

export async function login(usuario, password) {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('usuario', usuario)
    .eq('password', password)
    .eq('activo', true)
    .single()
  if (error || !data) return null
  return data
}

export async function fetchPacientes() {
  const { data, error } = await supabase
    .from('pacientes')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) { console.error(error); return [] }
  return data || []
}

export async function fetchVisitas(pacienteId) {
  const { data, error } = await supabase
    .from('visitas')
    .select('*')
    .eq('paciente_id', pacienteId)
    .order('created_at', { ascending: true })
  if (error) { console.error(error); return [] }
  return data || []
}

export async function fetchAllVisitas() {
  const { data, error } = await supabase
    .from('visitas')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) { console.error(error); return [] }
  return data || []
}

export async function getNextId(clave) {
  // Increment and return
  const { data, error } = await supabase
    .from('contadores')
    .select('valor')
    .eq('clave', clave)
    .single()
  if (error) return 1
  const next = (data.valor || 0) + 1
  await supabase.from('contadores').update({ valor: next }).eq('clave', clave)
  return next
}

export async function insertPaciente(paciente) {
  const { data, error } = await supabase.from('pacientes').insert(paciente).select().single()
  if (error) { console.error(error); return null }
  return data
}

export async function updatePaciente(id, updates) {
  const { error } = await supabase.from('pacientes').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) console.error(error)
  return !error
}

export async function deletePaciente(id) {
  const { error } = await supabase.from('pacientes').delete().eq('id', id)
  if (error) console.error(error)
  return !error
}

export async function insertVisita(visita) {
  const { data, error } = await supabase.from('visitas').insert(visita).select().single()
  if (error) { console.error(error); return null }
  return data
}
