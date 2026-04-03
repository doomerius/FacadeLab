import React from 'react'
import { useStore, actions } from '../stores/appStore'
import Icons from '../utils/icons'

export default function SettingsModal() {
  const keys = useStore(s => s.keys)
  const keyStatus = useStore(s => s.keyStatus)
  const projectName = useStore(s => s.projectName)

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
      onClick={(e) => { if (e.target === e.currentTarget) actions.setShowSettings(false) }}
    >
      <div style={{
        width: 520,
        maxHeight: '80vh',
        background: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border-default)',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
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
            <Icons.Settings size={16} stroke="var(--text-secondary)" />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Settings</span>
          </div>
          <button
            onClick={() => actions.setShowSettings(false)}
            style={{
              width: 28,
              height: 28,
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-tertiary)',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <Icons.X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Project name */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
              Project Name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => actions.setProjectName(e.target.value)}
              style={{ width: '100%', padding: '10px 12px' }}
            />
          </div>

          {/* API Keys summary */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>
              API Keys
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { id: 'anthropic', label: 'Anthropic' },
                { id: 'fal', label: 'fal.ai' },
                { id: 'replicate', label: 'Replicate' },
                { id: 'googleMaps', label: 'Google Maps' },
                { id: 'openai', label: 'OpenAI' },
              ].map(({ id, label }) => (
                <div key={id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--surface-1)',
                  border: '1px solid var(--border-subtle)',
                }}>
                  <span style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: keys[id] ? 'var(--success)' : 'var(--surface-3)',
                  }} />
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>{label}</span>
                  <input
                    type="password"
                    value={keys[id] || ''}
                    onChange={(e) => { actions.setKey(id, e.target.value); actions.saveKeys() }}
                    placeholder="Not set"
                    style={{
                      width: 200,
                      padding: '6px 8px',
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                      background: 'var(--surface-0)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                    spellCheck={false}
                    autoComplete="off"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Danger zone */}
          <div style={{
            padding: '14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(248, 113, 113, 0.2)',
            background: 'var(--error-muted)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--error)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Danger Zone
            </div>
            <button
              onClick={() => {
                if (confirm('Clear all saved API keys from browser storage?')) {
                  localStorage.removeItem('facadelab_keys')
                  actions.setKey('anthropic', '')
                  actions.setKey('fal', '')
                  actions.setKey('replicate', '')
                  actions.setKey('googleMaps', '')
                  actions.setKey('openai', '')
                }
              }}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(248, 113, 113, 0.1)',
                border: '1px solid rgba(248, 113, 113, 0.3)',
                fontSize: 12,
                color: 'var(--error)',
                fontWeight: 500,
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(248, 113, 113, 0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(248, 113, 113, 0.1)'}
            >
              Clear All Stored Keys
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 11,
          color: 'var(--text-tertiary)',
        }}>
          <span>FacadeLab v1.0.0 Beta</span>
          <button
            onClick={() => actions.setShowSettings(false)}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
