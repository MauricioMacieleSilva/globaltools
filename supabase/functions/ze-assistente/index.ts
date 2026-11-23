import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Ponte entre o chat do Zé e o Gemini.
//
// As consultas aos dados rodam no navegador de quem pergunta (com as mesmas
// permissões da pessoa). Esta função só guarda a chave do Gemini, exige login
// e limita o tamanho das conversas.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DEFAULT_MODEL = 'gemini-3.8-flash'
// Reservas quando o principal está sobrecarregado (modelos que a chave pode usar)
const FALLBACK_MODELS = (Deno.env.get('GEMINI_FALLBACK_MODELS') || 'gemini-3.6-flash,gemini-3.5-flash').split(',').map(m => m.trim()).filter(Boolean)
const MAX_BODY_BYTES = 600_000
const MAX_CONTENTS = 80

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

async function callGemini(model: string, apiKey: string, payload: unknown) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(payload),
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

    // Tenta o modelo principal; se estiver sobrecarregado (429/500/503) ou
    // indisponível (404), espera um pouco e tenta de novo, depois usa o reserva.
    const preferred = Deno.env.get('GEMINI_MODEL') || DEFAULT_MODEL
    const plan: { model: string; wait: number }[] = [
      { model: preferred, wait: 0 },
      ...FALLBACK_MODELS.map(m => ({ model: m, wait: 250 })),
      { model: preferred, wait: 1500 },
    ]
    const retryable = (status: number) => status === 404 || status === 429 || status >= 500

    let model = preferred
    let res: Response | null = null
    for (const step of plan) {
      if (step.wait) await new Promise(r => setTimeout(r, step.wait))
      model = step.model
      res = await callGemini(model, apiKey, payload)
      // Modelo que não aceita o nível de raciocínio: repete sem ele
      if (res.status === 400) {
        const peek = await res.clone().text()
        if (/thinking/i.test(peek)) {
          const gc = { ...(payload.generationConfig as Record<string, unknown>) }
          delete gc.thinkingConfig
          res = await callGemini(model, apiKey, { ...payload, generationConfig: gc })
        }
      }
      if (!retryable(res.status)) break
      console.warn(`ze-assistente: ${model} respondeu ${res.status}, tentando de novo`)
    }
    if (!res) throw new Error('sem resposta')

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      const msg = data?.error?.message || `HTTP ${res.status}`
      console.error('ze-assistente: erro do Gemini', res.status, msg)
      const friendly =
        res.status === 429 || res.status === 503 ? 'O Gemini está sobrecarregado agora. Tente de novo em alguns segundos.'
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
