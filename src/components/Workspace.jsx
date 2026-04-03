import React, { useState } from 'react'
import { useStore, actions } from '../stores/appStore'
import CanvasView from './CanvasView'
import ToolBar from './ToolBar'
import DetectPanel from './DetectPanel'
import ConfigPanel from './ConfigPanel'
import RenderPanel from './RenderPanel'
import ReferencePanel from './ReferencePanel'

export default function Workspace() {
  const step = useStore(s => s.step)
  const annotations = useStore(s => s.annotations)
  const selectedIds = useStore(s => s.selectedIds)
  const [rightPanelTab, setRightPanelTab] = useState('config')

  const selectedCount = selectedIds.size
  const totalCount = annotations.length

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      overflow: 'hidden',
      background: 'var(--bg-primary)',
    }}>
      {/* Left toolbar */}
      <ToolBar />

      {/* Canvas area */}
      <div style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--surface-0)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Canvas status bar */}
        <div style={{
          height: 32,
          minHeight: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          background: 'var(--surface-1)',
          borderBottom: '1px solid var(--border-subtle)',
          fontSize: 11,
          color: 'var(--text-tertiary)',
          fontFamily: 'var(--font-mono)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span>{totalCount} opening{totalCount !== 1 ? 's' : ''} detected</span>
            {selectedCount > 0 && (
              <span style={{ color: 'var(--select-amber)' }}>
                {selectedCount} selected
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>
              {step === 'detect' && 'Detection mode'}
              {step === 'configure' && 'Configuration mode'}
              {step === 'render' && 'Render mode'}
            </span>
          </div>
        </div>

        {/* Canvas */}
        <CanvasView />
      </div>

      {/* Right panel */}
      <div style={{
        width: 340,
        minWidth: 340,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--border-subtle)',
        overflow: 'hidden',
      }}>
        {/* Panel tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--surface-0)',
        }}>
          {step === 'detect' && (
            <PanelTab active label="Detection" />
          )}
          {(step === 'configure' || step === 'render') && (
            <>
              <PanelTab
                active={rightPanelTab === 'config'}
                label="Design"
                onClick={() => setRightPanelTab('config')}
              />
              <PanelTab
                active={rightPanelTab === 'reference'}
                label="Reference"
                onClick={() => setRightPanelTab('reference')}
              />
              <PanelTab
                active={rightPanelTab === 'render'}
                label="Render"
                onClick={() => setRightPanelTab('render')}
              />
            </>
          )}
        </div>

        {/* Panel content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '0' }}>
          {step === 'detect' && <DetectPanel />}
          {(step === 'configure' || step === 'render') && rightPanelTab === 'config' && <ConfigPanel />}
          {(step === 'configure' || step === 'render') && rightPanelTab === 'reference' && <ReferencePanel />}
          {(step === 'configure' || step === 'render') && rightPanelTab === 'render' && <RenderPanel />}
        </div>
      </div>
    </div>
  )
}

function PanelTab({ active, label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: '10px 0',
        fontSize: 12,
        fontWeight: active ? 500 : 400,
        color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
        background: 'transparent',
        borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
        transition: 'all var(--duration-fast) var(--ease-out)',
      }}
      onMouseEnter={e => !active && (e.currentTarget.style.color = 'var(--text-secondary)')}
      onMouseLeave={e => !active && (e.currentTarget.style.color = 'var(--text-tertiary)')}
    >
      {label}
    </button>
  )
}
