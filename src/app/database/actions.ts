'use server'

import { supabase } from '@/lib/supabase'

type Table = 'canciones' | 'mapeos_manuales'
type SortOrder = 'desc' | 'asc'

export async function searchDatabase(table: Table, query: string, sortOrder: SortOrder = 'desc') {
  let q = supabase
    .from(table)
    .select('*')
    .order('creado_en', { ascending: sortOrder === 'asc' })
    .limit(50)

  if (query.trim()) {
    q = q.ilike('nombre_busqueda', `%${query}%`)
  }

  const { data, error } = await q

  if (error) {
    console.error('[searchDatabase] error:', error.message)
    return { success: false as const, error: error.message }
  }
  return { success: true as const, data: data ?? [] }
}

export async function updateSpotifyId(table: Table, nombreBusqueda: string, spotifyId: string) {
  const { error } = await supabase
    .from(table)
    .update({ spotify_id: spotifyId })
    .eq('nombre_busqueda', nombreBusqueda)

  if (error) {
    console.error('[updateSpotifyId] error:', error.message)
    return { success: false as const, error: error.message }
  }
  return { success: true as const }
}

export async function deleteRow(table: Table, nombreBusqueda: string) {
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('nombre_busqueda', nombreBusqueda)

  if (error) {
    console.error('[deleteRow] error:', error.message)
    return { success: false as const, error: error.message }
  }
  return { success: true as const }
}
