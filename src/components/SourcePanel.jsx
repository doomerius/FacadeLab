import React, { useState, useCallback, useRef } from 'react'
import { actions, useStore } from '../stores/appStore'
import { loadImageFromFile } from '../utils/imageUtils'
import Icons from '../utils/icons'

export default function SourcePanel() {
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const address = useStore(s => s.address)
  const fileRef = useRef(null)

  const handleFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setError('Please upload an image file (JPG, PNG, WEBP)')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const img = await loadImageFromFile(file)
      actions.setSourceImage(img)
      actions.setStep('detect')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
      overflow: 'auto',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 680,
        animation: 'fadeIn var(--duration-slow) var(--ease-out)',
      }}>
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h2 style={{
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: '-0.03em',
            color: 'var(--text-primary)',
            marginBottom: 8,
          }}>
            Load a Facade Image
          </h2>
          <p style={{
            fontSize: 13,
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
          }}>
            Upload a photo, paste from clipboard, or fetch from Google Maps
          </p>
        </div>

        {/* Address input */}
        <div style={{
          marginBottom: 20,
          padding: '12px 16px',
          background: 'var(--surface-1)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 6,
          }}>
            <Icons.MapPin size={14} stroke="var(--text-tertiary)" />
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Building Address
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
              (improves render context)
            </span>
          </div>
          <input
            type="text"
            value={address}
            onChange={(e) => actions.setAddress(e.target.value)}
            placeholder="e.g., Vesterbrogade 42, Copenhagen, Denmark"
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: 13,
              background: 'var(--surface-0)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
            }}
          />
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            position: 'relative',
            padding: '60px 40px',
            borderRadius: 'var(--radius-xl)',
            border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border-default)'}`,
            background: dragOver ? 'var(--accent-muted)' : 'var(--surface-1)',
            cursor: 'pointer',
            textAlign: 'center',
            transition: 'all var(--duration-normal) var(--ease-out)',
            overflow: 'hidden',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.background = 'var(--surface-2)' }}
          onMouseLeave={e => { if (!dragOver) { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.background = 'var(--surface-1)' } }}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files[0]
              if (file) handleFile(file)
            }}
          />

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div className="animate-spin" style={{ color: 'var(--accent)' }}>
                <Icons.Loader size={32} />
              </div>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Processing image...</span>
            </div>
          ) : (
            <>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: 'var(--surface-3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <Icons.Upload size={24} stroke="var(--text-tertiary)" />
              </div>
              <p style={{
                fontSize: 15,
                fontWeight: 500,
                color: 'var(--text-primary)',
                marginBottom: 6,
              }}>
                Drop your facade photo here
              </p>
              <p style={{
                fontSize: 12,
                color: 'var(--text-tertiary)',
                marginBottom: 16,
              }}>
                or click to browse — JPG, PNG, WEBP, HEIC supported
              </p>
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 24,
                fontSize: 11,
                color: 'var(--text-tertiary)',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <kbd style={{
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: 'var(--surface-3)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: 10,
                    fontFamily: 'var(--font-mono)',
                  }}>Ctrl+V</kbd>
                  Paste from clipboard
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  Max 4096 x 4096px
                </span>
              </div>
            </>
          )}
        </div>

        {error && (
          <div style={{
            marginTop: 12,
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--error-muted)',
            border: '1px solid rgba(248, 113, 113, 0.2)',
            color: 'var(--error)',
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <Icons.Info size={14} />
            {error}
          </div>
        )}

        {/* Quick actions */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 10,
          marginTop: 20,
        }}>
          <QuickAction
            icon={<Icons.MapPin size={16} />}
            label="Google Maps"
            description="Fetch Street View"
            disabled
          />
          <QuickAction
            icon={<Icons.Eye size={16} />}
            label="Skraafoto"
            description="Danish aerial photos"
            disabled
          />
          <QuickAction
            icon={<Icons.Clipboard size={16} />}
            label="Paste"
            description="From clipboard"
            onClick={async () => {
              try {
                const items = await navigator.clipboard.read()
                for (const item of items) {
                  for (const type of item.types) {
                    if (type.startsWith('image/')) {
                      const blob = await item.getType(type)
                      const file = new File([blob], 'clipboard.png', { type })
                      handleFile(file)
                      return
                    }
                  }
                }
                setError('No image found in clipboard')
              } catch {
                setError('Clipboard access denied — try Ctrl+V instead')
              }
            }}
          />
        </div>
      </div>
    </div>
  )
}

function QuickAction({ icon, label, description, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: '16px 12px',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--surface-1)',
        border: '1px solid var(--border-subtle)',
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all var(--duration-fast) var(--ease-out)',
      }}
      onMouseEnter={e => !disabled && (e.currentTarget.style.background = 'var(--surface-2)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface-1)')}
    >
      <div style={{ color: 'var(--text-tertiary)' }}>{icon}</div>
      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{label}</span>
      <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{description}</span>
    </button>
  )
}
