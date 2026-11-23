import React, { lazy, Suspense, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Maximize2, X } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useZeStore } from '@/lib/ze/store'
import { cn } from '@/lib/utils'

const ZeChat = lazy(() => import('./ZeChat'))

// Botão "Pergunte ao Zé" presente em todas as telas e o painel lateral com a conversa.
export const ZeLauncher: React.FC = () => {
  const [open, setOpen] = useState(false)
  const { busy } = useZeStore()
  const location = useLocation()
  const navigate = useNavigate()

  // Atalho: Ctrl+J / Cmd+J abre e fecha o Zé
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault()
        setOpen(o => !o)
      }
    }
    // O Zé fecha o painel quando abre um tutorial guiado na tela
    // e outras telas (ex.: Central de Ajuda) podem abrir o Zé
    const onClose = () => setOpen(false)
    const onOpen = () => setOpen(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('ze:close', onClose)
    window.addEventListener('ze:open', onOpen)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('ze:close', onClose)
      window.removeEventListener('ze:open', onOpen)
    }
  }, [])

  if (location.pathname === '/assistente-global') return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Pergunte ao Zé"
        title="Pergunte ao Zé (Ctrl+J)"
        className={cn(
          'ze-launcher fixed bottom-4 right-4 z-50 flex h-12 items-center gap-2 rounded-full border border-sky-200 bg-white/95 pl-1.5 pr-1.5 shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:shadow-xl sm:pr-4',
          open && 'pointer-events-none opacity-0',
        )}
      >
        <span className="relative grid h-9 w-9 place-items-center">
          <span className={cn('absolute inset-0 rounded-full bg-sky-400/30', busy ? 'animate-ping' : 'ze-launcher__pulse')} />
          <img src="/brand/globo.webp" alt="" className="relative h-9 w-9" />
        </span>
        <span className="hidden text-sm font-semibold text-sky-900 sm:inline">Pergunte ao Zé</span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-[460px] [&>button]:hidden"
        >
          <div className="flex items-center gap-3 border-b bg-gradient-to-r from-sky-50 to-background px-4 py-3">
            <img src="/brand/globo.webp" alt="" className="h-9 w-9" />
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base leading-tight">Zé da Global</SheetTitle>
              <p className="text-xs text-muted-foreground">Dados da empresa e ajuda com o sistema</p>
            </div>
            <button
              type="button"
              onClick={() => { setOpen(false); navigate('/assistente-global') }}
              className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Abrir em tela cheia"
              aria-label="Abrir em tela cheia"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1">
            <Suspense fallback={null}>
              {open && <ZeChat variant="panel" autoFocus />}
            </Suspense>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

export default ZeLauncher
