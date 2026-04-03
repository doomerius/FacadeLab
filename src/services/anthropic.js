// Anthropic Claude API service — window detection + prompt generation

const DETECTION_PROMPT = (width, height) => `You are analyzing a building facade photograph for architectural renovation planning.

Your task: identify every window and door opening visible on the facade.

Return ONLY a valid JSON array. No explanation, no markdown formatting, no preamble, no code fences.

Each object in the array:
{
  "id": integer (sequential from 1),
  "x": integer (left edge, pixels from left of image),
  "y": integer (top edge, pixels from top of image),
  "w": integer (width in pixels),
  "h": integer (height in pixels),
  "type": "window" | "door",
  "floor": integer (floor number, 1 = ground level),
  "shape": "rectangle" | "arch" | "circular" | "other",
  "confidence": float (0.0-1.0, your certainty about this detection),
  "occluded": boolean (true if partially blocked by vegetation, another element, etc)
}

Image dimensions: ${width}x${height}px

Rules:
- Include every opening you can identify, including partially visible ones at edges
- x,y is the top-left corner of the tightest bounding rectangle around the opening
- For arched windows, use the bounding rectangle of the full arch including the curved portion
- If you see a window that has been filled in or bricked up, do not include it
- Estimate floor number from the vertical position and the typical floor height visible
- Include any skylights or roof lights with floor set to the roof level
- Set occluded=true if any significant portion of the window is hidden
- Be precise with coordinates — accuracy matters for downstream processing`

export async function detectWindows(apiKey, imageDataUrl, width, height) {
  const base64 = imageDataUrl.split(',')[1]
  const mediaType = imageDataUrl.startsWith('data:image/png') ? 'image/png' : 'image/jpeg'

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          {
            type: 'text',
            text: DETECTION_PROMPT(width, height),
          },
        ],
      }],
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `API error: ${response.status}`)
  }

  const data = await response.json()
  const text = data.content?.[0]?.text || ''

  // Parse JSON from response — handle potential markdown fences
  let jsonStr = text.trim()
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }

  const annotations = JSON.parse(jsonStr)
  if (!Array.isArray(annotations)) throw new Error('Expected JSON array')

  return annotations.map((a, i) => ({
    id: i + 1,
    x: Math.round(a.x),
    y: Math.round(a.y),
    w: Math.round(a.w),
    h: Math.round(a.h),
    type: a.type || 'window',
    floor: a.floor || 1,
    shape: a.shape || 'rectangle',
    confidence: a.confidence || 0.8,
    occluded: a.occluded || false,
    selected: false,
  }))
}

export async function generateRenderPrompt(apiKey, imageDataUrl, annotations, config, address, referenceDescription) {
  const base64 = imageDataUrl.split(',')[1]
  const mediaType = imageDataUrl.startsWith('data:image/png') ? 'image/png' : 'image/jpeg'
  const selectedAnns = annotations.filter(a => a.selected)

  const configText = `
Balcony specifications:
- Depth: ${config.depth}m
- Railing: ${RAILING_DESCRIPTIONS[config.railingType] || config.railingType}
- Structure/Material: ${MATERIAL_DESCRIPTIONS[config.material] || config.material}
- Floor finish: ${FLOOR_DESCRIPTIONS[config.floorFinish] || config.floorFinish}
- Soffit: ${SOFFIT_DESCRIPTIONS[config.ceilingSoffit] || config.ceilingSoffit}
- Plants: ${config.plants ? `Yes, density ${Math.round(config.plantDensity * 100)}%` : 'None'}
- Lighting: ${config.lighting}
${referenceDescription ? `\nReference model description: ${referenceDescription}` : ''}
${address ? `\nBuilding address/context: ${address}` : ''}

Selected windows for balcony addition: ${selectedAnns.length} windows on floors ${[...new Set(selectedAnns.map(a => a.floor))].sort().join(', ')}
`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          {
            type: 'text',
            text: `You are an expert architectural visualization prompt engineer.

Analyze this building facade photo and generate a Flux/SDXL image generation prompt that will produce a photorealistic render of the same building with the following modifications:

${configText}

Return a JSON object with these exact fields:
{
  "building_description": "detailed description of the existing building",
  "positive_prompt": "the full positive prompt for image generation",
  "negative_prompt": "negative prompt terms",
  "strength": float (0.3-0.6, how much to modify the image)
}

The positive prompt should follow this structure:
1. Photorealistic anchor terms
2. Building description from your analysis
3. Specific modification description using the balcony specs
4. Address/climate context
5. Quality terms

Return ONLY the JSON object, no explanation, no markdown fences.`,
          },
        ],
      }],
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `API error: ${response.status}`)
  }

  const data = await response.json()
  const text = data.content?.[0]?.text || ''

  let jsonStr = text.trim()
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }

  return JSON.parse(jsonStr)
}

export async function analyzeReferenceModel(apiKey, imageDataUrl) {
  const base64 = imageDataUrl.split(',')[1]
  const mediaType = imageDataUrl.startsWith('data:image/png') ? 'image/png' : 'image/jpeg'

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          {
            type: 'text',
            text: `Analyze this balcony/architectural element image and provide a detailed material and design description suitable for use in an image generation prompt. Focus on: dimensions, materials, railing type, structural system, finish, color, and any distinctive design features. Return only the description text, no preamble.`,
          },
        ],
      }],
    }),
  })

  if (!response.ok) throw new Error(`API error: ${response.status}`)
  const data = await response.json()
  return data.content?.[0]?.text || ''
}

export async function validateKey(apiKey) {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }],
      }),
    })
    return response.ok || response.status === 400 // 400 = valid key, bad request is fine
  } catch {
    return false
  }
}

// Descriptive mappings
const RAILING_DESCRIPTIONS = {
  'clear-glass': 'frameless tempered glass balustrade with minimal stainless steel top rail and point fixings',
  'frosted-glass': 'acid-etched laminated glass panels, partially opaque, aluminum extrusion frame',
  'steel-bar': 'vertical steel tube balusters, powder-coated, horizontal top and bottom rails',
  'steel-mesh': 'expanded metal mesh infill panel, galvanized finish, welded to structural frame',
  'wood-slats': 'horizontal hardwood decking slats, matching vertical timber balusters',
  'perforated-steel': 'perforated corten steel panel, semi-transparent, powder-coated',
  'wire-cable': 'stainless steel horizontal wire cables, marine-grade',
  'concrete-parapet': 'in-situ cast concrete upstand parapet, smooth shuttered finish, 900mm height',
}

const MATERIAL_DESCRIPTIONS = {
  'white-concrete': 'white precast concrete slab and frame',
  'grey-concrete': 'grey exposed aggregate concrete',
  'steel-galvanized': 'hot-rolled steel frame with galvanized finish',
  'steel-painted': 'structural steel frame, powder-coated black',
  'timber-pine': 'pine glulam timber structure',
  'timber-oak': 'oak glulam timber structure',
  'corten': 'corten weathering steel frame and brackets',
  'aluminum': 'aluminum extrusion system, anodized finish',
}

const FLOOR_DESCRIPTIONS = {
  'composite-decking': 'composite decking boards',
  'timber-decking': 'natural timber decking',
  'porcelain-tile': 'porcelain tile finish',
  'brushed-concrete': 'brushed concrete surface',
  'steel-grating': 'open steel grating',
}

const SOFFIT_DESCRIPTIONS = {
  'smooth-white': 'smooth white painted concrete soffit',
  'exposed-concrete': 'exposed concrete with formwork texture',
  'timber-cladding': 'timber cladding on soffit',
  'steel-plate': 'steel plate soffit',
}

export { RAILING_DESCRIPTIONS, MATERIAL_DESCRIPTIONS, FLOOR_DESCRIPTIONS, SOFFIT_DESCRIPTIONS }

// Sprint 2: buildRenderPrompt — pure local assembly, no API call needed
const RAILING_DESCRIPTIONS_V2 = {
  clear_glass: 'frameless tempered glass balustrade with minimal stainless steel top rail and point fixings',
  frosted_glass: 'acid-etched laminated glass panels, partially opaque, aluminum extrusion frame',
  steel_bar: 'vertical steel tube balusters, powder-coated, horizontal top and bottom rails',
  steel_mesh: 'expanded metal mesh infill panel, galvanized finish, welded to structural frame',
  wood_slats: 'horizontal hardwood decking slats on balcony floor, matching vertical timber balusters',
  perforated_steel: 'perforated corten steel or powder-coated steel panel, semi-transparent',
  wire_cable: 'stainless steel horizontal wire cables, marine-grade, 10mm diameter',
  concrete_parapet: 'in-situ cast concrete upstand parapet, smooth shuttered finish, 900mm height',
}

const MATERIAL_DESCRIPTIONS_V2 = {
  white_concrete: 'white precast concrete slab and frame',
  grey_concrete: 'grey exposed aggregate concrete',
  steel_galvanized: 'hot-rolled steel frame with galvanized finish',
  timber_oak: 'oak glulam timber structure',
  corten: 'corten weathering steel frame and brackets',
  aluminum: 'aluminum extrusion system, anodized finish',
}

const FLOOR_DESCRIPTIONS_V2 = {
  composite_decking: 'composite decking boards',
  timber_decking: 'natural timber decking',
  porcelain_tile: 'porcelain tile finish',
  brushed_concrete: 'brushed concrete surface',
  steel_grating: 'open steel grating',
}

const PLANT_DENSITY_LABELS = ['no plants', 'light plant decoration', 'medium plant density with potted greenery', 'heavy lush planting with trailing vegetation']

const LIGHTING_LABELS = {
  dawn: 'soft warm dawn light, golden hour, low sun angle',
  daytime: 'bright natural daylight, clear sky',
  dusk: 'warm golden dusk light, sunset ambiance',
  night: 'nighttime, artificial lighting, dark sky, illuminated balcony',
}

export function buildRenderPrompt(annotations, config, imageAnalysis, address) {
  const selectedAnns = annotations.filter(a => a.selected || a.selectedForRender)

  // Part 1: anchor
  const anchor = 'photorealistic architectural photograph, 8k, sharp focus, professional real estate photography, natural lighting'

  // Part 2: building description from imageAnalysis
  const buildingDesc = imageAnalysis ? imageAnalysis.trim() : ''

  // Part 3: modification description from config
  const railingDesc = RAILING_DESCRIPTIONS_V2[config.railingType] || config.railingType
  const materialDesc = MATERIAL_DESCRIPTIONS_V2[config.material] || config.material
  const floorDesc = FLOOR_DESCRIPTIONS_V2[config.floorFinish] || config.floorFinish
  const plantsDesc = config.plants
    ? PLANT_DENSITY_LABELS[config.plantDensity] || 'light plant decoration'
    : 'no plants'
  const lightingDesc = (config.lightingEnabled !== false) ? (LIGHTING_LABELS[config.lighting] || config.lighting) : 'natural daylight'

  const modDesc = [
    `adding ${config.depth}m deep balconies to ${selectedAnns.length > 0 ? selectedAnns.length + ' window opening' + (selectedAnns.length > 1 ? 's' : '') : 'selected windows'}`,
    `railing: ${railingDesc}`,
    `structure: ${materialDesc}`,
    `floor finish: ${floorDesc}`,
    plantsDesc,
    lightingDesc,
  ].join(', ')

  // Part 4: reference model
  const refDesc = config.referenceDescription ? config.referenceDescription.trim() : ''

  // Part 5: address context
  const addrDesc = address ? `Location: ${address.trim()}` : ''

  // Part 6: quality tail
  const qualityTail = 'no distortion, no artifacts, architecturally accurate, structurally plausible, photographic quality'

  const parts = [anchor, buildingDesc, modDesc, refDesc, addrDesc, qualityTail].filter(Boolean)
  const positive = parts.join(', ')

  const negative = 'cartoon, render, CGI look, distorted windows, melting facade, extra floors, missing floors, unrealistic proportions, oversaturated, HDR, anime, painting'

  // Inpainting hint
  const floors = selectedAnns.length > 0 ? [...new Set(selectedAnns.map(a => a.floor))].sort().join(', ') : 'all selected'
  const inpaintingHint = `Modify the window opening regions on floors ${floors} to add balconies. Preserve all surrounding facade material and architecture.`

  return { positive, negative, inpaintingHint }
}
