import React, { useState, useCallback } from 'react'
import { useStore, useOperationMode, actions, store } from '../stores/appStore'
import { analyzeBuilding, buildRenderPrompt } from '../services/anthropic'
import { generateImage, generateImageNanoBanana, inpaintImage, upscaleImage } from '../services/falai'
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
  const isRendering = useStore(s => s.isRendering)

  // Sprint 3 store state
  const buildingAnalysis = useStore(s => s.buildingAnalysis)
  const renderTier = useStore(s => s.renderTier)
  const numVariations = useStore(s => s.numVariations)
  const renderResults = useStore(s => s.renderResults)
  const selectedResult = useStore(s => s.selectedResult)
  const operationMode = useOperationMode()

  // Local UI state
  const [analysisText, setAnalysisText] = useState(buildingAnalysis || '')
  const [positivePrompt, setPositivePrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [loadingStep, setLoadingStep] = useState('')
  const [error, setError] = useState(null)
  const [isAnalysing, setIsAnalysing] = useState(false)
  const [isBuildingPrompt, setIsBuildingPrompt] = useState(false)
  const [isUpscaling, setIsUpscaling] = useState(false)

  const selectedCount = selectedIds.size
  const hasFalKey = !!keys.fal
  const hasAnthropicKey = !!keys.anthropic

  const getMarkedAnnotations = useCallback(() => {
    const s = store.getState()
    return s.annotations.map(a => ({
      ...a,
      selected: s.selectedIds.has(a.id),
      selectedForRender: s.selectedIds.has(a.id),
    }))
  }, [])

  // Step 1: Analyse Building
  const handleAnalyseBuilding = useCallback(async () => {
    if (!sourceImage || !hasAnthropicKey) return
    setIsAnalysing(true)
    setError(null)
    try {
      const text = await analyzeBuilding(keys.anthropic, sourceImage.dataUrl)
      setAnalysisText(text)
      actions.setBuildingAnalysis(text)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsAnalysing(false)
    }
  }, [sourceImage, hasAnthropicKey, keys.anthropic])

  // Step 2: Build Prompt
  const handleBuildPrompt = useCallback(() => {
    if (selectedCount === 0) return
    setIsBuildingPrompt(true)
    setError(null)
    try {
      const markedAnns = getMarkedAnnotations()
      const activeRef = referenceModels.find(m => m.active)
      const configWithRef = { ...config, referenceDescription: activeRef?.description }
      const pd = buildRenderPrompt(markedAnns, configWithRef, analysisText, address, operationMode)
      setPositivePrompt(pd.positive)
      setNegativePrompt(pd.negative)
      actions.setGeneratedPrompt(pd)
      actions.setRenderPrompt(pd.positive)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsBuildingPrompt(false)
    }
  }, [selectedCount, getMarkedAnnotations, referenceModels, config, analysisText, address])

  // Step 3: Generate
  const handleGenerate = useCallback(async () => {
    if (!hasFalKey || !positivePrompt) return
    if (renderTier !== 'prompt' && selectedCount === 0) return

    actions.setIsRendering(true)
    actions.setRenderResults([])
    actions.setSelectedResult(null)
    setError(null)

    try {
      if (renderTier === 'prompt') {
        // Prompt-only mode — nothing to generate from fal.ai
        setLoadingStep('')
        actions.setIsRendering(false)
        return
      }

      if (renderTier === 'tier2b') {
        setLoadingStep(`Generating render with Nano Banana 2 (this takes ~20s)...`)
        const urls = await generateImageNanoBanana(
          keys.fal,
          positivePrompt,
          sourceImage?.dataUrl,
          numVariations
        )
        const results = urls.map((url, i) => ({
          imageUrl: url,
          prompt: positivePrompt,
          seed: Math.floor(Math.random() * 999999),
          timestamp: Date.now(),
          index: i,
          tier: 'nano-banana-2',
        }))
        actions.setRenderResults(results)
        actions.setSelectedResult(results[0] || null)
      }

      if (renderTier === 'tier2') {
        setLoadingStep(`Generating render (this takes ~15s)...`)
        const urls = await generateImage(
          keys.fal,
          positivePrompt,
          negativePrompt,
          sourceImage.dataUrl,
          0.45,
          numVariations
        )
        const results = urls.map((url, i) => ({
          imageUrl: url,
          prompt: positivePrompt,
          seed: Math.floor(Math.random() * 999999),
          timestamp: Date.now(),
          index: i,
        }))
        actions.setRenderResults(results)
        actions.setSelectedResult(results[0] || null)
      }

      if (renderTier === 'tier3') {
        setLoadingStep('Generating inpainting mask...')
        const mask = await generateInpaintingMask(
          annotations,
          selectedIds,
          sourceImage.width,
          sourceImage.height,
          config
        )

        setLoadingStep(`Generating render (this takes ~15s)...`)
        const urls = await inpaintImage(
          keys.fal,
          positivePrompt,
          negativePrompt,
          sourceImage.dataUrl,
          mask,
          numVariations
        )
        const results = urls.map((url, i) => ({
          imageUrl: url,
          prompt: positivePrompt,
          seed: Math.floor(Math.random() * 999999),
          timestamp: Date.now(),
          index: i,
        }))
        actions.setRenderResults(results)
        actions.setSelectedResult(results[0] || null)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingStep('')
      actions.setIsRendering(false)
    }
  }, [hasFalKey, positivePrompt, negativePrompt, renderTier, selectedCount, keys.fal, sourceImage, numVariations, annotations, selectedIds, config])

  // Upscale selected result
  const handleUpscale = useCallback(async () => {
    if (!selectedResult || !hasFalKey) return
    setIsUpscaling(true)
    setError(null)
    try {
      const upscaledUrl = await upscaleImage(keys.fal, selectedResult.imageUrl)
      if (upscaledUrl) {
        const upscaled = { ...selectedResult, imageUrl: upscaledUrl, upscaled: true }
        const updated = renderResults.map(r =>
          r === selectedResult ? upscaled : r
        )
        actions.setRenderResults(updated)
        actions.setSelectedResult(upscaled)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setIsUpscaling(false)
    }
  }, [selectedResult, hasFalKey, keys.fal, renderResults])

  const handleDownload = useCallback((result) => {
    if (!result) return
    const a = document.createElement('a')
    a.href = result.imageUrl
    a.download = `facadelab-render-${result.index + 1}.png`
    a.target = '_blank'
    a.click()
  }, [])

  const handleSetAsBase = useCallback((result) => {
    if (!result) return
    // Replace source image with this render for chaining
    actions.setSourceImage({
      dataUrl: result.imageUrl,
      width: sourceImage?.width || 1024,
      height: sourceImage?.height || 768,
      name: `render-${result.index + 1}.png`,
    })
    actions.setAnnotations([])
  }, [sourceImage])

  const handleCopySeed = useCallback((result) => {
    if (!result) return
    navigator.clipboard.writeText(String(result.seed))
  }, [])

  const tierOptions = [
    { id: 'prompt', label: 'Prompt Only', desc: 'No generation' },
    { id: 'tier2b', label: 'Nano Banana 2', desc: 'Recommended ★' },
    { id: 'tier2', label: 'Flux Pro', desc: 'img2img' },
    { id: 'tier3', label: 'Inpainting', desc: 'Masked regions' },
  ]

  const canGenerate = renderTier === 'prompt'
    ? !!positivePrompt
    : renderTier === 'tier2b'
    ? hasFalKey && !!positivePrompt  // Nano Banana doesn't need selected windows
    : hasFalKey && !!positivePrompt && selectedCount > 0

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Step 1: Analyse Building */}
      <Section title="Step 1 — Analyse Building">
        <button
          onClick={handleAnalyseBuilding}
          disabled={isAnalysing || !sourceImage || !hasAnthropicKey}
          className="btn-secondary"
          style={{ width: '100%' }}
        >
          {isAnalysing ? (
            <><SpinnerIcon /> Analysing building...</>
          ) : (
            <><Icons.Search size={13} /> Analyse Building</>
          )}
        </button>
        {!hasAnthropicKey && (
          <Note type="warning">No Anthropic key — add one in Settings to enable analysis.</Note>
        )}
        {(analysisText || buildingAnalysis) && (
          <textarea
            value={analysisText}
            onChange={e => setAnalysisText(e.target.value)}
            placeholder="Building analysis will appear here (editable)..."
            style={textareaStyle}
            rows={3}
          />
        )}
      </Section>

      {/* Step 2: Build Prompt */}
      <Section title="Step 2 — Build Prompt">
        <button
          onClick={handleBuildPrompt}
          disabled={isBuildingPrompt || selectedCount === 0}
          className="btn-secondary"
          style={{ width: '100%' }}
        >
          {isBuildingPrompt ? (
            <><SpinnerIcon /> Building prompt...</>
          ) : (
            <><Icons.Copy size={13} /> Build Prompt {selectedCount === 0 ? '(select windows first)' : `(${selectedCount} selected)`}</>
          )}
        </button>
        {positivePrompt && (
          <>
            <label style={labelStyle}>Positive</label>
            <textarea
              value={positivePrompt}
              onChange={e => setPositivePrompt(e.target.value)}
              style={textareaStyle}
              rows={4}
            />
            <label style={labelStyle}>Negative</label>
            <textarea
              value={negativePrompt}
              onChange={e => setNegativePrompt(e.target.value)}
              style={{ ...textareaStyle, opacity: 0.7 }}
              rows={2}
            />
            <button
              onClick={() => navigator.clipboard.writeText(positivePrompt)}
              style={{ ...btnGhostStyle, alignSelf: 'flex-end', marginTop: -4 }}
            >
              <Icons.Copy size={11} /> Copy Prompt
            </button>
          </>
        )}
      </Section>

      {/* Step 3: Quality Tier */}
      <Section title="Step 3 — Quality Tier">
        <div style={{ display: 'flex', gap: 6 }}>
          {tierOptions.map(t => (
            <button
              key={t.id}
              onClick={() => actions.setRenderTier(t.id)}
              style={{
                flex: 1,
                padding: '8px 6px',
                borderRadius: 'var(--radius-md)',
                background: renderTier === t.id ? 'var(--accent-muted)' : 'var(--surface-0)',
                border: `1px solid ${renderTier === t.id ? 'var(--border-focus)' : 'var(--border-subtle)'}`,
                fontSize: 11,
                fontWeight: 500,
                color: renderTier === t.id ? 'var(--accent)' : 'var(--text-tertiary)',
                textAlign: 'center',
                lineHeight: 1.4,
                cursor: 'pointer',
              }}
            >
              <div>{t.label}</div>
              <div style={{ fontSize: 9, opacity: 0.7 }}>{t.desc}</div>
            </button>
          ))}
        </div>

        {/* Variations */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500 }}>Variations</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {[1, 2, 3, 4].map(n => (
              <button
                key={n}
                onClick={() => actions.setNumVariations(n)}
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
                  cursor: 'pointer',
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* Step 4: Generate */}
      {!hasFalKey && renderTier !== 'prompt' && (
        <div style={{
          padding: '8px 12px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--warning-muted)',
          border: '1px solid rgba(245,158,11,0.2)',
          fontSize: 11,
          color: 'var(--warning)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}>
          <span>fal.ai API key required to generate images.</span>
          <button
            onClick={() => actions.setShowSettings(true)}
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--warning)',
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
      <button
        onClick={handleGenerate}
        disabled={isRendering || !canGenerate}
        style={{
          width: '100%',
          padding: '14px 16px',
          borderRadius: 'var(--radius-lg)',
          background: isRendering || !canGenerate
            ? 'var(--surface-2)'
            : 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #3b82f6 100%)',
          color: isRendering || !canGenerate ? 'var(--text-disabled)' : '#fff',
          fontSize: 13,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          border: 'none',
          boxShadow: !isRendering && canGenerate ? '0 0 24px rgba(99,102,241,0.25)' : 'none',
          cursor: isRendering || !canGenerate ? 'default' : 'pointer',
          transition: 'all var(--duration-normal) var(--ease-out)',
        }}
      >
        {isRendering ? (
          <><SpinnerIcon size={16} /> {loadingStep || 'Generating...'}</>
        ) : (
          <><Icons.Sparkles size={16} /> Generate</>
        )}
      </button>

      {/* Error display + Retry */}
      {error && (
        <div style={{
          padding: '10px 12px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--error-muted)',
          border: '1px solid rgba(248,113,113,0.2)',
          color: 'var(--error)',
          fontSize: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <Icons.X size={13} style={{ marginTop: 1, flexShrink: 0 }} />
            <span>{error}</span>
          </div>
          <button
            onClick={handleGenerate}
            disabled={isRendering}
            style={{
              alignSelf: 'flex-start',
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(248,113,113,0.15)',
              border: '1px solid rgba(248,113,113,0.3)',
              color: 'var(--error)',
              fontSize: 11,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Step 5: Results */}
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

          {/* Results grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: renderResults.length > 1 ? '1fr 1fr' : '1fr',
            gap: 4,
            padding: 4,
          }}>
            {renderResults.map((result, i) => {
              const isSelected = selectedResult === result
              return (
                <div
                  key={i}
                  style={{
                    position: 'relative',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    border: `2px solid ${isSelected ? 'var(--accent)' : 'transparent'}`,
                    cursor: 'pointer',
                  }}
                  onClick={() => actions.setSelectedResult(result)}
                >
                  <img
                    src={result.imageUrl}
                    alt={`Render ${i + 1}`}
                    style={{ width: '100%', display: 'block' }}
                  />
                  {/* Index badge */}
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
                  {/* Per-image actions (hover row) */}
                  <div style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    display: 'flex',
                    gap: 3,
                  }}>
                    <ImgButton title="Download" onClick={e => { e.stopPropagation(); handleDownload(result) }}>
                      <Icons.Download size={11} />
                    </ImgButton>
                    <ImgButton title="Set as Base" onClick={e => { e.stopPropagation(); handleSetAsBase(result) }}>
                      <Icons.Upload size={11} />
                    </ImgButton>
                    <ImgButton title={`Copy seed: ${result.seed}`} onClick={e => { e.stopPropagation(); handleCopySeed(result) }}>
                      <Icons.Copy size={11} />
                    </ImgButton>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Selected result actions */}
          {selectedResult && (
            <div style={{ padding: '8px 14px', display: 'flex', gap: 8 }}>
              <button
                onClick={() => handleDownload(selectedResult)}
                style={actionBtnStyle}
              >
                <Icons.Download size={13} /> Download
              </button>
              <button
                onClick={handleUpscale}
                disabled={isUpscaling || !hasFalKey}
                style={{ ...actionBtnStyle, opacity: isUpscaling || !hasFalKey ? 0.5 : 1 }}
              >
                {isUpscaling ? <><SpinnerIcon size={13} /> Upscaling...</> : <><Icons.Sparkles size={13} /> Upscale</>}
              </button>
              <button
                onClick={() => handleCopySeed(selectedResult)}
                style={actionBtnStyle}
              >
                <Icons.Copy size={13} /> Seed
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div style={{
      padding: '12px 14px',
      borderRadius: 'var(--radius-lg)',
      background: 'var(--surface-1)',
      border: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function Note({ type = 'info', children }) {
  const colors = { warning: 'var(--warning)', info: 'var(--text-tertiary)' }
  const bgs = { warning: 'var(--warning-muted)', info: 'var(--surface-2)' }
  return (
    <div style={{
      padding: '7px 10px',
      borderRadius: 'var(--radius-md)',
      background: bgs[type],
      fontSize: 11,
      color: colors[type],
      lineHeight: 1.5,
    }}>
      {children}
    </div>
  )
}

function ImgButton({ children, title, onClick }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: 24,
        height: 24,
        borderRadius: 'var(--radius-sm)',
        background: 'rgba(0,0,0,0.65)',
        border: 'none',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        backdropFilter: 'blur(4px)',
      }}
    >
      {children}
    </button>
  )
}

function SpinnerIcon({ size = 13 }) {
  return (
    <span style={{ display: 'inline-flex', animation: 'spin 1s linear infinite' }}>
      <Icons.Loader size={size} />
    </span>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const textareaStyle = {
  width: '100%',
  padding: '8px 10px',
  fontSize: 11,
  fontFamily: 'var(--font-mono)',
  color: 'var(--text-secondary)',
  lineHeight: 1.6,
  background: 'var(--surface-0)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-md)',
  resize: 'vertical',
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle = {
  fontSize: 10,
  color: 'var(--text-tertiary)',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: -4,
}

const btnGhostStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '4px 8px',
  borderRadius: 'var(--radius-sm)',
  fontSize: 10,
  color: 'var(--text-tertiary)',
  background: 'var(--surface-0)',
  border: '1px solid var(--border-subtle)',
  cursor: 'pointer',
}

const actionBtnStyle = {
  flex: 1,
  padding: '7px 10px',
  borderRadius: 'var(--radius-md)',
  background: 'var(--surface-0)',
  border: '1px solid var(--border-subtle)',
  fontSize: 11,
  fontWeight: 500,
  color: 'var(--text-secondary)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 5,
  cursor: 'pointer',
}
