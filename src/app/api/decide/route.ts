import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

function cacheKey(title: string, artist: string) {
  return `${title.toLowerCase()}::${artist.toLowerCase()}`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { id: pendingId, title, artist, spotify_id, action } = body

    // action: 'accept' | 'skip' | 'manual'
    if (!pendingId || !title || !artist || !action) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const key        = cacheKey(title, artist)
    const finalId    = action === 'skip' ? 'skip' : (spotify_id ?? null)

    if (action !== 'next') {
      // Guardar en mapeos_manuales
      const { error: upsertError } = await supabase
        .from('mapeos_manuales')
        .upsert({ nombre_busqueda: key, spotify_id: finalId })

      if (upsertError) throw upsertError
    }

    // Eliminar de la cola de pendientes
    const { error: deleteError } = await supabase
      .from('canciones_pendientes')
      .delete()
      .eq('id', pendingId)

    if (deleteError) throw deleteError

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[decide] Error:', err)
    return NextResponse.json({ error: 'Failed to save decision' }, { status: 500 })
  }
}
