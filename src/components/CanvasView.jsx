import React, { useRef, useEffect, useState, useCallback } from 'react'
import Icons from '../utils/icons'
import { store, useStore, actions } from '../stores/appStore'

// Canvas-safe color constants (CSS vars don't work in canvas context)
const COLORS = {
  windowFill: 'rgba(59, 130, 246, 0.12)',
  windowBorder: '#3b82f6',
  doorFill: 'rgba(168, 85, 247, 0.12)',
  doorBorder: '#a855f7',
  selectedFill: 'rgba(245, 158, 11, 0.18)',
  selectedBorder: '#f59e0b',
  drawPreview: '#34d399',
  drawPreviewFill: 'rgba(52, 211, 153, 0.1)',
  handleFill: '#ffffff',
  handleBorder: '#f59e0b',
  lowConfidence: 'rgba(251, 191, 36, 0.85)',
}

export default function CanvasView() {
  const containerRef = useRef(null)
  const imageCanvasRef = useRef(null)
  const annotationCanvasRef = useRef(null)
  const interactionCanvasRef = useRef(null)
  const imgRef = useRef(null)

  const sourceImage = useStore(s => s.sourceImage)
  const annotations = useStore(s => s.annotations)
  const selectedIds = useStore(s => s.selectedIds)
  const activeTool = useStore(s => s.activeTool)
  const step = useStore(s => s.step)
  const balconyConfig = useStore(s => s.balconyConfig)

  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [drawing, setDrawing] = useState(null) // { startX, startY, endX, endY } in image coords
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState(null)
  const [resizing, setResizing] = useState(null) // { id, handle, startX, startY, origBbox }
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 })

  // Load image
  useEffect(() => {
    if (!sourceImage) return
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      fitImage()
    }
    img.src = sourceImage.dataUrl
  }, [sourceImage?.dataUrl])

  // Resize observer
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setContainerSize({ w: width, h: height })
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Refit on container resize
  useEffect(() => {
    if (containerSize.w > 0 && imgRef.current) fitImage()
  }, [containerSize.w, containerSize.h])

  const fitImage = useCallback(() => {
    if (!imgRef.current || !containerRef.current) return
    const cw = containerRef.current.clientWidth
    const ch = containerRef.current.clientHeight
    const iw = imgRef.current.width
    const ih = imgRef.current.height
    const s = Math.min((cw - 40) / iw, (ch - 40) / ih, 1)
    setScale(s)
    setOffset({
      x: (cw - iw * s) / 2,
      y: (ch - ih * s) / 2,
    })
  }, [])

  // Draw image layer
  useEffect(() => {
    const canvas = imageCanvasRef.current
    if (!canvas || !imgRef.current || !containerSize.w) return
    canvas.width = containerSize.w
    canvas.height = containerSize.h
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Checkerboard bg
    ctx.save()
    ctx.translate(offset.x, offset.y)
    ctx.scale(scale, scale)
    const iw = imgRef.current.width
    const ih = imgRef.current.height

    // Subtle shadow under image
    ctx.shadowColor = 'rgba(0,0,0,0.5)'
    ctx.shadowBlur = 20
    ctx.shadowOffsetY = 4
    ctx.fillStyle = '#1a1a20'
    ctx.fillRect(0, 0, iw, ih)
    ctx.shadowColor = 'transparent'

    ctx.drawImage(imgRef.current, 0, 0)
    ctx.restore()
  }, [sourceImage, scale, offset, containerSize])

  // Draw annotation layer
  useEffect(() => {
    const canvas = annotationCanvasRef.current
    if (!canvas || !containerSize.w) return
    canvas.width = containerSize.w
    canvas.height = containerSize.h
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    ctx.save()
    ctx.translate(offset.x, offset.y)
    ctx.scale(scale, scale)

    for (const ann of annotations) {
      const isSelected = selectedIds.has(ann.id)
      const isDoor = ann.type === 'door'

      // Fill
      ctx.fillStyle = isSelected ? COLORS.selectedFill : isDoor ? COLORS.doorFill : COLORS.windowFill
      ctx.fillRect(ann.x, ann.y, ann.w, ann.h)

      // Border
      ctx.strokeStyle = isSelected ? COLORS.selectedBorder : isDoor ? COLORS.doorBorder : COLORS.windowBorder
      ctx.lineWidth = isSelected ? 2 / scale : 1.5 / scale
      ctx.setLineDash(isSelected ? [] : [4 / scale, 3 / scale])
      ctx.strokeRect(ann.x, ann.y, ann.w, ann.h)
      ctx.setLineDash([])

      // Label pill above bbox
      const labelSize = Math.max(10, 11 / scale)
      const padding = 3 / scale
      const labelText = `${ann.type === 'door' ? 'D' : 'W'}${ann.id} · F${ann.floor}`
      ctx.font = `500 ${labelSize}px Inter, sans-serif`
      const tw = ctx.measureText(labelText).width
      const labelColor = isSelected ? COLORS.selectedBorder : isDoor ? COLORS.doorBorder : COLORS.windowBorder
      ctx.fillStyle = labelColor
      const rx = ann.x
      const ry = ann.y - labelSize - padding * 2 - 2 / scale
      ctx.beginPath()
      if (ctx.roundRect) {
        ctx.roundRect(rx, ry, tw + padding * 2, labelSize + padding * 2, 3 / scale)
      } else {
        ctx.rect(rx, ry, tw + padding * 2, labelSize + padding * 2)
      }
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.fillText(labelText, rx + padding, ry + labelSize + padding - 1 / scale)

      // Resize handles (only for selected + reshape tool)
      if (isSelected && activeTool === 'reshape') {
        const hs = 6 / scale
        const handles = getHandles(ann, hs)
        for (const h of handles) {
          ctx.fillStyle = COLORS.handleFill
          ctx.strokeStyle = COLORS.handleBorder
          ctx.lineWidth = 1.5 / scale
          ctx.fillRect(h.x - hs / 2, h.y - hs / 2, hs, hs)
          ctx.strokeRect(h.x - hs / 2, h.y - hs / 2, hs, hs)
        }
      }

      // Low-confidence indicator dot
      if (ann.confidence < 0.7) {
        ctx.fillStyle = COLORS.lowConfidence
        ctx.beginPath()
        ctx.arc(ann.x + ann.w - 4 / scale, ann.y + 4 / scale, 3 / scale, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Balcony preview overlay (configure and render steps)
    if ((step === 'configure' || step === 'render') && selectedIds.size > 0) {
      const depth = balconyConfig?.depth || 1.2
      // scale_factor: 1m depth ≈ 40px at typical resolution
      const scaleFactor = 40
      const balconyHeight = Math.round(depth * scaleFactor)

      for (const ann of annotations) {
        if (!selectedIds.has(ann.id)) continue

        // Balcony floor rectangle — slightly wider, below the window
        const extraSide = Math.round(ann.w * 0.1)
        const bx = ann.x - extraSide
        const by = ann.y + ann.h
        const bw = ann.w + extraSide * 2
        const bh = balconyHeight

        // Semi-transparent grey fill
        ctx.fillStyle = 'rgba(180, 180, 200, 0.35)'
        ctx.fillRect(bx, by, bw, bh)

        // Darker border
        ctx.strokeStyle = 'rgba(100, 100, 130, 0.7)'
        ctx.lineWidth = 1.5 / scale
        ctx.setLineDash([])
        ctx.strokeRect(bx, by, bw, bh)

        // Dashed railing line at top of balcony floor
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.8)'
        ctx.lineWidth = 1.5 / scale
        ctx.setLineDash([6 / scale, 3 / scale])
        ctx.beginPath()
        ctx.moveTo(bx, by)
        ctx.lineTo(bx + bw, by)
        ctx.stroke()
        ctx.setLineDash([])

        // Depth label
        const labelSize = Math.max(9, 10 / scale)
        ctx.font = `500 ${labelSize}px Inter, sans-serif`
        ctx.fillStyle = 'rgba(245, 158, 11, 0.9)'
        ctx.fillText(`${depth.toFixed(1)}m`, bx + 4 / scale, by + bh / 2 + labelSize / 2)
      }
    }

    // Drawing preview (snapped to 10px grid)
    if (drawing) {
      const snap = 10
      const x = Math.round(Math.min(drawing.startX, drawing.endX) / snap) * snap
      const y = Math.round(Math.min(drawing.startY, drawing.endY) / snap) * snap
      const w = Math.round(Math.abs(drawing.endX - drawing.startX) / snap) * snap
      const h = Math.round(Math.abs(drawing.endY - drawing.startY) / snap) * snap
      ctx.strokeStyle = COLORS.drawPreview
      ctx.lineWidth = 2 / scale
      ctx.setLineDash([6 / scale, 4 / scale])
      ctx.strokeRect(x, y, w, h)
      ctx.fillStyle = COLORS.drawPreviewFill
      ctx.fillRect(x, y, w, h)
      ctx.setLineDash([])
      const dimText = `${w} x ${h}px`
      ctx.font = `500 ${Math.max(9, 10 / scale)}px "JetBrains Mono", monospace`
      ctx.fillStyle = COLORS.drawPreview
      ctx.fillText(dimText, x, y - 4 / scale)
    }

    ctx.restore()
  }, [annotations, selectedIds, activeTool, scale, offset, containerSize, drawing, step, balconyConfig])

  // Convert screen coords to image coords
  const screenToImage = useCallback((sx, sy) => {
    return {
      x: (sx - offset.x) / scale,
      y: (sy - offset.y) / scale,
    }
  }, [scale, offset])

  // Hit test annotations
  const hitTest = useCallback((ix, iy) => {
    // Reverse order for z-order (top-most first)
    for (let i = annotations.length - 1; i >= 0; i--) {
      const a = annotations[i]
      if (ix >= a.x && ix <= a.x + a.w && iy >= a.y && iy <= a.y + a.h) {
        return a
      }
    }
    return null
  }, [annotations])

  // Handle resize handle hit
  const hitTestHandle = useCallback((ix, iy) => {
    const hs = 8 / scale
    for (const ann of annotations) {
      if (!selectedIds.has(ann.id)) continue
      const handles = getHandles(ann, hs)
      for (const h of handles) {
        if (Math.abs(ix - h.x) < hs && Math.abs(iy - h.y) < hs) {
          return { id: ann.id, handle: h.pos, ann }
        }
      }
    }
    return null
  }, [annotations, selectedIds, scale])

  // Mouse handlers
  const handleMouseDown = useCallback((e) => {
    const rect = interactionCanvasRef.current.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const { x: ix, y: iy } = screenToImage(sx, sy)

    // Middle click or space held = pan
    if (e.button === 1) {
      setIsPanning(true)
      setPanStart({ x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y })
      return
    }

    if (activeTool === 'select') {
      const hit = hitTest(ix, iy)
      if (hit) {
        if (e.shiftKey) {
          actions.toggleSelection(hit.id)
        } else {
          if (!selectedIds.has(hit.id)) {
            actions.clearSelection()
            actions.toggleSelection(hit.id)
          }
        }
      } else {
        actions.clearSelection()
      }
    } else if (activeTool === 'draw') {
      setDrawing({ startX: ix, startY: iy, endX: ix, endY: iy })
    } else if (activeTool === 'reshape') {
      const handle = hitTestHandle(ix, iy)
      if (handle) {
        const ann = annotations.find(a => a.id === handle.id)
        setResizing({
          id: handle.id,
          handle: handle.handle,
          startX: ix,
          startY: iy,
          origBbox: { x: ann.x, y: ann.y, w: ann.w, h: ann.h },
        })
        actions.pushUndo()
      } else {
        const hit = hitTest(ix, iy)
        if (hit) {
          actions.clearSelection()
          actions.toggleSelection(hit.id)
        }
      }
    } else if (activeTool === 'delete') {
      const hit = hitTest(ix, iy)
      if (hit) {
        actions.removeAnnotation(hit.id)
      }
    }
  }, [activeTool, screenToImage, hitTest, hitTestHandle, selectedIds, offset, annotations])

  const handleMouseMove = useCallback((e) => {
    if (isPanning && panStart) {
      const dx = e.clientX - panStart.x
      const dy = e.clientY - panStart.y
      setOffset({ x: panStart.ox + dx, y: panStart.oy + dy })
      return
    }

    if (drawing) {
      const rect = interactionCanvasRef.current.getBoundingClientRect()
      const { x, y } = screenToImage(e.clientX - rect.left, e.clientY - rect.top)
      setDrawing(d => ({ ...d, endX: x, endY: y }))
    }

    if (resizing) {
      const rect = interactionCanvasRef.current.getBoundingClientRect()
      const { x: ix, y: iy } = screenToImage(e.clientX - rect.left, e.clientY - rect.top)
      const dx = ix - resizing.startX
      const dy = iy - resizing.startY
      const o = resizing.origBbox
      let nx = o.x, ny = o.y, nw = o.w, nh = o.h

      if (resizing.handle.includes('w')) { nx = o.x + dx; nw = o.w - dx }
      if (resizing.handle.includes('e')) { nw = o.w + dx }
      if (resizing.handle.includes('n')) { ny = o.y + dy; nh = o.h - dy }
      if (resizing.handle.includes('s')) { nh = o.h + dy }

      if (nw > 10 && nh > 10) {
        actions.updateAnnotation(resizing.id, { x: Math.round(nx), y: Math.round(ny), w: Math.round(nw), h: Math.round(nh) })
      }
    }
  }, [isPanning, panStart, drawing, resizing, screenToImage])

  const handleMouseUp = useCallback((e) => {
    if (isPanning) {
      setIsPanning(false)
      setPanStart(null)
      return
    }

    if (drawing) {
      const snap = 10
      const x = Math.round(Math.min(drawing.startX, drawing.endX) / snap) * snap
      const y = Math.round(Math.min(drawing.startY, drawing.endY) / snap) * snap
      const w = Math.round(Math.abs(drawing.endX - drawing.startX) / snap) * snap
      const h = Math.round(Math.abs(drawing.endY - drawing.startY) / snap) * snap

      if (w > 10 && h > 10) {
        actions.addAnnotation({
          x,
          y,
          w,
          h,
          type: 'window',
          floor: 1,
          shape: 'rectangle',
          confidence: 1.0,
          occluded: false,
        })
      }
      setDrawing(null)
    }

    if (resizing) {
      setResizing(null)
    }
  }, [drawing, resizing, isPanning])

  // Wheel zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const rect = containerRef.current.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    setScale(s => {
      const ns = Math.max(0.1, Math.min(5, s * delta))
      const ratio = ns / s
      setOffset(o => ({
        x: mx - (mx - o.x) * ratio,
        y: my - (my - o.y) * ratio,
      }))
      return ns
    })
  }, [])

  const cursorMap = {
    select: 'default',
    draw: 'crosshair',
    reshape: 'default',
    delete: 'pointer',
  }

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        cursor: isPanning ? 'grabbing' : cursorMap[activeTool] || 'default',
      }}
    >
      <canvas ref={imageCanvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
      <canvas ref={annotationCanvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
      <canvas
        ref={interactionCanvasRef}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />

      {/* Zoom controls */}
      <div style={{
        position: 'absolute',
        bottom: 12,
        right: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        background: 'var(--surface-2)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
        padding: 2,
      }}>
        <button onClick={() => fitImage()} style={{ padding: '4px 6px', borderRadius: 'var(--radius-sm)', color: 'var(--text-tertiary)' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <Icons.Maximize size={13} />
        </button>
        <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', padding: '0 4px', minWidth: 36, textAlign: 'center' }}>
          {Math.round(scale * 100)}%
        </span>
        <button onClick={() => setScale(s => Math.min(5, s * 1.25))} style={{ padding: '4px 6px', borderRadius: 'var(--radius-sm)', color: 'var(--text-tertiary)' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <Icons.ZoomIn size={13} />
        </button>
      </div>
    </div>
  )
}

function getHandles(ann, hs) {
  return [
    { pos: 'nw', x: ann.x, y: ann.y },
    { pos: 'ne', x: ann.x + ann.w, y: ann.y },
    { pos: 'sw', x: ann.x, y: ann.y + ann.h },
    { pos: 'se', x: ann.x + ann.w, y: ann.y + ann.h },
    { pos: 'n', x: ann.x + ann.w / 2, y: ann.y },
    { pos: 's', x: ann.x + ann.w / 2, y: ann.y + ann.h },
    { pos: 'w', x: ann.x, y: ann.y + ann.h / 2 },
    { pos: 'e', x: ann.x + ann.w, y: ann.y + ann.h / 2 },
  ]
}


