import { type TextOverlay, type EditState } from '../lib/imageEngine'

interface TextOverlayPanelProps {
  edit: EditState
  onEditChange: (edit: EditState) => void
}

const COLORS = ['#fef3c7', '#ffffff', '#d97706', '#fb7185', '#22c55e', '#3b82f6', '#a855f7', '#000000']
const FONTS = ['Inter', 'Playfair Display', 'JetBrains Mono']

export function TextOverlayPanel({ edit, onEditChange }: TextOverlayPanelProps) {
  const overlays = edit.textOverlays

  const addOverlay = () => {
    const next: TextOverlay = {
      id: `txt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text: 'Text',
      x: 50,
      y: 50,
      fontSize: 32,
      fontFamily: 'Inter',
      fill: '#fef3c7',
    }
    onEditChange({ ...edit, textOverlays: [...overlays, next] })
  }

  const updateOverlay = (id: string, patch: Partial<TextOverlay>) => {
    onEditChange({
      ...edit,
      textOverlays: overlays.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    })
  }

  const removeOverlay = (id: string) => {
    onEditChange({ ...edit, textOverlays: overlays.filter((o) => o.id !== id) })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <p className="eyebrow text-[var(--color-text-muted)] text-xs">Text Overlays</p>
        <button
          onClick={addOverlay}
          className="label-mono text-[0.625rem] text-[var(--color-primary)] hover:text-[var(--color-primary-light)] transition-colors"
        >
          + Add
        </button>
      </div>

      {overlays.length === 0 && (
        <p className="text-sm text-[var(--color-text-muted)] py-4 text-center">
          Click &ldquo;+ Add&rdquo; or click on the canvas to place text
        </p>
      )}

      {overlays.map((overlay) => (
        <div key={overlay.id} className="space-y-2 bg-[var(--color-bg)] border border-[var(--color-border-subtle)] p-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={overlay.text}
              onChange={(e) => updateOverlay(overlay.id, { text: e.target.value })}
              className="flex-1 bg-transparent border-0 border-b border-[var(--color-border)] px-0 py-1.5 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              placeholder="Text content"
            />
            <button
              onClick={() => removeOverlay(overlay.id)}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-coral)] transition-colors shrink-0"
              aria-label="Remove text"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="eyebrow text-[var(--color-text-muted)] mb-1 block text-[0.625rem]">Size — {overlay.fontSize}px</label>
              <input
                type="range"
                min={10}
                max={200}
                step={1}
                value={overlay.fontSize}
                onChange={(e) => updateOverlay(overlay.id, { fontSize: parseInt(e.target.value) })}
                className="w-full accent-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="eyebrow text-[var(--color-text-muted)] mb-1 block text-[0.625rem]">Font</label>
              <select
                value={overlay.fontFamily}
                onChange={(e) => updateOverlay(overlay.id, { fontFamily: e.target.value })}
                className="w-full bg-[var(--color-bg-alt)] border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
              >
                {FONTS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="eyebrow text-[var(--color-text-muted)] mb-1 block text-[0.625rem]">Color</label>
            <div className="flex gap-1.5">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => updateOverlay(overlay.id, { fill: c })}
                  className={`w-5 h-5 border transition-colors ${overlay.fill === c ? 'border-[var(--color-cream)] scale-110' : 'border-[var(--color-border)]'}`}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
