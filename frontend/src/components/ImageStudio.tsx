import { useState, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { revealVariants, staggerContainer } from '../hooks/useScrollReveal'
import { ComparisonSlider } from './ComparisonSlider'
import { EditorToolbar } from './EditorToolbar'
import { EditorCanvas } from './EditorCanvas'
import { FilterPanel } from './FilterPanel'
import { RotatePanel } from './RotatePanel'
import { TextOverlayPanel } from './TextOverlayPanel'
import {
  type ImageFile,
  type CompressionOptions,
  type ToolMode,
  type EditState,
  type CropRect,
  type HistoryEntry,
  type TextOverlay,
  DEFAULT_OPTIONS,
  DEFAULT_EDIT_STATE,
  DEFAULT_FILTERS,
  createImageFile,
  compressImage,
  applyEdits,
  formatBytes,
  reductionPercent,
  downloadBlob,
  getOutputExtension,
  pushHistory,
  undo,
  redo,
} from '../lib/imageEngine'

export function ImageStudio() {
  const [images, setImages] = useState<ImageFile[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [options, setOptions] = useState<CompressionOptions>(DEFAULT_OPTIONS)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [activeTool, setActiveTool] = useState<ToolMode>('compress')
  const [editStates, setEditStates] = useState<Map<string, EditState>>(new Map())
  const [histories, setHistories] = useState<Map<string, HistoryEntry[]>>(new Map())
  const [historyIndices, setHistoryIndices] = useState<Map<string, number>>(new Map())

  const [editedUrl, setEditedUrl] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  const selectedImage = images[selectedIndex] ?? null

  const currentEdit: EditState = selectedImage
    ? (editStates.get(selectedImage.id) ?? { ...DEFAULT_EDIT_STATE })
    : { ...DEFAULT_EDIT_STATE }

  const currentHistory: HistoryEntry[] = selectedImage
    ? (histories.get(selectedImage.id) ?? [{ state: { ...DEFAULT_EDIT_STATE }, label: 'Initial' }])
    : [{ state: { ...DEFAULT_EDIT_STATE }, label: 'Initial' }]

  const currentHistoryIndex: number = selectedImage
    ? (historyIndices.get(selectedImage.id) ?? 0)
    : 0

  const canUndo = currentHistoryIndex > 0
  const canRedo = currentHistoryIndex < currentHistory.length - 1

  const setCurrentEdit = useCallback(
    (edit: EditState, label: string = 'Edit') => {
      if (!selectedImage) return
      setEditStates((prev) => {
        const next = new Map(prev)
        next.set(selectedImage.id, edit)
        return next
      })
      const newHistory = pushHistory(currentHistory, edit, label)
      const newIndex = newHistory.length - 1
      setHistories((prev) => {
        const next = new Map(prev)
        next.set(selectedImage.id, newHistory)
        return next
      })
      setHistoryIndices((prev) => {
        const next = new Map(prev)
        next.set(selectedImage.id, newIndex)
        return next
      })
      setEditedUrl(null)
    },
    [selectedImage, currentHistory],
  )

  const handleUndo = useCallback(() => {
    if (!selectedImage) return
    const newIndex = undo(currentHistory, currentHistoryIndex)
    const state = currentHistory[newIndex].state
    setEditStates((prev) => {
      const next = new Map(prev)
      next.set(selectedImage.id, state)
      return next
    })
    setHistoryIndices((prev) => {
      const next = new Map(prev)
      next.set(selectedImage.id, newIndex)
      return next
    })
    setEditedUrl(null)
  }, [selectedImage, currentHistory, currentHistoryIndex])

  const handleRedo = useCallback(() => {
    if (!selectedImage) return
    const newIndex = redo(currentHistory, currentHistoryIndex)
    const state = currentHistory[newIndex].state
    setEditStates((prev) => {
      const next = new Map(prev)
      next.set(selectedImage.id, state)
      return next
    })
    setHistoryIndices((prev) => {
      const next = new Map(prev)
      next.set(selectedImage.id, newIndex)
      return next
    })
    setEditedUrl(null)
  }, [selectedImage, currentHistory, currentHistoryIndex])

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const valid = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (valid.length === 0) return

    const newImages = await Promise.all(valid.map(createImageFile))
    setImages((prev) => {
      const updated = [...prev, ...newImages]
      if (prev.length === 0) setSelectedIndex(0)
      return updated
    })
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    addFiles(e.dataTransfer.files)
  }, [addFiles])

  const handleCompress = useCallback(async () => {
    const targets = images.filter((img) => img.status === 'pending' || img.status === 'error')
    if (targets.length === 0) return

    for (const img of targets) {
      setImages((prev) =>
        prev.map((i) => (i.id === img.id ? { ...i, status: 'processing' as const } : i)),
      )

      try {
        const result = await compressImage(img, options)
        setImages((prev) =>
          prev.map((i) => (i.id === img.id ? { ...i, ...result } : i)),
        )
      } catch {
        setImages((prev) =>
          prev.map((i) =>
            i.id === img.id ? { ...i, status: 'error' as const, error: 'Compression failed' } : i,
          ),
        )
      }
    }
  }, [images, options])

  const handleExportEdit = useCallback(async () => {
    if (!selectedImage) return
    setIsExporting(true)
    try {
      const result = await applyEdits(
        selectedImage.originalUrl,
        selectedImage.originalWidth,
        selectedImage.originalHeight,
        currentEdit,
        options.format,
        options.quality,
      )
      if (editedUrl) URL.revokeObjectURL(editedUrl)
      setEditedUrl(result.url)
    } catch {
      // silent
    }
    setIsExporting(false)
  }, [selectedImage, currentEdit, options.format, options.quality, editedUrl])

  const handleDownload = useCallback(
    (img: ImageFile) => {
      if (!img.compressedUrl) return
      const baseName = img.file.name.replace(/\.[^.]+$/, '')
      const ext = getOutputExtension(options.format)
      downloadBlob(img.compressedUrl, `${baseName}-compressed${ext}`)
    },
    [options.format],
  )

  const handleDownloadEdited = useCallback(() => {
    if (!editedUrl || !selectedImage) return
    const baseName = selectedImage.file.name.replace(/\.[^.]+$/, '')
    const ext = getOutputExtension(options.format)
    downloadBlob(editedUrl, `${baseName}-edited${ext}`)
  }, [editedUrl, selectedImage, options.format])

  const handleDownloadAll = useCallback(() => {
    images
      .filter((img) => img.status === 'done' && img.compressedUrl)
      .forEach((img) => handleDownload(img))
  }, [images, handleDownload])

  const handleRemove = useCallback(
    (id: string) => {
      setImages((prev) => {
        const idx = prev.findIndex((i) => i.id === id)
        const updated = prev.filter((i) => i.id !== id)
        if (selectedIndex >= updated.length) {
          setSelectedIndex(Math.max(0, updated.length - 1))
        }
        if (idx <= selectedIndex && selectedIndex > 0) {
          setSelectedIndex((s) => s - 1)
        }
        return updated
      })
      setEditStates((prev) => {
        const next = new Map(prev)
        next.delete(id)
        return next
      })
    },
    [selectedIndex],
  )

  const handleCropChange = useCallback(
    (crop: CropRect) => {
      setCurrentEdit({ ...currentEdit, crop }, 'Crop')
    },
    [currentEdit, setCurrentEdit],
  )

  const handleStartCrop = useCallback(() => {
    if (!selectedImage) return
    const initialCrop: CropRect = {
      x: 0,
      y: 0,
      width: selectedImage.originalWidth * 0.8,
      height: selectedImage.originalHeight * 0.8,
    }
    setCurrentEdit({ ...currentEdit, crop: initialCrop }, 'Start Crop')
  }, [selectedImage, currentEdit, setCurrentEdit])

  const handleApplyCrop = useCallback(() => {
    if (!currentEdit.crop || !selectedImage) return
    handleExportEdit()
  }, [currentEdit.crop, selectedImage, handleExportEdit])

  const handleCancelCrop = useCallback(() => {
    setCurrentEdit({ ...currentEdit, crop: null }, 'Cancel Crop')
  }, [currentEdit, setCurrentEdit])

  const handleAddTextAt = useCallback(
    (x: number, y: number) => {
      const overlay: TextOverlay = {
        id: `txt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        text: 'Text',
        x,
        y,
        fontSize: 32,
        fontFamily: 'Inter',
        fill: '#fef3c7',
      }
      setCurrentEdit({ ...currentEdit, textOverlays: [...currentEdit.textOverlays, overlay] }, 'Add Text')
    },
    [currentEdit, setCurrentEdit],
  )

  const hasEdits =
    currentEdit.rotation !== 0 ||
    currentEdit.flipH ||
    currentEdit.flipV ||
    currentEdit.crop !== null ||
    currentEdit.textOverlays.length > 0 ||
    JSON.stringify(currentEdit.filters) !== JSON.stringify(DEFAULT_FILTERS)

  const totalOriginal = images.reduce((sum, img) => sum + img.originalSize, 0)
  const totalCompressed = images.reduce((sum, img) => sum + (img.compressedSize ?? 0), 0)
  const doneCount = images.filter((img) => img.status === 'done').length

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12"
    >
      {/* Left column: Upload + Settings */}
      <div className="lg:col-span-5">
        <motion.div variants={revealVariants} custom={0} className="mb-10">
          <p className="eyebrow text-[var(--color-primary)] mb-3">Image Studio</p>
          <h2 className="text-3xl md:text-4xl font-serif font-normal text-[var(--color-cream)] leading-tight">
            Comprima & redimensione<br />
            <span className="text-[var(--color-coral)]">direto no browser</span>
          </h2>
          <p className="mt-4 text-[var(--color-text-muted)] max-w-md">
            Sem upload. Sem servidor. Suas imagens nunca saem do seu computador.
          </p>
        </motion.div>

        {/* Drop Zone */}
        <motion.div variants={revealVariants} custom={0.1}>
          <div
            className={`drop-zone ${dragActive ? 'drop-zone--active' : ''} flex flex-col items-center justify-center py-16 px-6 text-center cursor-pointer`}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && addFiles(e.target.files)}
            />
            <svg className="w-10 h-10 text-[var(--color-text-muted)] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-[var(--color-text-muted)] text-sm">
              Arraste imagens aqui ou <span className="text-[var(--color-primary)] link-underline">clique para selecionar</span>
            </p>
            <p className="label-mono text-[var(--color-text-muted)] text-[0.625rem] mt-2">
              PNG · JPG · WEBP · GIF
            </p>
          </div>
        </motion.div>

        {/* Editor Toolbar */}
        {selectedImage && (
          <motion.div variants={revealVariants} custom={0.15} className="mt-6">
            <EditorToolbar
              activeTool={activeTool}
              onToolChange={setActiveTool}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={handleUndo}
              onRedo={handleRedo}
            />
          </motion.div>
        )}

        {/* Tool Panels */}
        {selectedImage && (
          <motion.div variants={revealVariants} custom={0.2} className="mt-4">
            {activeTool === 'compress' && (
              <div className="group editorial-divider py-8">
                <div className="flex items-baseline gap-4 mb-6">
                  <span className="section-number">01</span>
                  <h3 className="text-xl font-serif font-normal text-[var(--color-cream)]">Configurações</h3>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="eyebrow text-[var(--color-text-muted)] mb-2 block text-xs">Qualidade — {Math.round(options.quality * 100)}%</label>
                    <input
                      type="range"
                      min={0.1}
                      max={1}
                      step={0.05}
                      value={options.quality}
                      onChange={(e) => setOptions((o) => ({ ...o, quality: parseFloat(e.target.value) }))}
                      className="w-full accent-[var(--color-primary)]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="eyebrow text-[var(--color-text-muted)] mb-2 block text-xs">Largura máx.</label>
                      <input
                        type="number"
                        value={options.maxWidth}
                        onChange={(e) => setOptions((o) => ({ ...o, maxWidth: Math.max(1, parseInt(e.target.value) || 0) }))}
                        className="w-full bg-transparent border-0 border-b border-[var(--color-border)] px-0 py-2.5 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition-colors stat-value"
                      />
                    </div>
                    <div>
                      <label className="eyebrow text-[var(--color-text-muted)] mb-2 block text-xs">Altura máx.</label>
                      <input
                        type="number"
                        value={options.maxHeight}
                        onChange={(e) => setOptions((o) => ({ ...o, maxHeight: Math.max(1, parseInt(e.target.value) || 0) }))}
                        className="w-full bg-transparent border-0 border-b border-[var(--color-border)] px-0 py-2.5 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition-colors stat-value"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="eyebrow text-[var(--color-text-muted)] mb-2 block text-xs">Formato de saída</label>
                    <div className="flex gap-2">
                      {(['image/webp', 'image/jpeg', 'image/png'] as const).map((fmt) => (
                        <button
                          key={fmt}
                          onClick={() => setOptions((o) => ({ ...o, format: fmt }))}
                          aria-pressed={options.format === fmt}
                          className={`px-4 py-2 text-sm transition-all duration-200 ${
                            options.format === fmt
                              ? 'bg-[var(--color-primary)] text-[var(--color-cream)]'
                              : 'bg-[var(--color-bg)] text-[var(--color-text-muted)] border-b border-[var(--color-border)] hover:border-[var(--color-primary)]'
                          }`}
                        >
                          {fmt === 'image/webp' ? 'WebP' : fmt === 'image/jpeg' ? 'JPEG' : 'PNG'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTool === 'crop' && (
              <div className="group editorial-divider py-8">
                <div className="flex items-baseline gap-4 mb-6">
                  <span className="section-number">02</span>
                  <h3 className="text-xl font-serif font-normal text-[var(--color-cream)]">Crop</h3>
                </div>

                {!currentEdit.crop ? (
                  <button
                    onClick={handleStartCrop}
                    className="btn-clipped"
                  >
                    <span className="btn-text-back text-xs font-semibold">Start Crop Selection</span>
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="eyebrow text-[var(--color-text-muted)] mb-1 block text-[0.625rem]">X</label>
                        <input
                          type="number"
                          value={Math.round(currentEdit.crop.x)}
                          onChange={(e) =>
                            handleCropChange({ ...currentEdit.crop!, x: Math.max(0, parseInt(e.target.value) || 0) })
                          }
                          className="w-full bg-transparent border-0 border-b border-[var(--color-border)] px-0 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] stat-value"
                        />
                      </div>
                      <div>
                        <label className="eyebrow text-[var(--color-text-muted)] mb-1 block text-[0.625rem]">Y</label>
                        <input
                          type="number"
                          value={Math.round(currentEdit.crop.y)}
                          onChange={(e) =>
                            handleCropChange({ ...currentEdit.crop!, y: Math.max(0, parseInt(e.target.value) || 0) })
                          }
                          className="w-full bg-transparent border-0 border-b border-[var(--color-border)] px-0 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] stat-value"
                        />
                      </div>
                      <div>
                        <label className="eyebrow text-[var(--color-text-muted)] mb-1 block text-[0.625rem]">Width</label>
                        <input
                          type="number"
                          value={Math.round(currentEdit.crop.width)}
                          onChange={(e) =>
                            handleCropChange({ ...currentEdit.crop!, width: Math.max(20, parseInt(e.target.value) || 20) })
                          }
                          className="w-full bg-transparent border-0 border-b border-[var(--color-border)] px-0 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] stat-value"
                        />
                      </div>
                      <div>
                        <label className="eyebrow text-[var(--color-text-muted)] mb-1 block text-[0.625rem]">Height</label>
                        <input
                          type="number"
                          value={Math.round(currentEdit.crop.height)}
                          onChange={(e) =>
                            handleCropChange({ ...currentEdit.crop!, height: Math.max(20, parseInt(e.target.value) || 20) })
                          }
                          className="w-full bg-transparent border-0 border-b border-[var(--color-border)] px-0 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] stat-value"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={handleApplyCrop}
                        className="btn-clipped flex-1"
                      >
                        <span className="btn-text-back text-xs font-semibold">Apply Crop</span>
                      </button>
                      <button
                        onClick={handleCancelCrop}
                        className="flex-1 px-4 py-3 text-sm text-[var(--color-text-muted)] border border-[var(--color-border)] hover:border-[var(--color-coral)] hover:text-[var(--color-coral)] transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTool === 'filters' && (
              <div className="group editorial-divider py-8">
                <div className="flex items-baseline gap-4 mb-6">
                  <span className="section-number">03</span>
                  <h3 className="text-xl font-serif font-normal text-[var(--color-cream)]">Filters</h3>
                </div>
                <FilterPanel
                  filters={currentEdit.filters}
                  onChange={(filters) => setCurrentEdit({ ...currentEdit, filters }, 'Filter')}
                  onReset={() => setCurrentEdit({ ...currentEdit, filters: { ...DEFAULT_FILTERS } }, 'Reset Filters')}
                />
              </div>
            )}

            {activeTool === 'rotate' && (
              <div className="group editorial-divider py-8">
                <div className="flex items-baseline gap-4 mb-6">
                  <span className="section-number">04</span>
                  <h3 className="text-xl font-serif font-normal text-[var(--color-cream)]">Transform</h3>
                </div>
                <RotatePanel edit={currentEdit} onEditChange={(edit) => setCurrentEdit(edit, 'Transform')} />
              </div>
            )}

            {activeTool === 'text' && (
              <div className="group editorial-divider py-8">
                <div className="flex items-baseline gap-4 mb-6">
                  <span className="section-number">05</span>
                  <h3 className="text-xl font-serif font-normal text-[var(--color-cream)]">Text</h3>
                </div>
                <TextOverlayPanel edit={currentEdit} onEditChange={(edit) => setCurrentEdit(edit, 'Text')} />
              </div>
            )}
          </motion.div>
        )}

        {/* Actions */}
        <motion.div variants={revealVariants} custom={0.3} className="mt-8 space-y-3">
          {activeTool === 'compress' && (
            <>
              <button
                onClick={handleCompress}
                disabled={images.length === 0 || images.every((i) => i.status === 'done' || i.status === 'processing')}
                className="btn-clipped w-full"
              >
                <span className="btn-text-back flex items-center justify-center gap-2 font-semibold text-sm tracking-wide">
                  {images.some((i) => i.status === 'processing')
                    ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Comprimindo...
                      </>
                    )
                    : doneCount > 0
                      ? `Comprimir ${images.filter((i) => i.status === 'pending' || i.status === 'error').length || '0'} restantes`
                      : `Comprimir ${images.length || '0'} imagens`}
                </span>
              </button>

              {doneCount > 0 && (
                <button
                  onClick={handleDownloadAll}
                  className="w-full px-4 py-3 text-sm text-[var(--color-primary)] border border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/10 transition-colors"
                >
                  Baixar todas ({doneCount})
                </button>
              )}
            </>
          )}

          {selectedImage && activeTool !== 'compress' && hasEdits && (
            <button
              onClick={handleExportEdit}
              disabled={isExporting}
              className="btn-clipped w-full"
            >
              <span className="btn-text-back flex items-center justify-center gap-2 font-semibold text-sm tracking-wide">
                {isExporting
                  ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Exporting...
                    </>
                  )
                  : 'Export Edited Image'}
              </span>
            </button>
          )}

          {editedUrl && (
            <button
              onClick={handleDownloadEdited}
              className="w-full px-4 py-3 text-sm text-[var(--color-primary)] border border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/10 transition-colors"
            >
              Download Edited Image
            </button>
          )}
        </motion.div>

        {/* File List */}
        {images.length > 0 && (
          <motion.div variants={revealVariants} custom={0.4} className="group editorial-divider py-8 mt-6">
            <div className="flex items-baseline gap-4 mb-6">
              <span className="section-number">06</span>
              <h3 className="text-xl font-serif font-normal text-[var(--color-cream)]">Imagens</h3>
            </div>

            <div className="space-y-1 max-h-80 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-[var(--color-border)] [&::-webkit-scrollbar-thumb]:rounded-sm [&::-webkit-scrollbar-track]:transparent">
              {images.map((img, idx) => (
                <div
                  key={img.id}
                  onClick={() => setSelectedIndex(idx)}
                  className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
                    idx === selectedIndex
                      ? 'bg-[var(--color-bg-elevated)] border-l-2 border-[var(--color-primary)]'
                      : 'hover:bg-[var(--color-bg-alt)] border-l-2 border-transparent'
                  }`}
                >
                  <img src={img.originalUrl} alt="" className="w-8 h-8 object-cover shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[var(--color-text)] truncate">{img.file.name}</p>
                    <p className="label-mono text-[0.625rem] text-[var(--color-text-muted)]">
                      {formatBytes(img.originalSize)} · {img.originalWidth}×{img.originalHeight}
                    </p>
                  </div>
                  {img.status === 'done' && img.compressedSize != null && (
                    <span className="label-mono text-[0.625rem] text-[var(--color-primary)] shrink-0">
                      -{reductionPercent(img.originalSize, img.compressedSize)}%
                    </span>
                  )}
                  {img.status === 'processing' && (
                    <svg className="animate-spin w-4 h-4 text-[var(--color-primary)] shrink-0" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemove(img.id) }}
                    className="text-[var(--color-text-muted)] hover:text-[var(--color-coral)] transition-colors shrink-0"
                    aria-label="Remover"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Stats summary */}
        {doneCount > 0 && activeTool === 'compress' && (
          <motion.div variants={revealVariants} custom={0.5} className="mt-6 grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="stat-value text-lg text-[var(--color-cream)]">{formatBytes(totalOriginal)}</p>
              <p className="label-mono text-[0.625rem] text-[var(--color-text-muted)] mt-1">Original</p>
            </div>
            <div className="text-center">
              <p className="stat-value text-lg text-[var(--color-primary)]">{formatBytes(totalCompressed)}</p>
              <p className="label-mono text-[0.625rem] text-[var(--color-text-muted)] mt-1">Comprimido</p>
            </div>
            <div className="text-center">
              <p className="stat-value text-lg text-[var(--color-coral)]">-{reductionPercent(totalOriginal, totalCompressed)}%</p>
              <p className="label-mono text-[0.625rem] text-[var(--color-text-muted)] mt-1">Redução</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Right column: Preview / Canvas */}
      <div className="lg:col-span-7">
        <div className="lg:sticky lg:top-24">
          <motion.div variants={revealVariants} custom={0.3}>
            <p className="eyebrow text-[var(--color-text-muted)] mb-4">Preview</p>

            {selectedImage ? (
              <div>
                {activeTool === 'compress' ? (
                  selectedImage.status === 'done' && selectedImage.compressedUrl ? (
                    <ComparisonSlider
                      beforeSrc={selectedImage.originalUrl}
                      afterSrc={selectedImage.compressedUrl}
                      beforeLabel="Original"
                      afterLabel="Compressed"
                      width={selectedImage.originalWidth}
                      height={selectedImage.originalHeight}
                    />
                  ) : (
                    <div className="bg-[var(--color-bg-alt)] border border-[var(--color-border-subtle)] flex items-center justify-center" style={{ minHeight: 400 }}>
                      <img
                        src={selectedImage.originalUrl}
                        alt={selectedImage.file.name}
                        className="max-w-full max-h-[600px] object-contain"
                      />
                    </div>
                  )
                ) : editedUrl ? (
                  <div className="bg-[var(--color-bg-alt)] border border-[var(--color-border-subtle)] flex items-center justify-center" style={{ minHeight: 400 }}>
                    <img
                      src={editedUrl}
                      alt="Edited preview"
                      className="max-w-full max-h-[600px] object-contain"
                    />
                  </div>
                ) : (
                  <EditorCanvas
                    imageSrc={selectedImage.originalUrl}
                    originalWidth={selectedImage.originalWidth}
                    originalHeight={selectedImage.originalHeight}
                    edit={currentEdit}
                    activeTool={activeTool}
                    onCropChange={handleCropChange}
                    onEditTextAt={handleAddTextAt}
                  />
                )}

                {/* Per-image stats (compress mode only) */}
                {activeTool === 'compress' && selectedImage.status === 'done' && selectedImage.compressedSize != null && (
                  <div className="mt-4 grid grid-cols-4 gap-3">
                    <div className="fade-border-bottom pb-3">
                      <p className="stat-value text-sm text-[var(--color-cream)]">{formatBytes(selectedImage.originalSize)}</p>
                      <p className="label-mono text-[0.5625rem] text-[var(--color-text-muted)] mt-1">Original</p>
                    </div>
                    <div className="fade-border-bottom pb-3">
                      <p className="stat-value text-sm text-[var(--color-primary)]">{formatBytes(selectedImage.compressedSize)}</p>
                      <p className="label-mono text-[0.5625rem] text-[var(--color-text-muted)] mt-1">Comprimido</p>
                    </div>
                    <div className="fade-border-bottom pb-3">
                      <p className="stat-value text-sm text-[var(--color-coral)]">
                        -{reductionPercent(selectedImage.originalSize, selectedImage.compressedSize)}%
                      </p>
                      <p className="label-mono text-[0.5625rem] text-[var(--color-text-muted)] mt-1">Redução</p>
                    </div>
                    <div className="fade-border-bottom pb-3">
                      <p className="stat-value text-sm text-[var(--color-cream)]">
                        {selectedImage.compressedWidth}×{selectedImage.compressedHeight}
                      </p>
                      <p className="label-mono text-[0.5625rem] text-[var(--color-text-muted)] mt-1">Dimensões</p>
                    </div>
                  </div>
                )}

                {activeTool === 'compress' && selectedImage.status === 'done' && (
                  <button
                    onClick={() => handleDownload(selectedImage)}
                    className="btn-clipped mt-4 w-full"
                  >
                    <span className="btn-text-back text-xs font-semibold">Baixar esta imagem</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[400px] bg-[var(--color-bg-alt)] border border-[var(--color-border-subtle)] geometric-bg">
                <div className="text-center relative z-10">
                  <p className="font-serif text-2xl text-[var(--color-cream)] mb-2">Preview</p>
                  <p className="text-sm text-[var(--color-text-muted)]">Arraste imagens para começar</p>
                  <p className="label-mono text-[var(--color-primary)] mt-3">100% local · Sem upload</p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}
