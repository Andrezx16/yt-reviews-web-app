'use client'

import { useState, useCallback } from 'react'
import { searchDatabase, updateSpotifyId } from '@/app/database/actions'
import Link from 'next/link'

type TableType = 'canciones' | 'mapeos_manuales' | 'ambas'

interface DBRow {
  nombre_busqueda: string
  spotify_id: string | null
  _table?: 'canciones' | 'mapeos_manuales'
}

function SpotifyLink({ id }: { id: string | null }) {
  if (!id) return <span style={{ color: 'var(--muted)', fontSize: 13 }}>(vacío)</span>
  return (
    <a
      href={`https://open.spotify.com/track/${id}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        color: 'var(--spotify-green)',
        fontFamily: 'monospace',
        fontSize: 13,
        textDecoration: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '2px 8px',
        background: 'rgba(29,185,84,0.08)',
        borderRadius: 6,
        border: '1px solid rgba(29,185,84,0.2)',
        transition: 'background 0.2s',
      }}
    >
      <span style={{ fontSize: 11 }}>♪</span>
      {id}
      <span style={{ fontSize: 10, opacity: 0.6 }}>↗</span>
    </a>
  )
}

const TAB_LABELS: Record<TableType, string> = {
  canciones: 'Canciones',
  mapeos_manuales: 'Mapeos Manuales',
  ambas: 'Ambas',
}

export default function DatabaseManager() {
  const [activeTab, setActiveTab] = useState<TableType>('canciones')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<DBRow[]>([])
  const [loading, setLoading] = useState(false)
  const [editingRow, setEditingRow] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = useCallback(async () => {
    const q = query.trim()
    if (!q) return
    setLoading(true)
    setError(null)
    setEditingRow(null)
    setResults([])

    try {
      if (activeTab === 'ambas') {
        const [resC, resM] = await Promise.all([
          searchDatabase('canciones', q),
          searchDatabase('mapeos_manuales', q),
        ])
        const combined: DBRow[] = [
          ...((resC.success && resC.data) ? resC.data.map(r => ({ ...r, _table: 'canciones' as const })) : []),
          ...((resM.success && resM.data) ? resM.data.map(r => ({ ...r, _table: 'mapeos_manuales' as const })) : []),
        ]
        setResults(combined)
        if (!resC.success && !resM.success) setError('Error al buscar en ambas tablas')
      } else {
        const res = await searchDatabase(activeTab, q)
        if (res.success && res.data) {
          setResults(res.data.map(r => ({ ...r, _table: activeTab })))
        } else {
          setError(res.error || 'Error al buscar')
        }
      }
    } catch {
      setError('Error inesperado')
    } finally {
      setLoading(false)
    }
  }, [query, activeTab])

  const handleTabChange = (tab: TableType) => {
    setActiveTab(tab)
    setResults([])
    setQuery('')
    setError(null)
    setEditingRow(null)
  }

  // Unique key per row: table+nombre_busqueda
  const rowKey = (row: DBRow) => `${row._table}::${row.nombre_busqueda}`

  const startEditing = (row: DBRow) => {
    setEditingRow(rowKey(row))
    setEditValue(row.spotify_id || '')
  }

  const saveEdit = async (row: DBRow) => {
    const table = row._table ?? (activeTab === 'ambas' ? 'canciones' : activeTab)
    setSaving(true)
    const res = await updateSpotifyId(table, row.nombre_busqueda, editValue)
    if (res.success) {
      setResults(prev =>
        prev.map(r =>
          rowKey(r) === rowKey(row) ? { ...r, spotify_id: editValue } : r
        )
      )
      setEditingRow(null)
    } else {
      setError(res.error || 'Error al actualizar')
    }
    setSaving(false)
  }

  const tableLabel = (row: DBRow) =>
    row._table === 'canciones' ? 'Canciones' : row._table === 'mapeos_manuales' ? 'Mapeo' : ''

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
      {/* Animated background (fixed so it stays put while scrolling) */}
      <div className="bg-animated" />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 760,
          margin: '0 auto',
          padding: '20px 20px 48px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {/* Header */}
        <div className="header">
          <div className="header-logo">
            <Link
              href="/"
              style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 10 }}
            >
              <div
                className="logo-icon"
                style={{ background: 'var(--surface2)', fontSize: 14, flexShrink: 0 }}
              >
                ←
              </div>
              <div>
                <div className="logo-title">Base de Datos</div>
                <div className="logo-sub">Gestor de IDs</div>
              </div>
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(['canciones', 'mapeos_manuales', 'ambas'] as TableType[]).map(tab => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              style={{
                padding: '8px 18px',
                borderRadius: 20,
                border: 'none',
                background:
                  activeTab === tab ? 'rgba(124,58,237,0.25)' : 'var(--surface2)',
                color: activeTab === tab ? 'var(--purple-light)' : 'var(--muted)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 13,
                transition: 'all 0.2s ease',
                outline: activeTab === tab ? '1px solid rgba(124,58,237,0.4)' : 'none',
              }}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        {/* Search bar */}
        <div className="search-input-wrap">
          <input
            className="search-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder={`Buscar en ${TAB_LABELS[activeTab].toLowerCase()}…`}
          />
          <button className="search-go-btn" onClick={handleSearch} disabled={loading}>
            {loading ? '…' : 'Buscar'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              padding: 12,
              background: 'rgba(255,50,50,0.1)',
              color: '#ff6b6b',
              borderRadius: 10,
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        {/* Results */}
        <div
          style={{
            background: 'var(--surface)',
            borderRadius: 16,
            border: '1px solid var(--border)',
            overflow: 'hidden',
          }}
        >
          {results.length === 0 && !loading && (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
              {query.trim() ? 'Sin resultados para esa búsqueda' : 'Realiza una búsqueda para ver resultados'}
            </div>
          )}

          {loading && (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
              Buscando…
            </div>
          )}

          {results.map(row => {
            const key = rowKey(row)
            const isEditing = editingRow === key
            return (
              <div
                key={key}
                style={{
                  padding: '14px 18px',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                {/* Title row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>
                    {row.nombre_busqueda}
                  </span>
                  {activeTab === 'ambas' && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: 99,
                        background:
                          row._table === 'canciones'
                            ? 'rgba(29,185,84,0.15)'
                            : 'rgba(124,58,237,0.2)',
                        color:
                          row._table === 'canciones'
                            ? 'var(--spotify-green)'
                            : 'var(--purple-light)',
                      }}
                    >
                      {tableLabel(row)}
                    </span>
                  )}
                </div>

                {/* Spotify ID row */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--muted)', fontSize: 12, flexShrink: 0 }}>
                    Spotify ID:
                  </span>

                  {isEditing ? (
                    <>
                      <input
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && saveEdit(row)}
                        autoFocus
                        placeholder="spotify_id o link completo"
                        style={{
                          flex: 1,
                          minWidth: 180,
                          background: 'var(--surface2)',
                          border: '1px solid rgba(124,58,237,0.5)',
                          color: 'white',
                          padding: '6px 12px',
                          borderRadius: 8,
                          fontSize: 13,
                          outline: 'none',
                        }}
                      />
                      <button
                        onClick={() => saveEdit(row)}
                        disabled={saving}
                        style={{
                          background: 'var(--spotify-green)',
                          color: 'white',
                          border: 'none',
                          padding: '6px 14px',
                          borderRadius: 8,
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: 13,
                        }}
                      >
                        {saving ? '…' : 'Guardar'}
                      </button>
                      <button
                        onClick={() => setEditingRow(null)}
                        style={{
                          background: 'var(--surface2)',
                          color: 'var(--muted)',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: 8,
                          cursor: 'pointer',
                          fontSize: 13,
                        }}
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <SpotifyLink id={row.spotify_id} />
                      <button
                        onClick={() => startEditing(row)}
                        style={{
                          background: 'var(--surface2)',
                          color: 'var(--text)',
                          border: 'none',
                          padding: '4px 12px',
                          borderRadius: 8,
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: 600,
                          marginLeft: 'auto',
                        }}
                      >
                        Editar
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {results.length > 0 && (
          <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
            {results.length} resultado{results.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  )
}
