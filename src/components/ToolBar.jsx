import React from 'react'
import { useStore, actions } from '../stores/appStore'
import Icons from '../utils/icons'

const TOOLS = [
  { id: 'select', icon: Icons.MousePointer, label: 'Select', shortcut: 'V' },
  { id: 'draw', icon: Icons.Square, label: 'Draw', shortcut: 'D' },
  { id: 'reshape', icon: Icons.Move, label: 'Reshape', shortcut: 'R' },
  { id: 'delete', icon: Icons.Trash, label: 'Delete', shortcut: 'X' },
]

export default function ToolBar({ isMobile = false }) {
  const activeTool = useStore(s => s.activeTool)
  const undoStack = useStore(s => s.undoStack)

  return (
    <div style={{
      width: isMobile ? '100%' : 52,
      minWidth: isMobile ? undefined : 52,
      height: isMobile ? 48 : undefined,
      display: 'flex',
      flexDirection: isMobile ? 'row' : 'column',
      alignItems: 'center',
      justifyContent: isMobile ? 'center' : undefined,
      padding: isMobile ? '4px 12px' : '12px 0',
      gap: isMobile ? 8 : 4,
      background: 'var(--bg-secondary)',
      borderRight: isMobile ? 'none' : '1px solid var(--border-subtle)',
      borderTop: isMobile ? '1px solid var(--border-subtle)' : 'none',
    }}>
      {TOOLS.map(tool => {
        const active = activeTool === tool.id
        const IconComp = tool.icon
        return (
          <button
            key={tool.id}
            onClick={() => actions.setActiveTool(tool.id)}
            title={`${tool.label} (${tool.shortcut})`}
            style={{
              width: isMobile ? 44 : 36,
              height: isMobile ? 44 : 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--radius-md)',
              background: active ? 'var(--accent-muted)' : 'transparent',
              color: active ? 'var(--accent)' : 'var(--text-tertiary)',
              border: active ? '1px solid var(--border-focus)' : '1px solid transparent',
              transition: 'all var(--duration-fast) var(--ease-out)',
              position: 'relative',
            }}
            onMouseEnter={e => {
              if (!active) {
                e.currentTarget.style.background = 'var(--bg-hover)'
                e.currentTarget.style.color = 'var(--text-secondary)'
              }
            }}
            onMouseLeave={e => {
              if (!active) {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--text-tertiary)'
              }
            }}
          >
            <IconComp size={16} />
          </button>
        )
      })}

      <div style={isMobile ? { width: 1, height: 24, background: 'var(--border-subtle)', margin: '0 4px' } : { width: 24, height: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />

      {/* Undo */}
      <button
        onClick={() => actions.undo()}
        disabled={undoStack.length === 0}
        title="Undo (Ctrl+Z)"
        style={{
          width: isMobile ? 44 : 36,
          height: isMobile ? 44 : 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-tertiary)',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)' }}
      >
        <Icons.Undo size={16} />
      </button>

      {/* Select All */}
      <button
        onClick={() => actions.selectAll()}
        title="Select All (Ctrl+A)"
        style={{
          width: isMobile ? 44 : 36,
          height: isMobile ? 44 : 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-tertiary)',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)' }}
      >
        <Icons.Grid size={16} />
      </button>
    </div>
  )
}
