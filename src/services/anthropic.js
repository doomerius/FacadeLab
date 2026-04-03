// Anthropic Claude API service — window detection + prompt generation
import { DETECTION_PROMPT, BUILDING_ANALYSIS_PROMPT, RENDER_MODES, RAILING_DESCRIPTIONS as RD, MATERIAL_DESCRIPTIONS as MD, FLOOR_DESCRIPTIONS as FD } from './prompts'
import { segmentByPoint } from './falai'

export async function detectWindows(apiKey, imageDataUrl, width, height, falApiKey = null, onStageChange = null) {
  const base64 = imageDataUrl.split(',')[1]
  const mediaType = imageDataUrl.startsWith('data:image/png') ? 'image/png' : 'image/jpeg'

  // Stage 1: Claude structural analysis + bounding boxes
  if (onStageChange) onStageChange('claude')

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 8192,
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

  if (!text) throw new Error('No response from Claude — check your API key and try again')

  // Parse new JSON object format: { building: {...}, openings: [...] }
  // Also handle legacy array format for backwards compat
  let parsed
  let buildingMeta = null
  let openingsArray

  const jsonStr = text.trim()
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    // Try extracting JSON object or array from response
    const objStart = jsonStr.indexOf('{')
    const objEnd = jsonStr.lastIndexOf('}')
    const arrStart = jsonStr.indexOf('[')
    const arrEnd = jsonStr.lastIndexOf(']')

    if (objStart !== -1 && objEnd > objStart && (arrStart === -1 || objStart < arrStart)) {
      try {
        parsed = JSON.parse(jsonStr.slice(objStart, objEnd + 1))
      } catch {
        // fall through
      }
    }
    if (!parsed && arrStart !== -1 && arrEnd > arrStart) {
      try {
        parsed = JSON.parse(jsonStr.slice(arrStart, arrEnd + 1))
      } catch {
        // fall through
      }
    }
    if (!parsed) {
      console.error('Claude raw response:', text.slice(0, 500))
      throw new Error('Detection response was not valid JSON. Try again or use a higher-resolution image.')
    }
  }

  if (Array.isArray(parsed)) {
    openingsArray = parsed
  } else if (parsed.openings && Array.isArray(parsed.openings)) {
    buildingMeta = parsed.building || null
    openingsArray = parsed.openings
  } else {
    throw new Error('Unexpected response structure from Claude')
  }

  let annotations = openingsArray.map((a, i) => ({
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
    has_balcony: a.has_balcony || false,
    group_id: a.group_id ?? null,
    window_style: a.window_style || 'unknown',
    selected: false,
  }))

  // Stage 2: SAM2 pixel-perfect masks (if fal key provided)
  if (falApiKey && annotations.length > 0) {
    if (onStageChange) onStageChange('sam2')
    annotations = await refineWithSAM2(falApiKey, imageDataUrl, annotations, width, height)
  }

  // Attach building metadata to first annotation as _buildingMeta (consumed by UI)
  if (buildingMeta && annotations.length > 0) {
    annotations._buildingMeta = buildingMeta
  }

  return annotations
}

async function refineWithSAM2(falApiKey, imageDataUrl, annotations, width, height) {
  const refined = []
  for (const ann of annotations) {
    try {
      const centerX = ann.x + ann.w / 2
      const centerY = ann.y + ann.h / 2
      const maskUrl = await segmentByPoint(falApiKey, imageDataUrl, centerX, centerY, width, height)
      refined.push({ ...ann, maskUrl, hasSAMMask: !!maskUrl })
    } catch {
      refined.push({ ...ann, hasSAMMask: false })
    }
  }
  return refined
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
      model: 'claude-haiku-4-5',
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

export async function analyzeBuilding(apiKey, imageDataUrl) {
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
      model: 'claude-haiku-4-5',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          {
            type: 'text',
            text: BUILDING_ANALYSIS_PROMPT,
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
  return data.content?.[0]?.text || ''
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
      model: 'claude-haiku-4-5',
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
        model: 'claude-haiku-4-5',
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

export function buildRenderPrompt(annotations, config, imageAnalysis, address, mode = 'add_balconies') {
  const selectedAnns = annotations.filter(a => a.selected || a.selectedForRender)
  const modeConfig = RENDER_MODES[mode] || RENDER_MODES.add_balconies

  // Part 1: anchor from mode
  const anchor = modeConfig.positivePrefix.replace(/,$/, '')

  // Part 2: building description from imageAnalysis
  const buildingDesc = imageAnalysis ? imageAnalysis.trim() : ''

  // Part 3: modification description from mode template
  const floors = selectedAnns.length > 0 ? [...new Set(selectedAnns.map(a => a.floor))].sort() : [1]
  const modDesc = modeConfig.modificationTemplate(config, selectedAnns.length || 1, floors).replace(/,$/, '')

  // Plants and lighting (for modes that use them)
  const plantsDesc = (mode === 'add_balconies' || mode === 'replace_balconies') && config.plants
    ? (PLANT_DENSITY_LABELS[config.plantDensity] || 'light plant decoration')
    : null
  const lightingDesc = (config.lightingEnabled !== false) ? (LIGHTING_LABELS[config.lighting] || config.lighting) : null

  // Part 4: reference model
  const refDesc = config.referenceDescription ? config.referenceDescription.trim() : ''

  // Part 5: address context
  const addrDesc = address ? `Location: ${address.trim()}` : ''

  // Part 6: quality tail
  const qualityTail = 'no distortion, no artifacts, architecturally accurate, structurally plausible, photographic quality'

  const parts = [anchor, buildingDesc, modDesc, plantsDesc, lightingDesc, refDesc, addrDesc, qualityTail].filter(Boolean)
  const positive = parts.join(', ')

  const negative = modeConfig.negativePrompt
  const inpaintingHint = modeConfig.inpaintingGuidance

  return { positive, negative, inpaintingHint }
}
