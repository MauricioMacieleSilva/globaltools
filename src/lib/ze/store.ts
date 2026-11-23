import { useSyncExternalStore } from 'react'
import type { GeminiContent, ZeStep } from './agent'

// Conversa do Zé compartilhada entre o painel flutuante e a página do Zé.
// Fica guardada na sessão do navegador (some ao fechar a aba).

export interface ZeMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  steps?: ZeStep[]
  error?: boolean
  at: number
}

interface ZeState {
  messages: ZeMessage[]
  contents: GeminiContent[]
  busy: boolean
  liveSteps: ZeStep[]
}

const KEY = 'ze_conversa_v1'

function load(): ZeState {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (raw) {
      const saved = JSON.parse(raw)
      return { messages: saved.messages || [], contents: saved.contents || [], busy: false, liveSteps: [] }
    }
  } catch { /* sessão indisponível */ }
  return { messages: [], contents: [], busy: false, liveSteps: [] }
}

let state: ZeState = load()
const listeners = new Set<() => void>()

function persist() {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ messages: state.messages.slice(-60), contents: state.contents }))
  } catch { /* cheio ou indisponível: segue só em memória */ }
}

export function setZeState(patch: Partial<ZeState>) {
  state = { ...state, ...patch }
  if ('messages' in patch || 'contents' in patch) persist()
  listeners.forEach(l => l())
}

export function getZeState() {
  return state
}

export function resetZe() {
  setZeState({ messages: [], contents: [], busy: false, liveSteps: [] })
}

export function useZeStore(): ZeState {
  return useSyncExternalStore(
    cb => { listeners.add(cb); return () => listeners.delete(cb) },
    () => state,
    () => state,
  )
}
