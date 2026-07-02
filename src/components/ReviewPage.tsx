'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import Link from 'next/link'
import {
  Music2,
  Database,
  Search,
  X,
  Check,
  Clock9,
  AlertTriangle,
  RefreshCw,
  HelpCircle,
  Play,
  Pause,
  PlayCircle,
  PartyPopper,
  Loader2,
  ListTodo,
} from 'lucide-react'
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

        {/* Modal header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'rgba(29,185,84,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Search size={15} color="var(--spotify-green)" />
          </div>
          <div>
            <div className="modal-title" style={{ marginBottom: 0 }}>Buscar en Spotify</div>
            <div className="modal-subtitle" style={{ marginBottom: 0 }}>
              {track.artist} — <strong>{track.title}</strong>
            </div>
          </div>
        </div>

        <div style={{ height: 16 }} />

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
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {loading
              ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              : <Search size={14} />
            }
            {loading ? 'Buscando' : 'Buscar'}
          </button>
        </div>

        {searched && results.length === 0 && (
          <p className="no-results">Sin resultados — intenta con otra búsqueda</p>
        )}

        <div className="results-list">
          {results.map((r, i) => (
            <div key={r.id} className="result-item" onClick={() => onChoose(r.id)}>
              {r.image
                ? <img src={r.image} className="result-img" alt={r.album} />
                : <div className="result-img" style={{ background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Music2 size={18} color="var(--muted)" />
                  </div>
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
                <Check size={13} />
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
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Check size={14} />
              OK
            </button>
          </div>
        </div>

        <button id="modal-close-btn" className="modal-close-btn" onClick={onClose}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <X size={15} />
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

// ─── Reason badge config ──────────────────────────────────────────────────────

const REASON_META: Record<string, {
  label: string
  Icon: React.FC<{ size?: number }>
  cls: string
  dotColor: string
}> = {
  fuzzy_title_match: {
    label: 'Match por título',
    Icon: ({ size }) => <AlertTriangle size={size} />,
    cls: 'reason-fuzzy',
    dotColor: '#f59e0b',
  },
  duplicate_id: {
    label: 'ID duplicado',
    Icon: ({ size }) => <RefreshCw size={size} />,
    cls: 'reason-dup',
    dotColor: '#ef4444',
  },
  not_found: {
    label: 'No encontrada',
    Icon: ({ size }) => <HelpCircle size={size} />,
    cls: 'reason-miss',
    dotColor: 'var(--muted)',
  },
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

  const rm = REASON_META[track.reason] ?? {
    label: track.reason,
    Icon: ({ size }: { size?: number }) => <HelpCircle size={size} />,
    cls: 'reason-miss',
    dotColor: 'var(--muted)',
  }

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
          : <div className="card-image-placeholder">
              <Music2 size={56} color="var(--muted)" style={{ opacity: 0.4 }} />
            </div>
        }
        <div className="card-overlay" />

        {/* Reason badge */}
        <div className="card-image-badge">
          <span className="dot" style={{ background: rm.dotColor }} />
          <rm.Icon size={10} />
          {rm.label}
        </div>

        {/* Swipe stamps */}
        <motion.div className="swipe-stamp accept" style={{ opacity: acceptOpacity }}>
          <Check size={18} strokeWidth={3} />
          Aceptar
        </motion.div>
        <motion.div className="swipe-stamp skip" style={{ opacity: skipOpacity }}>
          <X size={18} strokeWidth={3} />
          Skip
        </motion.div>
      </div>

      {/* Card body */}
      <div className="card-body">
        <div className="card-ytm-label">
          <PlayCircle size={11} />
          YouTube Music
        </div>
        <div className="card-title">{track.title}</div>
        <div className="card-artist">{track.artist}</div>

        {sp ? (
          <div className="card-suggestion">
            {sp.image
              ? <img src={sp.image} className="suggestion-thumb" alt={sp.album} />
              : <div className="suggestion-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Music2 size={18} color="var(--muted)" />
                </div>
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
                {playing ? <Pause size={14} /> : <Play size={14} />}
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
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div className="bg-animated" />
      <div className="app-shell">

        {/* Header */}
        <header className="header">
          <div className="header-logo">
            <div className="logo-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Music2 size={18} />
            </div>
            <div>
              <div className="logo-title">YTMusic Review</div>
              <div className="logo-sub">YouTube Music → Spotify</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {tracks.length > 0 && (
              <div className="pill-badge" title="Canciones pendientes">
                <ListTodo size={14} />
                <span>{tracks.length}</span>
              </div>
            )}
            <Link
              href="/database"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'var(--surface2)',
                color: 'var(--muted)',
                padding: '6px 12px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: 500,
                textDecoration: 'none',
                border: '1px solid var(--border)',
                transition: 'color 0.2s',
              }}
            >
              <Database size={13} />
              BD
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
              <div className="state-icon">
                <PartyPopper size={60} color="var(--spotify-green)" strokeWidth={1.5} />
              </div>
              <div className="state-title">¡Todo al día!</div>
              <div className="state-sub">
                No hay canciones pendientes de revisión.
                <br />Corre <code>sync.py</code> para detectar nuevas.
              </div>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
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
              <div className="action-btn-circle skip-btn">
                <X size={26} strokeWidth={3} />
              </div>
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
              <div className="action-btn-circle next-btn">
                <Clock9 size={27} strokeWidth={3} />
              </div>
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
              <div className="action-btn-circle search-btn">
                <Search size={24} strokeWidth={3} />
              </div>
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
              <div className="action-btn-circle accept-btn">
                {saving
                  ? <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
                  : <Check size={24} strokeWidth={3} />
                }
              </div>
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
