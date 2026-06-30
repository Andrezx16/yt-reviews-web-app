import { supabase } from '@/lib/supabase'
import { getTrackById } from '@/lib/spotify'
import ReviewPage from '@/components/ReviewPage'

export const dynamic = 'force-dynamic'

export default async function Page() {
  try {
    const { data, error } = await supabase
      .from('canciones_pendientes')
      .select('*')
      .order('id', { ascending: true })

    if (error) throw error

    const tracks = await Promise.all(
      (data ?? []).map(async (row) => {
        let spotifyTrack = null
        if (row.cached_id) {
          spotifyTrack = await getTrackById(row.cached_id)
        }
        return { ...row, spotifyTrack }
      })
    )

    return <ReviewPage tracks={tracks} total={tracks.length} />
  } catch (err) {
    console.error('[page] Error loading tracks:', err)
    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 24,
        textAlign: 'center',
        color: '#f0f0f5',
        background: '#0a0a0f',
      }}>
        <div style={{ fontSize: 56 }}>⚠️</div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>Error de conexión</div>
        <div style={{ fontSize: 14, color: '#8888a0', lineHeight: 1.5 }}>
          No se pudo conectar a Supabase.
          <br />Verifica las variables de entorno en <code>.env.local</code>
        </div>
      </div>
    )
  }
}
