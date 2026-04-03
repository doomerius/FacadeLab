import React, { useState } from 'react'
import { useStore, actions } from '../stores/appStore'
import Icons from '../utils/icons'

const RAILING_TYPES = [
  { id: 'clear-glass', label: 'Clear Glass', desc: 'Frameless tempered glass' },
  { id: 'frosted-glass', label: 'Frosted Glass', desc: 'Acid-etched laminated panels' },
  { id: 'steel-bar', label: 'Steel Bar', desc: 'Vertical tube balusters' },
  { id: 'steel-mesh', label: 'Steel Mesh', desc: 'Expanded metal mesh' },
  { id: 'wood-slats', label: 'Wood Slats', desc: 'Hardwood timber balusters' },
  { id: 'perforated-steel', label: 'Perforated Steel', desc: 'Corten/powder-coated panel' },
  { id: 'wire-cable', label: 'Wire Cable', desc: 'Horizontal steel cables' },
  { id: 'concrete-parapet', label: 'Concrete Parapet', desc: 'Cast concrete upstand' },
]

const MATERIALS = [
  { id: 'white-concrete', label: 'White Concrete' },
  { id: 'grey-concrete', label: 'Grey Concrete' },
  { id: 'steel-galvanized', label: 'Steel (Galvanized)' },
  { id: 'steel-painted', label: 'Steel (Painted)' },
  { id: 'timber-pine', label: 'Timber (Pine)' },
  { id: 'timber-oak', label: 'Timber (Oak)' },
  { id: 'corten', label: 'Corten Steel' },
  { id: 'aluminum', label: 'Aluminum' },
]

const FLOOR_FINISHES = [
  { id: 'composite-decking', label: 'Composite Decking' },
  { id: 'timber-decking', label: 'Timber Decking' },
  { id: 'porcelain-tile', label: 'Porcelain Tile' },
  { id: 'brushed-concrete', label: 'Brushed Concrete' },
  { id: 'steel-grating', label: 'Steel Grating' },
]

const SOFFITS = [
  { id: 'smooth-white', label: 'Smooth White' },
  { id: 'exposed-concrete', label: 'Exposed Concrete' },
  { id: 'timber-cladding', label: 'Timber Cladding' },
  { id: 'steel-plate', label: 'Steel Plate' },
]

const LIGHTING = [
  { id: 'dawn', label: 'Dawn' },
  { id: 'daytime', label: 'Daytime' },
  { id: 'dusk', label: 'Dusk' },
  { id: 'night', label: 'Night' },
]

export default function ConfigPanel() {
  const config = useStore(s => s.balconyConfig)
  const selectedIds = useStore(s => s.selectedIds)
  const annotations = useStore(s => s.annotations)
  const selectedCount = selectedIds.size

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
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

      {/* Depth slider */}
      <Section title="Balcony Depth">
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
      </Section>

      {/* Railing Type */}
      <Section title="Railing Type">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {RAILING_TYPES.map(r => (
            <OptionCard
              key={r.id}
              selected={config.railingType === r.id}
              label={r.label}
              desc={r.desc}
              onClick={() => actions.setBalconyConfig({ railingType: r.id })}
            />
          ))}
        </div>
      </Section>

      {/* Structure Material */}
      <Section title="Structure Material">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {MATERIALS.map(m => (
            <OptionChip
              key={m.id}
              selected={config.material === m.id}
              label={m.label}
              onClick={() => actions.setBalconyConfig({ material: m.id })}
            />
          ))}
        </div>
      </Section>

      {/* Floor Finish */}
      <Section title="Floor Finish">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {FLOOR_FINISHES.map(f => (
            <OptionChip
              key={f.id}
              selected={config.floorFinish === f.id}
              label={f.label}
              onClick={() => actions.setBalconyConfig({ floorFinish: f.id })}
            />
          ))}
        </div>
      </Section>

      {/* Soffit */}
      <Section title="Ceiling Soffit">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {SOFFITS.map(s => (
            <OptionChip
              key={s.id}
              selected={config.ceilingSoffit === s.id}
              label={s.label}
              onClick={() => actions.setBalconyConfig({ ceilingSoffit: s.id })}
            />
          ))}
        </div>
      </Section>

      {/* Plants */}
      <Section title="Plants & Greenery">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ToggleSwitch
            value={config.plants}
            onChange={(v) => actions.setBalconyConfig({ plants: v })}
          />
          <span style={{ fontSize: 12, color: config.plants ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
            {config.plants ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        {config.plants && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={config.plantDensity}
              onChange={(e) => actions.setBalconyConfig({ plantDensity: parseFloat(e.target.value) })}
              style={{
                flex: 1, height: 4, appearance: 'none',
                background: `linear-gradient(to right, var(--success) ${config.plantDensity * 100}%, var(--surface-3) ${config.plantDensity * 100}%)`,
                borderRadius: 'var(--radius-full)', outline: 'none', cursor: 'pointer',
              }}
            />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', minWidth: 36, textAlign: 'right' }}>
              {Math.round(config.plantDensity * 100)}%
            </span>
          </div>
        )}
      </Section>

      {/* Lighting */}
      <Section title="Lighting">
        <div style={{ display: 'flex', gap: 6 }}>
          {LIGHTING.map(l => (
            <OptionChip
              key={l.id}
              selected={config.lighting === l.id}
              label={l.label}
              onClick={() => actions.setBalconyConfig({ lighting: l.id })}
            />
          ))}
        </div>
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

function OptionCard({ selected, label, desc, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 12px',
        borderRadius: 'var(--radius-md)',
        background: selected ? 'var(--accent-muted)' : 'var(--surface-0)',
        border: `1px solid ${selected ? 'var(--border-focus)' : 'var(--border-subtle)'}`,
        textAlign: 'left',
        transition: 'all var(--duration-fast) var(--ease-out)',
      }}
      onMouseEnter={e => !selected && (e.currentTarget.style.borderColor = 'var(--border-strong)')}
      onMouseLeave={e => !selected && (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
    >
      <div style={{ fontSize: 12, fontWeight: 500, color: selected ? 'var(--accent)' : 'var(--text-primary)', marginBottom: 2 }}>
        {label}
      </div>
      {desc && (
        <div style={{ fontSize: 10, color: 'var(--text-tertiary)', lineHeight: 1.3 }}>
          {desc}
        </div>
      )}
    </button>
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
      }}
      onMouseEnter={e => !selected && (e.currentTarget.style.borderColor = 'var(--border-strong)')}
      onMouseLeave={e => !selected && (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
    >
      {label}
    </button>
  )
}

function ToggleSwitch({ value, onChange }) {
  return (
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
  )
}
