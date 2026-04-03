import React, { useEffect, useCallback } from 'react'
import { store, useStore, actions } from './stores/appStore'
import { loadImageFromFile } from './utils/imageUtils'
import { useMobile } from './utils/useMobile'
import Header from './components/Header'
import SetupPanel from './components/SetupPanel'
import SourcePanel from './components/SourcePanel'
import Workspace from './components/Workspace'
import SettingsModal from './components/SettingsModal'
import ExportModal from './components/ExportModal'

export default function App() {
  const step = useStore(s => s.step)
  const showSettings = useStore(s => s.showSettings)
  const showExport = useStore(s => s.showExport)
  const sourceImage = useStore(s => s.sourceImage)
  const keys = useStore(s => s.keys)
  const isMobile = useMobile()
  const hasDemoMode = !keys.anthropic && !keys.fal

  // Load saved keys on mount — go straight to source (free-tier mode)
  useEffect(() => {
    actions.loadKeys()
    // Always start at source step; setup is optional
    const s = store.getState()
    if (s.sourceImage) {
      actions.setStep('detect')
    } else {
      actions.setStep('source')
    }
  }, [])

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      // Ctrl+Z — undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        actions.undo()
      }
      // Ctrl+A — select all
      if ((e.metaKey || e.ctrlKey) && e.key === 'a' && step === 'configure') {
        e.preventDefault()
        actions.selectAll()
      }
      // Escape — clear selection / close modals
      if (e.key === 'Escape') {
        if (showSettings) actions.setShowSettings(false)
        else if (showExport) actions.setShowExport(false)
        else actions.clearSelection()
      }
      // Tool shortcuts
      if (e.key === 'v' || e.key === 'V') actions.setActiveTool('select')
      if (e.key === 'd' || e.key === 'D') actions.setActiveTool('draw')
      if (e.key === 'r' || e.key === 'R') actions.setActiveTool('reshape')
      if (e.key === 'x' || e.key === 'X') actions.setActiveTool('delete')
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [step, showSettings, showExport])

  // Paste handler
  useEffect(() => {
    const handler = (e) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          const file = item.getAsFile()
          loadImageFromFile(file).then(img => {
            actions.setSourceImage(img)
            actions.setStep('detect')
          })
          break
        }
      }
    }
    window.addEventListener('paste', handler)
    return () => window.removeEventListener('paste', handler)
  }, [])

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-primary)',
      overflow: 'hidden',
    }}>
      <Header />
      {hasDemoMode && (
        <div style={{
          background: 'var(--surface-2)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '6px 16px',
          fontSize: 11,
          color: 'var(--text-tertiary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}>
          <span>Demo mode — image upload, canvas tools, and annotation work without API keys.</span>
          <button
            onClick={() => actions.setShowSettings(true)}
            style={{
              fontSize: 11,
              color: 'var(--accent)',
              fontWeight: 500,
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--accent-muted)',
              border: '1px solid var(--border-focus)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Add API Keys
          </button>
        </div>
      )}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {step === 'setup' && <SourcePanel />}
        {step === 'source' && <SourcePanel />}
        {(step === 'detect' || step === 'configure' || step === 'render') && <Workspace isMobile={isMobile} />}
      </div>
      {showSettings && <SettingsModal />}
      {showExport && <ExportModal />}
    </div>
  )
}
