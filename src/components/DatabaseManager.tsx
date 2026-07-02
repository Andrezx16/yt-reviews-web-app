'use client'

import { useState, useCallback, useEffect } from 'react'
import { searchDatabase, updateSpotifyId, deleteRow } from '@/app/database/actions'
import Link from 'next/link'
import {
  ArrowLeft,
  Search,
  Loader2,
  Music2,
  ExternalLink,
  Pencil,
  Check,
  X,
  AlertCircle,
  Database,
  Trash2,
  ArrowUpDown,
} from 'lucide-react'

type TableType = 'canciones' | 'mapeos_manuales' | 'ambas'

interface DBRow {
  nombre_busqueda: string
  spotify_id: string | null
  creado_en?: string
  _table?: 'canciones' | 'mapeos_manuales'
}

const TAB_CONFIG: { id: TableType; label: string; short: string }[] = [
  { id: 'canciones',       label: 'Canciones',       short: 'C' },
  { id: 'mapeos_manuales', label: 'Mapeos Manuales', short: 'M' },
  { id: 'ambas',           label: 'Ambas',            short: 'A' },
]

// ── Inline styles as constants to avoid repetition ──────────────────────────

const btnBase: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: 'none',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  fontFamily: "inherit",
}

// ── Sub-components ──────────────────────────────────────────────────────────

function SpotifyLink({ id }: { id: string | null }) {
  if (!id) {
    return (
      <span style={{ color: 'var(--muted)', fontSize: 12, fontStyle: 'italic' }}>
        Sin ID asignado
      </span>
    )
  }
  return (
    <a
      href={`https://open.spotify.com/track/${id}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        color: 'var(--spotify-green)',
        fontFamily: 'monospace',
        fontSize: 12,
        textDecoration: 'none',
        padding: '3px 10px',
        background: 'rgba(29,185,84,0.07)',
        border: '1px solid rgba(29,185,84,0.18)',
        borderRadius: 6,
        maxWidth: '100%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      <Music2 size={11} />
      <span>{id}</span>
      <ExternalLink size={10} style={{ opacity: 0.5, flexShrink: 0 }} />
    </a>
  )
}

function TableBadge({ table }: { table: 'canciones' | 'mapeos_manuales' | undefined }) {
  if (!table) return null
  const isCancion = table === 'canciones'
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        padding: '2px 8px',
        borderRadius: 99,
        background: isCancion ? 'rgba(29,185,84,0.12)' : 'rgba(124,58,237,0.15)',
        color: isCancion ? 'var(--spotify-green)' : 'var(--purple-light)',
        flexShrink: 0,
      }}
    >
      {isCancion ? 'Canción' : 'Mapeo'}
    </span>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export default function DatabaseManager() {
  const [activeTab, setActiveTab]   = useState<TableType>('canciones')
  const [query, setQuery]           = useState('')
  const [results, setResults]       = useState<DBRow[]>([])
  const [loading, setLoading]       = useState(false)
  const [editingRow, setEditingRow] = useState<string | null>(null)
  const [editValue, setEditValue]   = useState('')
  const [saving, setSaving]         = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [sortOrder, setSortOrder]   = useState<'desc' | 'asc'>('desc')

  const handleSearch = useCallback(async () => {
    const q = query.trim()
    setLoading(true)
    setError(null)
    setEditingRow(null)
    setConfirmingDelete(null)
    setResults([])

    try {
      if (activeTab === 'ambas') {
        const [resC, resM] = await Promise.all([
          searchDatabase('canciones', q, sortOrder),
          searchDatabase('mapeos_manuales', q, sortOrder),
        ])
        const combined: DBRow[] = [
          ...((resC.success && resC.data) ? resC.data.map(r => ({ ...r, _table: 'canciones' as const })) : []),
          ...((resM.success && resM.data) ? resM.data.map(r => ({ ...r, _table: 'mapeos_manuales' as const })) : []),
        ]
        combined.sort((a, b) => {
          const tA = new Date(a.creado_en || 0).getTime()
          const tB = new Date(b.creado_en || 0).getTime()
          return sortOrder === 'desc' ? tB - tA : tA - tB
        })
        setResults(combined)
        if (!resC.success && !resM.success) setError('No se pudo conectar con Supabase')
      } else {
        const res = await searchDatabase(activeTab, q, sortOrder)
        if (res.success && res.data) {
          setResults(res.data.map(r => ({ ...r, _table: activeTab })))
        } else {
          setError(res.error ?? 'Error al buscar')
        }
      }
    } catch {
      setError('Error inesperado al buscar')
    } finally {
      setLoading(false)
    }
  }, [query, activeTab, sortOrder])

  useEffect(() => {
    // Wrap in a setTimeout to avoid calling setState synchronously within the effect
    // which triggers the "cascading renders" warning.
    const timer = setTimeout(() => {
      handleSearch()
    }, 0)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, sortOrder])

  const handleTabChange = (tab: TableType) => {
    setActiveTab(tab)
    setResults([])
    setQuery('')
    setError(null)
    setEditingRow(null)
    setConfirmingDelete(null)
  }

  const rowKey = (row: DBRow) => `${row._table}::${row.nombre_busqueda}`

  const startEditing = (row: DBRow) => {
    setEditingRow(rowKey(row))
    setEditValue(row.spotify_id ?? '')
  }

  const saveEdit = async (row: DBRow) => {
    const table = row._table ?? (activeTab === 'ambas' ? 'canciones' : activeTab)
    setSaving(true)
    const res = await updateSpotifyId(table, row.nombre_busqueda, editValue)
    if (res.success) {
      setResults(prev => prev.map(r => rowKey(r) === rowKey(row) ? { ...r, spotify_id: editValue } : r))
      setEditingRow(null)
    } else {
      setError(res.error ?? 'Error al actualizar')
    }
    setSaving(false)
  }

  const confirmDeleteAction = async (row: DBRow) => {
    setIsDeleting(true)
    const table = row._table ?? (activeTab === 'ambas' ? 'canciones' : activeTab)
    const res = await deleteRow(table, row.nombre_busqueda)
    
    if (res.success) {
      setResults(prev => prev.filter(r => rowKey(r) !== rowKey(row)))
    } else {
      setError(res.error ?? 'Error al eliminar')
    }
    setIsDeleting(false)
    setConfirmingDelete(null)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        overflowY: 'auto',
        background: 'var(--bg)',
        color: 'var(--text)',
        fontFamily: "var(--font-inter, 'Inter', sans-serif)",
      }}
    >
      <div className="bg-animated" />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 720,
          margin: '0 auto',
          padding: '28px 24px 64px',
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <Link
            href="/"
            style={{
              ...btnBase,
              width: 36,
              height: 36,
              background: 'var(--surface2)',
              borderRadius: 10,
              color: 'var(--muted)',
              flexShrink: 0,
            }}
          >
            <ArrowLeft size={16} />
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'linear-gradient(135deg, var(--purple), var(--spotify-green))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Database size={16} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>Base de Datos</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>Busca y edita IDs de Spotify</div>
            </div>
          </div>
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            gap: 4,
            background: 'var(--surface)',
            padding: 4,
            borderRadius: 12,
            marginBottom: 20,
            border: '1px solid var(--border)',
          }}
        >
          {TAB_CONFIG.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              style={{
                ...btnBase,
                flex: 1,
                padding: '8px 12px',
                borderRadius: 8,
                background: activeTab === tab.id ? 'var(--surface2)' : 'transparent',
                color: activeTab === tab.id ? 'var(--text)' : 'var(--muted)',
                fontWeight: activeTab === tab.id ? 600 : 400,
                fontSize: 13,
                boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Search bar ──────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <div
            style={{
              flex: 1,
              display: 'flex',
              width:'30vw',
              gap: 8,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '6px 6px 6px 14px',
              alignItems: 'center',
            }}
          >
            <Search size={15} style={{ color: 'var(--muted)', flexShrink: 0 }} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Buscar por título…"
              style={{
                flex: 1,
                minWidth: 0,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text)',
                fontSize: 14,
                fontFamily: 'inherit',
              }}
            />
            <button
              onClick={() => handleSearch()}
              disabled={loading}
              style={{
                ...btnBase,
                padding: '8px 14px',
                borderRadius: 8,
                background: loading ? 'var(--surface2)' : 'var(--purple)',
                color: loading ? 'var(--muted)' : 'white',
                fontSize: 13,
                fontWeight: 600,
                gap: 10,
              }}
            >
              {loading
                ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                : <Search size={14} />
              }
              {loading ? 'Buscando' : 'Buscar'}
            </button>
          </div>
          <button
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            title="Ordenar"
            style={{
              ...btnBase,
              padding: '0 14px',
              borderRadius: 12,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              gap: 6,
              flexShrink: 0,
            }}
          >
            <ArrowUpDown size={15} />
          </button>
        </div>

        {/* Spin animation */}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        {/* ── Error ───────────────────────────────────────────────────────── */}
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 10,
              color: '#f87171',
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            {error}
          </div>
        )}

        {/* ── Results ─────────────────────────────────────────────────────── */}
        {loading && (
          <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 10px', display: 'block' }} />
            Buscando en {TAB_CONFIG.find(t => t.id === activeTab)?.label.toLowerCase()}…
          </div>
        )}

        {!loading && results.length === 0 && (
          <div
            style={{
              padding: '48px 0',
              textAlign: 'center',
              color: 'var(--muted)',
              fontSize: 13,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Search size={28} style={{ opacity: 0.2 }} />
            {query.trim() ? 'Sin resultados para esa búsqueda' : 'No hay datos en esta tabla'}
          </div>
        )}

        {results.length > 0 && (
          <>
            <div
              style={{
                fontSize: 11,
                color: 'var(--muted)',
                marginBottom: 10,
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>{results.length} resultado{results.length !== 1 ? 's' : ''}</span>
              <span style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {TAB_CONFIG.find(t => t.id === activeTab)?.label}
              </span>
            </div>

            <div
              style={{
                background: 'var(--surface)',
                borderRadius: 14,
                border: '1px solid var(--border)',
                overflow: 'hidden',
              }}
            >
              {results.map((row, idx) => {
                const key = rowKey(row)
                const isEditing = editingRow === key
                const isConfirmingDelete = confirmingDelete === key
                const isLast = idx === results.length - 1
                return (
                  <div
                    key={key}
                    style={{
                      padding: '14px 16px',
                      borderBottom: isLast ? 'none' : '1px solid var(--border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                  >
                    {/* Title row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Music2 size={13} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, fontSize: 13, flex: 1, lineHeight: 1.3 }}>
                        {row.nombre_busqueda}
                      </span>
                      {activeTab === 'ambas' && <TableBadge table={row._table} />}
                    </div>

                    {/* ID row */}
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        <input
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && saveEdit(row)}
                          autoFocus
                          placeholder="spotify_id o URL de Spotify"
                          style={{
                            flex: 1,
                            minWidth: 180,
                            background: 'var(--surface2)',
                            border: '1px solid rgba(124,58,237,0.4)',
                            color: 'var(--text)',
                            padding: '7px 12px',
                            borderRadius: 8,
                            fontSize: 13,
                            outline: 'none',
                            fontFamily: 'monospace',
                          }}
                        />
                        <button
                          onClick={() => saveEdit(row)}
                          disabled={saving}
                          style={{
                            ...btnBase,
                            padding: '7px 14px',
                            borderRadius: 8,
                            background: 'var(--spotify-green)',
                            color: 'white',
                            fontWeight: 600,
                            fontSize: 13,
                            gap: 5,
                          }}
                        >
                          {saving
                            ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                            : <Check size={13} />
                          }
                          {saving ? 'Guardando' : 'Guardar'}
                        </button>
                        <button
                          onClick={() => setEditingRow(null)}
                          style={{
                            ...btnBase,
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: 'var(--surface2)',
                            color: 'var(--muted)',
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : isConfirmingDelete ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                        <span style={{ fontSize: 12, color: 'var(--muted)', marginRight: 4 }}>¿Eliminar?</span>
                        <button
                          onClick={() => confirmDeleteAction(row)}
                          disabled={isDeleting}
                          style={{
                            ...btnBase,
                            gap: 5,
                            padding: '5px 11px',
                            borderRadius: 8,
                            background: 'rgba(239,68,68,0.1)',
                            color: '#f87171',
                            fontSize: 12,
                            fontWeight: 500,
                          }}
                        >
                          {isDeleting ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={12} />}
                          Sí
                        </button>
                        <button
                          onClick={() => setConfirmingDelete(null)}
                          disabled={isDeleting}
                          style={{
                            ...btnBase,
                            padding: '5px 11px',
                            borderRadius: 8,
                            background: 'var(--surface2)',
                            color: 'var(--muted)',
                            fontSize: 12,
                            fontWeight: 500,
                          }}
                        >
                          <X size={12} />
                          No
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <SpotifyLink id={row.spotify_id} />
                        <button
                          onClick={() => startEditing(row)}
                          title="Editar"
                          style={{
                            ...btnBase,
                            marginLeft: 'auto',
                            padding: '5px 9px',
                            borderRadius: 8,
                            background: 'var(--surface2)',
                            color: 'var(--muted)',
                          }}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setConfirmingDelete(rowKey(row))}
                          title="Eliminar"
                          style={{
                            ...btnBase,
                            gap: 5,
                            padding: '5px 11px',
                            borderRadius: 8,
                            background: 'rgba(239,68,68,0.1)',
                            color: '#f87171',
                            fontSize: 12,
                            fontWeight: 500,
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
