import React, { useEffect, useCallback } from 'react'
import { store, useStore, actions } from './stores/appStore'
import { loadImageFromFile } from './utils/imageUtils'
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

  // Load saved keys on mount
  useEffect(() => {
    actions.loadKeys()
    const saved = store.getState().keys
    if (saved.anthropic) {
      actions.setStep(sourceImage ? 'detect' : 'source')
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
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {step === 'setup' && <SetupPanel />}
        {step === 'source' && <SourcePanel />}
        {(step === 'detect' || step === 'configure' || step === 'render') && <Workspace />}
      </div>
      {showSettings && <SettingsModal />}
      {showExport && <ExportModal />}
    </div>
  )
}
