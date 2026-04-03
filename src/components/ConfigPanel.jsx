import React, { useState } from 'react'
import { useStore, useOperationMode, actions } from '../stores/appStore'
import { RENDER_MODES } from '../services/prompts'
import Icons from '../utils/icons'

const RAILING_TYPES = [
  { id: 'clear_glass', label: 'Clear Glass', desc: 'frameless tempered glass balustrade with minimal stainless steel top rail and point fixings' },
  { id: 'frosted_glass', label: 'Frosted Glass', desc: 'acid-etched laminated glass panels, partially opaque, aluminum extrusion frame' },
  { id: 'steel_bar', label: 'Steel Bar', desc: 'vertical steel tube balusters, powder-coated, horizontal top and bottom rails' },
  { id: 'steel_mesh', label: 'Steel Mesh', desc: 'expanded metal mesh infill panel, galvanized finish, welded to structural frame' },
  { id: 'wood_slats', label: 'Wood Slats', desc: 'horizontal hardwood decking slats on balcony floor, matching vertical timber balusters' },
  { id: 'perforated_steel', label: 'Perforated Steel', desc: 'perforated corten steel or powder-coated steel panel, semi-transparent' },
  { id: 'wire_cable', label: 'Wire Cable', desc: 'stainless steel horizontal wire cables, marine-grade, 10mm diameter' },
  { id: 'concrete_parapet', label: 'Concrete Parapet', desc: 'in-situ cast concrete upstand parapet, smooth shuttered finish, 900mm height' },
]

const MATERIALS = [
  { id: 'white_concrete', label: 'White Concrete' },
  { id: 'grey_concrete', label: 'Grey Concrete' },
  { id: 'steel_galvanized', label: 'Steel (Galvanized)' },
  { id: 'timber_oak', label: 'Timber (Oak)' },
  { id: 'corten', label: 'Corten Steel' },
  { id: 'aluminum', label: 'Aluminum' },
]

const FLOOR_FINISHES = [
  { id: 'composite_decking', label: 'Composite Decking' },
  { id: 'timber_decking', label: 'Timber Decking' },
  { id: 'porcelain_tile', label: 'Porcelain Tile' },
  { id: 'brushed_concrete', label: 'Brushed Concrete' },
  { id: 'steel_grating', label: 'Steel Grating' },
]

const PLANT_DENSITIES = [
  { value: 0, label: 'None' },
  { value: 1, label: 'Light' },
  { value: 2, label: 'Medium' },
  { value: 3, label: 'Heavy' },
]

const LIGHTING = [
  { id: 'dawn', label: 'Dawn' },
  { id: 'daytime', label: 'Daytime' },
  { id: 'dusk', label: 'Dusk' },
  { id: 'night', label: 'Night' },
]

const MODE_KEYS = Object.keys(RENDER_MODES)

export default function ConfigPanel() {
  const config = useStore(s => s.balconyConfig)
  const selectedIds = useStore(s => s.selectedIds)
  const operationMode = useOperationMode()
  const selectedCount = selectedIds.size

  const showBalconyConfig = operationMode === 'add_balconies' || operationMode === 'replace_balconies'
  const showWindowConfig = operationMode === 'enlarge_windows'
  // remove_balconies and add_cladding show no special config

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Operation Mode Selector */}
      <div style={{
        padding: '10px 14px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--surface-1)',
        border: '1px solid var(--border-subtle)',
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
          Operation Mode
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {MODE_KEYS.map(key => {
            const m = RENDER_MODES[key]
            const isActive = operationMode === key
            return (
              <button
                key={key}
                onClick={() => actions.setOperationMode(key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-md)',
                  background: isActive ? 'var(--accent-muted)' : 'transparent',
                  border: `1px solid ${isActive ? 'var(--border-focus)' : 'transparent'}`,
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all var(--duration-fast) var(--ease-out)',
                }}
                onMouseEnter={e => !isActive && (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => !isActive && (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: isActive ? 'var(--accent)' : 'var(--text-tertiary)',
                  flexShrink: 0,
                  transition: 'background var(--duration-fast)',
                }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: isActive ? 500 : 400, color: isActive ? 'var(--accent)' : 'var(--text-primary)' }}>
                    {m.label}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{m.description}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Selection status */}
      <div style={{
        padding: '12px 14px',
        borderRadius: 'var(--radius-md)',
        background: selectedCount > 0 ? 'var(--select-amber-fill)' : 'var(--surface-1)',
        border: `1px solid ${selectedCount > 0 ? 'rgba(245, 158, 11, 0.25)' : 'var(--border-subtle)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: selectedCount > 0 ? 'var(--select-amber)' : 'var(--text-tertiary)' }}>
            {selectedCount > 0 ? `${selectedCount} window${selectedCount > 1 ? 's' : ''} selected` : 'No windows selected'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>
            {selectedCount > 0 ? 'Configure balcony for selection' : 'Click windows on canvas to select'}
          </div>
        </div>
        {selectedCount > 0 && (
          <button onClick={() => actions.selectAll()} style={{
            fontSize: 11, color: 'var(--accent)', fontWeight: 500, padding: '4px 8px',
            borderRadius: 'var(--radius-sm)', background: 'var(--accent-muted)',
          }}>
            Select All
          </button>
        )}
      </div>

      {/* Depth slider — only for balcony modes */}
      {showBalconyConfig && <Section title="Balcony Depth">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input
            type="range"
            min="0.6"
            max="2.4"
            step="0.1"
            value={config.depth}
            onChange={(e) => actions.setBalconyConfig({ depth: parseFloat(e.target.value) })}
            style={{
              flex: 1,
              height: 4,
              appearance: 'none',
              background: `linear-gradient(to right, var(--accent) ${((config.depth - 0.6) / 1.8) * 100}%, var(--surface-3) ${((config.depth - 0.6) / 1.8) * 100}%)`,
              borderRadius: 'var(--radius-full)',
              outline: 'none',
              cursor: 'pointer',
            }}
          />
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-primary)',
            minWidth: 48,
            textAlign: 'right',
          }}>
            {config.depth.toFixed(1)}m
          </span>
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 10,
          color: 'var(--text-tertiary)',
          marginTop: 4,
        }}>
          <span>Juliette (0.6m)</span>
          <span>Terrace (2.4m)</span>
        </div>
      </Section>}

      {/* Railing Type — only for balcony modes */}
      {showBalconyConfig && <Section title="Railing Type">
        <select
          value={config.railingType}
          onChange={(e) => actions.setBalconyConfig({ railingType: e.target.value })}
          style={{
            width: '100%',
            padding: '8px 10px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--surface-0)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-primary)',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          {RAILING_TYPES.map(r => (
            <option key={r.id} value={r.id}>{r.label}</option>
          ))}
        </select>
        {config.railingType && (
          <div style={{
            marginTop: 6,
            padding: '6px 8px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--surface-0)',
            border: '1px solid var(--border-subtle)',
            fontSize: 10,
            color: 'var(--text-tertiary)',
            lineHeight: 1.5,
          }}>
            {RAILING_TYPES.find(r => r.id === config.railingType)?.desc}
          </div>
        )}
      </Section>}

      {/* Structure Material — only for balcony modes */}
      {showBalconyConfig && <Section title="Structure Material">
        <select
          value={config.material}
          onChange={(e) => actions.setBalconyConfig({ material: e.target.value })}
          style={{
            width: '100%',
            padding: '8px 10px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--surface-0)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-primary)',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          {MATERIALS.map(m => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
      </Section>}

      {/* Floor Finish — only for balcony modes */}
      {showBalconyConfig && <Section title="Floor Finish">
        <select
          value={config.floorFinish}
          onChange={(e) => actions.setBalconyConfig({ floorFinish: e.target.value })}
          style={{
            width: '100%',
            padding: '8px 10px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--surface-0)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-primary)',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          {FLOOR_FINISHES.map(f => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </select>
      </Section>}

      {/* Enlarge windows config */}
      {showWindowConfig && (
        <Section title="Window Scale">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              type="range"
              min="1.2"
              max="2.5"
              step="0.1"
              value={config.windowScale || 1.5}
              onChange={(e) => actions.setBalconyConfig({ windowScale: parseFloat(e.target.value) })}
              style={{
                flex: 1,
                height: 4,
                appearance: 'none',
                background: `linear-gradient(to right, var(--accent) ${((((config.windowScale || 1.5) - 1.2) / 1.3)) * 100}%, var(--surface-3) ${((((config.windowScale || 1.5) - 1.2) / 1.3)) * 100}%)`,
                borderRadius: 'var(--radius-full)',
                outline: 'none',
                cursor: 'pointer',
              }}
            />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', minWidth: 36 }}>
              {(config.windowScale || 1.5).toFixed(1)}x
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-tertiary)', marginTop: 4 }}>
            <span>Small (1.2x)</span><span>Large (2.5x)</span>
          </div>
        </Section>
      )}

      {/* Plants — only for balcony modes */}
      {showBalconyConfig && <Section title="Plants & Greenery">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: config.plants ? 10 : 0 }}>
          <ToggleSwitch
            value={config.plants}
            onChange={(v) => actions.setBalconyConfig({ plants: v })}
          />
          <span style={{ fontSize: 12, color: config.plants ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
            {config.plants ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        {config.plants && (
          <div style={{ display: 'flex', gap: 6 }}>
            {PLANT_DENSITIES.map(d => (
              <OptionChip
                key={d.value}
                selected={config.plantDensity === d.value}
                label={d.label}
                onClick={() => actions.setBalconyConfig({ plantDensity: d.value })}
              />
            ))}
          </div>
        )}
      </Section>}

      {/* Lighting */}
      <Section title="Lighting">
        <ToggleSwitch
          value={config.lightingEnabled !== false}
          onChange={(v) => actions.setBalconyConfig({ lightingEnabled: v })}
          label={config.lightingEnabled !== false ? 'Custom lighting' : 'Default lighting'}
        />
        {config.lightingEnabled !== false && (
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            {LIGHTING.map(l => (
              <OptionChip
                key={l.id}
                selected={config.lighting === l.id}
                label={l.label}
                onClick={() => actions.setBalconyConfig({ lighting: l.id })}
              />
            ))}
          </div>
        )}
      </Section>

      {/* Proceed to render */}
      {selectedCount > 0 && (
        <button
          onClick={() => actions.setStep('render')}
          style={{
            width: '100%',
            padding: '14px 16px',
            borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, var(--accent) 0%, #818cf8 100%)',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: 'var(--shadow-glow)',
            transition: 'all var(--duration-normal) var(--ease-out)',
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.01)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <Icons.Sparkles size={16} />
          Generate Render
        </button>
      )}
    </div>
  )
}

function Section({ title, children }) {
  const [open, setOpen] = useState(true)
  return (
    <div style={{
      borderRadius: 'var(--radius-md)',
      background: 'var(--surface-1)',
      border: '1px solid var(--border-subtle)',
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          background: 'transparent',
        }}
      >
        {title}
        {open ? <Icons.ChevronDown size={12} /> : <Icons.ChevronRight size={12} />}
      </button>
      {open && (
        <div style={{ padding: '0 14px 14px' }}>
          {children}
        </div>
      )}
    </div>
  )
}

function OptionChip({ selected, label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 12px',
        borderRadius: 'var(--radius-full)',
        background: selected ? 'var(--accent-muted)' : 'var(--surface-0)',
        border: `1px solid ${selected ? 'var(--border-focus)' : 'var(--border-subtle)'}`,
        fontSize: 11,
        fontWeight: selected ? 500 : 400,
        color: selected ? 'var(--accent)' : 'var(--text-secondary)',
        whiteSpace: 'nowrap',
        transition: 'all var(--duration-fast) var(--ease-out)',
        flex: 1,
      }}
      onMouseEnter={e => !selected && (e.currentTarget.style.borderColor = 'var(--border-strong)')}
      onMouseLeave={e => !selected && (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
    >
      {label}
    </button>
  )
}

function ToggleSwitch({ value, onChange, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: 40,
          height: 22,
          borderRadius: 'var(--radius-full)',
          background: value ? 'var(--accent)' : 'var(--surface-3)',
          padding: 2,
          display: 'flex',
          alignItems: 'center',
          transition: 'background var(--duration-fast) var(--ease-out)',
          border: `1px solid ${value ? 'var(--accent)' : 'var(--border-default)'}`,
          flexShrink: 0,
        }}
      >
        <div style={{
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: '#fff',
          transform: value ? 'translateX(18px)' : 'translateX(0)',
          transition: 'transform var(--duration-fast) var(--ease-spring)',
          boxShadow: 'var(--shadow-sm)',
        }} />
      </button>
      {label && (
        <span style={{ fontSize: 12, color: value ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
          {label}
        </span>
      )}
    </div>
  )
}
