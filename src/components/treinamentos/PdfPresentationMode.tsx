import { useState, useEffect, useRef, useCallback } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, X, Maximize, Minimize } from 'lucide-react'

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

interface PdfPresentationModeProps {
  pdfUrl: string
  title: string
  onClose: () => void
}

export default function PdfPresentationMode({ pdfUrl, title, onClose }: PdfPresentationModeProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const [loading, setLoading] = useState(true)
  const [showControls, setShowControls] = useState(true)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load PDF document
  useEffect(() => {
    let cancelled = false
    const loadPdf = async () => {
      try {
        const doc = await pdfjsLib.getDocument(pdfUrl).promise
        if (!cancelled) {
          setPdfDoc(doc)
          setTotalPages(doc.numPages)
          setLoading(false)
        }
      } catch (err) {
        console.error('Error loading PDF:', err)
        setLoading(false)
      }
    }
    loadPdf()
    return () => { cancelled = true }
  }, [pdfUrl])

  // Render current page
  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDoc || !canvasRef.current || !containerRef.current) return

    const page = await pdfDoc.getPage(pageNum)
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const container = containerRef.current
    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight

    const viewport = page.getViewport({ scale: 1 })
    const scaleX = containerWidth / viewport.width
    const scaleY = containerHeight / viewport.height
    const scale = Math.min(scaleX, scaleY)

    const scaledViewport = page.getViewport({ scale: scale * window.devicePixelRatio })

    canvas.width = scaledViewport.width
    canvas.height = scaledViewport.height
    canvas.style.width = `${scaledViewport.width / window.devicePixelRatio}px`
    canvas.style.height = `${scaledViewport.height / window.devicePixelRatio}px`

    await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise
  }, [pdfDoc])

  useEffect(() => {
    if (pdfDoc) renderPage(currentPage)
  }, [pdfDoc, currentPage, renderPage])

  // Re-render on resize
  useEffect(() => {
    const handleResize = () => { if (pdfDoc) renderPage(currentPage) }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [pdfDoc, currentPage, renderPage])

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault()
        setCurrentPage(p => Math.min(p + 1, totalPages))
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        setCurrentPage(p => Math.max(p - 1, 1))
      } else if (e.key === 'Escape') {
        if (isFullscreen) exitFullscreen()
        else onClose()
      } else if (e.key === 'Home') {
        setCurrentPage(1)
      } else if (e.key === 'End') {
        setCurrentPage(totalPages)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [totalPages, isFullscreen, onClose])

  // Fullscreen
  const enterFullscreen = async () => {
    try {
      await containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } catch {}
  }

  const exitFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      setIsFullscreen(false)
    } catch {}
  }

  useEffect(() => {
    const handler = () => {
      setIsFullscreen(!!document.fullscreenElement)
      if (pdfDoc) renderPage(currentPage)
    }
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [pdfDoc, currentPage, renderPage])

  // Auto-hide controls
  const resetControlsTimer = useCallback(() => {
    setShowControls(true)
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current)
    controlsTimerRef.current = setTimeout(() => setShowControls(false), 3000)
  }, [])

  useEffect(() => {
    resetControlsTimer()
    return () => { if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current) }
  }, [resetControlsTimer])

  const goNext = () => setCurrentPage(p => Math.min(p + 1, totalPages))
  const goPrev = () => setCurrentPage(p => Math.max(p - 1, 1))

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-black flex items-center justify-center select-none"
      onMouseMove={resetControlsTimer}
      onClick={resetControlsTimer}
      style={{ cursor: showControls ? 'default' : 'none' }}
    >
      {loading ? (
        <div className="text-white text-lg animate-pulse">Carregando apresentação...</div>
      ) : (
        <>
          <canvas ref={canvasRef} className="max-w-full max-h-full" />

          {/* Click areas for navigation */}
          <div className="absolute inset-0 flex">
            <div className="w-1/3 h-full cursor-pointer" onClick={goPrev} />
            <div className="w-1/3 h-full" />
            <div className="w-1/3 h-full cursor-pointer" onClick={goNext} />
          </div>

          {/* Controls overlay */}
          <div
            className={`absolute inset-x-0 bottom-0 transition-opacity duration-300 ${
              showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="flex items-center justify-between px-4 sm:px-8 py-4 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20 h-9 w-9">
                  <X className="h-5 w-5" />
                </Button>
                <span className="text-white/80 text-sm font-medium truncate max-w-[200px] sm:max-w-none">
                  {title}
                </span>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <Button variant="ghost" size="icon" onClick={goPrev} disabled={currentPage <= 1} className="text-white hover:bg-white/20 h-9 w-9 disabled:opacity-30">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <span className="text-white text-sm font-mono min-w-[60px] text-center">
                  {currentPage} / {totalPages}
                </span>
                <Button variant="ghost" size="icon" onClick={goNext} disabled={currentPage >= totalPages} className="text-white hover:bg-white/20 h-9 w-9 disabled:opacity-30">
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>

              <Button variant="ghost" size="icon" onClick={isFullscreen ? exitFullscreen : enterFullscreen} className="text-white hover:bg-white/20 h-9 w-9">
                {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
