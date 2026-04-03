import React, { useRef } from 'react'
import { useStore, actions } from '../stores/appStore'
import { loadImageFromFile } from '../utils/imageUtils'
import Icons from '../utils/icons'

export default function ReferencePanel() {
  const referenceModels = useStore(s => s.referenceModels)
  const fileRef = useRef(null)

  const handleImport = async (file) => {
    try {
      const img = await loadImageFromFile(file)
      actions.addReferenceModel({
        name: file.name.replace(/\.[^.]+$/, ''),
        dataUrl: img.dataUrl,
        width: img.width,
        height: img.height,
      })
    } catch (err) {
      console.error('Failed to import reference:', err)
    }
  }

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Import button */}
      <button
        onClick={() => fileRef.current?.click()}
        style={{
          width: '100%',
          padding: '14px 16px',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--surface-2)',
          border: '1px dashed var(--border-default)',
          color: 'var(--text-secondary)',
          fontSize: 12,
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          transition: 'all var(--duration-fast) var(--ease-out)',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
      >
        <Icons.Plus size={16} />
        Import Model Images
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          for (const file of e.target.files) handleImport(file)
          e.target.value = ''
        }}
      />

      {/* Info */}
      <div style={{
        padding: '12px 14px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--info-muted)',
        border: '1px solid rgba(96, 165, 250, 0.15)',
        fontSize: 11,
        color: 'var(--info)',
        lineHeight: 1.6,
      }}>
        Import photos of actual balcony models, manufacturer product images, or renders. Claude Vision will analyze them to extract detailed material descriptions for the render prompt.
      </div>

      {/* Model grid */}
      {referenceModels.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{
            fontSize: 10,
            fontWeight: 600,
            color: 'var(--text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Model Library ({referenceModels.length})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {referenceModels.map(model => (
              <ModelCard key={model.id} model={model} />
            ))}
          </div>
        </div>
      )}

      {referenceModels.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '32px 16px',
          color: 'var(--text-tertiary)',
        }}>
          <Icons.Layers size={32} stroke="var(--text-disabled)" style={{ margin: '0 auto 12px', display: 'block' }} />
          <p style={{ fontSize: 12, marginBottom: 4 }}>No reference models yet</p>
          <p style={{ fontSize: 11, color: 'var(--text-disabled)' }}>
            Import images of balcony designs you'd like to match
          </p>
        </div>
      )}
    </div>
  )
}

function ModelCard({ model }) {
  return (
    <div style={{
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      background: 'var(--surface-1)',
      border: model.active ? '2px solid var(--accent)' : '1px solid var(--border-subtle)',
      cursor: 'pointer',
      transition: 'all var(--duration-fast) var(--ease-out)',
    }}
      onClick={() => actions.setActiveReferenceModel(model.id)}
    >
      <div style={{
        position: 'relative',
        paddingBottom: '75%',
        background: 'var(--surface-0)',
      }}>
        <img
          src={model.dataUrl}
          alt={model.name}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
        {model.active && (
          <div style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Icons.Check size={12} stroke="#fff" strokeWidth={2.5} />
          </div>
        )}
      </div>
      <div style={{
        padding: '8px 10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{
          fontSize: 11,
          fontWeight: 500,
          color: model.active ? 'var(--accent)' : 'var(--text-secondary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {model.name}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); actions.removeReferenceModel(model.id) }}
          style={{
            padding: 2,
            color: 'var(--text-disabled)',
            borderRadius: 'var(--radius-sm)',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--error)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-disabled)'}
        >
          <Icons.X size={12} />
        </button>
      </div>
    </div>
  )
}
