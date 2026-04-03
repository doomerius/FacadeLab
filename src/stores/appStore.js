import { useState, useCallback, useRef } from 'react'

// Simple global state with React hooks — no external deps needed
const createStore = () => {
  let state = {
    // Pipeline step: 'setup' | 'source' | 'detect' | 'configure' | 'render'
    step: 'source',

    // Operation mode
    operationMode: 'add_balconies', // 'add_balconies' | 'replace_balconies' | 'remove_balconies' | 'enlarge_windows' | 'add_cladding'

    // API Keys
    keys: {
      anthropic: '',
      fal: '',
      replicate: '',
      googleMaps: '',
      kortforsyningen: '',
      openai: '',
    },
    keyStatus: {}, // { anthropic: 'valid' | 'invalid' | 'checking' | null }

    // Image
    sourceImage: null,       // { dataUrl, width, height, name }
    address: '',

    // Annotations (detected windows/doors)
    annotations: [],         // [{ id, x, y, w, h, type, floor, shape, confidence, occluded, selected, groupId }]
    selectedIds: new Set(),
    nextAnnotationId: 1,

    // Undo stack
    undoStack: [],

    // Active tool: 'select' | 'draw' | 'reshape' | 'delete'
    activeTool: 'select',

    // Balcony config (global defaults)
    balconyConfig: {
      depth: 1.2,
      railingType: 'clear_glass',
      material: 'white_concrete',
      floorFinish: 'composite_decking',
      ceilingSoffit: 'smooth_white',
      plants: false,
      plantDensity: 1,
      lighting: 'daytime',
    },

    // Per-annotation overrides: { [annotationId]: { ...partial config } }
    perAnnotationConfig: {},

    // Reference models
    referenceModels: [],  // [{ id, name, dataUrl, active }]

    // Render state
    renderPrompt: '',
    renderResults: [],   // [{ url, prompt, seed, timestamp }]
    selectedResult: null,
    isRendering: false,
    isDetecting: false,

    // Sprint 3 additions
    buildingAnalysis: null,   // Claude building description
    generatedPrompt: null,    // assembled positive/negative prompt
    renderTier: 'tier2b',     // 'prompt' | 'tier2b' | 'tier2' | 'tier3'
    numVariations: 1,         // 1-4

    // UI state
    showSettings: false,
    showExport: false,
    canvasScale: 1,
    canvasOffset: { x: 0, y: 0 },

    // Project
    projectName: 'Untitled Project',
    projectModified: false,
  }

  const listeners = new Set()

  const getState = () => state

  const setState = (updater) => {
    const prev = state
    state = typeof updater === 'function' ? { ...prev, ...updater(prev) } : { ...prev, ...updater }
    state.projectModified = true
    listeners.forEach(fn => fn(state, prev))
  }

  const subscribe = (fn) => {
    listeners.add(fn)
    return () => listeners.delete(fn)
  }

  return { getState, setState, subscribe }
}

export const store = createStore()

// React hook to use the store
export function useStore(selector) {
  const [, forceUpdate] = useState(0)
  const selectorRef = useRef(selector)
  selectorRef.current = selector
  const prevRef = useRef(selector(store.getState()))

  useState(() => {
    return store.subscribe((state) => {
      const next = selectorRef.current(state)
      if (next !== prevRef.current) {
        prevRef.current = next
        forceUpdate(c => c + 1)
      }
    })
  })

  return selector(store.getState())
}

// Convenience hooks
export const useStep = () => useStore(s => s.step)
export const useKeys = () => useStore(s => s.keys)
export const useKeyStatus = () => useStore(s => s.keyStatus)
export const useSourceImage = () => useStore(s => s.sourceImage)
export const useAnnotations = () => useStore(s => s.annotations)
export const useSelectedIds = () => useStore(s => s.selectedIds)
export const useActiveTool = () => useStore(s => s.activeTool)
export const useBalconyConfig = () => useStore(s => s.balconyConfig)
export const useReferenceModels = () => useStore(s => s.referenceModels)
export const useIsDetecting = () => useStore(s => s.isDetecting)
export const useIsRendering = () => useStore(s => s.isRendering)
export const useRenderPrompt = () => useStore(s => s.renderPrompt)
export const useRenderResults = () => useStore(s => s.renderResults)
export const useBuildingAnalysis = () => useStore(s => s.buildingAnalysis)
export const useGeneratedPrompt = () => useStore(s => s.generatedPrompt)
export const useRenderTier = () => useStore(s => s.renderTier)
export const useNumVariations = () => useStore(s => s.numVariations)
export const useSelectedResult = () => useStore(s => s.selectedResult)
export const useOperationMode = () => useStore(s => s.operationMode)

// Actions
export const actions = {
  setStep: (step) => store.setState({ step }),

  setKey: (provider, value) => {
    const s = store.getState()
    store.setState({ keys: { ...s.keys, [provider]: value } })
  },

  setKeyStatus: (provider, status) => {
    const s = store.getState()
    store.setState({ keyStatus: { ...s.keyStatus, [provider]: status } })
  },

  setSourceImage: (img) => store.setState({ sourceImage: img, annotations: [], selectedIds: new Set(), undoStack: [] }),
  setAddress: (addr) => store.setState({ address: addr }),

  setAnnotations: (anns) => store.setState({ annotations: anns }),

  pushUndo: () => {
    const s = store.getState()
    const stack = [...s.undoStack, s.annotations].slice(-20)
    store.setState({ undoStack: stack })
  },

  undo: () => {
    const s = store.getState()
    if (s.undoStack.length === 0) return
    const prev = s.undoStack[s.undoStack.length - 1]
    store.setState({
      annotations: prev,
      undoStack: s.undoStack.slice(0, -1),
    })
  },

  addAnnotation: (ann) => {
    const s = store.getState()
    actions.pushUndo()
    const id = s.nextAnnotationId
    store.setState({
      annotations: [...s.annotations, { ...ann, id, selected: false }],
      nextAnnotationId: id + 1,
    })
    return id
  },

  removeAnnotation: (id) => {
    const s = store.getState()
    actions.pushUndo()
    store.setState({
      annotations: s.annotations.filter(a => a.id !== id),
      selectedIds: new Set([...s.selectedIds].filter(i => i !== id)),
    })
  },

  updateAnnotation: (id, updates) => {
    const s = store.getState()
    store.setState({
      annotations: s.annotations.map(a => a.id === id ? { ...a, ...updates } : a),
    })
  },

  toggleSelection: (id) => {
    const s = store.getState()
    const next = new Set(s.selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    store.setState({ selectedIds: next })
  },

  selectAll: () => {
    const s = store.getState()
    store.setState({ selectedIds: new Set(s.annotations.map(a => a.id)) })
  },

  clearSelection: () => store.setState({ selectedIds: new Set() }),

  setActiveTool: (tool) => store.setState({ activeTool: tool }),

  setBalconyConfig: (updates) => {
    const s = store.getState()
    store.setState({ balconyConfig: { ...s.balconyConfig, ...updates } })
  },

  setPerAnnotationConfig: (id, config) => {
    const s = store.getState()
    store.setState({
      perAnnotationConfig: { ...s.perAnnotationConfig, [id]: { ...(s.perAnnotationConfig[id] || {}), ...config } },
    })
  },

  addReferenceModel: (model) => {
    const s = store.getState()
    const id = Date.now()
    store.setState({
      referenceModels: [...s.referenceModels, { ...model, id, active: s.referenceModels.length === 0 }],
    })
  },

  removeReferenceModel: (id) => {
    const s = store.getState()
    store.setState({
      referenceModels: s.referenceModels.filter(m => m.id !== id),
    })
  },

  setActiveReferenceModel: (id) => {
    const s = store.getState()
    store.setState({
      referenceModels: s.referenceModels.map(m => ({ ...m, active: m.id === id })),
    })
  },

  setRenderPrompt: (prompt) => store.setState({ renderPrompt: prompt }),
  setRenderResults: (results) => store.setState({ renderResults: results }),
  setIsRendering: (v) => store.setState({ isRendering: v }),
  setIsDetecting: (v) => store.setState({ isDetecting: v }),

  // Operation mode
  setOperationMode: (mode) => store.setState({ operationMode: mode }),

  // Sprint 3 actions
  setBuildingAnalysis: (text) => store.setState({ buildingAnalysis: text }),
  setGeneratedPrompt: (p) => store.setState({ generatedPrompt: p }),
  setRenderTier: (tier) => store.setState({ renderTier: tier }),
  setNumVariations: (n) => store.setState({ numVariations: n }),
  setSelectedResult: (result) => store.setState({ selectedResult: result }),
  addRenderResult: (result) => {
    const s = store.getState()
    store.setState({ renderResults: [...s.renderResults, result] })
  },

  setShowSettings: (v) => store.setState({ showSettings: v }),
  setShowExport: (v) => store.setState({ showExport: v }),
  setCanvasScale: (s) => store.setState({ canvasScale: s }),
  setProjectName: (name) => store.setState({ projectName: name }),

  // Load keys from localStorage
  loadKeys: () => {
    try {
      const saved = localStorage.getItem('facadelab_keys')
      if (saved) {
        const keys = JSON.parse(saved)
        store.setState({ keys })
      }
    } catch {}
  },

  // Save keys to localStorage
  saveKeys: () => {
    try {
      const s = store.getState()
      localStorage.setItem('facadelab_keys', JSON.stringify(s.keys))
    } catch {}
  },

  // Serialize entire project
  exportProject: () => {
    const s = store.getState()
    return JSON.stringify({
      version: 1,
      projectName: s.projectName,
      sourceImage: s.sourceImage,
      address: s.address,
      annotations: s.annotations,
      balconyConfig: s.balconyConfig,
      perAnnotationConfig: s.perAnnotationConfig,
      referenceModels: s.referenceModels,
      renderPrompt: s.renderPrompt,
    }, null, 2)
  },

  importProject: (json) => {
    try {
      const data = JSON.parse(json)
      store.setState({
        projectName: data.projectName || 'Imported Project',
        sourceImage: data.sourceImage,
        address: data.address || '',
        annotations: data.annotations || [],
        balconyConfig: data.balconyConfig || store.getState().balconyConfig,
        perAnnotationConfig: data.perAnnotationConfig || {},
        referenceModels: data.referenceModels || [],
        renderPrompt: data.renderPrompt || '',
        nextAnnotationId: Math.max(0, ...(data.annotations || []).map(a => a.id)) + 1,
        selectedIds: new Set(),
        undoStack: [],
        step: data.sourceImage ? 'detect' : 'source',
      })
      return true
    } catch (e) {
      console.error('Failed to import project:', e)
      return false
    }
  },
}
