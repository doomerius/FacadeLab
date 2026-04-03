import React, { useState, useCallback } from 'react'
import { useStore, actions, store } from '../stores/appStore'
import { generateRenderPrompt, analyzeReferenceModel } from '../services/anthropic'
import { generateImage, inpaintImage } from '../services/falai'
import { generateInpaintingMask } from '../utils/imageUtils'
import Icons from '../utils/icons'

export default function RenderPanel() {
  const keys = useStore(s => s.keys)
  const sourceImage = useStore(s => s.sourceImage)
  const annotations = useStore(s => s.annotations)
  const selectedIds = useStore(s => s.selectedIds)
  const config = useStore(s => s.balconyConfig)
  const address = useStore(s => s.address)
  const referenceModels = useStore(s => s.referenceModels)
  const renderPrompt = useStore(s => s.renderPrompt)
  const renderResults = useStore(s => s.renderResults)
  const isRendering = useStore(s => s.isRendering)

  const [numVariations, setNumVariations] = useState(1)
  const [renderStep, setRenderStep] = useState('')
  const [error, setError] = useState(null)

  const selectedCount = selectedIds.size
  const hasFalKey = !!keys.fal

  const handleRender = useCallback(async () => {
    if (!keys.anthropic || !sourceImage || selectedCount === 0) return

    actions.setIsRendering(true)
    setError(null)
    setRenderStep('Generating prompt with Claude...')

    try {
      // Get active reference description
      let refDesc = ''
      const activeRef = referenceModels.find(m => m.active)
      if (activeRef && keys.anthropic) {
        setRenderStep('Analyzing reference model...')
        refDesc = await analyzeReferenceModel(keys.anthropic, activeRef.dataUrl)
      }

      // Mark selected annotations
      const s = store.getState()
      const markedAnns = s.annotations.map(a => ({
        ...a,
        selected: s.selectedIds.has(a.id),
      }))

      // Generate prompt via Claude
      setRenderStep('Crafting architectural prompt...')
      const promptData = await generateRenderPrompt(
        keys.anthropic,
        sourceImage.dataUrl,
        markedAnns,
        config,
        address,
        refDesc
      )

      actions.setRenderPrompt(promptData.positive_prompt)

      // If fal.ai key present, generate actual image
      if (hasFalKey) {
        setRenderStep('Generating inpainting mask...')
        const mask = generateInpaintingMask(
          annotations,
          selectedIds,
          sourceImage.width,
          sourceImage.height,
          30
        )

        setRenderStep(`Rendering ${numVariations} variation${numVariations > 1 ? 's' : ''} with Flux Pro...`)

        let imageUrls
        try {
          // Try inpainting first
          imageUrls = await inpaintImage(
            keys.fal,
            promptData.positive_prompt,
            promptData.negative_prompt,
            sourceImage.dataUrl,
            mask,
            promptData.strength || 0.85,
            numVariations
          )
        } catch {
          // Fallback to img2img
          setRenderStep('Falling back to img2img generation...')
          imageUrls = await generateImage(
            keys.fal,
            promptData.positive_prompt,
            promptData.negative_prompt,
            sourceImage.dataUrl,
            promptData.strength || 0.45,
            numVariations
          )
        }

        actions.setRenderResults(imageUrls.map((url, i) => ({
          url,
          seed: Math.floor(Math.random() * 999999),
          selected: i === 0,
        })))
        setRenderStep('Complete')
      } else {
        setRenderStep('Prompt generated (add fal.ai key for image generation)')
      }
    } catch (err) {
      setError(err.message)
      setRenderStep('')
    } finally {
      actions.setIsRendering(false)
    }
  }, [keys, sourceImage, selectedCount, config, address, referenceModels, hasFalKey, numVariations, annotations, selectedIds])

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Render controls */}
      <div style={{
        padding: '14px',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--surface-1)',
        border: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500 }}>Variations</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {[1, 2, 4].map(n => (
              <button
                key={n}
                onClick={() => setNumVariations(n)}
                style={{
                  width: 32,
                  height: 28,
                  borderRadius: 'var(--radius-sm)',
                  background: numVariations === n ? 'var(--accent-muted)' : 'var(--surface-0)',
                  border: `1px solid ${numVariations === n ? 'var(--border-focus)' : 'var(--border-subtle)'}`,
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 500,
                  color: numVariations === n ? 'var(--accent)' : 'var(--text-tertiary)',
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {!hasFalKey && (
          <div style={{
            padding: '8px 10px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--warning-muted)',
            fontSize: 11,
            color: 'var(--warning)',
            lineHeight: 1.5,
          }}>
            No fal.ai key — will generate prompt only. Add key in Settings for image generation.
          </div>
        )}

        <button
          onClick={handleRender}
          disabled={isRendering || selectedCount === 0}
          style={{
            width: '100%',
            padding: '14px 16px',
            borderRadius: 'var(--radius-lg)',
            background: isRendering
              ? 'var(--surface-2)'
              : selectedCount === 0
                ? 'var(--surface-2)'
                : 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #3b82f6 100%)',
            color: isRendering || selectedCount === 0 ? 'var(--text-disabled)' : '#fff',
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: !isRendering && selectedCount > 0 ? '0 0 24px rgba(99, 102, 241, 0.25)' : 'none',
            border: isRendering ? '1px solid var(--border-default)' : 'none',
            transition: 'all var(--duration-normal) var(--ease-out)',
          }}
          onMouseEnter={e => !isRendering && selectedCount > 0 && (e.currentTarget.style.transform = 'scale(1.01)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          {isRendering ? (
            <>
              <span className="animate-spin"><Icons.Loader size={16} /></span>
              {renderStep}
            </>
          ) : (
            <>
              <Icons.Sparkles size={16} />
              {selectedCount === 0 ? 'Select windows first' : `Render ${selectedCount} Balcon${selectedCount > 1 ? 'ies' : 'y'}`}
            </>
          )}
        </button>
      </div>

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

      {/* Prompt output */}
      {renderPrompt && (
        <div style={{
          borderRadius: 'var(--radius-lg)',
          background: 'var(--surface-1)',
          border: '1px solid var(--border-subtle)',
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderBottom: '1px solid var(--border-subtle)',
          }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Generated Prompt
            </span>
            <button
              onClick={() => navigator.clipboard.writeText(renderPrompt)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 10,
                color: 'var(--text-tertiary)',
                background: 'var(--surface-0)',
                border: '1px solid var(--border-subtle)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-0)'}
            >
              <Icons.Copy size={11} />
              Copy
            </button>
          </div>
          <pre style={{
            padding: 14,
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            maxHeight: 200,
            overflow: 'auto',
            margin: 0,
          }}>
            {renderPrompt}
          </pre>
        </div>
      )}

      {/* Render results */}
      {renderResults.length > 0 && (
        <div style={{
          borderRadius: 'var(--radius-lg)',
          background: 'var(--surface-1)',
          border: '1px solid var(--border-subtle)',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '10px 14px',
            borderBottom: '1px solid var(--border-subtle)',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Results ({renderResults.length})
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: renderResults.length > 1 ? '1fr 1fr' : '1fr',
            gap: 4,
            padding: 4,
          }}>
            {renderResults.map((result, i) => (
              <div key={i} style={{
                position: 'relative',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                border: result.selected ? '2px solid var(--accent)' : '2px solid transparent',
                cursor: 'pointer',
              }}
                onClick={() => {
                  actions.setRenderResults(renderResults.map((r, j) => ({
                    ...r,
                    selected: j === i,
                  })))
                }}
              >
                <img
                  src={result.url}
                  alt={`Render variation ${i + 1}`}
                  style={{ width: '100%', display: 'block' }}
                />
                <div style={{
                  position: 'absolute',
                  bottom: 4,
                  left: 4,
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(0,0,0,0.7)',
                  fontSize: 10,
                  fontFamily: 'var(--font-mono)',
                  color: '#fff',
                }}>
                  #{i + 1}
                </div>
              </div>
            ))}
          </div>

          {/* Download selected */}
          <div style={{ padding: '8px 14px', display: 'flex', gap: 8 }}>
            <button
              onClick={() => {
                const selected = renderResults.find(r => r.selected) || renderResults[0]
                if (selected?.url) {
                  const a = document.createElement('a')
                  a.href = selected.url
                  a.download = 'facadelab-render.png'
                  a.target = '_blank'
                  a.click()
                }
              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--surface-0)',
                border: '1px solid var(--border-subtle)',
                fontSize: 11,
                fontWeight: 500,
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-0)'}
            >
              <Icons.Download size={13} />
              Download
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
