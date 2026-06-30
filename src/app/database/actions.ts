'use server'

import { supabase } from '@/lib/supabase'

type Table = 'canciones' | 'mapeos_manuales'

export async function searchDatabase(table: Table, query: string) {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .ilike('nombre_busqueda', `%${query}%`)
    .limit(50)

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
