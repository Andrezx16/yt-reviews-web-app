let _token: string | null = null
let _tokenExpiry = 0

export async function getSpotifyToken(): Promise<string> {
  if (_token && Date.now() < _tokenExpiry) return _token

  const creds = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64')

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  })

  const data = await res.json()
  _token = data.access_token
  _tokenExpiry = Date.now() + (data.expires_in - 60) * 1000
  return _token!
}

export interface SpotifyTrack {
  id: string
  name: string
  artist: string
  album: string
  image: string | null
  preview_url: string | null
  url: string
}

export async function searchSpotify(query: string, limit = 5): Promise<SpotifyTrack[]> {
  const token = await getSpotifyToken()
  const params = new URLSearchParams({ q: query, type: 'track', limit: String(limit) })
  const res = await fetch(`https://api.spotify.com/v1/search?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  const data = await res.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data.tracks?.items ?? []).map((t: any) => ({
    id: t.id,
    name: t.name,
    artist: t.artists.map((a: { name: string }) => a.name).join(', '),
    album: t.album.name,
    image: t.album.images?.[0]?.url ?? null,
    preview_url: t.preview_url ?? null,
    url: t.external_urls?.spotify ?? '',
  }))
}

export async function getTrackById(id: string): Promise<SpotifyTrack | null> {
  try {
    const token = await getSpotifyToken()
    const res = await fetch(`https://api.spotify.com/v1/tracks/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!res.ok) return null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const t: any = await res.json()
    return {
      id: t.id,
      name: t.name,
      artist: t.artists.map((a: { name: string }) => a.name).join(', '),
      album: t.album.name,
      image: t.album.images?.[0]?.url ?? null,
      preview_url: t.preview_url ?? null,
      url: t.external_urls?.spotify ?? '',
    }
  } catch {
    return null
  }
}
