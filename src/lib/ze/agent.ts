import { supabase } from '@/integrations/supabase/client'
import { getAllowedAreas, getToolDeclarations, getToolLabel, runZeTool, ZeToolContext } from './tools'

// Conversa no formato do Gemini. As partes devolvidas pelo modelo são guardadas
// exatamente como vieram (inclui assinaturas internas que o Gemini exige ao
// continuar uma conversa com ferramentas).
export interface GeminiPart {
  text?: string
  functionCall?: { name: string; args?: Record<string, any> }
  functionResponse?: { name: string; response: Record<string, any> }
  [key: string]: unknown
}
export interface GeminiContent {
  role: 'user' | 'model'
  parts: GeminiPart[]
}

export interface ZeStep {
  tool: string
  label: string
  args: Record<string, any>
  ok: boolean
}

export interface ZeUser {
  name: string
  role: string
}

const MAX_ROUNDS = 8

function hoje() {
  const d = new Date()
  const dias = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return `${iso} (${dias[d.getDay()]})`
}

function systemPrompt(user: ZeUser, ctx: ZeToolContext, pagina?: string) {
  const areas = getAllowedAreas(ctx)
  return `Você é o Zé, o assistente da Global Aço dentro do Globinho (sistema interno da empresa).
A Global Aço vende produtos siderúrgicos: perfis, telhas, laminados, vergalhões, chapas, tubos, bobinas e arames, e tem fábrica própria (corte, dobra, perfilação).

QUEM ESTÁ PERGUNTANDO: ${user.name} (perfil ${user.role}).
HOJE: ${hoje()}.${pagina ? `\nTELA ABERTA AGORA: ${pagina}.` : ''}
ÁREAS QUE ESTA PESSOA PODE CONSULTAR: ${areas.join(', ') || 'nenhuma'}.

COMO TRABALHAR
- Para qualquer número, cliente, pedido, estoque ou dado da empresa, CONSULTE AS FERRAMENTAS. Nunca invente nem estime dados.
- Faça quantas consultas precisar, em sequência, até ter a resposta completa (ex.: comparar meses = uma consulta por período, ou agrupar por mês).
- Para qualquer conta que não seja trivial (variação %, média, margem, participação, projeção), use a ferramenta calcular.
- Se o nome de vendedor/cliente for ambíguo, use listar_nomes antes de filtrar. Se houver mais de um cliente parecido, diga quais encontrou.
- Datas: "este mês" = do dia 1 até hoje; "mês passado" = mês anterior inteiro; ao comparar com período anterior, compare o mesmo intervalo de dias quando o período atual não terminou e deixe isso claro.
- "Faturamento" segue o card Faturado do Dashboard (tipo "faturado"). "Orçamentos em aberto" = tipo "orcamento" sem filtro de data.
- "Ticket médio" no Dashboard é por cliente (valor ÷ nº de clientes); use ticket_medio_por_cliente, e cite o por pedido só se pedirem.
- Se a ferramenta disser que a pessoa não tem acesso, explique com educação que essa informação não está liberada para o perfil dela.
- Você só consulta: não cria, altera nem apaga nada no sistema. Se pedirem isso, diga onde fazer no Globinho.

COMO RESPONDER
- Português do Brasil, direto e simpático, como um colega experiente da empresa. Comece pela resposta, depois os detalhes.
- Valores em reais no padrão brasileiro (R$ 1.234.567,89). Pesos em kg ou toneladas (t) quando passar de 1.000 kg.
- Use tabelas em markdown para rankings e comparações, e negrito para o número principal.
- Diga sempre o período e os filtros usados (ex.: "novembro/2026 até hoje, todos os vendedores").
- Quando fizer sentido, termine com um insight curto ou uma sugestão prática (ex.: cliente que parou de comprar, orçamento grande parado).
- Não mostre nomes de ferramentas, JSON nem termos técnicos.`
}

async function callGemini(contents: GeminiContent[], user: ZeUser, ctx: ZeToolContext, pagina?: string) {
  const { data, error } = await supabase.functions.invoke('ze-assistente', {
    body: {
      contents,
      systemInstruction: { parts: [{ text: systemPrompt(user, ctx, pagina) }] },
      tools: [{ functionDeclarations: getToolDeclarations(ctx) }],
    },
  })
  if (error) {
    let msg = 'Não consegui falar com o servidor do Zé. Tente de novo.'
    try {
      const body = await (error as { context?: Response }).context?.json()
      if (body?.error) msg = body.error
    } catch { /* mantém a mensagem padrão */ }
    throw new Error(msg)
  }
  if (!data?.ok) throw new Error(data?.error || 'O Zé não conseguiu responder.')
  return data.content as GeminiContent
}

export interface ZeTurnResult {
  text: string
  contents: GeminiContent[]
  steps: ZeStep[]
}

/**
 * Executa uma pergunta: chama o Gemini, roda as ferramentas que ele pedir e
 * repete até ele responder em texto.
 */
export async function askZe(opts: {
  history: GeminiContent[]
  question: string
  user: ZeUser
  ctx: ZeToolContext
  pagina?: string
  onStep?: (step: ZeStep) => void
}): Promise<ZeTurnResult> {
  const contents: GeminiContent[] = [...opts.history, { role: 'user', parts: [{ text: opts.question }] }]
  const steps: ZeStep[] = []

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const reply = await callGemini(contents, opts.user, opts.ctx, opts.pagina)
    const parts = reply?.parts || []
    contents.push({ role: 'model', parts })

    const calls = parts.filter(p => p.functionCall).map(p => p.functionCall!)
    if (!calls.length) {
      const text = parts.map(p => p.text || '').join('').trim()
      return { text: text || 'Não encontrei uma resposta para isso. Pode reformular?', contents, steps }
    }

    const responses = await Promise.all(
      calls.map(async call => {
        const args = call.args || {}
        const result = await runZeTool(call.name, args, opts.ctx)
        const step: ZeStep = { tool: call.name, label: getToolLabel(call.name), args, ok: !('erro' in result) }
        steps.push(step)
        opts.onStep?.(step)
        return { functionResponse: { name: call.name, response: result } }
      }),
    )
    contents.push({ role: 'user', parts: responses })
  }

  return {
    text: 'Essa pergunta exigiu consultas demais. Tente dividir em perguntas menores.',
    contents,
    steps,
  }
}

/** Mantém o histórico enviado à IA num tamanho razoável (últimas trocas) */
export function trimHistory(contents: GeminiContent[], maxTurns = 8): GeminiContent[] {
  // Corta sempre no início de uma pergunta do usuário (texto), nunca no meio de uma consulta
  const starts: number[] = []
  contents.forEach((c, i) => {
    if (c.role === 'user' && c.parts.some(p => typeof p.text === 'string')) starts.push(i)
  })
  if (starts.length <= maxTurns) return contents
  return contents.slice(starts[starts.length - maxTurns])
}
