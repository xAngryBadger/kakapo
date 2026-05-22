import { useRef, useState, useCallback, useEffect } from 'react'
import { type EditState, type CropRect, type ToolMode, buildFilterCSS } from '../lib/imageEngine'

interface EditorCanvasProps {
  imageSrc: string
  originalWidth: number
  originalHeight: number
  edit: EditState
  activeTool: ToolMode
  onCropChange: (crop: CropRect) => void
  onEditTextAt?: (x: number, y: number) => void
}

type DragHandle = 'tl' | 'tr' | 'bl' | 'br' | 'tm' | 'bm' | 'ml' | 'mr' | 'move' | null

export function EditorCanvas({
  imageSrc,
  originalWidth,
  originalHeight,
  edit,
  activeTool,
  onCropChange,
  onEditTextAt,
}: EditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dragHandle, setDragHandle] = useState<DragHandle>(null)
  const dragStart = useRef<{ mx: number; my: number; crop: CropRect }>({ mx: 0, my: 0, crop: { x: 0, y: 0, width: 0, height: 0 } })

  const imageDisplayW = containerRef.current?.clientWidth ?? 0
  const imageDisplayH = imageDisplayW > 0 ? (originalHeight / originalWidth) * imageDisplayW : 0
  const scaleX = imageDisplayW / originalWidth
  const scaleY = imageDisplayH / originalHeight

  const filterCSS = buildFilterCSS(edit.filters)
  const transformParts: string[] = []
  if (edit.rotation !== 0) transformParts.push(`rotate(${edit.rotation}deg)`)
  if (edit.flipH) transformParts.push('scaleX(-1)')
  if (edit.flipV) transformParts.push('scaleY(-1)')
  const transformCSS = transformParts.length > 0 ? transformParts.join(' ') : undefined

  const crop = edit.crop
  const showCrop = activeTool === 'crop' && crop

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, handle: DragHandle) => {
      if (!handle || !crop) return
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      setDragHandle(handle)
      dragStart.current = { mx: e.clientX, my: e.clientY, crop: { ...crop } }
    },
    [crop],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragHandle || !crop) return
      const dx = (e.clientX - dragStart.current.mx) / scaleX
      const dy = (e.clientY - dragStart.current.my) / scaleY
      const c = dragStart.current.crop

      let next = { ...c }

      if (dragHandle === 'move') {
        next.x = Math.max(0, Math.min(originalWidth - c.width, c.x + dx))
        next.y = Math.max(0, Math.min(originalHeight - c.height, c.y + dy))
      } else {
        let { x, y, width, height } = c

        if (dragHandle.includes('l')) { x = c.x + dx; width = c.width - dx }
        if (dragHandle.includes('r')) { width = c.width + dx }
        if (dragHandle.includes('t')) { y = c.y + dy; height = c.height - dy }
        if (dragHandle.includes('b')) { height = c.height + dy }

        if (width < 20) { width = 20; if (dragHandle.includes('l')) x = c.x + c.width - 20 }
        if (height < 20) { height = 20; if (dragHandle.includes('t')) y = c.y + c.height - 20 }
        x = Math.max(0, x)
        y = Math.max(0, y)
        if (x + width > originalWidth) width = originalWidth - x
        if (y + height > originalHeight) height = originalHeight - y

        next = { x, y, width, height }
      }

      onCropChange(next)
    },
    [dragHandle, crop, scaleX, scaleY, originalWidth, originalHeight, onCropChange],
  )

  const handlePointerUp = useCallback(() => {
    setDragHandle(null)
  }, [])

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (activeTool !== 'text') return
      const rect = e.currentTarget.getBoundingClientRect()
      const x = (e.clientX - rect.left) / scaleX
      const y = (e.clientY - rect.top) / scaleY
      onEditTextAt?.(x, y)
    },
    [activeTool, scaleX, scaleY, onEditTextAt],
  )

  useEffect(() => {
    if (dragHandle) return
  }, [dragHandle])

  const handleCursor: Record<string, string> = {
    tl: 'nwse-resize',
    tr: 'nesw-resize',
    bl: 'nesw-resize',
    br: 'nwse-resize',
    tm: 'ns-resize',
    bm: 'ns-resize',
    ml: 'ew-resize',
    mr: 'ew-resize',
    move: 'move',
  }

  const handles: { key: DragHandle; cx: number; cy: number }[] = crop
    ? [
        { key: 'tl', cx: crop.x, cy: crop.y },
        { key: 'tr', cx: crop.x + crop.width, cy: crop.y },
        { key: 'bl', cx: crop.x, cy: crop.y + crop.height },
        { key: 'br', cx: crop.x + crop.width, cy: crop.y + crop.height },
        { key: 'tm', cx: crop.x + crop.width / 2, cy: crop.y },
        { key: 'bm', cx: crop.x + crop.width / 2, cy: crop.y + crop.height },
        { key: 'ml', cx: crop.x, cy: crop.y + crop.height / 2 },
        { key: 'mr', cx: crop.x + crop.width, cy: crop.y + crop.height / 2 },
      ]
    : []

  return (
    <div
      ref={containerRef}
      className="relative bg-[var(--color-bg-alt)] border border-[var(--color-border-subtle)] overflow-hidden"
      style={{ cursor: dragHandle && dragHandle in handleCursor ? handleCursor[dragHandle as keyof typeof handleCursor] : activeTool === 'crop' ? 'crosshair' : activeTool === 'text' ? 'text' : 'default' }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClick={handleCanvasClick}
    >
      <div className="relative" style={{ width: '100%', aspectRatio: `${originalWidth} / ${originalHeight}`, overflow: 'hidden' }}>
        <img
          src={imageSrc}
          alt=""
          draggable={false}
          className="absolute inset-0 w-full h-full object-contain select-none"
          style={{ filter: filterCSS !== 'none' ? filterCSS : undefined, transform: transformCSS }}
        />

        {showCrop && crop && (
          <>
            <div
              className="absolute border-2 border-dashed border-[var(--color-primary)] bg-[var(--color-primary)]/5 pointer-events-none"
              style={{
                left: `${crop.x * scaleX}px`,
                top: `${crop.y * scaleY}px`,
                width: `${crop.width * scaleX}px`,
                height: `${crop.height * scaleY}px`,
              }}
            />

            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                clipPath: `polygon(
                  0% 0%, 0% 100%, ${(crop.x / originalWidth) * 100}% 100%, ${(crop.x / originalWidth) * 100}% ${(crop.y / originalHeight) * 100}%,
                  ${((crop.x + crop.width) / originalWidth) * 100}% ${(crop.y / originalHeight) * 100}%, ${((crop.x + crop.width) / originalWidth) * 100}% ${((crop.y + crop.height) / originalHeight) * 100}%,
                  ${(crop.x / originalWidth) * 100}% ${((crop.y + crop.height) / originalHeight) * 100}%, ${(crop.x / originalWidth) * 100}% 100%, 100% 100%, 100% 0%
                )`,
                backgroundColor: 'rgba(12,10,9,0.6)',
              }}
            />

            {handles.map(({ key, cx, cy }) => (
              <div
                key={key}
                onPointerDown={(e) => handlePointerDown(e, key)}
                className="absolute w-3 h-3 bg-[var(--color-cream)] border border-[var(--color-primary)] -translate-x-1/2 -translate-y-1/2 z-20"
                style={{
                  left: `${cx * scaleX}px`,
                  top: `${cy * scaleY}px`,
                  cursor: key ? handleCursor[key] : undefined,
                }}
              />
            ))}

            <div
              className="absolute z-10"
              style={{
                left: `${crop.x * scaleX}px`,
                top: `${crop.y * scaleY}px`,
                width: `${crop.width * scaleX}px`,
                height: `${crop.height * scaleY}px`,
                cursor: 'move',
              }}
              onPointerDown={(e) => handlePointerDown(e, 'move')}
            />
          </>
        )}

        {activeTool === 'text' &&
          edit.textOverlays.map((overlay) => (
            <div
              key={overlay.id}
              className="absolute pointer-events-none"
              style={{
                left: `${overlay.x * scaleX}px`,
                top: `${overlay.y * scaleY}px`,
                fontSize: `${overlay.fontSize * scaleY}px`,
                fontFamily: overlay.fontFamily,
                color: overlay.fill,
              }}
            >
              {overlay.text}
            </div>
          ))}
      </div>
    </div>
  )
}
