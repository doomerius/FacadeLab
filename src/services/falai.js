// fal.ai service — Flux image generation + inpainting

export async function generateImage(apiKey, prompt, negativePrompt, imageDataUrl, strength = 0.45, numImages = 1) {
  const base64 = imageDataUrl.split(',')[1]

  const response = await fetch('https://queue.fal.run/fal-ai/flux-pro/v1.1', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Key ${apiKey}`,
    },
    body: JSON.stringify({
      prompt: prompt,
      image_url: `data:image/jpeg;base64,${base64}`,
      strength: strength,
      num_images: numImages,
      image_size: 'landscape_16_9',
      num_inference_steps: 28,
      guidance_scale: 3.5,
      enable_safety_checker: false,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || `fal.ai error: ${response.status}`)
  }

  const data = await response.json()
  return data.images?.map(img => img.url) || []
}

export async function inpaintImage(apiKey, prompt, negativePrompt, imageDataUrl, maskDataUrl, strength = 0.85, numImages = 1) {
  const response = await fetch('https://queue.fal.run/fal-ai/flux-pro/v1/fill', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Key ${apiKey}`,
    },
    body: JSON.stringify({
      prompt: prompt,
      image_url: imageDataUrl,
      mask_url: maskDataUrl,
      num_images: numImages,
      image_size: 'landscape_16_9',
      num_inference_steps: 28,
      guidance_scale: 3.5,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || `fal.ai error: ${response.status}`)
  }

  const data = await response.json()
  return data.images?.map(img => img.url) || []
}

export async function upscaleImage(apiKey, imageUrl, scale = 2) {
  const response = await fetch('https://queue.fal.run/fal-ai/real-esrgan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Key ${apiKey}`,
    },
    body: JSON.stringify({
      image_url: imageUrl,
      scale: scale,
    }),
  })

  if (!response.ok) throw new Error(`Upscale error: ${response.status}`)
  const data = await response.json()
  return data.image?.url
}

export async function validateKey(apiKey) {
  try {
    const response = await fetch('https://queue.fal.run/fal-ai/flux-pro/v1.1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${apiKey}`,
      },
      body: JSON.stringify({
        prompt: 'test',
        image_size: { width: 64, height: 64 },
        num_inference_steps: 1,
      }),
    })
    // Even an error response means the key format was accepted
    return response.status !== 401 && response.status !== 403
  } catch {
    return false
  }
}
