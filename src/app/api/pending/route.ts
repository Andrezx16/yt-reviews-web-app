import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getTrackById } from '@/lib/spotify'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('canciones_pendientes')
      .select('*')
      .order('id', { ascending: true })

    if (error) throw error

    // Para cada canción pendiente, si hay un cached_id, buscar la info de Spotify
    const enriched = await Promise.all(
      (data ?? []).map(async (row) => {
        let spotifyTrack = null
        if (row.cached_id) {
          spotifyTrack = await getTrackById(row.cached_id)
        }
        return { ...row, spotifyTrack }
      })
    )

    return NextResponse.json({ tracks: enriched, total: enriched.length })
  } catch (err) {
    console.error('[pending] Error:', err)
    return NextResponse.json({ error: 'Error loading pending tracks' }, { status: 500 })
  }
}
