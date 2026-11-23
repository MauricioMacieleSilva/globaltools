import React, { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

const DEFAULT_MESSAGES = [
  'Conectando ao Globinho',
  'Buscando os pedidos de hoje',
  'Conferindo a produção',
  'Organizando a carteira de clientes',
  'Quase lá',
]

const SPIN_MESSAGES = [
  'Girando o mundo do aço',
  'Mais uma volta, mesmo?',
  'O globo agradece o carinho',
  'Já já tudo pronto',
]

interface BrandLoaderProps {
  /** Frases que vão se alternando abaixo do globo */
  messages?: string[]
  /** Ocupa a tela toda (abertura do sistema) ou só a área de conteúdo */
  fullScreen?: boolean
  className?: string
}

// Loading com o globo da Global Aço: o globo flutua, um anel de luz percorre o
// "G" e as frases mostram o que está sendo carregado. Clicar no globo faz ele
// dar um giro. Se demorar demais, oferece recarregar a página.
export const BrandLoader: React.FC<BrandLoaderProps> = ({
  messages = DEFAULT_MESSAGES,
  fullScreen = false,
  className,
}) => {
  const [index, setIndex] = useState(0)
  const [spins, setSpins] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    if (messages.length < 2) return
    const id = setInterval(() => setIndex(i => (i + 1) % messages.length), 2200)
    return () => clearInterval(id)
  }, [messages.length])

  useEffect(() => {
    const id = setTimeout(() => setSlow(true), 12000)
    return () => clearTimeout(id)
  }, [])

  const spin = () => {
    if (spinning) return
    setSpinning(true)
    setSpins(n => n + 1)
    setTimeout(() => setSpinning(false), 900)
  }

  const text = spins > 0 && spinning
    ? SPIN_MESSAGES[(spins - 1) % SPIN_MESSAGES.length]
    : messages[index % messages.length]

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'brand-loader flex flex-col items-center justify-center px-6 text-center',
        fullScreen ? 'fixed inset-0 z-50 bg-gradient-to-b from-background to-muted/40' : 'min-h-[60vh]',
        className,
      )}
    >
      <button
        type="button"
        onClick={spin}
        aria-label="Girar o globo"
        className="brand-loader__stage group relative grid h-40 w-40 cursor-pointer place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        <span className="brand-loader__glow" aria-hidden />
        <svg className="brand-loader__ring" viewBox="0 0 160 160" aria-hidden>
          <defs>
            <linearGradient id="brandLoaderArc" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0" />
              <stop offset="60%" stopColor="#38bdf8" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#0ea5e9" />
            </linearGradient>
          </defs>
          <circle cx="80" cy="80" r="74" className="brand-loader__track" />
          <circle cx="80" cy="80" r="74" className="brand-loader__arc" stroke="url(#brandLoaderArc)" />
        </svg>
        <img
          src="/brand/globo.webp"
          alt="Global Aço"
          draggable={false}
          className={cn('brand-loader__globe h-28 w-28 select-none', spinning && 'brand-loader__globe--spin')}
        />
      </button>

      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">Global Aço</p>

      <p key={text} className="brand-loader__text mt-2 min-h-[1.5rem] text-base font-medium text-foreground">
        {text}
        <span className="brand-loader__dots" aria-hidden>
          <span>.</span><span>.</span><span>.</span>
        </span>
      </p>

      <div className="brand-loader__bar mt-5 h-1 w-48 overflow-hidden rounded-full bg-primary/10" aria-hidden>
        <span />
      </div>

      {slow ? (
        <div className="mt-6 space-y-2 text-sm text-muted-foreground">
          <p>Está demorando mais que o normal.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-md border bg-background px-4 py-1.5 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted"
          >
            Recarregar
          </button>
        </div>
      ) : (
        <p className="mt-6 text-xs text-muted-foreground/70">Dica: clique no globo</p>
      )}
    </div>
  )
}

export default BrandLoader
