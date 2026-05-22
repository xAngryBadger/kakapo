import { type EditState, DEFAULT_EDIT_STATE } from '../lib/imageEngine'

interface RotatePanelProps {
  edit: EditState
  onEditChange: (edit: EditState) => void
  onEditChangeEnd: () => void
}

export function RotatePanel({ edit, onEditChange, onEditChangeEnd }: RotatePanelProps) {
  const rotate = (deg: number) => {
    const next = (edit.rotation + deg + 360) % 360
    onEditChange({ ...edit, rotation: next })
    setTimeout(onEditChangeEnd, 0)
  }

  const flipH = () => {
    onEditChange({ ...edit, flipH: !edit.flipH })
    setTimeout(onEditChangeEnd, 0)
  }
  const flipV = () => {
    onEditChange({ ...edit, flipV: !edit.flipV })
    setTimeout(onEditChangeEnd, 0)
  }

  const isDefaultRotation = edit.rotation === 0 && !edit.flipH && !edit.flipV

  const resetTransform = () => {
    onEditChange({ ...edit, rotation: DEFAULT_EDIT_STATE.rotation, flipH: DEFAULT_EDIT_STATE.flipH, flipV: DEFAULT_EDIT_STATE.flipV })
    setTimeout(onEditChangeEnd, 0)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <p className="eyebrow text-[var(--color-text-muted)] text-xs">Transform</p>
        <button
          onClick={resetTransform}
          disabled={isDefaultRotation}
          className="label-mono text-[0.625rem] text-[var(--color-primary)] hover:text-[var(--color-primary-light)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Reset
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => rotate(-90)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-cream)] hover:border-[var(--color-primary)] transition-colors text-xs"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4" />
          </svg>
          -90
        </button>
        <button
          onClick={() => rotate(90)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-cream)] hover:border-[var(--color-primary)] transition-colors text-xs"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 10H11a5 5 0 00-5 5v2M21 10l-4-4M21 10l-4 4" />
          </svg>
          +90
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={flipH}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 border text-xs transition-colors ${
            edit.flipH
              ? 'bg-[var(--color-primary)]/20 border-[var(--color-primary)] text-[var(--color-primary)]'
              : 'bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-cream)] hover:border-[var(--color-primary)]'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m-12 6h12m-12 6h12M4 7v12" />
          </svg>
          Flip H
        </button>
        <button
          onClick={flipV}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 border text-xs transition-colors ${
            edit.flipV
              ? 'bg-[var(--color-primary)]/20 border-[var(--color-primary)] text-[var(--color-primary)]'
              : 'bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-cream)] hover:border-[var(--color-primary)]'
          }`}
        >
          <svg className="w-4 h-4 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m-12 6h12m-12 6h12M4 7v12" />
          </svg>
          Flip V
        </button>
      </div>

      <div>
        <label className="eyebrow text-[var(--color-text-muted)] mb-1.5 block text-xs">
          Rotation — {edit.rotation}deg
        </label>
        <input
          type="range"
          min={0}
          max={359}
          step={1}
          value={edit.rotation}
          onChange={(e) => onEditChange({ ...edit, rotation: parseInt(e.target.value) })}
          onPointerUp={onEditChangeEnd}
          className="w-full accent-[var(--color-primary)]"
        />
      </div>
    </div>
  )
}
