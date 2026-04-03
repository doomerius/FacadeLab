# FacadeLab Build Sprint — Current Status & Priorities

## Completed (in repo)
- ✅ React + Vite scaffold with app store
- ✅ Key management (Anthropic, fal.ai, etc)
- ✅ Image upload + paste handler
- ✅ Canvas infrastructure (3-layer canvas system)
- ✅ Annotation model (windows array, selection state)
- ✅ Tool system (draw, reshape, delete, select)
- ✅ Configuration panel UI skeleton
- ✅ Export modal UI
- ✅ Settings modal UI
- ✅ Anthropic service integration
- ✅ fal.ai service integration

## Critical Gaps to Close (MVP = ship items 1-6)

### 1. Window Detection Hardening
- [ ] Claude Vision detection: parse response, validate JSON, handle errors
- [ ] Canvas drawing: render bounding boxes with labels (id, floor, type)
- [ ] Selection state: highlight selected windows in amber
- [ ] Grouping: detect window runs (same w/h, even spacing) and suggest groups
- [ ] SAM2 integration: optional pixel-level masks via fal.ai

### 2. Manual Annotation Refinement
- [ ] Draw tool: drag to create rectangles, snapping grid, resize handles
- [ ] Reshape tool: 8-handle resize on selected annotation
- [ ] Delete tool: single-click removal with undo support
- [ ] Undo stack: store and restore 20 past states
- [ ] Context menu: right-click to edit individual window properties

### 3. Configuration Panel Completion
- [ ] Depth slider (0.6–2.4m, 0.1m steps)
- [ ] Railing type dropdown (8 presets)
- [ ] Material dropdown (5 options for structure)
- [ ] Floor finish dropdown (5 options)
- [ ] Plants toggle + density slider
- [ ] Lighting toggle (dawn/day/dusk/night)
- [ ] Per-window override UI (right-click detail panel)

### 4. Canvas Compositing
- [ ] 2D balcony preview overlay (schematic rects on canvas)
- [ ] Perspective projection: detect vanishing points from window grid
- [ ] Inpainting mask generation: white rects on black canvas with dilation
- [ ] Mask preview: toggle to show mask before render

### 5. Render Pipeline
- [ ] Prompt assembly: concatenate all sections into final prompt string
- [ ] Tier 1 (prompt-only): Claude analyzes annotated image, outputs prompt
- [ ] Tier 2 (text-to-image): fal.ai Flux Pro with img2img
- [ ] Tier 3 (inpainting): fal.ai Flux inpainting with mask
- [ ] Multiple variations: request 1–4 seeds in grid
- [ ] Render result display: image + prompt + copy button

### 6. Project Management Minimal
- [ ] Save to JSON: serialize entire state
- [ ] Load from JSON: restore state
- [ ] Download as file: trigger browser download
- [ ] Upload to restore: file picker to load project

## Nice-to-Have Before Beta
- [ ] Reference model import (Module 5)
- [ ] Batch mode (upload multiple, apply same config)
- [ ] PDF export (side-by-side before/after + spec sheet)
- [ ] Staircase mode (separate annotation workflow)
- [ ] Upscaling (Real-ESRGAN via fal.ai)

## Implementation Plan

**Sprint 1 (detection + canvas):** Complete items 1–2. Ship working detection + annotation UI.
**Sprint 2 (config + compositing):** Complete items 3–4. Ship working configuration panel.
**Sprint 3 (render):** Complete item 5. Ship first end-to-end render.
**Sprint 4 (project mgmt + hardening):** Complete item 6 + bug fixes. Ship MVP.

Each sprint is shippable independently. After Sprint 1, a user can detect windows and annotate them. After Sprint 2, they can configure balcony properties. After Sprint 3, they get a real render. After Sprint 4, they can save their work.

---

## Key Decisions

1. **No external UI library:** Everything is inline styles + CSS custom properties. Keeps bundle tiny, no version conflicts.
2. **Canvas over SVG:** Canvas for performance during pan/zoom and annotation dragging. SVG for final exports.
3. **Client-side first:** Keys in localStorage (encrypted) by default. Proxy optional for team deployments.
4. **Prompt engineering is critical:** The render quality depends 90% on prompt quality, not on the model. Invest heavily in prompt testing.
5. **Reference models as differentiator:** Most tools don't support image conditioning. This is the secret sauce.

---

## Test Data

For development, use:
- Small building: https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1024 (residential facade)
- Large building: https://images.unsplash.com/photo-1464207687429-7505649dae38?w=1024 (apartment block)
- Complex facade: https://images.unsplash.com/photo-1449844908441-8829872d2607?w=1024 (historical building)

All have clear window patterns suitable for detection testing.

