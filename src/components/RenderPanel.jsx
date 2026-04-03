import React, { useState, useCallback } from 'react'
import { useStore, actions, store } from '../stores/appStore'
import { generateRenderPrompt, buildRenderPrompt } from '../services/anthropic'
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
  const [promptData, setPromptData] = useState(null) // { positive, negative, inpaintingHint }
  const [maskDataUrl, setMaskDataUrl] = useState(null)

  const selectedCount = selectedIds.size
  const hasFalKey = !!keys.fal

  // Prepare annotaions with selected flag
  const getMarkedAnnotations = useCallback(() => {
    const s = store.getState()
    return s.annotations.map(a => ({
      ...a,
      selected: s.selectedIds.has(a.id),
      selectedForRender: s.selectedIds.has(a.id),
    }))
  }, [])

  // Task 5a: Generate Prompt button
  const handleGeneratePrompt = useCallback(async () => {
    if (!sourceImage || selectedCount === 0) return
    setError(null)
    setRenderStep('Assembling prompt...')

    try {
      const markedAnns = getMarkedAnnotations()
      // Use local buildRenderPrompt (no API key needed)
      // If we have imageAnalysis cached, use it; otherwise pass empty
      const imageAnalysis = config.cachedImageAnalysis || ''
      const activeRef = referenceModels.find(m => m.active)
      const configWithRef = {
        ...config,
        referenceDescription: activeRef ? activeRef.description : undefined,
      }
      const pd = buildRenderPrompt(markedAnns, configWithRef, imageAnalysis, address)
      setPromptData(pd)
      actions.setRenderPrompt(pd.positive)
      setRenderStep('')
    } catch (err) {
      setError(err.message)
      setRenderStep('')
    }
  }, [sourceImage, selectedCount, config, address, referenceModels, getMarkedAnnotations])

  // Task 5b: Generate Render Tier 2 (img2img)
  const handleRenderTier2 = useCallback(async () => {
    if (!hasFalKey || !sourceImage || selectedCount === 0) return
    actions.setIsRendering(true)
    setError(null)
    setRenderStep('Generating prompt...')

    try {
      // First ensure we have a prompt
      let pd = promptData
      if (!pd) {
        const markedAnns = getMarkedAnnotations()
        const imageAnalysis = config.cachedImageAnalysis || ''
        const activeRef = referenceModels.find(m => m.active)
        const configWithRef = { ...config, referenceDescription: activeRef?.description }
        pd = buildRenderPrompt(markedAnns, configWithRef, imageAnalysis, address)
        setPromptData(pd)
        actions.setRenderPrompt(pd.positive)
      }

      setRenderStep(`Rendering ${numVariations} variation${numVariations > 1 ? 's' : ''} with Flux Pro (img2img)...`)
      const imageUrls = await generateImage(
        keys.fal,
        pd.positive,
        pd.negative,
        sourceImage.dataUrl,
        0.45,
        numVariations
      )

      actions.setRenderResults(imageUrls.map((url, i) => ({
        url,
        seed: Math.floor(Math.random() * 999999),
        selected: i === 0,
      })))
      setRenderStep('Complete')
    } catch (err) {
      setError(err.message)
      setRenderStep('')
    } finally {
      actions.setIsRendering(false)
    }
  }, [hasFalKey, sourceImage, selectedCount, config, address, referenceModels, promptData, keys.fal, numVariations, getMarkedAnnotations])

  // Task 5c: Generate Render Tier 3 (inpainting)
  const handleRenderTier3 = useCallback(async () => {
    if (!hasFalKey || !sourceImage || selectedCount === 0) return
    actions.setIsRendering(true)
    setError(null)
    setRenderStep('Generating inpainting mask...')

    try {
      // Generate mask
      const mask = generateInpaintingMask(
        annotations,
        selectedIds,
        sourceImage.width,
        sourceImage.height,
        config
      )
      setMaskDataUrl(mask)

      // Ensure prompt
      let pd = promptData
      if (!pd) {
        setRenderStep('Assembling prompt...')
        const markedAnns = getMarkedAnnotations()
        const imageAnalysis = config.cachedImageAnalysis || ''
        const activeRef = referenceModels.find(m => m.active)
        const configWithRef = { ...config, referenceDescription: activeRef?.description }
        pd = buildRenderPrompt(markedAnns, configWithRef, imageAnalysis, address)
        setPromptData(pd)
        actions.setRenderPrompt(pd.positive)
      }

      setRenderStep(`Rendering ${numVariations} variation${numVariations > 1 ? 's' : ''} with Flux Inpainting...`)
      const imageUrls = await inpaintImage(
        keys.fal,
        pd.positive,
        pd.negative,
        sourceImage.dataUrl,
        mask,
        0.85,
        numVariations
      )

      actions.setRenderResults(imageUrls.map((url, i) => ({
        url,
        seed: Math.floor(Math.random() * 999999),
        selected: i === 0,
      })))
      setRenderStep('Complete')
    } catch (err) {
      setError(err.message)
      setRenderStep('')
    } finally {
      actions.setIsRendering(false)
    }
  }, [hasFalKey, sourceImage, selectedCount, config, address, referenceModels, promptData, keys.fal, numVariations, annotations, selectedIds, getMarkedAnnotations])

  // Legacy full render (Claude prompt + fal.ai)
  const handleRenderFull = useCallback(async () => {
    if (!keys.anthropic || !sourceImage || selectedCount === 0) return

    actions.setIsRendering(true)
    setError(null)
    setRenderStep('Generating prompt with Claude...')

    try {
      let refDesc = ''
      const activeRef = referenceModels.find(m => m.active)
      if (activeRef && keys.anthropic) {
        setRenderStep('Analyzing reference model...')
        const { analyzeReferenceModel } = await import('../services/anthropic')
        refDesc = await analyzeReferenceModel(keys.anthropic, activeRef.dataUrl)
      }

      const markedAnns = getMarkedAnnotations()

      setRenderStep('Crafting architectural prompt...')
      const pd = await generateRenderPrompt(
        keys.anthropic,
        sourceImage.dataUrl,
        markedAnns,
        config,
        address,
        refDesc
      )

      const positivePrompt = pd.positive_prompt || pd.positive || ''
      actions.setRenderPrompt(positivePrompt)
      setPromptData({ positive: positivePrompt, negative: pd.negative_prompt || '', inpaintingHint: '' })

      if (hasFalKey) {
        setRenderStep('Generating inpainting mask...')
        const mask = generateInpaintingMask(annotations, selectedIds, sourceImage.width, sourceImage.height, config)
        setMaskDataUrl(mask)

        setRenderStep(`Rendering ${numVariations} variation${numVariations > 1 ? 's' : ''} with Flux Pro...`)

        let imageUrls
        try {
          imageUrls = await inpaintImage(keys.fal, positivePrompt, pd.negative_prompt || '', sourceImage.dataUrl, mask, pd.strength || 0.85, numVariations)
        } catch {
          setRenderStep('Falling back to img2img generation...')
          imageUrls = await generateImage(keys.fal, positivePrompt, pd.negative_prompt || '', sourceImage.dataUrl, pd.strength || 0.45, numVariations)
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
  }, [keys, sourceImage, selectedCount, config, address, referenceModels, hasFalKey, numVariations, annotations, selectedIds, getMarkedAnnotations])

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
            No fal.ai key — prompt generation only. Add key in Settings for image generation.
          </div>
        )}

        {/* Generate Prompt button */}
        <button
          onClick={handleGeneratePrompt}
          disabled={isRendering || selectedCount === 0}
          style={{
            width: '100%',
            padding: '10px 16px',
            borderRadius: 'var(--radius-md)',
            background: selectedCount === 0 ? 'var(--surface-2)' : 'var(--surface-0)',
            color: selectedCount === 0 ? 'var(--text-disabled)' : 'var(--text-primary)',
            border: `1px solid ${selectedCount === 0 ? 'var(--border-subtle)' : 'var(--border-default)'}`,
            fontSize: 12,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
          onMouseEnter={e => selectedCount > 0 && !isRendering && (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={e => selectedCount > 0 && !isRendering && (e.currentTarget.style.background = 'var(--surface-0)')}
        >
          <Icons.Copy size={13} />
          Generate Prompt
        </button>

        {/* Tier 2: img2img */}
        <button
          onClick={handleRenderTier2}
          disabled={isRendering || selectedCount === 0 || !hasFalKey}
          style={{
            width: '100%',
            padding: '10px 16px',
            borderRadius: 'var(--radius-md)',
            background: !hasFalKey || selectedCount === 0 ? 'var(--surface-2)' : 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
            color: !hasFalKey || selectedCount === 0 ? 'var(--text-disabled)' : '#fff',
            fontSize: 12,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            border: 'none',
          }}
        >
          {isRendering ? (
            <>
              <span className="animate-spin"><Icons.Loader size={13} /></span>
              {renderStep}
            </>
          ) : (
            <>
              <Icons.Sparkles size={13} />
              Generate Render (Tier 2 — img2img)
            </>
          )}
        </button>

        {/* Tier 3: inpainting */}
        <button
          onClick={handleRenderTier3}
          disabled={isRendering || selectedCount === 0 || !hasFalKey}
          style={{
            width: '100%',
            padding: '14px 16px',
            borderRadius: 'var(--radius-lg)',
            background: isRendering
              ? 'var(--surface-2)'
              : selectedCount === 0 || !hasFalKey
                ? 'var(--surface-2)'
                : 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #3b82f6 100%)',
            color: isRendering || selectedCount === 0 || !hasFalKey ? 'var(--text-disabled)' : '#fff',
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: !isRendering && selectedCount > 0 && hasFalKey ? '0 0 24px rgba(99, 102, 241, 0.25)' : 'none',
            border: isRendering ? '1px solid var(--border-default)' : 'none',
            transition: 'all var(--duration-normal) var(--ease-out)',
          }}
          onMouseEnter={e => !isRendering && selectedCount > 0 && hasFalKey && (e.currentTarget.style.transform = 'scale(1.01)')}
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
              {selectedCount === 0 ? 'Select windows first' : `Generate Render (Tier 3 — Inpainting)`}
            </>
          )}
        </button>

        {/* Full render with Claude prompt */}
        {keys.anthropic && (
          <button
            onClick={handleRenderFull}
            disabled={isRendering || selectedCount === 0}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface-0)',
              border: '1px solid var(--border-subtle)',
              fontSize: 11,
              color: 'var(--text-tertiary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <Icons.Sparkles size={11} />
            Full Render with Claude Prompt
          </button>
        )}
      </div>

      {error && (
        <div style={{
          padding: '10px 12px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--error-muted)',
          border: '1px solid rgba(248, 113, 113, 0.2)',
          color: 'var(--error)',
          fontSize: 12,
          display: 'flex',
          gap: 8,
          alignItems: 'flex-start',
        }}>
          <Icons.X size={13} style={{ marginTop: 1, flexShrink: 0 }} />
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
              Copy Prompt
            </button>
          </div>
          <textarea
            readOnly
            value={renderPrompt}
            style={{
              width: '100%',
              padding: 14,
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              maxHeight: 200,
              overflow: 'auto',
              margin: 0,
              background: 'transparent',
              border: 'none',
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {promptData?.inpaintingHint && (
            <div style={{
              padding: '8px 14px',
              borderTop: '1px solid var(--border-subtle)',
              fontSize: 10,
              color: 'var(--text-tertiary)',
              fontStyle: 'italic',
            }}>
              {promptData.inpaintingHint}
            </div>
          )}
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

          {/* Download selected + Copy Prompt */}
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
            {renderPrompt && (
              <button
                onClick={() => navigator.clipboard.writeText(renderPrompt)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--surface-0)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: 11,
                  color: 'var(--text-tertiary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-0)'}
              >
                <Icons.Copy size={13} />
                Copy Prompt
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
