import React from 'react'
import { useStore, actions } from '../stores/appStore'
import Icons from '../utils/icons'

const TOOLS = [
  { id: 'select', icon: Icons.MousePointer, label: 'Select', shortcut: 'V' },
  { id: 'draw', icon: Icons.Square, label: 'Draw', shortcut: 'D' },
  { id: 'reshape', icon: Icons.Move, label: 'Reshape', shortcut: 'R' },
  { id: 'delete', icon: Icons.Trash, label: 'Delete', shortcut: 'X' },
]

export default function ToolBar() {
  const activeTool = useStore(s => s.activeTool)
  const undoStack = useStore(s => s.undoStack)

  return (
    <div style={{
      width: 52,
      minWidth: 52,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '12px 0',
      gap: 4,
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border-subtle)',
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
              width: 36,
              height: 36,
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

      <div style={{ width: 24, height: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />

      {/* Undo */}
      <button
        onClick={() => actions.undo()}
        disabled={undoStack.length === 0}
        title="Undo (Ctrl+Z)"
        style={{
          width: 36,
          height: 36,
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
          width: 36,
          height: 36,
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
