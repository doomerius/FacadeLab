// fal.ai service — Flux image generation + inpainting
// API pattern: POST https://fal.run/{model_id} with Authorization: Key {apiKey}
//
// Future: fal-ai/flux-pro/kontext for multi-reference conditioning (Module 5)

const FAL_BASE = 'https://fal.run'

async function falPost(apiKey, modelId, body) {
  const response = await fetch(`${FAL_BASE}/${modelId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Key ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || err.message || `fal.ai error: ${response.status}`)
  }

  return response.json()
}

function toDataUri(imageBase64) {
  // Accept either a full data URI or raw base64 — normalise to data URI
  if (imageBase64.startsWith('data:')) return imageBase64
  return `data:image/jpeg;base64,${imageBase64}`
}

// Tier 2: text-to-image with img2img strength
// endpoint: fal-ai/flux-pro
export async function generateImage(apiKey, prompt, negativePrompt, imageBase64, strength = 0.45, numImages = 1) {
  const data = await falPost(apiKey, 'fal-ai/flux-pro', {
    prompt,
    negative_prompt: negativePrompt || undefined,
    image_url: toDataUri(imageBase64),
    strength,
    num_images: numImages,
  })

  // fal.ai returns { images: [{ url }] } or { image: { url } }
  if (data.images) return data.images.map(img => img.url)
  if (data.image?.url) return [data.image.url]
  return []
}

// Tier 3: inpainting with mask
// endpoint: fal-ai/flux-pro/v1/fill (FLUX.1 Fill — built for inpainting)
export async function inpaintImage(apiKey, prompt, negativePrompt, imageBase64, maskBase64, numImages = 1) {
  const data = await falPost(apiKey, 'fal-ai/flux-pro/v1/fill', {
    prompt,
    negative_prompt: negativePrompt || undefined,
    image_url: toDataUri(imageBase64),
    mask_url: toDataUri(maskBase64),
    num_images: numImages,
  })

  if (data.images) return data.images.map(img => img.url)
  if (data.image?.url) return [data.image.url]
  return []
}

// Upscale
// endpoint: fal-ai/real-esrgan
export async function upscaleImage(apiKey, imageBase64) {
  const data = await falPost(apiKey, 'fal-ai/real-esrgan', {
    image_url: toDataUri(imageBase64),
  })

  return data.image?.url || data.images?.[0]?.url || null
}

export async function validateKey(apiKey) {
  try {
    // A minimal request — will fail with 422 (bad params) but not 401/403 if key is valid
    const response = await fetch(`${FAL_BASE}/fal-ai/flux-pro`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${apiKey}`,
      },
      body: JSON.stringify({ prompt: 'test' }),
    })
    return response.status !== 401 && response.status !== 403
  } catch {
    return false
  }
}
