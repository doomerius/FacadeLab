import React, { useState } from 'react'
import { store, useStore, actions } from '../stores/appStore'
import { detectWindows } from '../services/anthropic'
import Icons from '../utils/icons'

export default function DetectPanel() {
  const keys = useStore(s => s.keys)
  const sourceImage = useStore(s => s.sourceImage)
  const isDetecting = useStore(s => s.isDetecting)
  const annotations = useStore(s => s.annotations)
  const [error, setError] = useState(null)

  const handleDetect = async () => {
    if (!keys.anthropic || !sourceImage) return
    actions.setIsDetecting(true)
    setError(null)

    try {
      const results = await detectWindows(
        keys.anthropic,
        sourceImage.dataUrl,
        sourceImage.width,
        sourceImage.height
      )
      actions.setAnnotations(results)
      // Sync nextAnnotationId so manual additions don't collide
      const maxId = Math.max(0, ...results.map(r => r.id))
      store.setState({ nextAnnotationId: maxId + 1 })
    } catch (err) {
      setError(err.message)
    } finally {
      actions.setIsDetecting(false)
    }
  }

  const windowCount = annotations.filter(a => a.type === 'window').length
  const doorCount = annotations.filter(a => a.type === 'door').length
  const floors = [...new Set(annotations.map(a => a.floor))].sort((a, b) => a - b)

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Detect button */}
      <button
        onClick={handleDetect}
        disabled={isDetecting || !keys.anthropic}
        style={{
          width: '100%',
          padding: '14px 16px',
          borderRadius: 'var(--radius-lg)',
          background: isDetecting
            ? 'var(--surface-2)'
            : 'linear-gradient(135deg, var(--accent) 0%, #818cf8 100%)',
          color: isDetecting ? 'var(--text-secondary)' : '#fff',
          fontSize: 13,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          boxShadow: isDetecting ? 'none' : 'var(--shadow-glow)',
          border: isDetecting ? '1px solid var(--border-default)' : 'none',
          transition: 'all var(--duration-normal) var(--ease-out)',
        }}
        onMouseEnter={e => !isDetecting && (e.currentTarget.style.transform = 'scale(1.01)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {isDetecting ? (
          <>
            <span className="animate-spin"><Icons.Loader size={16} /></span>
            Analyzing facade with Claude Vision...
          </>
        ) : (
          <>
            <Icons.Scan size={16} />
            {annotations.length > 0 ? 'Re-detect Windows & Doors' : 'Detect Windows & Doors'}
          </>
        )}
      </button>

      {error && (
        <div style={{
          padding: '10px 12px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--error-muted)',
          border: '1px solid rgba(248, 113, 113, 0.2)',
          color: 'var(--error)',
          fontSize: 12,
        }}>
          {error}
        </div>
      )}

      {/* Results summary */}
      {annotations.length > 0 && (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
          }}>
            <StatCard label="Windows" value={windowCount} color="var(--detect-blue)" />
            <StatCard label="Doors" value={doorCount} color="var(--door-purple)" />
          </div>

          <div style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--surface-1)',
            border: '1px solid var(--border-subtle)',
          }}>
            <div style={{
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 8,
            }}>
              Floors Detected
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {floors.map(f => (
                <span key={f} style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--surface-3)',
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-secondary)',
                  fontWeight: 500,
                }}>
                  Floor {f}
                </span>
              ))}
            </div>
          </div>

          {/* Annotation list */}
          <div>
            <div style={{
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 8,
              padding: '0 2px',
            }}>
              Openings ({annotations.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {annotations.map(ann => (
                <AnnotationRow key={ann.id} annotation={ann} />
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => actions.setActiveTool('draw')}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--surface-2)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
                fontSize: 12,
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'all var(--duration-fast) var(--ease-out)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.borderColor = 'var(--border-strong)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.borderColor = 'var(--border-default)' }}
            >
              <Icons.Edit size={13} />
              Refine Manually
            </button>
            <button
              onClick={() => actions.setStep('configure')}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: 'var(--radius-lg)',
                background: 'linear-gradient(135deg, var(--accent) 0%, #818cf8 100%)',
                border: 'none',
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                boxShadow: 'var(--shadow-glow)',
                transition: 'all var(--duration-fast) var(--ease-out)',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.01)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              Configure
              <Icons.ChevronRight size={13} />
            </button>
          </div>
        </>
      )}

      {/* Tips */}
      <div style={{
        padding: '12px 14px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--info-muted)',
        border: '1px solid rgba(96, 165, 250, 0.15)',
        fontSize: 11,
        color: 'var(--info)',
        lineHeight: 1.6,
      }}>
        <strong>Tips:</strong> Use the Draw tool (D) to add missed openings. Use Reshape (R) to adjust boxes. Click Delete (X) to remove false positives.
      </div>
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div style={{
      padding: '12px 14px',
      borderRadius: 'var(--radius-md)',
      background: 'var(--surface-1)',
      border: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500 }}>{label}</span>
      <span style={{
        fontSize: 20,
        fontWeight: 700,
        fontFamily: 'var(--font-mono)',
        color,
        letterSpacing: '-0.02em',
      }}>
        {value}
      </span>
    </div>
  )
}

function AnnotationRow({ annotation: ann }) {
  const selectedIds = useStore(s => s.selectedIds)
  const isSelected = selectedIds.has(ann.id)

  return (
    <button
      onClick={() => actions.toggleSelection(ann.id)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 10px',
        borderRadius: 'var(--radius-md)',
        background: isSelected ? 'var(--select-amber-fill)' : 'transparent',
        border: isSelected ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid transparent',
        width: '100%',
        textAlign: 'left',
        transition: 'all var(--duration-fast) var(--ease-out)',
      }}
      onMouseEnter={e => !isSelected && (e.currentTarget.style.background = 'var(--bg-hover)')}
      onMouseLeave={e => !isSelected && (e.currentTarget.style.background = 'transparent')}
    >
      <div style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: ann.type === 'door' ? 'var(--door-purple)' : 'var(--detect-blue)',
        flexShrink: 0,
      }} />
      <span style={{
        fontSize: 12,
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-primary)',
        fontWeight: 500,
        minWidth: 28,
      }}>
        {ann.type === 'door' ? 'D' : 'W'}{ann.id}
      </span>
      <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
        Floor {ann.floor}
      </span>
      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
        {ann.w}x{ann.h}
      </span>
      {ann.confidence < 0.7 && (
        <span style={{ fontSize: 9, color: 'var(--warning)', fontWeight: 500 }}>LOW</span>
      )}
    </button>
  )
}


