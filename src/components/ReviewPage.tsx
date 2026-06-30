'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import Link from 'next/link'
import type { SpotifyTrack } from '@/lib/spotify'

interface PendingTrack {
  id: number
  title: string
  artist: string
  reason: string
  cached_id?: string | null
  spotifyTrack?: SpotifyTrack | null
}

type SearchResult = SpotifyTrack

// ─── Search Modal ────────────────────────────────────────────────────────────

function SearchModal({
  track,
  onChoose,
  onClose,
}: {
  track: PendingTrack
  onChoose: (spotifyId: string) => void
  onClose: () => void
}) {
  const [query, setQuery]       = useState(`${track.title} ${track.artist}`)
  const [results, setResults]   = useState<SearchResult[]>([])
  const [loading, setLoading]   = useState(false)
  const [searched, setSearched] = useState(false)
  const [manualId, setManualId] = useState('')

  const doSearch = useCallback(async () => {
    if (!query.trim()) return
    setLoading(true)
    setSearched(false)
    try {
      const params = new URLSearchParams({ title: track.title, artist: track.artist })
      // If user changed the query significantly, use that as a raw query
      const url = query !== `${track.title} ${track.artist}`
        ? `/api/search?title=${encodeURIComponent(query)}&artist=`
        : `/api/search?${params}`
      const res  = await fetch(url)
      const data = await res.json()
      setResults(data.results ?? [])
    } finally {
      setLoading(false)
      setSearched(true)
    }
  }, [query, track])

  const parseId = (val: string) => {
    val = val.trim()
    if (val.includes('open.spotify.com/track/')) {
      return val.split('open.spotify.com/track/')[1].split('?')[0]
    }
    if (val.startsWith('spotify:track:')) return val.split('spotify:track:')[1]
    return val
  }

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal-sheet"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-handle" />
        <div className="modal-title">Buscar en Spotify</div>
        <div className="modal-subtitle">
          YTM: <strong>{track.artist} — {track.title}</strong>
        </div>

        <div className="search-input-wrap">
          <input
            id="search-query-input"
            className="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doSearch()}
            placeholder="Título o artista…"
            autoFocus
          />
          <button
            id="search-go-btn"
            className="search-go-btn"
            onClick={doSearch}
            disabled={loading}
          >
            {loading ? '…' : 'Buscar'}
          </button>
        </div>

        {searched && results.length === 0 && (
          <p className="no-results">Sin resultados — intenta con otra búsqueda</p>
        )}

        <div className="results-list">
          {results.map((r, i) => (
            <div key={r.id} className="result-item">
              {r.image
                ? <img src={r.image} className="result-img" alt={r.album} />
                : <div className="result-img" style={{ background: 'var(--surface)' }} />
              }
              <div className="result-info">
                <div className="result-name">{r.name}</div>
                <div className="result-artist">{r.artist}</div>
                <div className="result-album">{r.album}</div>
              </div>
              <button
                id={`choose-result-${i}`}
                className="result-choose-btn"
                onClick={() => onChoose(r.id)}
              >
                ✓
              </button>
            </div>
          ))}
        </div>

        <div className="manual-wrap">
          <div className="manual-label">O pega un ID / link de Spotify manualmente:</div>
          <div className="manual-row">
            <input
              id="manual-id-input"
              className="search-input"
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              placeholder="https://open.spotify.com/track/…"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && manualId.trim()) {
                  const parsed = parseId(manualId)
                  if (parsed) onChoose(parsed)
                }
              }}
            />
            <button
              id="manual-id-submit"
              className="search-go-btn"
              onClick={() => {
                const parsed = parseId(manualId)
                if (parsed) onChoose(parsed)
              }}
              disabled={!manualId.trim()}
            >
              OK
            </button>
          </div>
        </div>

        <button id="modal-close-btn" className="modal-close-btn" onClick={onClose}>
          Cancelar
        </button>
      </motion.div>
    </motion.div>
  )
}

// ─── Preview audio hook ───────────────────────────────────────────────────────

function useAudioPreview() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)

  const toggle = (url: string | null) => {
    if (!url) return
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
      setPlaying(false)
      return
    }
    const audio = new Audio(url)
    audio.volume = 0.7
    audio.play()
    audio.onended = () => { audioRef.current = null; setPlaying(false) }
    audioRef.current = audio
    setPlaying(true)
  }

  const stop = () => {
    audioRef.current?.pause()
    audioRef.current = null
    setPlaying(false)
  }

  return { playing, toggle, stop }
}

// ─── Swipeable Card ──────────────────────────────────────────────────────────

function SwipeCard({
  track,
  onAccept,
  onSkip,
  onSearch,
  onNext,
  isTop,
}: {
  track: PendingTrack
  onAccept: () => void
  onSkip: () => void
  onSearch: () => void
  onNext: () => void
  isTop: boolean
}) {
  const x    = useMotionValue(0)
  const rot  = useTransform(x, [-200, 200], [-20, 20])
  const { playing, toggle, stop } = useAudioPreview()

  const acceptOpacity = useTransform(x, [20, 100], [0, 1])
  const skipOpacity   = useTransform(x, [-100, -20], [1, 0])

  const sp = track.spotifyTrack

  const reasonMeta: Record<string, { label: string; icon: string; cls: string }> = {
    fuzzy_title_match: { label: 'Match por título', icon: '⚠️', cls: 'reason-fuzzy' },
    duplicate_id:      { label: 'ID duplicado',     icon: '🔁', cls: 'reason-dup' },
    not_found:         { label: 'No encontrada',    icon: '✗',  cls: 'reason-miss' },
  }
  const rm = reasonMeta[track.reason] ?? { label: track.reason, icon: '?', cls: 'reason-miss' }

  const handleDragEnd = (_event: unknown, info: { offset: { x: number } }) => {
    stop()
    if (info.offset.x > 120) onAccept()
    else if (info.offset.x < -120) onSkip()
  }

  return (
    <motion.div
      className="track-card"
      style={{ x, rotate: rot }}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      whileDrag={{ scale: 1.02, cursor: 'grabbing' }}
    >
      {/* Album art */}
      <div className="card-image-wrap">
        {sp?.image
          ? <img src={sp.image} alt={sp.album} draggable={false} />
          : <div className="card-image-placeholder">🎵</div>
        }
        <div className="card-overlay" />

        {/* Reason badge */}
        <div className="card-image-badge">
          <span className={`dot ${rm.cls}`} style={{ background: rm.cls === 'reason-fuzzy' ? '#f59e0b' : rm.cls === 'reason-dup' ? '#ef4444' : 'var(--muted)' }} />
          {rm.icon} {rm.label}
        </div>

        {/* Swipe stamps */}
        <motion.div className="swipe-stamp accept" style={{ opacity: acceptOpacity }}>
          ✓ Aceptar
        </motion.div>
        <motion.div className="swipe-stamp skip" style={{ opacity: skipOpacity }}>
          ✗ Skip
        </motion.div>
      </div>

      {/* Card body */}
      <div className="card-body">
        <div className="card-ytm-label">
          <span>▶</span> YouTube Music
        </div>
        <div className="card-title">{track.title}</div>
        <div className="card-artist">{track.artist}</div>

        {sp ? (
          <div className="card-suggestion">
            {sp.image
              ? <img src={sp.image} className="suggestion-thumb" alt={sp.album} />
              : <div className="suggestion-thumb" />
            }
            <div className="suggestion-info">
              <div className="suggestion-name">{sp.name}</div>
              <div className="suggestion-artist">{sp.artist}</div>
              <div className="suggestion-album">{sp.album}</div>
            </div>
            {sp.preview_url && (
              <button
                id={`preview-btn-${track.id}`}
                className={`preview-btn${playing ? ' playing' : ''}`}
                onClick={(e) => { e.stopPropagation(); toggle(sp.preview_url) }}
                title="Preview"
              >
                {playing ? '⏸' : '▶'}
              </button>
            )}
          </div>
        ) : (
          <div className="card-suggestion" style={{ justifyContent: 'center', opacity: 0.5 }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              Sin sugerencia automática — busca manualmente
            </span>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReviewPage({
  tracks: initialTracks,
  total: initialTotal,
}: {
  tracks: PendingTrack[]
  total: number
}) {
  const [tracks, setTracks]         = useState<PendingTrack[]>(initialTracks)
  const [resolved, setResolved]     = useState(0)
  const [showSearch, setShowSearch] = useState(false)
  const [saving, setSaving]         = useState(false)
  const total = initialTotal

  const current = tracks[0]

  const decide = async (action: 'accept' | 'skip' | 'manual', spotifyId?: string) => {
    if (!current || saving) return
    setSaving(true)
    try {
      await fetch('/api/decide', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id:         current.id,
          title:      current.title,
          artist:     current.artist,
          spotify_id: spotifyId ?? current.spotifyTrack?.id ?? null,
          action,
        }),
      })
      setTracks((prev) => prev.slice(1))
      setResolved((r) => r + 1)
    } finally {
      setSaving(false)
    }
  }

  const handleAccept = () => decide('accept')
  const handleSkip   = () => decide('skip')
  const handleNext   = () => {
    // Move current track to the end without deciding
    setTracks((prev) => [...prev.slice(1), prev[0]])
  }
  const handleChoose = (id: string) => {
    setShowSearch(false)
    decide('manual', id)
  }

  const doneCount = resolved
  const percent   = total > 0 ? Math.round((doneCount / total) * 100) : 100

  return (
    <>
      <div className="bg-animated" />
      <div className="app-shell">

        {/* Header */}
        <header className="header">
          <div className="header-logo">
            <div className="logo-icon">🎵</div>
            <div>
              <div className="logo-title">YTMusic Review</div>
              <div className="logo-sub">YouTube Music → Spotify</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {tracks.length > 0 && (
              <div className="pill-badge">{tracks.length} pendientes</div>
            )}
            <Link 
              href="/database"
              style={{
                background: 'rgba(255,255,255,0.1)',
                color: 'var(--text)',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 600,
                textDecoration: 'none',
                border: '1px solid var(--border)',
                transition: 'background 0.2s'
              }}
            >
              Base de Datos
            </Link>
          </div>
        </header>

        {/* Progress */}
        {total > 0 && (
          <div className="progress-wrap">
            <div className="progress-label">
              <span>{doneCount} resueltas</span>
              <span>{percent}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${percent}%` }} />
            </div>
          </div>
        )}

        {/* Card stage */}
        <div className="card-stage">
          {tracks.length === 0 ? (
            <div className="state-center">
              <div className="state-icon">🎉</div>
              <div className="state-title">¡Todo al día!</div>
              <div className="state-sub">
                No hay canciones pendientes de revisión.
                <br />Corre <code>sync.py</code> para detectar nuevas.
              </div>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {/* Render top 2 cards for depth effect */}
              {tracks.slice(0, 2).reverse().map((t, i, arr) => {
                const isTop = i === arr.length - 1
                return (
                  <SwipeCard
                    key={t.id}
                    track={t}
                    isTop={isTop}
                    onAccept={handleAccept}
                    onSkip={handleSkip}
                    onSearch={() => setShowSearch(true)}
                    onNext={handleNext}
                  />
                )
              })}
            </AnimatePresence>
          )}
        </div>

        {/* Action buttons */}
        {tracks.length > 0 && (
          <div className="action-row">
            {/* Skip */}
            <button
              id="action-skip"
              className="action-btn"
              onClick={handleSkip}
              disabled={saving}
              title="No sincronizar esta canción"
            >
              <div className="action-btn-circle skip-btn">✕</div>
              <span className="action-btn-label">Skip</span>
            </button>

            {/* Dejar para después */}
            <button
              id="action-next"
              className="action-btn"
              onClick={handleNext}
              disabled={saving}
              title="Dejar para después"
            >
              <div className="action-btn-circle next-btn">→</div>
              <span className="action-btn-label">Después</span>
            </button>

            {/* Buscar en Spotify */}
            <button
              id="action-search"
              className="action-btn"
              onClick={() => setShowSearch(true)}
              disabled={saving}
              title="Buscar en Spotify"
            >
              <div className="action-btn-circle search-btn">🔍</div>
              <span className="action-btn-label">Buscar</span>
            </button>

            {/* Aceptar */}
            <button
              id="action-accept"
              className="action-btn"
              onClick={handleAccept}
              disabled={saving || !current?.spotifyTrack}
              title="Aceptar sugerencia"
            >
              <div className="action-btn-circle accept-btn">♥</div>
              <span className="action-btn-label">Aceptar</span>
            </button>
          </div>
        )}
      </div>

      {/* Search modal */}
      <AnimatePresence>
        {showSearch && current && (
          <SearchModal
            track={current}
            onChoose={handleChoose}
            onClose={() => setShowSearch(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
