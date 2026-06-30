import { NextRequest, NextResponse } from 'next/server'
import { searchSpotify } from '@/lib/spotify'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const title  = searchParams.get('title') ?? ''
  const artist = searchParams.get('artist') ?? ''

  if (!title) {
    return NextResponse.json({ error: 'Missing title' }, { status: 400 })
  }

  try {
    // Misma cascada de estrategias que review.py / sync.py
    const seen = new Map<string, object>()

    const add = (results: Awaited<ReturnType<typeof searchSpotify>>) => {
      for (const r of results) {
        if (!seen.has(r.id)) seen.set(r.id, r)
      }
    }

    const artistClean = artist.replace('- Topic', '').trim()

    if (artistClean) {
      add(await searchSpotify(`track:${title} artist:${artistClean}`, 5))
    }
    add(await searchSpotify(`track:${title}`, 5))
    if (artistClean) {
      add(await searchSpotify(`${title} ${artistClean}`, 5))
    }
    add(await searchSpotify(`${title}`, 5))

    const results = Array.from(seen.values()).slice(0, 5)
    return NextResponse.json({ results })
  } catch (err) {
    console.error('[search] Error:', err)
    return NextResponse.json({ error: 'Spotify search failed' }, { status: 500 })
  }
}
