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
  const x = Math.max(0, ann.x - dilation)
  const y = Math.max(0, ann.y - dilation)
  const w = Math.min(imageWidth - x, ann.w + dilation * 2)
  const h = Math.min(imageHeight - y, ann.h + dilation * 2 + Math.round(ann.h * 0.5))
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
    if (ann.maskUrl && ann.hasSAMMask) {
      // Fetch and composite the SAM2 mask (white pixels = masked region)
      try {
        const img = await loadImageEl(ann.maskUrl)
        ctx.globalCompositeOperation = 'screen'
        ctx.drawImage(img, 0, 0, imageWidth, imageHeight)
        ctx.globalCompositeOperation = 'source-over'
      } catch {
        // Fall back to rectangle
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
