import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ZeMarkdown } from './ZeMarkdown'
import { ArrowUp, Check, Copy, Loader2, RotateCcw, Search, Sparkles, TriangleAlert } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useUserPermissions, PageKey } from '@/hooks/useUserPermissions'
import { askZe, trimHistory } from '@/lib/ze/agent'
import type { ZeToolContext } from '@/lib/ze/tools'
import { getZeState, resetZe, setZeState, useZeStore, ZeMessage } from '@/lib/ze/store'
import { getRoleLabel } from '@/lib/user-status'
import { cn } from '@/lib/utils'

const PAGE_NAMES: Record<string, string> = {
  '/': 'Dashboard Comercial',
  '/dashboard-comercial': 'Dashboard Comercial',
  '/crm': 'CRM',
  '/clientes': 'Clientes',
  '/producao': 'Fábrica (produção e estoque)',
  '/fretes': 'Fretes',
  '/politica-comercial': 'Política Comercial',
  '/chamados': 'Chamados',
  '/corte-perfil': 'Corte Perfil',
  '/corte-blank': 'Corte Blank',
}

const SUGGESTIONS: { pages: PageKey[]; paths: string[]; text: string }[] = [
  { pages: ['dashboard'], paths: ['/', '/dashboard-comercial'], text: 'Como está o faturamento deste mês comparado ao mês passado?' },
  { pages: ['dashboard'], paths: ['/', '/dashboard-comercial'], text: 'Ranking de vendedores no ano, com peso e ticket médio' },
  { pages: ['dashboard'], paths: ['/', '/dashboard-comercial', '/clientes'], text: 'Quais orçamentos em aberto passam de R$ 100 mil?' },
  { pages: ['dashboard', 'clientes'], paths: ['/clientes'], text: 'Quais clientes bons estão há mais de 90 dias sem comprar?' },
  { pages: ['dashboard'], paths: ['/', '/dashboard-comercial'], text: 'Por que perdemos orçamentos este ano? Mostre os motivos' },
  { pages: ['crm'], paths: ['/crm'], text: 'Quantos contatos cada vendedor fez esta semana?' },
  { pages: ['crm'], paths: ['/crm'], text: 'Quais follow-ups estão atrasados?' },
  { pages: ['producao'], paths: ['/producao'], text: 'O que está atrasado na fábrica?' },
  { pages: ['estoque', 'producao'], paths: ['/producao'], text: 'Quanto temos de bobina em estoque?' },
  { pages: ['fretes'], paths: ['/fretes'], text: 'Qual o custo médio de frete por kg este mês?' },
  { pages: ['politica'], paths: ['/politica-comercial'], text: 'Qual o preço do perfil U 100?' },
]

let counter = 0
const newId = () => `${Date.now()}-${++counter}`

function StepsLine({ steps, live }: { steps: { label: string; ok: boolean }[]; live?: boolean }) {
  const unique = [...new Map(steps.map(s => [s.label, s])).values()]
  if (!unique.length) return null
  return (
    <div className="mb-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
      <Search className="h-3 w-3" />
      <span>{live ? 'Consultando' : 'Consultei'}:</span>
      {unique.map(s => (
        <span
          key={s.label}
          className={cn('rounded-full border px-2 py-0.5', s.ok ? 'bg-background' : 'border-amber-300 bg-amber-50 text-amber-800')}
        >
          {s.label}
        </span>
      ))}
    </div>
  )
}

function ZeAvatar({ size = 'md' }: { size?: 'sm' | 'md' }) {
  return (
    <div className={cn('shrink-0 overflow-hidden rounded-full bg-sky-50 ring-1 ring-sky-200', size === 'sm' ? 'h-7 w-7' : 'h-9 w-9')}>
      <img src="/brand/globo.webp" alt="Zé" className="h-full w-full object-contain p-0.5" />
    </div>
  )
}

function AssistantMessage({ m }: { m: ZeMessage }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex gap-2.5">
      <ZeAvatar size="sm" />
      <div className="min-w-0 flex-1">
        {m.steps?.length ? <StepsLine steps={m.steps} /> : null}
        <div
          className={cn(
            'ze-markdown rounded-2xl rounded-tl-sm border bg-card px-3.5 py-2.5 text-sm leading-relaxed text-foreground shadow-sm',
            m.error && 'border-amber-300 bg-amber-50',
          )}
        >
          {m.error && <TriangleAlert className="mb-1 h-4 w-4 text-amber-600" />}
          <ZeMarkdown text={m.text} />
        </div>
        {!m.error && (
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(m.text)
                setCopied(true)
                setTimeout(() => setCopied(false), 1800)
              } catch { /* sem permissão de cópia */ }
            }}
            className="mt-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        )}
      </div>
    </div>
  )
}

interface ZeChatProps {
  /** Página do Zé (tela cheia) ou painel lateral */
  variant?: 'page' | 'panel'
  autoFocus?: boolean
}

export const ZeChat: React.FC<ZeChatProps> = ({ variant = 'panel', autoFocus }) => {
  const { userProfile } = useAuth()
  const { checkPageAccess, isAdmin } = useUserPermissions()
  const { messages, busy, liveSteps } = useZeStore()
  const [input, setInput] = useState('')
  const location = useLocation()
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const ctx: ZeToolContext = useMemo(
    () => ({ isAdmin, canView: (p: PageKey) => checkPageAccess(p).canView }),
    [isAdmin, checkPageAccess],
  )

  const firstName = (userProfile?.full_name || '').split(' ')[0]
  const pagina = PAGE_NAMES[location.pathname]

  const suggestions = useMemo(() => {
    const allowed = SUGGESTIONS.filter(s => isAdmin || s.pages.some(p => ctx.canView(p)))
    const here = allowed.filter(s => s.paths.includes(location.pathname))
    const rest = allowed.filter(s => !s.paths.includes(location.pathname))
    return [...here, ...rest].slice(0, 4)
  }, [ctx, isAdmin, location.pathname])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length, busy, liveSteps.length])

  useEffect(() => {
    if (autoFocus) setTimeout(() => inputRef.current?.focus(), 150)
  }, [autoFocus])

  const send = async (raw: string) => {
    const question = raw.trim()
    if (!question || getZeState().busy) return
    setInput('')

    const userMsg: ZeMessage = { id: newId(), role: 'user', text: question, at: Date.now() }
    setZeState({ messages: [...getZeState().messages, userMsg], busy: true, liveSteps: [] })

    try {
      const result = await askZe({
        history: trimHistory(getZeState().contents),
        question,
        user: { name: userProfile?.full_name || 'Usuário', role: getRoleLabel(userProfile?.role || 'visitante') },
        ctx,
        pagina,
        onStep: step => setZeState({ liveSteps: [...getZeState().liveSteps, step] }),
      })
      setZeState({
        messages: [...getZeState().messages, { id: newId(), role: 'assistant', text: result.text, steps: result.steps, at: Date.now() }],
        contents: result.contents,
        busy: false,
        liveSteps: [],
      })
    } catch (e) {
      setZeState({
        messages: [
          ...getZeState().messages,
          { id: newId(), role: 'assistant', text: (e as Error).message || 'Algo deu errado. Tente de novo.', error: true, at: Date.now() },
        ],
        busy: false,
        liveSteps: [],
      })
    } finally {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const empty = messages.length === 0

  return (
    <div className={cn('flex h-full min-h-0 flex-col', variant === 'page' && 'mx-auto w-full max-w-3xl')}>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="brand-loader__stage relative grid h-24 w-24 place-items-center">
              <span className="brand-loader__glow" aria-hidden />
              <img src="/brand/globo.webp" alt="" className="brand-loader__globe h-20 w-20" />
            </div>
            <h2 className="mt-3 text-lg font-semibold text-foreground">
              {firstName ? `Fala, ${firstName}! ` : ''}Eu sou o Zé.
            </h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Pergunte do seu jeito sobre vendas, clientes, pedidos, orçamentos, produção, estoque e CRM. Eu consulto os
              dados do sistema e faço as contas.
            </p>
            <div className="mt-5 grid w-full max-w-md gap-2">
              {suggestions.map(s => (
                <button
                  key={s.text}
                  type="button"
                  onClick={() => send(s.text)}
                  className="group flex items-center gap-2 rounded-xl border bg-card px-3 py-2.5 text-left text-sm text-foreground shadow-sm transition hover:border-sky-300 hover:bg-sky-50/60"
                >
                  <Sparkles className="h-4 w-4 shrink-0 text-sky-500" />
                  <span>{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map(m =>
              m.role === 'user' ? (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground shadow-sm">
                    {m.text}
                  </div>
                </div>
              ) : (
                <AssistantMessage key={m.id} m={m} />
              ),
            )}
            {busy && (
              <div className="flex gap-2.5">
                <ZeAvatar size="sm" />
                <div className="min-w-0 flex-1">
                  <StepsLine steps={liveSteps} live />
                  <div className="inline-flex items-center gap-2 rounded-2xl rounded-tl-sm border bg-card px-3.5 py-2.5 text-sm text-muted-foreground shadow-sm">
                    <Loader2 className="h-4 w-4 animate-spin text-sky-500" />
                    {liveSteps.length ? 'Analisando os dados' : 'Pensando'}
                    <span className="brand-loader__dots" aria-hidden>
                      <span>.</span><span>.</span><span>.</span>
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <div className="border-t bg-background/95 p-3">
        <form
          onSubmit={e => { e.preventDefault(); send(input) }}
          className="flex items-end gap-2 rounded-2xl border bg-card p-1.5 shadow-sm focus-within:border-sky-300 focus-within:ring-2 focus-within:ring-sky-100"
        >
          <textarea
            ref={inputRef}
            value={input}
            rows={1}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
            }}
            placeholder="Pergunte ao Zé..."
            className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground"
            disabled={busy}
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="Enviar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
          </button>
        </form>
        <div className="mt-1.5 flex items-center justify-between px-1 text-[11px] text-muted-foreground">
          <span>O Zé consulta só o que você já pode ver no sistema.</span>
          {!empty && (
            <button
              type="button"
              onClick={resetZe}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-muted hover:text-foreground disabled:opacity-40"
            >
              <RotateCcw className="h-3 w-3" />
              Nova conversa
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ZeChat
