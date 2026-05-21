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
