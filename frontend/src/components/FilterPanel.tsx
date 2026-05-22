import { type FilterState, DEFAULT_FILTERS } from '../lib/imageEngine'

interface FilterPanelProps {
  filters: FilterState
  onChange: (filters: FilterState) => void
  onChangeEnd: () => void
  onReset: () => void
}

const sliders: { key: keyof FilterState; label: string; min: number; max: number; step: number; unit: string }[] = [
  { key: 'brightness', label: 'Brightness', min: 0, max: 200, step: 1, unit: '%' },
  { key: 'contrast', label: 'Contrast', min: 0, max: 200, step: 1, unit: '%' },
  { key: 'saturate', label: 'Saturation', min: 0, max: 200, step: 1, unit: '%' },
  { key: 'blur', label: 'Blur', min: 0, max: 20, step: 0.5, unit: 'px' },
  { key: 'hueRotate', label: 'Hue Rotate', min: -180, max: 180, step: 1, unit: 'deg' },
]

export function FilterPanel({ filters, onChange, onChangeEnd, onReset }: FilterPanelProps) {
  const isDefault = JSON.stringify(filters) === JSON.stringify(DEFAULT_FILTERS)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <p className="eyebrow text-[var(--color-text-muted)] text-xs">Filters</p>
        <button
          onClick={onReset}
          disabled={isDefault}
          className="label-mono text-[0.625rem] text-[var(--color-primary)] hover:text-[var(--color-primary-light)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Reset
        </button>
      </div>

      {sliders.map(({ key, label, min, max, step, unit }) => (
        <div key={key}>
          <label className="eyebrow text-[var(--color-text-muted)] mb-1.5 block text-xs">
            {label} — {filters[key]}{unit}
          </label>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={filters[key]}
            onChange={(e) => onChange({ ...filters, [key]: parseFloat(e.target.value) })}
            onPointerUp={onChangeEnd}
            className="w-full accent-[var(--color-primary)]"
          />
        </div>
      ))}
    </div>
  )
}
