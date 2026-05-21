import { useRef, useState, useCallback, useEffect } from 'react'

interface ComparisonSliderProps {
  beforeSrc: string
  afterSrc: string
  beforeLabel?: string
  afterLabel?: string
  width: number
  height: number
}

export function ComparisonSlider({
  beforeSrc,
  afterSrc,
  beforeLabel = 'Original',
  afterLabel = 'Compressed',
  width,
  height,
}: ComparisonSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState(50)
  const isDragging = useRef(false)

  const updatePosition = useCallback((clientX: number) => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = clientX - rect.left
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100))
    setPosition(pct)
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    updatePosition(e.clientX)
  }, [updatePosition])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return
    updatePosition(e.clientX)
  }, [updatePosition])

  const handlePointerUp = useCallback(() => {
    isDragging.current = false
  }, [])

  useEffect(() => {
    return () => {
      isDragging.current = false
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="comparison-slider relative bg-[var(--color-bg-alt)] border border-[var(--color-border-subtle)]"
      style={{ aspectRatio: `${width} / ${height}` }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <img
        src={beforeSrc}
        alt={beforeLabel}
        className="absolute inset-0 w-full h-full object-contain"
        draggable={false}
      />

      <div
        className="comparison-slider__after absolute inset-0"
        style={{ clipPath: `inset(0 0 0 ${position}%)` }}
      >
        <img
          src={afterSrc}
          alt={afterLabel}
          className="absolute inset-0 w-full h-full object-contain"
          draggable={false}
        />
      </div>

      <div
        className="comparison-slider__handle"
        style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
      >
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[var(--color-cream)] text-xs select-none">
          ⟺
        </span>
      </div>

      <div className="absolute top-3 left-3 px-2 py-1 bg-[var(--color-bg)]/70 backdrop-blur-sm text-[var(--color-text-muted)] label-mono text-[0.625rem]">
        {beforeLabel}
      </div>
      <div className="absolute top-3 right-3 px-2 py-1 bg-[var(--color-bg)]/70 backdrop-blur-sm text-[var(--color-primary)] label-mono text-[0.625rem]">
        {afterLabel}
      </div>
    </div>
  )
}
