import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Ponte entre o chat do Zé e o Gemini.
//
// As consultas aos dados rodam no navegador de quem pergunta (com as mesmas
// permissões da pessoa). Esta função só guarda a chave do Gemini, exige login
// e limita o tamanho das conversas.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, prefer, x-supabase-api-version, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Ordem definida medindo a velocidade real (23/11/2026). Pode ser trocada sem
// mexer no código pelos secrets GEMINI_MODEL e GEMINI_FALLBACK_MODELS.
const DEFAULT_MODEL = 'gemini-3-flash-preview'
// Reservas quando o principal está sobrecarregado (modelos que a chave pode usar)
const FALLBACK_MODELS = (Deno.env.get('GEMINI_FALLBACK_MODELS') || 'gemini-3.8-flash,gemini-3.6-flash,gemini-flash-lite-latest,gemini-3.5-flash').split(',').map(m => m.trim()).filter(Boolean)
const MAX_BODY_BYTES = 600_000
const MAX_CONTENTS = 80

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

// Tempo máximo de uma tentativa
const CALL_TIMEOUT_MS = Number(Deno.env.get('GEMINI_TIMEOUT_MS') || 25_000)
// Se o modelo não respondeu em HEDGE_MS, dispara o próximo em paralelo
const HEDGE_MS = 6_000
// Tempo total máximo de uma pergunta ao Gemini
const TOTAL_MS = 55_000
const MAX_PARALELO = 3

async function callGemini(model: string, apiKey: string, payload: unknown, timeoutMs = CALL_TIMEOUT_MS, outer?: AbortSignal) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  const onOuter = () => ctrl.abort()
  if (outer) {
    if (outer.aborted) ctrl.abort()
    else outer.addEventListener('abort', onOuter, { once: true })
  }
  try {
    return await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    })
  } catch (e) {
    // Timeout ou falha de rede: devolve 504 para entrar na lógica de nova tentativa
    if (!outer?.aborted) console.warn(`ze-assistente: ${model} sem resposta (${(e as Error).name})`)
    return new Response(JSON.stringify({ error: { message: 'timeout' } }), { status: 504 })
  } finally {
    clearTimeout(timer)
    outer?.removeEventListener('abort', onOuter)
  }
}

const retryable = (status: number) => status === 404 || status === 429 || status >= 500

type Tentativa = { model: string; res: Response }

// Uma tentativa num modelo; se ele recusar o nível de raciocínio, repete sem ele
async function tentar(model: string, apiKey: string, payload: Record<string, unknown>, signal: AbortSignal): Promise<Tentativa> {
  let res = await callGemini(model, apiKey, payload, CALL_TIMEOUT_MS, signal)
  if (res.status === 400) {
    const peek = await res.clone().text()
    if (/thinking/i.test(peek)) {
      const gc = { ...(payload.generationConfig as Record<string, unknown>) }
      delete gc.thinkingConfig
      res = await callGemini(model, apiKey, { ...payload, generationConfig: gc }, CALL_TIMEOUT_MS, signal)
    }
  }
  // Lê a resposta inteira aqui: assim cancelar as tentativas paralelas não
  // interrompe a leitura da resposta vencedora
  const text = await res.text()
  return { model, res: new Response(text, { status: res.status }) }
}

// Pergunta aos modelos em sequência, mas sem esperar o lento falhar:
// - começa pelo preferido;
// - se ele não responder em HEDGE_MS, dispara o próximo em paralelo;
// - se um falhar (sobrecarga, timeout), passa na hora para o próximo;
// - fica com a primeira resposta boa e cancela as outras.
// A lista é percorrida no máximo duas vezes, dentro de TOTAL_MS.
function perguntarComReservas(models: string[], apiKey: string, payload: Record<string, unknown>): Promise<Tentativa | null> {
  const ctrl = new AbortController()
  return new Promise(resolve => {
    let idx = 0
    let volta = 0
    let rodando = 0
    let fim = false
    let ultimaFalha: Tentativa | null = null

    const terminar = (t: Tentativa | null) => {
      if (fim) return
      fim = true
      clearInterval(hedge)
      clearTimeout(prazo)
      ctrl.abort()
      resolve(t)
    }

    const disparar = () => {
      if (fim) return
      if (idx >= models.length) {
        if (volta === 0 && rodando === 0) { volta = 1; idx = 0 }
        else { if (rodando === 0) terminar(ultimaFalha); return }
      }
      const model = models[idx++]
      rodando++
      tentar(model, apiKey, payload, ctrl.signal)
        .catch(() => ({ model, res: new Response('{}', { status: 504 }) }))
        .then(t => {
        rodando--
        if (fim) return
        if (t.res.ok || !retryable(t.res.status)) { terminar(t); return }
        ultimaFalha = t
        console.warn(`ze-assistente: ${model} respondeu ${t.res.status}, tentando outro`)
        if (volta === 1 && idx >= models.length && rodando === 0) { terminar(t); return }
        disparar()
      })
    }

    const hedge = setInterval(() => { if (rodando < MAX_PARALELO) disparar() }, HEDGE_MS)
    const prazo = setTimeout(() => terminar(ultimaFalha), TOTAL_MS)
    disparar()
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      return json({ ok: false, code: 'no_key', error: 'O Zé ainda não está configurado (falta a chave do Gemini no servidor).' })
    }

    // Só usuários logados
    const authHeader = req.headers.get('Authorization') ?? ''
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } },
    )
    const { data: { user }, error: authError } = await admin.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) return json({ ok: false, code: 'unauthorized', error: 'Sessão expirada. Entre de novo no sistema.' }, 401)

    const raw = await req.text()
    if (raw.length > MAX_BODY_BYTES) {
      return json({ ok: false, code: 'too_large', error: 'A conversa ficou longa demais. Comece uma nova conversa.' })
    }

    const body = JSON.parse(raw || '{}')

    // Diagnóstico: quais modelos de texto esta chave pode usar
    if (body.listModels) {
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': apiKey } })
      const j = await r.json().catch(() => ({}))
      const models = (j.models || [])
        .filter((m: { supportedGenerationMethods?: string[] }) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m: { name: string }) => m.name.replace('models/', ''))
      return json({ ok: true, models })
    }
    // Diagnóstico: mede o tempo de resposta de cada modelo
    if (Array.isArray(body.benchmark)) {
      const tests = await Promise.all(body.benchmark.slice(0, 8).map(async (m: string) => {
        const t0 = Date.now()
        const r = await callGemini(String(m), apiKey, {
          contents: [{ role: 'user', parts: [{ text: 'Responda só: ok' }] }],
          generationConfig: { maxOutputTokens: 20, thinkingConfig: { thinkingLevel: 'low' } },
        }, 30_000)
        return { model: m, status: r.status, ms: Date.now() - t0 }
      }))
      return json({ ok: true, tests })
    }
    const contents = Array.isArray(body.contents) ? body.contents : []
    if (contents.length === 0) return json({ ok: false, code: 'empty', error: 'Mensagem vazia.' })
    if (contents.length > MAX_CONTENTS) {
      return json({ ok: false, code: 'too_long', error: 'A conversa ficou longa demais. Comece uma nova conversa.' })
    }

    const payload: Record<string, unknown> = {
      contents,
      // Raciocínio "low": as contas são feitas pelas ferramentas, então não
      // precisa do raciocínio longo (padrão "high"), que deixava cada resposta lenta.
      generationConfig: { temperature: 0.2, maxOutputTokens: 4096, thinkingConfig: { thinkingLevel: 'low' } },
    }
    if (body.systemInstruction) payload.systemInstruction = body.systemInstruction
    if (Array.isArray(body.tools) && body.tools.length) payload.tools = body.tools
    if (body.toolConfig) payload.toolConfig = body.toolConfig

    const preferred = Deno.env.get('GEMINI_MODEL') || DEFAULT_MODEL
    const models = [...new Set([preferred, ...FALLBACK_MODELS])]
    const t = await perguntarComReservas(models, apiKey, payload)
    const res = t?.res ?? new Response(JSON.stringify({ error: { message: 'timeout' } }), { status: 504 })
    const model = t?.model ?? preferred

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      const msg = data?.error?.message || `HTTP ${res.status}`
      console.error('ze-assistente: erro do Gemini', res.status, msg)
      const friendly =
        res.status === 429 || res.status === 503 ? 'O Gemini está sobrecarregado agora. Tente de novo em alguns segundos.'
        : res.status === 504 ? 'O Gemini está muito lento agora. Tente de novo em alguns segundos.'
        : res.status === 400 && /api key/i.test(msg) ? 'A chave do Gemini cadastrada no servidor não é válida.'
        : res.status === 403 ? 'A chave do Gemini não tem permissão para este modelo.'
        : 'O Gemini não respondeu. Tente de novo.'
      return json({ ok: false, code: 'gemini_error', error: friendly, detail: msg })
    }

    const candidate = data?.candidates?.[0]
    if (!candidate?.content) {
      const reason = candidate?.finishReason || data?.promptFeedback?.blockReason || 'sem resposta'
      return json({ ok: false, code: 'no_content', error: `O Zé não conseguiu responder (${reason}). Tente perguntar de outro jeito.` })
    }

    console.log(`ze-assistente: ${user.email} | ${model} | tokens ${data?.usageMetadata?.totalTokenCount ?? '?'}`)

    return json({
      ok: true,
      model,
      content: candidate.content,
      finishReason: candidate.finishReason,
      usage: data.usageMetadata ?? null,
    })
  } catch (error) {
    console.error('ze-assistente: erro inesperado', error)
    return json({ ok: false, code: 'unexpected', error: 'Erro inesperado no servidor do Zé.' }, 500)
  }
})
