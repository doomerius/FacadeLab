import React, { useState, useEffect, useCallback } from 'react'
import { useStore, actions } from '../stores/appStore'
import Icons from '../utils/icons'
import { validateKey as validateAnthropicKey } from '../services/anthropic'
import { validateKey as validateFalKey } from '../services/falai'

const KEY_CONFIGS = [
  {
    id: 'anthropic',
    label: 'Anthropic',
    description: 'Required for window detection via Claude Vision',
    placeholder: 'sk-ant-api03-...',
    required: true,
    icon: '◆',
  },
  {
    id: 'fal',
    label: 'fal.ai',
    description: 'Image generation with Flux Pro',
    placeholder: 'fal-...',
    required: false,
    icon: '▲',
  },
  {
    id: 'replicate',
    label: 'Replicate',
    description: 'Alternative image generation provider',
    placeholder: 'r8_...',
    required: false,
    icon: '●',
  },
  {
    id: 'googleMaps',
    label: 'Google Maps',
    description: 'Street View image fetching',
    placeholder: 'AIza...',
    required: false,
    icon: '◎',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    description: 'Alternative detection via GPT-4V',
    placeholder: 'sk-...',
    required: false,
    icon: '◇',
  },
]

export default function SetupPanel() {
  const keys = useStore(s => s.keys)
  const keyStatus = useStore(s => s.keyStatus)

  const handleKeyChange = useCallback((provider, value) => {
    actions.setKey(provider, value)
    actions.setKeyStatus(provider, null)
  }, [])

  const handleValidate = useCallback(async (provider) => {
    const key = keys[provider]
    if (!key) return
    actions.setKeyStatus(provider, 'checking')
    try {
      let valid = false
      if (provider === 'anthropic') valid = await validateAnthropicKey(key)
      else if (provider === 'fal') valid = await validateFalKey(key)
      else valid = key.length > 10 // Basic check for others
      actions.setKeyStatus(provider, valid ? 'valid' : 'invalid')
      actions.saveKeys()
    } catch {
      actions.setKeyStatus(provider, 'invalid')
    }
  }, [keys])

  const canProceed = keys.anthropic && keys.anthropic.length > 10

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
      overflow: 'auto',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 640,
        animation: 'fadeIn var(--duration-slow) var(--ease-out)',
      }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: 'linear-gradient(135deg, var(--accent) 0%, #818cf8 50%, #a78bfa 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 0 40px rgba(99, 102, 241, 0.25)',
          }}>
            <Icons.Building size={32} stroke="#fff" strokeWidth={1.5} />
          </div>
          <h1 style={{
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: '-0.03em',
            color: 'var(--text-primary)',
            marginBottom: 8,
          }}>
            Welcome to FacadeLab
          </h1>
          <p style={{
            fontSize: 14,
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            maxWidth: 460,
            margin: '0 auto',
          }}>
            Photorealistic facade visualization in minutes. Add your API keys below to get started.
          </p>
        </div>

        {/* Key inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {KEY_CONFIGS.map((config) => (
            <KeyInput
              key={config.id}
              config={config}
              value={keys[config.id] || ''}
              status={keyStatus[config.id]}
              onChange={(v) => handleKeyChange(config.id, v)}
              onValidate={() => handleValidate(config.id)}
            />
          ))}
        </div>

        {/* Continue button */}
        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={() => {
              actions.saveKeys()
              actions.setStep('source')
            }}
            disabled={!canProceed}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 32px',
              borderRadius: 'var(--radius-lg)',
              background: canProceed
                ? 'linear-gradient(135deg, var(--accent) 0%, #818cf8 100%)'
                : 'var(--surface-2)',
              color: canProceed ? '#fff' : 'var(--text-disabled)',
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: '-0.01em',
              boxShadow: canProceed ? 'var(--shadow-glow)' : 'none',
              transition: 'all var(--duration-normal) var(--ease-out)',
              transform: canProceed ? 'scale(1)' : 'scale(0.98)',
            }}
            onMouseEnter={e => canProceed && (e.currentTarget.style.transform = 'scale(1.02)')}
            onMouseLeave={e => canProceed && (e.currentTarget.style.transform = 'scale(1)')}
          >
            Continue to Image Upload
            <Icons.ChevronRight size={16} />
          </button>
        </div>

        {/* Info text */}
        <p style={{
          textAlign: 'center',
          fontSize: 11,
          color: 'var(--text-tertiary)',
          marginTop: 20,
          lineHeight: 1.6,
        }}>
          Keys are stored locally in your browser. No data is sent to FacadeLab servers.
          <br />
          API calls go directly from your browser to the respective services.
        </p>
      </div>
    </div>
  )
}

function KeyInput({ config, value, status, onChange, onValidate }) {
  const [visible, setVisible] = useState(false)
  const [focused, setFocused] = useState(false)

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      padding: '14px 16px',
      borderRadius: 'var(--radius-lg)',
      background: focused ? 'var(--surface-2)' : 'var(--surface-1)',
      border: `1px solid ${focused ? 'var(--border-focus)' : 'var(--border-subtle)'}`,
      transition: 'all var(--duration-fast) var(--ease-out)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 14,
            color: config.required ? 'var(--accent)' : 'var(--text-tertiary)',
            width: 18,
            textAlign: 'center',
            fontWeight: 600,
          }}>
            {config.icon}
          </span>
          <span style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--text-primary)',
          }}>
            {config.label}
          </span>
          {config.required && (
            <span style={{
              fontSize: 9,
              fontWeight: 600,
              color: 'var(--accent)',
              background: 'var(--accent-muted)',
              padding: '1px 5px',
              borderRadius: 'var(--radius-full)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}>
              Required
            </span>
          )}
        </div>
        <StatusDot status={status} />
      </div>

      <p style={{
        fontSize: 11,
        color: 'var(--text-tertiary)',
        margin: 0,
        lineHeight: 1.4,
      }}>
        {config.description}
      </p>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type={visible ? 'text' : 'password'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => { setFocused(false); if (value) onValidate() }}
            placeholder={config.placeholder}
            style={{
              width: '100%',
              padding: '8px 36px 8px 10px',
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              background: 'var(--surface-0)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
            }}
            spellCheck={false}
            autoComplete="off"
          />
          <button
            onClick={() => setVisible(!visible)}
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              padding: 2,
              color: 'var(--text-tertiary)',
            }}
            tabIndex={-1}
          >
            <Icons.Eye size={13} />
          </button>
        </div>
        <button
          onClick={onValidate}
          disabled={!value}
          style={{
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--surface-2)',
            border: '1px solid var(--border-subtle)',
            fontSize: 11,
            fontWeight: 500,
            color: value ? 'var(--text-secondary)' : 'var(--text-disabled)',
          }}
          onMouseEnter={e => value && (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface-2)')}
        >
          Validate
        </button>
      </div>
    </div>
  )
}

function StatusDot({ status }) {
  if (!status) return null

  const config = {
    checking: { color: 'var(--warning)', label: 'Checking...' },
    valid: { color: 'var(--success)', label: 'Valid' },
    invalid: { color: 'var(--error)', label: 'Invalid' },
  }[status]

  if (!config) return null

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 11,
      color: config.color,
      fontWeight: 500,
    }}>
      <div style={{
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: config.color,
        boxShadow: `0 0 6px ${config.color}`,
        animation: status === 'checking' ? 'pulse 1.5s ease-in-out infinite' : 'none',
      }} />
      {config.label}
    </div>
  )
}
