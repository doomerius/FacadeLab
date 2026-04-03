// Image processing utilities

const MAX_DIMENSION = 2048

export function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const { canvas, width, height } = downsampleImage(img)
        resolve({
          dataUrl: canvas.toDataURL('image/jpeg', 0.92),
          width,
          height,
          name: file.name,
          originalWidth: img.width,
          originalHeight: img.height,
        })
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = e.target.result
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

export function loadImageFromDataUrl(dataUrl, name = 'pasted-image') {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const { canvas, width, height } = downsampleImage(img)
      resolve({
        dataUrl: canvas.toDataURL('image/jpeg', 0.92),
        width,
        height,
        name,
        originalWidth: img.width,
        originalHeight: img.height,
      })
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = dataUrl
  })
}

function downsampleImage(img) {
  let width = img.width
  let height = img.height

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height)
    width = Math.round(width * ratio)
    height = Math.round(height * ratio)
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, width, height)

  return { canvas, width, height }
}

function loadImageEl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

function drawDilatedRect(ctx, ann, dilation, imageWidth, imageHeight) {
  ctx.fillStyle = 'white'
  // Dilate: left/right by dilation, up by 50% dilation, down by 2x dilation
  // (balcony extends below window, so we need more room downward)
  const x = Math.max(0, ann.x - dilation)
  const y = Math.max(0, ann.y - Math.round(dilation * 0.5))
  const w = Math.min(imageWidth - x, ann.w + dilation * 2)
  const h = Math.min(imageHeight - y, ann.h + Math.round(dilation * 0.5) + dilation * 2)
  ctx.fillRect(x, y, w, h)
}

export async function generateInpaintingMask(annotations, selectedIds, imageWidth, imageHeight, config) {
  const canvas = document.createElement('canvas')
  canvas.width = imageWidth
  canvas.height = imageHeight
  const ctx = canvas.getContext('2d')

  // Support legacy call with plain dilationPx number
  let depth = 1.2
  if (config && typeof config === 'object') {
    depth = config.depth || 1.2
  } else if (typeof config === 'number') {
    depth = config / 40
  }

  const dilationPx = Math.round(depth * 40)

  // Black background
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, imageWidth, imageHeight)

  const selected = annotations.filter(a => selectedIds.has(a.id))

  for (const ann of selected) {
    if (ann.maskB64) {
      // Local base64 mask from self-hosted cv-service (GroundingDINO + SAM2)
      try {
        const img = await loadImageEl(`data:image/png;base64,${ann.maskB64}`)
        ctx.globalCompositeOperation = 'screen'
        ctx.drawImage(img, 0, 0, imageWidth, imageHeight)
        ctx.globalCompositeOperation = 'source-over'
      } catch {
        drawDilatedRect(ctx, ann, dilationPx, imageWidth, imageHeight)
      }
    } else if (ann.maskUrl && ann.hasSAMMask) {
      // Remote URL mask from fal.ai SAM2
      try {
        const img = await loadImageEl(ann.maskUrl)
        ctx.globalCompositeOperation = 'screen'
        ctx.drawImage(img, 0, 0, imageWidth, imageHeight)
        ctx.globalCompositeOperation = 'source-over'
      } catch {
        drawDilatedRect(ctx, ann, dilationPx, imageWidth, imageHeight)
      }
    } else {
      drawDilatedRect(ctx, ann, dilationPx, imageWidth, imageHeight)
    }
  }

  return canvas.toDataURL('image/png')
}

export function createCanvasFromDataUrl(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      resolve(canvas)
    }
    img.src = dataUrl
  })
}
