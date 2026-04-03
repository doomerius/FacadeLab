import React from 'react'
import { useStore, actions } from '../stores/appStore'
import Icons from '../utils/icons'

const STEPS = [
  { id: 'setup', label: 'API Keys', num: '01' },
  { id: 'source', label: 'Image', num: '02' },
  { id: 'detect', label: 'Detect', num: '03' },
  { id: 'configure', label: 'Configure', num: '04' },
  { id: 'render', label: 'Render', num: '05' },
]

export default function Header() {
  const step = useStore(s => s.step)
  const projectName = useStore(s => s.projectName)
  const sourceImage = useStore(s => s.sourceImage)
  const keys = useStore(s => s.keys)

  const stepIdx = STEPS.findIndex(s => s.id === step)

  const canNavigate = (targetStep) => {
    const targetIdx = STEPS.findIndex(s => s.id === targetStep)
    if (targetStep === 'setup') return true
    if (targetStep === 'source') return !!keys.anthropic
    if (targetStep === 'detect') return !!sourceImage
    if (targetStep === 'configure') return !!sourceImage
    if (targetStep === 'render') return !!sourceImage
    return targetIdx <= stepIdx
  }

  return (
    <header style={{
      height: 56,
      minHeight: 56,
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      background: 'var(--surface-0)',
      borderBottom: '1px solid var(--border-subtle)',
      gap: 0,
      zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginRight: 32,
        userSelect: 'none',
      }}>
        <div style={{
          width: 28,
          height: 28,
          borderRadius: 7,
          background: 'linear-gradient(135deg, var(--accent) 0%, #818cf8 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--shadow-glow)',
        }}>
          <Icons.Building size={15} stroke="#fff" strokeWidth={2} />
        </div>
        <span style={{
          fontSize: 15,
          fontWeight: 600,
          letterSpacing: '-0.02em',
          color: 'var(--text-primary)',
        }}>
          FacadeLab
        </span>
        <span style={{
          fontSize: 10,
          fontWeight: 500,
          color: 'var(--accent)',
          background: 'var(--accent-muted)',
          padding: '2px 6px',
          borderRadius: 'var(--radius-full)',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}>
          Beta
        </span>
      </div>

      {/* Pipeline steps */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        flex: 1,
      }}>
        {STEPS.map((s, i) => {
          const isActive = s.id === step
          const isPast = i < stepIdx
          const canNav = canNavigate(s.id)

          return (
            <React.Fragment key={s.id}>
              {i > 0 && (
                <div style={{
                  width: 20,
                  height: 1,
                  background: isPast ? 'var(--accent)' : 'var(--border-subtle)',
                  margin: '0 2px',
                  transition: 'background var(--duration-normal) var(--ease-out)',
                }} />
              )}
              <button
                onClick={() => canNav && actions.setStep(s.id)}
                disabled={!canNav}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: isActive ? 'var(--accent-muted)' : 'transparent',
                  border: isActive ? '1px solid var(--border-focus)' : '1px solid transparent',
                  cursor: canNav ? 'pointer' : 'default',
                  transition: 'all var(--duration-fast) var(--ease-out)',
                  opacity: canNav ? 1 : 0.35,
                }}
              >
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  fontWeight: 500,
                  color: isActive ? 'var(--accent)' : isPast ? 'var(--success)' : 'var(--text-tertiary)',
                  minWidth: 18,
                }}>
                  {isPast ? <Icons.Check size={12} stroke="var(--success)" /> : s.num}
                </span>
                <span style={{
                  fontSize: 12,
                  fontWeight: isActive ? 500 : 400,
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  letterSpacing: '-0.01em',
                }}>
                  {s.label}
                </span>
              </button>
            </React.Fragment>
          )
        })}
      </nav>

      {/* Right actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <HeaderButton icon={<Icons.Save size={15} />} label="Save" onClick={() => {
          const json = actions.exportProject()
          const blob = new Blob([json], { type: 'application/json' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${projectName.replace(/\s+/g, '-').toLowerCase()}.facadelab.json`
          a.click()
          URL.revokeObjectURL(url)
        }} />
        <HeaderButton icon={<Icons.FolderOpen size={15} />} label="Open" onClick={() => {
          const input = document.createElement('input')
          input.type = 'file'
          input.accept = '.json'
          input.onchange = (e) => {
            const file = e.target.files[0]
            if (!file) return
            const reader = new FileReader()
            reader.onload = (e) => actions.importProject(e.target.result)
            reader.readAsText(file)
          }
          input.click()
        }} />
        <div style={{ width: 1, height: 20, background: 'var(--border-subtle)', margin: '0 8px' }} />
        <HeaderButton icon={<Icons.Download size={15} />} label="Export" onClick={() => actions.setShowExport(true)} />
        <HeaderButton icon={<Icons.Settings size={15} />} onClick={() => actions.setShowSettings(true)} />
      </div>
    </header>
  )
}

function HeaderButton({ icon, label, onClick, active }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: label ? '6px 10px' : '6px 8px',
        borderRadius: 'var(--radius-md)',
        color: active ? 'var(--accent)' : 'var(--text-secondary)',
        background: active ? 'var(--accent-muted)' : 'transparent',
        fontSize: 12,
        fontWeight: 400,
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      {icon}
      {label && <span>{label}</span>}
    </button>
  )
}
