export interface ImageFile {
  id: string
  file: File
  originalUrl: string
  originalSize: number
  originalWidth: number
  originalHeight: number
  compressedUrl: string | null
  compressedSize: number | null
  compressedWidth: number
  compressedHeight: number
  status: 'pending' | 'processing' | 'done' | 'error'
  error?: string
}

export interface CompressionOptions {
  quality: number
  maxWidth: number
  maxHeight: number
  format: 'image/jpeg' | 'image/png' | 'image/webp'
}

export const DEFAULT_OPTIONS: CompressionOptions = {
  quality: 0.8,
  maxWidth: 1920,
  maxHeight: 1080,
  format: 'image/webp',
}

export type ToolMode = 'compress' | 'crop' | 'filters' | 'rotate' | 'text'

export interface FilterState {
  brightness: number
  contrast: number
  saturate: number
  blur: number
  hueRotate: number
}

export const DEFAULT_FILTERS: FilterState = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  blur: 0,
  hueRotate: 0,
}

export interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

export interface TextOverlay {
  id: string
  text: string
  x: number
  y: number
  fontSize: number
  fontFamily: string
  fill: string
}

export interface EditState {
  filters: FilterState
  crop: CropRect | null
  rotation: number
  flipH: boolean
  flipV: boolean
  textOverlays: TextOverlay[]
}

export const DEFAULT_EDIT_STATE: EditState = {
  filters: { ...DEFAULT_FILTERS },
  crop: null,
  rotation: 0,
  flipH: false,
  flipV: false,
  textOverlays: [],
}

export interface HistoryEntry {
  state: EditState
  label: string
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function getDimensions(file: File): Promise<{ width: number; height: number; url: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight, url })
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })
}

export async function createImageFile(file: File): Promise<ImageFile> {
  const { width, height, url } = await getDimensions(file)
  return {
    id: generateId(),
    file,
    originalUrl: url,
    originalSize: file.size,
    originalWidth: width,
    originalHeight: height,
    compressedUrl: null,
    compressedSize: null,
    compressedWidth: 0,
    compressedHeight: 0,
    status: 'pending',
  }
}

export async function compressImage(
  imageFile: ImageFile,
  options: CompressionOptions,
): Promise<Partial<ImageFile>> {
  const img = await loadImage(imageFile.originalUrl)

  const { maxWidth, maxHeight } = options
  let targetWidth = img.naturalWidth
  let targetHeight = img.naturalHeight

  if (targetWidth > maxWidth || targetHeight > maxHeight) {
    const ratio = Math.min(maxWidth / targetWidth, maxHeight / targetHeight)
    targetWidth = Math.round(targetWidth * ratio)
    targetHeight = Math.round(targetHeight * ratio)
  }

  targetWidth = Math.max(1, targetWidth)
  targetHeight = Math.max(1, targetHeight)

  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas context not available')

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b)
        else reject(new Error('Compression failed'))
      },
      options.format,
      options.quality,
    )
  })

  const compressedUrl = URL.createObjectURL(blob)

  return {
    compressedUrl,
    compressedSize: blob.size,
    compressedWidth: targetWidth,
    compressedHeight: targetHeight,
    status: 'done',
  }
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function reductionPercent(original: number, compressed: number): number {
  if (original === 0) return 0
  return Math.round((1 - compressed / original) * 100)
}

export function downloadBlob(url: string, filename: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

export function getOutputExtension(format: string): string {
  switch (format) {
    case 'image/webp': return '.webp'
    case 'image/png': return '.png'
    case 'image/jpeg': return '.jpg'
    default: return '.webp'
  }
}

export function buildFilterCSS(f: FilterState): string {
  const parts: string[] = []
  if (f.brightness !== 100) parts.push(`brightness(${f.brightness}%)`)
  if (f.contrast !== 100) parts.push(`contrast(${f.contrast}%)`)
  if (f.saturate !== 100) parts.push(`saturate(${f.saturate}%)`)
  if (f.blur > 0) parts.push(`blur(${f.blur}px)`)
  if (f.hueRotate !== 0) parts.push(`hue-rotate(${f.hueRotate}deg)`)
  return parts.length > 0 ? parts.join(' ') : 'none'
}

export function computeEditedDimensions(
  originalWidth: number,
  originalHeight: number,
  edit: EditState,
): { width: number; height: number } {
  if (edit.crop) {
    return {
      width: Math.max(1, Math.round(edit.crop.width)),
      height: Math.max(1, Math.round(edit.crop.height)),
    }
  }

  const radians = (edit.rotation * Math.PI) / 180
  const absCos = Math.abs(Math.cos(radians))
  const absSin = Math.abs(Math.sin(radians))
  const w = Math.round(originalWidth * absCos + originalHeight * absSin)
  const h = Math.round(originalWidth * absSin + originalHeight * absCos)

  return { width: Math.max(1, w), height: Math.max(1, h) }
}

function drawRotatedFlipped(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  srcW: number,
  srcH: number,
  radians: number,
  flipH: boolean,
  flipV: boolean,
) {
  const absCos = Math.abs(Math.cos(radians))
  const absSin = Math.abs(Math.sin(radians))
  const rotW = Math.round(srcW * absCos + srcH * absSin)
  const rotH = Math.round(srcW * absSin + srcH * absCos)

  ctx.save()
  ctx.translate(rotW / 2, rotH / 2)
  ctx.rotate(radians)
  if (flipH) ctx.scale(-1, 1)
  if (flipV) ctx.scale(1, -1)
  ctx.drawImage(img, -srcW / 2, -srcH / 2, srcW, srcH)
  ctx.restore()
}

export async function applyEdits(
  imageSrc: string,
  _originalWidth: number,
  _originalHeight: number,
  edit: EditState,
  format: string = 'image/png',
  quality: number = 1,
): Promise<{ blob: Blob; url: string; width: number; height: number }> {
  const img = await loadImage(imageSrc)
  const srcW = img.naturalWidth
  const srcH = img.naturalHeight
  const radians = (edit.rotation * Math.PI) / 180
  const absCos = Math.abs(Math.cos(radians))
  const absSin = Math.abs(Math.sin(radians))
  const rotW = Math.round(srcW * absCos + srcH * absSin)
  const rotH = Math.round(srcW * absSin + srcH * absCos)

  const filterCSS = buildFilterCSS(edit.filters)

  let finalCanvas: HTMLCanvasElement

  if (edit.crop) {
    const rotCanvas = document.createElement('canvas')
    rotCanvas.width = Math.max(1, rotW)
    rotCanvas.height = Math.max(1, rotH)
    const rotCtx = rotCanvas.getContext('2d')!
    rotCtx.imageSmoothingEnabled = true
    rotCtx.imageSmoothingQuality = 'high'
    if (filterCSS !== 'none') rotCtx.filter = filterCSS
    drawRotatedFlipped(rotCtx, img, srcW, srcH, radians, edit.flipH, edit.flipV)

    const cropW = Math.max(1, Math.round(edit.crop.width))
    const cropH = Math.max(1, Math.round(edit.crop.height))

    finalCanvas = document.createElement('canvas')
    finalCanvas.width = cropW
    finalCanvas.height = cropH
    const finalCtx = finalCanvas.getContext('2d')!
    finalCtx.imageSmoothingEnabled = true
    finalCtx.imageSmoothingQuality = 'high'
    finalCtx.drawImage(
      rotCanvas,
      Math.round(edit.crop.x),
      Math.round(edit.crop.y),
      cropW,
      cropH,
      0,
      0,
      cropW,
      cropH,
    )
  } else {
    finalCanvas = document.createElement('canvas')
    finalCanvas.width = Math.max(1, rotW)
    finalCanvas.height = Math.max(1, rotH)
    const ctx = finalCanvas.getContext('2d')!
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    if (filterCSS !== 'none') ctx.filter = filterCSS
    drawRotatedFlipped(ctx, img, srcW, srcH, radians, edit.flipH, edit.flipV)
  }

  const canvasW = finalCanvas.width
  const canvasH = finalCanvas.height

  if (edit.textOverlays.length > 0) {
    const ctx = finalCanvas.getContext('2d')!
    ctx.filter = 'none'

    for (const overlay of edit.textOverlays) {
      ctx.save()
      ctx.font = `${overlay.fontSize}px ${overlay.fontFamily}`
      ctx.fillStyle = overlay.fill
      ctx.textBaseline = 'top'

      const tx = edit.crop ? (overlay.x - edit.crop.x) : overlay.x
      const ty = edit.crop ? (overlay.y - edit.crop.y) : overlay.y
      ctx.fillText(overlay.text, tx, ty)
      ctx.restore()
    }
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    finalCanvas.toBlob(
      (b) => { if (b) resolve(b); else reject(new Error('Export failed')) },
      format,
      quality,
    )
  })

  return {
    blob,
    url: URL.createObjectURL(blob),
    width: canvasW,
    height: canvasH,
  }
}

export function pushHistory(
  history: HistoryEntry[],
  state: EditState,
  label: string,
  maxEntries: number = 50,
): HistoryEntry[] {
  const next = [...history, { state: structuredClone(state), label }]
  return next.length > maxEntries ? next.slice(next.length - maxEntries) : next
}

export function undo(_history: HistoryEntry[], currentIndex: number): number {
  return Math.max(0, currentIndex - 1)
}

export function redo(_history: HistoryEntry[], currentIndex: number): number {
  return Math.min(_history.length - 1, currentIndex + 1)
}
