import { useState } from 'react'
import { motion } from 'framer-motion'
import { Preloader } from './components/Preloader'
import { ImageStudio } from './components/ImageStudio'
import { BetaBanner } from './components/BetaBanner'
import { useLenis } from './hooks/useLenis'

function App() {
  const [showPreloader, setShowPreloader] = useState(true)
  const [bannerDismissed, setBannerDismissed] = useState(() => !!localStorage.getItem('badger-beta-banner-dismissed'))

  useLenis()

  return (
    <>
      {showPreloader && <Preloader title="Kakapo" onComplete={() => setShowPreloader(false)} />}

      <div className="noise-overlay noise-overlay--animated" aria-hidden="true" />

      <motion.div
        initial={{ clipPath: 'inset(0 0 100% 0)' }}
        animate={{ clipPath: 'inset(0 0 0 0)' }}
        transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]"
      >
        {!bannerDismissed && <BetaBanner onDismiss={() => { setBannerDismissed(true); localStorage.setItem('badger-beta-banner-dismissed', '1') }} />}

        <header
          className={`fixed left-0 right-0 z-40 h-16 flex items-center transition-top duration-300 ${bannerDismissed ? 'top-0' : 'top-[76px]'}`}
          style={{ backdropFilter: 'blur(16px)', backgroundColor: 'rgba(12,10,9,0.8)' }}
        >
          <div className="max-w-7xl mx-auto px-6 w-full flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: 'spring', stiffness: 200, damping: 15 }}
                className="w-8 h-8 flex items-center justify-center"
              >
                <svg className="w-6 h-6 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </motion.div>
              <h1 className="text-lg font-serif font-normal tracking-tight text-[var(--color-cream)]">Kakapo</h1>
            </div>
            <div className="flex items-center gap-4">
        <span className="label-mono text-[var(--color-primary)]">100% local</span>
        <span className="label-mono text-[var(--color-text-muted)]">Edit · Compress · Export</span>
            </div>
          </div>
        </header>

        <main className={`max-w-7xl mx-auto px-6 pb-16 lg:px-8 transition-[padding] duration-300 ${bannerDismissed ? 'pt-20' : 'pt-[7rem]'}`}>
        <ImageStudio />
      </main>

        <footer className="fade-border-top px-6 py-6 mt-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <p className="font-serif text-sm text-[var(--color-text-muted)]">
              Desenvolvido por Isaac Nathan
            </p>
            <a
              href="https://github.com/xAngryBadger"
              className="link-underline label-mono text-[var(--color-primary)] hover:text-[var(--color-primary-light)]"
            >
              GitHub
            </a>
          </div>
        </footer>
      </motion.div>
    </>
  )
}

export default App
