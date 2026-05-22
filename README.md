# Kakapo

Client-side image editor — compress, crop, filter, rotate, and overlay text, entirely in the browser.

**Zero uploads. Zero servers. Your images never leave your machine.**

## Features

- **Compress** — Quality, max dimensions, output format (WebP / JPEG / PNG)
- **Crop** — Drag to select, numeric X/Y/W/H inputs
- **Filters** — Brightness, contrast, saturation, blur, hue rotation
- **Transform** — 90° rotation, free-angle slider, horizontal/vertical flip
- **Text overlays** — Place, drag, resize, color, font selection
- **Undo/Redo** — Full edit history with keyboard shortcuts (Ctrl+Z / Ctrl+Shift+Z)
- **Batch** — Multi-image upload, compress all, download all
- **100% local** — No backend, no API calls, works offline

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS v4
- Framer Motion
- Lenis (smooth scroll)
- Canvas API for all image processing

## Getting Started

```bash
cd frontend
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

## Architecture

- `src/lib/imageEngine.ts` — Core image processing (compression, edit pipeline, history)
- `src/components/EditorCanvas.tsx` — Interactive canvas with crop handles, text dragging
- `src/components/ImageStudio.tsx` — Main editor orchestrator (state, tools, export)
- `src/components/FilterPanel.tsx` — Filter sliders with batched history
- `src/components/RotatePanel.tsx` — Rotation/flip controls
- `src/components/TextOverlayPanel.tsx` — Text overlay management with X/Y positioning
- `src/components/ComparisonSlider.tsx` — Before/after comparison for compression
- `src/components/EditorToolbar.tsx` — Tool mode switcher + undo/redo

## License

MIT
