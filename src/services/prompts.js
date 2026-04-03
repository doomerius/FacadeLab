// Specialized prompts for different FacadeLab operation modes
// These are the actual prompts sent to Claude for analysis and to the image models for generation

export const DETECTION_PROMPT = `You are analyzing a building facade photograph for architectural renovation planning.

Your task: identify every window and door opening visible on the facade.

Return ONLY a valid JSON array. No explanation, no markdown formatting, no preamble.

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

Rules:
- Include every opening you can identify, including partially visible ones at edges
- x,y is the top-left corner of the tightest bounding rectangle around the opening
- For arched windows, use the bounding rectangle of the full arch including the curved portion
- If you see a window that has been filled in or bricked up, do not include it
- Estimate floor number from the vertical position and the typical floor height visible
- Include any skylights or roof lights with floor set to the roof level
- Set occluded=true if any significant portion of the window is hidden`

export const BUILDING_ANALYSIS_PROMPT = `You are an expert architectural analyst. Analyze this building facade photograph and provide a concise description for use in an AI image generation prompt.

Return a single paragraph (2-4 sentences) describing:
1. Architectural style and approximate era (e.g. "early 20th century Nordic functionalism", "1970s Danish social housing", "19th century classical revival")
2. Primary facade materials (brick type/color, render, stone, timber, etc.)
3. Number of visible floors and approximate building width
4. Location context if determinable (urban/suburban, climate hints, neighboring buildings)
5. Notable existing features (cornices, pilasters, balconies already present, window style)

Be precise and technical. This description will be injected into an image generation prompt, so architectural accuracy matters more than literary quality.
Do not include any preamble or explanation — just the description paragraph.`

export const RAILING_DESCRIPTIONS = {
  clear_glass: 'frameless tempered glass balustrade with minimal stainless steel top rail and point fixings',
  frosted_glass: 'acid-etched laminated glass panels, partially opaque, aluminum extrusion frame',
  steel_bar: 'vertical steel tube balusters, powder-coated, horizontal top and bottom rails',
  steel_mesh: 'expanded metal mesh infill panel, galvanized finish, welded to structural frame',
  wood_slats: 'horizontal hardwood decking slats on balcony floor, matching vertical timber balusters',
  perforated_steel: 'perforated corten steel or powder-coated steel panel, semi-transparent',
  wire_cable: 'stainless steel horizontal wire cables, marine-grade, 10mm diameter',
  concrete_parapet: 'in-situ cast concrete upstand parapet, smooth shuttered finish, 900mm height',
}

export const MATERIAL_DESCRIPTIONS = {
  white_concrete: 'white pigmented in-situ concrete',
  grey_concrete: 'fair-faced grey concrete',
  steel_galvanized: 'hot-rolled steel, galvanized finish',
  timber_oak: 'structural oak glulam',
  corten: 'corten weathering steel',
  aluminum: 'extruded aluminum system',
}

export const FLOOR_DESCRIPTIONS = {
  composite_decking: 'composite wood-effect decking boards',
  timber_decking: 'natural hardwood decking',
  porcelain_tile: 'large format outdoor porcelain tiles',
  brushed_concrete: 'brushed in-situ concrete',
  steel_grating: 'galvanized steel open-bar grating',
}

// Mode-specific render prompts
export const RENDER_MODES = {
  add_balconies: {
    label: 'Add Balconies',
    description: 'Add new balconies to selected windows',
    positivePrefix: 'photorealistic architectural photograph, 8k, sharp focus, professional real estate photography, natural lighting,',
    modificationTemplate: (config, count, floors) =>
      `${count} new ${config.depth}m deep cantilevered balconies added to windows on floor${floors.length > 1 ? 's' : ''} ${floors.join(', ')}, ${RAILING_DESCRIPTIONS[config.railingType] || config.railingType}, ${MATERIAL_DESCRIPTIONS[config.material] || config.material} structure, ${FLOOR_DESCRIPTIONS[config.floorFinish] || config.floorFinish} floor finish,`,
    negativePrompt: 'cartoon, render, CGI look, 3D render, illustration, distorted windows, melting facade, extra floors, missing floors, unrealistic proportions, oversaturated, HDR, anime, painting, watermark, text, floating balconies disconnected from wall, balconies blocking unselected windows',
    inpaintingGuidance: 'Regenerate only the masked window regions, adding balcony structures that connect solidly to the building facade wall. Maintain the existing facade texture, brick pattern, and architectural character exactly outside the masked areas.',
  },
  replace_balconies: {
    label: 'Replace Balconies',
    description: 'Replace existing balconies with new design',
    positivePrefix: 'photorealistic architectural photograph, 8k, sharp focus, professional real estate photography, natural lighting,',
    modificationTemplate: (config, count, floors) =>
      `existing balconies on floor${floors.length > 1 ? 's' : ''} ${floors.join(', ')} replaced with new ${config.depth}m deep ${RAILING_DESCRIPTIONS[config.railingType] || config.railingType} balconies, ${MATERIAL_DESCRIPTIONS[config.material] || config.material} structure, ${FLOOR_DESCRIPTIONS[config.floorFinish] || config.floorFinish} floor,`,
    negativePrompt: 'cartoon, render, CGI look, 3D render, old balconies, previous balconies, original balconies, distorted facade, missing floors, unrealistic proportions, floating elements, disconnected structure',
    inpaintingGuidance: 'Replace the existing balcony structures in the masked regions with the new balcony design. The new balconies should appear freshly installed, maintaining the same structural attachment points as the originals. Match the lighting and shadow direction of the original photograph exactly.',
  },
  remove_balconies: {
    label: 'Remove Balconies',
    description: 'Remove balconies and restore facade',
    positivePrefix: 'photorealistic architectural photograph, 8k, sharp focus, professional real estate photography, natural lighting,',
    modificationTemplate: (config, count, floors) =>
      `balconies removed from floor${floors.length > 1 ? 's' : ''} ${floors.join(', ')}, original facade wall restored, windows exposed, clean facade surface,`,
    negativePrompt: 'balconies, railings, protruding elements, cartoon, render, CGI look, distorted facade, patched appearance, visible removal marks, inconsistent masonry',
    inpaintingGuidance: 'Remove the balcony structures completely from the masked regions. Restore the original facade wall surface as if the balconies were never there — match the brick coursing, render texture, or cladding of the surrounding unmasked facade exactly.',
  },
  enlarge_windows: {
    label: 'Enlarge Windows',
    description: 'Expand selected windows larger',
    positivePrefix: 'photorealistic architectural photograph, 8k, sharp focus, professional real estate photography, natural lighting,',
    modificationTemplate: (config, count, floors) =>
      `windows on floor${floors.length > 1 ? 's' : ''} ${floors.join(', ')} enlarged, wider and taller openings, ${config.windowStyle || 'matching original frame style'}, preserved surrounding masonry coursing,`,
    negativePrompt: 'cartoon, render, CGI look, broken masonry, cracked wall, unrealistic opening size, distorted proportions, floating frames, cartoon windows',
    inpaintingGuidance: 'Enlarge the window openings in the masked regions. The expanded openings should have clean reveals and properly terminated masonry or render at the new edges. The window frames should match the existing style. Do not alter the facade outside the masked region.',
  },
  add_cladding: {
    label: 'Reclad Facade',
    description: 'Change the facade material/finish',
    positivePrefix: 'photorealistic architectural photograph, 8k, sharp focus, professional real estate photography, natural lighting,',
    modificationTemplate: (config, count, floors) =>
      `facade reclad with ${config.claddingMaterial || 'white render'}, windows and doors preserved in original positions, new surface finish applied over entire facade,`,
    negativePrompt: 'cartoon, render, CGI look, floating cladding, visible original material showing through, mismatched panels, distorted windows, unrealistic texture',
    inpaintingGuidance: 'Apply the new cladding material to the entire masked facade area while preserving all window and door openings exactly. The new material should appear to be professionally installed, with proper reveals around openings and clean terminations at edges.',
  },
}
