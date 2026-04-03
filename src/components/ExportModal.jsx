import React, { useState } from 'react'
import { useStore, actions, store } from '../stores/appStore'
import Icons from '../utils/icons'

export default function ExportModal() {
  const renderResults = useStore(s => s.renderResults)
  const sourceImage = useStore(s => s.sourceImage)
  const projectName = useStore(s => s.projectName)
  const [format, setFormat] = useState('png')

  const selectedRender = renderResults.find(r => r.selected)

  const handleExportImage = async () => {
    const url = selectedRender?.url || sourceImage?.dataUrl
    if (!url) return

    const a = document.createElement('a')
    a.href = url
    a.download = `${projectName.replace(/\s+/g, '-').toLowerCase()}-render.${format}`
    a.target = '_blank'
    a.click()
  }

  const handleExportProject = () => {
    const json = actions.exportProject()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${projectName.replace(/\s+/g, '-').toLowerCase()}.facadelab.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(8px)',
      animation: 'fadeIn var(--duration-fast) var(--ease-out)',
    }}
      onClick={(e) => { if (e.target === e.currentTarget) actions.setShowExport(false) }}
    >
      <div style={{
        width: 440,
        background: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border-default)',
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden',
        animation: 'fadeIn var(--duration-normal) var(--ease-spring)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icons.Download size={16} stroke="var(--text-secondary)" />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Export</span>
          </div>
          <button
            onClick={() => actions.setShowExport(false)}
            style={{
              width: 28, height: 28, borderRadius: 'var(--radius-md)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-tertiary)',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <Icons.X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Render export */}
          {(selectedRender || sourceImage) && (
            <div style={{
              padding: 14,
              borderRadius: 'var(--radius-lg)',
              background: 'var(--surface-1)',
              border: '1px solid var(--border-subtle)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                Image Export
              </div>

              {selectedRender && (
                <img src={selectedRender.url} alt="Render" style={{
                  width: '100%', borderRadius: 'var(--radius-md)', marginBottom: 12,
                }} />
              )}

              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                {['png', 'jpg'].map(f => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    style={{
                      padding: '6px 16px',
                      borderRadius: 'var(--radius-full)',
                      background: format === f ? 'var(--accent-muted)' : 'var(--surface-0)',
                      border: `1px solid ${format === f ? 'var(--border-focus)' : 'var(--border-subtle)'}`,
                      fontSize: 12,
                      fontWeight: format === f ? 500 : 400,
                      color: format === f ? 'var(--accent)' : 'var(--text-secondary)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <button
                onClick={handleExportImage}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--accent)',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Icons.Download size={14} />
                Download Image
              </button>
            </div>
          )}

          {/* Project export */}
          <div style={{
            padding: 14,
            borderRadius: 'var(--radius-lg)',
            background: 'var(--surface-1)',
            border: '1px solid var(--border-subtle)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
              Project File
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.5, marginBottom: 12 }}>
              Save the complete project state including image, annotations, configuration, and render results as a JSON file.
            </p>
            <button
              onClick={handleExportProject}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--surface-2)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
                fontSize: 12,
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-2)'}
            >
              <Icons.Save size={14} />
              Download .facadelab.json
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
