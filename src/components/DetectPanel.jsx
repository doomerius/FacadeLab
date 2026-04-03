import React, { useState, useEffect } from 'react'
import { store, useStore, actions } from '../stores/appStore'
import { detectWindows, detectWindowsSelfHosted, checkCVServiceAvailable } from '../services/anthropic'
import Icons from '../utils/icons'

const CV_SERVICE_URL = 'https://cv.palkia.io'

export default function DetectPanel() {
  const keys = useStore(s => s.keys)
  const sourceImage = useStore(s => s.sourceImage)
  const isDetecting = useStore(s => s.isDetecting)
  const annotations = useStore(s => s.annotations)
  const [error, setError] = useState(null)
  const [detectStage, setDetectStage] = useState(null) // 'claude' | 'sam2' | 'cv-service' | null
  const [buildingMeta, setBuildingMeta] = useState(null)
  const [selfHostedAvailable, setSelfHostedAvailable] = useState(null) // null=checking, true/false
  const [useSelfHosted, setUseSelfHosted] = useState(true)
  const [showMaskPreview, setShowMaskPreview] = useState(false)

  // Check cv-service availability on mount
  useEffect(() => {
    checkCVServiceAvailable(CV_SERVICE_URL).then(available => {
      setSelfHostedAvailable(available)
      setUseSelfHosted(available) // default to self-hosted if reachable
    })
  }, [])

  const canDetectSelfHosted = useSelfHosted && selfHostedAvailable && !!sourceImage
  const canDetectClaude = !useSelfHosted && !!keys.anthropic && !!sourceImage
  const canDetect = canDetectSelfHosted || canDetectClaude

  const handleDetect = async () => {
    if (!sourceImage) return
    actions.setIsDetecting(true)
    setError(null)
    setBuildingMeta(null)

    try {
      let results
      if (useSelfHosted && selfHostedAvailable) {
        setDetectStage('cv-service')
        results = await detectWindowsSelfHosted(sourceImage.dataUrl, CV_SERVICE_URL)
      } else {
        if (!keys.anthropic) throw new Error('Anthropic API key required')
        setDetectStage('claude')
        results = await detectWindows(
          keys.anthropic,
          sourceImage.dataUrl,
          sourceImage.width,
          sourceImage.height,
          keys.fal || null,
          (stage) => setDetectStage(stage)
        )
        // Extract building metadata if present
        if (results._buildingMeta) {
          setBuildingMeta(results._buildingMeta)
        }
      }
      actions.setAnnotations(results)
      const maxId = Math.max(0, ...results.map(r => r.id))
      store.setState({ nextAnnotationId: maxId + 1 })
    } catch (err) {
      setError(err.message)
    } finally {
      actions.setIsDetecting(false)
      setDetectStage(null)
    }
  }

  const windowCount = annotations.filter(a => a.type === 'window').length
  const doorCount = annotations.filter(a => a.type === 'door').length
  const floors = [...new Set(annotations.map(a => a.floor))].sort((a, b) => a - b)
  const samCount = annotations.filter(a => a.hasSAMMask).length
  const balconyCount = annotations.filter(a => a.has_balcony).length
  const groups = [...new Set(annotations.map(a => a.group_id).filter(g => g != null))]

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Detection mode toggle */}
      <div style={{
        padding: '10px 12px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--surface-1)',
        border: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Detection Engine
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => setUseSelfHosted(true)}
            disabled={!selfHostedAvailable}
            style={{
              flex: 1,
              padding: '7px 8px',
              borderRadius: 'var(--radius-md)',
              border: useSelfHosted ? '1px solid var(--accent)' : '1px solid var(--border-default)',
              background: useSelfHosted ? 'rgba(99,102,241,0.1)' : 'var(--surface-2)',
              color: useSelfHosted ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: 11,
              fontWeight: 600,
              cursor: selfHostedAvailable ? 'pointer' : 'not-allowed',
              opacity: selfHostedAvailable === false ? 0.5 : 1,
            }}
          >
            🤖 Self-hosted
            {selfHostedAvailable === null && <span style={{ opacity: 0.6 }}> …</span>}
            {selfHostedAvailable === true && <span style={{ color: 'var(--success, #22c55e)', marginLeft: 4 }}>✓</span>}
            {selfHostedAvailable === false && <span style={{ opacity: 0.5, marginLeft: 4 }}>offline</span>}
          </button>
          <button
            onClick={() => setUseSelfHosted(false)}
            style={{
              flex: 1,
              padding: '7px 8px',
              borderRadius: 'var(--radius-md)',
              border: !useSelfHosted ? '1px solid var(--accent)' : '1px solid var(--border-default)',
              background: !useSelfHosted ? 'rgba(99,102,241,0.1)' : 'var(--surface-2)',
              color: !useSelfHosted ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            🧠 Claude + SAM2
          </button>
        </div>
        {useSelfHosted ? (
          <div style={{ fontSize: 10, color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
            GroundingDINO + SAM2 · No API keys needed · Pixel-accurate masks
          </div>
        ) : (
          <div style={{ fontSize: 10, color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
            Claude vision + fal.ai SAM2 · Requires API keys in Settings
          </div>
        )}
      </div>

      {/* Detect button */}
      <button
        onClick={handleDetect}
        disabled={isDetecting || !canDetect}
        title={!canDetect && !useSelfHosted && !keys.anthropic ? 'Anthropic API key required — add in Settings' : undefined}
        style={{
          width: '100%',
          padding: '14px 16px',
          borderRadius: 'var(--radius-lg)',
          background: !canDetect
            ? 'var(--surface-2)'
            : isDetecting
            ? 'var(--surface-2)'
            : 'linear-gradient(135deg, var(--accent) 0%, #818cf8 100%)',
          color: (!canDetect || isDetecting) ? 'var(--text-secondary)' : '#fff',
          fontSize: 13,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          boxShadow: (!canDetect || isDetecting) ? 'none' : 'var(--shadow-glow)',
          border: (!canDetect || isDetecting) ? '1px solid var(--border-default)' : 'none',
          transition: 'all var(--duration-normal) var(--ease-out)',
          cursor: !canDetect ? 'not-allowed' : undefined,
        }}
        onMouseEnter={e => (!isDetecting && canDetect) && (e.currentTarget.style.transform = 'scale(1.01)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {isDetecting ? (
          <>
            <span className="animate-spin"><Icons.Loader size={16} /></span>
            {detectStage === 'sam2' ? 'Stage 2: Refining masks with SAM2...'
              : detectStage === 'cv-service' ? 'Detecting with GroundingDINO + SAM2...'
              : 'Stage 1: Analysing structure with Claude...'}
          </>
        ) : !canDetect && !useSelfHosted ? (
          <>
            <Icons.Settings size={16} />
            API key required to detect
          </>
        ) : (
          <>
            <Icons.Scan size={16} />
            {annotations.length > 0 ? 'Re-detect Windows & Doors' : 'Detect Windows & Doors'}
          </>
        )}
      </button>
      {!useSelfHosted && !keys.anthropic && (
        <div style={{
          padding: '8px 12px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--warning-muted)',
          border: '1px solid rgba(245,158,11,0.2)',
          fontSize: 11,
          color: 'var(--warning)',
          lineHeight: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}>
          <span>Add an Anthropic key to enable Claude detection.</span>
          <button
            onClick={() => actions.setShowSettings(true)}
            style={{
              fontSize: 11,
              color: 'var(--warning)',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(245,158,11,0.12)',
              border: '1px solid rgba(245,158,11,0.3)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Settings
          </button>
        </div>
      )}

      {error && (
        <div style={{
          padding: '10px 12px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--error-muted)',
          border: '1px solid rgba(248, 113, 113, 0.2)',
          color: 'var(--error)',
          fontSize: 12,
        }}>
          {error}
        </div>
      )}

      {/* SAM2 hint when using Claude mode without fal key */}
      {!useSelfHosted && !keys.fal && keys.anthropic && (
        <div style={{
          padding: '8px 12px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--info-muted)',
          border: '1px solid rgba(96,165,250,0.15)',
          fontSize: 11,
          color: 'var(--info)',
          lineHeight: 1.5,
        }}>
          🔬 Add a fal.ai key in Settings to enable pixel-accurate masks (Stage 2)
        </div>
      )}

      {/* Results summary */}
      {annotations.length > 0 && (
        <>
          {/* Building summary */}
          {buildingMeta && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.08) 100%)',
              border: '1px solid rgba(99,102,241,0.2)',
              fontSize: 12,
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
            }}>
              🏢 <strong style={{ color: 'var(--text-primary)' }}>Building Analysis:</strong> {buildingMeta.floors} floor{buildingMeta.floors !== 1 ? 's' : ''}, {buildingMeta.window_count || windowCount} windows{doorCount > 0 ? `, ${doorCount} door${doorCount !== 1 ? 's' : ''}` : ''}
              {samCount > 0 && <span style={{ opacity: 0.7 }}> · {samCount} SAM2 masks</span>}
            </div>
          )}

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
          }}>
            <StatCard label="Windows" value={windowCount} color="var(--detect-blue)" />
            <StatCard label="Doors" value={doorCount} color="var(--door-purple)" />
          </div>

          <div style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--surface-1)',
            border: '1px solid var(--border-subtle)',
          }}>
            <div style={{
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 8,
            }}>
              Floors Detected
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {floors.map(f => (
                <span key={f} style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--surface-3)',
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-secondary)',
                  fontWeight: 500,
                }}>
                  Floor {f}
                </span>
              ))}
            </div>
          </div>

          {/* Annotation list */}
          <div>
            <div style={{
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 8,
              padding: '0 2px',
            }}>
              Openings ({annotations.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {annotations.map(ann => (
                <AnnotationRow key={ann.id} annotation={ann} />
              ))}
            </div>
          </div>

          {/* Mask preview toggle */}
          {annotations.some(a => a.hasSAMMask || a.maskB64) && (
            <button
              onClick={() => setShowMaskPreview(v => !v)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                border: showMaskPreview ? '1px solid var(--accent)' : '1px solid var(--border-default)',
                background: showMaskPreview ? 'rgba(99,102,241,0.1)' : 'var(--surface-2)',
                color: showMaskPreview ? 'var(--accent)' : 'var(--text-secondary)',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              🖤 {showMaskPreview ? 'Hide Mask Preview' : 'Show Mask Preview'}
              <span style={{ fontSize: 10, opacity: 0.7, fontWeight: 400 }}>(verify alignment)</span>
            </button>
          )}

          {/* Mask preview canvas */}
          {showMaskPreview && (
            <MaskPreviewCanvas annotations={annotations} />
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => actions.setActiveTool('draw')}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--surface-2)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
                fontSize: 12,
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'all var(--duration-fast) var(--ease-out)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.borderColor = 'var(--border-strong)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.borderColor = 'var(--border-default)' }}
            >
              <Icons.Edit size={13} />
              Refine Manually
            </button>
            <button
              onClick={() => actions.setStep('configure')}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: 'var(--radius-lg)',
                background: 'linear-gradient(135deg, var(--accent) 0%, #818cf8 100%)',
                border: 'none',
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                boxShadow: 'var(--shadow-glow)',
                transition: 'all var(--duration-fast) var(--ease-out)',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.01)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              Configure
              <Icons.ChevronRight size={13} />
            </button>
          </div>
        </>
      )}

      {/* Tips */}
      <div style={{
        padding: '12px 14px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--info-muted)',
        border: '1px solid rgba(96, 165, 250, 0.15)',
        fontSize: 11,
        color: 'var(--info)',
        lineHeight: 1.6,
      }}>
        <strong>Tips:</strong> Use the Draw tool (D) to add missed openings. Use Reshape (R) to adjust boxes. Click Delete (X) to remove false positives.
      </div>
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div style={{
      padding: '12px 14px',
      borderRadius: 'var(--radius-md)',
      background: 'var(--surface-1)',
      border: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500 }}>{label}</span>
      <span style={{
        fontSize: 20,
        fontWeight: 700,
        fontFamily: 'var(--font-mono)',
        color,
        letterSpacing: '-0.02em',
      }}>
        {value}
      </span>
    </div>
  )
}

function MaskPreviewCanvas({ annotations }) {
  const sourceImage = useStore(s => s.sourceImage)
  const selectedIds = useStore(s => s.selectedIds)
  const canvasRef = React.useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !sourceImage) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width
    const H = canvas.height

    // Draw source image
    const img = new Image()
    img.onload = async () => {
      ctx.drawImage(img, 0, 0, W, H)

      // Composite selected masks with red tint
      const selected = annotations.filter(a => selectedIds.has(a.id))
      for (const ann of selected) {
        if (ann.maskB64) {
          try {
            const maskImg = await new Promise((res, rej) => {
              const mi = new Image()
              mi.onload = () => res(mi)
              mi.onerror = rej
              mi.src = `data:image/png;base64,${ann.maskB64}`
            })
            ctx.save()
            ctx.globalAlpha = 0.5
            ctx.globalCompositeOperation = 'multiply'
            // Red mask overlay: draw mask as red
            const tmp = document.createElement('canvas')
            tmp.width = W; tmp.height = H
            const tc = tmp.getContext('2d')
            tc.drawImage(maskImg, 0, 0, W, H)
            tc.globalCompositeOperation = 'source-in'
            tc.fillStyle = 'rgba(239,68,68,0.8)'
            tc.fillRect(0, 0, W, H)
            ctx.globalCompositeOperation = 'source-over'
            ctx.globalAlpha = 0.6
            ctx.drawImage(tmp, 0, 0)
            ctx.restore()
          } catch {}
        } else if (ann.maskUrl) {
          try {
            const maskImg = await new Promise((res, rej) => {
              const mi = new Image(); mi.crossOrigin = 'anonymous'
              mi.onload = () => res(mi); mi.onerror = rej
              mi.src = ann.maskUrl
            })
            ctx.save()
            const tmp = document.createElement('canvas')
            tmp.width = W; tmp.height = H
            const tc = tmp.getContext('2d')
            tc.drawImage(maskImg, 0, 0, W, H)
            tc.globalCompositeOperation = 'source-in'
            tc.fillStyle = 'rgba(239,68,68,0.8)'
            tc.fillRect(0, 0, W, H)
            ctx.globalCompositeOperation = 'source-over'
            ctx.globalAlpha = 0.6
            ctx.drawImage(tmp, 0, 0)
            ctx.restore()
          } catch {}
        } else {
          // Fallback: draw bbox
          ctx.save()
          ctx.globalAlpha = 0.4
          ctx.fillStyle = 'rgba(239,68,68,0.5)'
          ctx.fillRect(ann.x * W / sourceImage.width, ann.y * H / sourceImage.height,
            ann.w * W / sourceImage.width, ann.h * H / sourceImage.height)
          ctx.restore()
        }
      }
    }
    img.src = sourceImage.dataUrl
  }, [annotations, selectedIds, sourceImage])

  if (!sourceImage) return null

  return (
    <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
      <div style={{ fontSize: 10, padding: '4px 8px', background: 'var(--surface-1)', color: 'var(--text-tertiary)', fontWeight: 600 }}>
        MASK PREVIEW — selected annotations highlighted in red
      </div>
      <canvas
        ref={canvasRef}
        width={320}
        height={Math.round(320 * sourceImage.height / sourceImage.width)}
        style={{ display: 'block', width: '100%' }}
      />
    </div>
  )
}

function AnnotationRow({ annotation: ann }) {
  const selectedIds = useStore(s => s.selectedIds)
  const isSelected = selectedIds.has(ann.id)

  return (
    <button
      onClick={() => actions.toggleSelection(ann.id)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 10px',
        borderRadius: 'var(--radius-md)',
        background: isSelected ? 'var(--select-amber-fill)' : 'transparent',
        border: isSelected ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid transparent',
        width: '100%',
        textAlign: 'left',
        transition: 'all var(--duration-fast) var(--ease-out)',
      }}
      onMouseEnter={e => !isSelected && (e.currentTarget.style.background = 'var(--bg-hover)')}
      onMouseLeave={e => !isSelected && (e.currentTarget.style.background = 'transparent')}
    >
      <div style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: ann.type === 'door' ? 'var(--door-purple)' : 'var(--detect-blue)',
        flexShrink: 0,
      }} />
      <span style={{
        fontSize: 12,
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-primary)',
        fontWeight: 500,
        minWidth: 28,
      }}>
        {ann.type === 'door' ? 'D' : 'W'}{ann.id}
      </span>
      <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
        Floor {ann.floor}
      </span>
      {ann.group_id != null && (
        <span style={{
          fontSize: 9,
          padding: '1px 5px',
          borderRadius: 'var(--radius-full)',
          background: 'rgba(99,102,241,0.15)',
          color: 'var(--accent)',
          fontWeight: 600,
          fontFamily: 'var(--font-mono)',
        }}>
          G{ann.group_id}
        </span>
      )}
      {ann.has_balcony && (
        <span title="Already has a balcony" style={{ fontSize: 12 }}>⚠️</span>
      )}
      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
        {ann.w}x{ann.h}
      </span>
      {ann.hasSAMMask && (
        <span style={{ fontSize: 9, color: 'var(--success, #22c55e)', fontWeight: 500 }} title="SAM2 pixel mask">✓</span>
      )}
      {ann.confidence < 0.7 && (
        <span style={{ fontSize: 9, color: 'var(--warning)', fontWeight: 500 }}>LOW</span>
      )}
    </button>
  )
}


