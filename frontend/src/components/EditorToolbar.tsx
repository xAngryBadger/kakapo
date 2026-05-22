import type { ReactNode } from 'react'
import { type ToolMode } from '../lib/imageEngine'

interface EditorToolbarProps {
  activeTool: ToolMode
  onToolChange: (tool: ToolMode) => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}

const tools: { mode: ToolMode; label: string; icon: ReactNode }[] = [
  {
    mode: 'compress',
    label: 'Compress',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    ),
  },
  {
    mode: 'crop',
    label: 'Crop',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 3v4H3m18 0h-4V3m0 18v-4h4M3 17h4v4" />
      </svg>
    ),
  },
  {
    mode: 'filters',
    label: 'Filters',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4h18l-7 8.5V20l-4 1.5V12.5L3 4z" />
      </svg>
    ),
  },
  {
    mode: 'rotate',
    label: 'Rotate',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  {
    mode: 'text',
    label: 'Text',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7V4h16v3M9 20h6M12 4v16" />
      </svg>
    ),
  },
]

export function EditorToolbar({
  activeTool,
  onToolChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: EditorToolbarProps) {
  return (
    <div className="flex items-center gap-1 px-2 py-1.5 bg-[var(--color-bg-alt)] border border-[var(--color-border-subtle)] rounded-sm">
      {tools.map(({ mode, label, icon }) => (
        <button
          key={mode}
          onClick={() => onToolChange(mode)}
          aria-pressed={activeTool === mode}
          title={label}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-all duration-200 ${
            activeTool === mode
              ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border-b border-[var(--color-primary)]'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-cream)] border-b border-transparent'
          }`}
        >
          {icon}
          <span className="hidden sm:inline label-mono text-[0.625rem]">{label}</span>
        </button>
      ))}

      <div className="w-px h-5 bg-[var(--color-border)] mx-2" />

      <button
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo"
        className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-cream)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4" />
        </svg>
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo"
        className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-cream)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 10H11a5 5 0 00-5 5v2M21 10l-4-4M21 10l-4 4" />
        </svg>
      </button>
    </div>
  )
}
