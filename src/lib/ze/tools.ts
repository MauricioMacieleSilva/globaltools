import { supabase } from '@/integrations/supabase/client'
import { fetchComercialData } from '@/services/googleSheetsService'
import { fetchProducaoData } from '@/services/producaoService'
import type { ComercialData } from '@/context/ComercialContext'
import type { PageKey } from '@/hooks/useUserPermissions'
import { calcular } from './calc'
import { helpArticles, helpArticlesFor, searchHelp, type HelpArticle } from '@/content/help'

// =====================================================================
// Ferramentas do Zé
//
// Rodam no navegador de quem pergunta: usam os mesmos dados que o Globinho
// já carrega (planilha do ERP + banco) e as mesmas permissões da pessoa.
// Todas as contas são feitas aqui, em código. A IA só escolhe o que consultar
// e escreve a resposta, então os números não dependem dela "fazer conta".
// =====================================================================

export interface ZeToolContext {
  canView: (page: PageKey) => boolean
  isAdmin: boolean
}

type Args = Record<string, any>
type ToolResult = Record<string, unknown>

interface ZeTool {
  name: string
  label: string
  /** Telas que liberam esta ferramenta (basta uma) */
  pages: PageKey[] | 'any'
  declaration: Record<string, unknown>
  run: (args: Args, ctx: ZeToolContext) => Promise<ToolResult>
}

// ---------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------

export const norm = (s: unknown) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

const matches = (value: unknown, query?: string) => !query || norm(value).includes(norm(query))

const r2 = (n: number) => Math.round(n * 100) / 100

/** dd/mm/aaaa -> Date (meio-dia local, evita problema de fuso) */
function parseBR(s?: string): Date | null {
  if (!s) return null
  const m = String(s).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (m) {
    const d = new Date(+m[3], +m[2] - 1, +m[1], 12)
    return Number.isNaN(d.getTime()) || +m[3] < 2000 ? null : d
  }
  const iso = String(s).trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3], 12)
  return null
}

/** aaaa-mm-dd vindo da IA -> Date */
function parseISO(s?: string, endOfDay = false): Date | null {
  if (!s) return null
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  return new Date(+m[1], +m[2] - 1, +m[3], endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0)
}

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

function inRange(d: Date | null, from: Date | null, to: Date | null) {
  if (!from && !to) return true
  if (!d) return false
  if (from && d < from) return false
  if (to && d > to) return false
  return true
}

// ---------------------------------------------------------------------
// Dados comerciais (planilha do ERP)
// ---------------------------------------------------------------------

type Situacao = 'faturado' | 'pedido' | 'orcamento' | 'perdido' | 'cancelado' | 'devolucao' | 'outro'

interface Linha extends ComercialData {
  _sit: Situacao
  _data: Date | null
}

let comercialCache: { ts: number; rows: Linha[] } | null = null

// Mesmas regras do Dashboard Comercial:
// - faturado = situação "Emitida" com faturamento_tipo 1 (data de emissão)
// - pedido   = situação "Pedido" com faturamento_tipo 1 (data de início)
// - orçamento = "Orçamento" (data de início); perdido = "Perdido" (data da perda)
// - pedidos marcados como excluídos pelos admins ficam de fora
function classify(r: ComercialData): Situacao {
  const s = norm(r.situacao)
  if (s === 'emitida') return r.faturamento_tipo === 1 ? 'faturado' : 'outro'
  if (s === 'pedido') return r.faturamento_tipo === 1 ? 'pedido' : 'outro'
  if (s === 'orcamento') return 'orcamento'
  if (s === 'perdido') return 'perdido'
  if (s.startsWith('canc')) return 'cancelado'
  if (s.startsWith('devol')) return 'devolucao'
  return 'outro'
}

function dataDaLinha(r: ComercialData, sit: Situacao): Date | null {
  if (sit === 'faturado') return parseBR(r.data_emissao) || parseBR(r.data_inicio)
  if (sit === 'perdido') return parseBR(r.data_perdido) || parseBR(r.data_inicio)
  if (sit === 'cancelado' || sit === 'devolucao') return parseBR(r.data_emissao) || parseBR(r.data_inicio)
  return parseBR(r.data_inicio) || parseBR(r.data_emissao)
}

async function carregarComercial(): Promise<Linha[]> {
  if (comercialCache && Date.now() - comercialCache.ts < 5 * 60 * 1000) return comercialCache.rows

  const [rows, excl] = await Promise.all([
    fetchComercialData(),
    supabase.from('excluded_orders').select('numero_pedido'),
  ])
  const excluidos = new Set((excl.data || []).map(e => String(e.numero_pedido)))

  // Proteção contra os dados de exemplo que o carregador devolve quando a planilha falha
  const pareceExemplo = rows.length < 20 && rows.some(r => /^(PED|ERR|PERDIDO_)/.test(r.numeropedido))
  if (pareceExemplo) throw new Error('A planilha do ERP não carregou agora. Tente de novo em instantes.')

  const linhas = rows
    .filter(r => !excluidos.has(String(r.numeropedido)))
    .map(r => {
      const _sit = classify(r)
      return { ...r, _sit, _data: dataDaLinha(r, _sit) }
    })

  comercialCache = { ts: Date.now(), rows: linhas }
  return linhas
}

const TIPOS: Record<string, Situacao[]> = {
  faturado: ['faturado', 'pedido'],
  somente_emitido: ['faturado'],
  pedidos_em_carteira: ['pedido'],
  orcamento: ['orcamento'],
  perdido: ['perdido'],
  cancelado: ['cancelado'],
  devolucao: ['devolucao'],
  todos: ['faturado', 'pedido', 'orcamento', 'perdido', 'cancelado', 'devolucao'],
}

function filtrarComercial(rows: Linha[], a: Args) {
  const tipos = TIPOS[a.tipo || 'faturado'] || TIPOS.faturado
  const de = parseISO(a.data_inicio)
  const ate = parseISO(a.data_fim, true)
  return rows.filter(r =>
    tipos.includes(r._sit) &&
    inRange(r._data, de, ate) &&
    matches(r.vendedor, a.vendedor) &&
    (matches(r.cliente, a.cliente) || (a.cliente && norm(r.codigocliente) === norm(a.cliente))) &&
    matches(r.uf, a.uf) &&
    matches(r.cli_cidade, a.cidade) &&
    matches(r.classe, a.classe) &&
    matches(r.descricaomat, a.produto) &&
    (!a.numero_pedido || String(r.numeropedido) === String(a.numero_pedido)) &&
    (!a.cliente_novo || (a.cliente_novo === 'sim' ? norm(r.cliente_novo).includes('nov') : !norm(r.cliente_novo).includes('nov'))),
  )
}

function totais(rows: Linha[]) {
  const valor = rows.reduce((s, r) => s + (r.valor || 0), 0)
  const peso = rows.reduce((s, r) => s + (r.peso || 0), 0)
  const pedidos = new Set(rows.map(r => r.numeropedido)).size
  const clientes = new Set(rows.map(r => r.codigocliente || r.cliente)).size
  return {
    valor_reais: r2(valor),
    peso_kg: r2(peso),
    pedidos,
    clientes,
    itens: rows.length,
    ticket_medio_por_cliente: clientes ? r2(valor / clientes) : 0,
    ticket_medio_por_pedido: pedidos ? r2(valor / pedidos) : 0,
    preco_medio_por_kg: peso ? r2(valor / peso) : 0,
  }
}

const AGRUPADORES: Record<string, (r: Linha) => string> = {
  ano: r => (r._data ? String(r._data.getFullYear()) : 'sem data'),
  mes: r => (r._data ? ym(r._data) : 'sem data'),
  dia: r => (r._data ? ymd(r._data) : 'sem data'),
  dia_da_semana: r => (r._data ? ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'][r._data.getDay()] : 'sem data'),
  vendedor: r => r.vendedor || 'sem vendedor',
  cliente: r => r.cliente || 'sem cliente',
  classe: r => r.classe || 'sem classe',
  uf: r => r.uf || 'sem UF',
  cidade: r => `${r.cli_cidade || 'sem cidade'}/${r.uf || ''}`,
  produto: r => r.descricaomat || 'sem descrição',
  motivo_perda: r => r.perdido_motivo || 'sem motivo informado',
  situacao: r => r._sit,
  cliente_novo: r => (norm(r.cliente_novo).includes('nov') ? 'cliente novo' : 'cliente antigo'),
}

function agrupar(rows: Linha[], por: string[], ordenar: string, limite: number) {
  const fns = por.map(p => AGRUPADORES[p]).filter(Boolean)
  if (!fns.length) return undefined
  const map = new Map<string, Linha[]>()
  for (const r of rows) {
    const k = fns.map(f => f(r)).join(' | ')
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(r)
  }
  const temporal = por.length === 1 && ['ano', 'mes', 'dia'].includes(por[0])
  const grupos = [...map.entries()].map(([chave, rs]) => ({ grupo: chave, ...totais(rs) }))
  const campo = ordenar === 'peso' ? 'peso_kg' : ordenar === 'pedidos' ? 'pedidos' : 'valor_reais'
  grupos.sort((a, b) => (temporal && ordenar === 'cronologico' ? a.grupo.localeCompare(b.grupo) : (b as any)[campo] - (a as any)[campo]))
  if (temporal && (!ordenar || ordenar === 'cronologico')) grupos.sort((a, b) => a.grupo.localeCompare(b.grupo))

  const top = grupos.slice(0, limite)
  const resto = grupos.slice(limite)
  const out: ToolResult = { grupos: top, total_de_grupos: grupos.length }
  if (resto.length) {
    out.demais_grupos_somados = {
      quantidade: resto.length,
      valor_reais: r2(resto.reduce((s, g) => s + g.valor_reais, 0)),
      peso_kg: r2(resto.reduce((s, g) => s + g.peso_kg, 0)),
    }
  }
  return out
}

// ---------------------------------------------------------------------
// Declarações (formato do Gemini) + execução
// ---------------------------------------------------------------------

const S = (description: string, extra: Record<string, unknown> = {}) => ({ type: 'STRING', description, ...extra })
const N = (description: string) => ({ type: 'NUMBER', description })

const FILTROS_COMERCIAIS = {
  data_inicio: S('Data inicial AAAA-MM-DD (inclusive)'),
  data_fim: S('Data final AAAA-MM-DD (inclusive)'),
  vendedor: S('Parte do nome do vendedor'),
  cliente: S('Parte do nome do cliente ou código do cliente'),
  uf: S('Sigla do estado, ex.: RS'),
  cidade: S('Cidade do cliente'),
  classe: S('Classe de produto: PERFIS, TELHAS, LAMINADOS, VERGALHÕES, CHAPAS, TUBOS, BOBINAS, ARAMES'),
  produto: S('Trecho da descrição do material, ex.: "U 100", "galvanizado", "#3,00"'),
  numero_pedido: S('Número exato do pedido/orçamento'),
  cliente_novo: S('"sim" para só clientes novos, "nao" para só antigos'),
}

const TIPO_PARAM = S(
  'faturado = vendas como no card "Faturado" do Dashboard (emitidas + pedidos com faturamento); somente_emitido = só notas emitidas; pedidos_em_carteira = pedidos ainda não emitidos; orcamento = orçamentos em aberto; perdido = orçamentos perdidos; cancelado; devolucao; todos',
  { enum: Object.keys(TIPOS) },
)

const TOOLS: ZeTool[] = [
  {
    name: 'consultar_vendas',
    label: 'Vendas e orçamentos',
    pages: ['dashboard', 'clientes'],
    declaration: {
      name: 'consultar_vendas',
      description:
        'Soma e agrupa vendas, orçamentos, perdidos, cancelamentos e devoluções da planilha do ERP (desde o início). Devolve valor (R$), peso (kg), nº de pedidos, nº de clientes, ticket médio e R$/kg. Use para faturamento, rankings, comparações entre períodos, evolução mês a mês, mix de produtos, regiões etc. Para comparar dois períodos, chame duas vezes.',
      parameters: {
        type: 'OBJECT',
        properties: {
          tipo: TIPO_PARAM,
          ...FILTROS_COMERCIAIS,
          agrupar_por: {
            type: 'ARRAY',
            items: { type: 'STRING', enum: Object.keys(AGRUPADORES) },
            description: 'Uma ou mais dimensões para agrupar (ex.: ["vendedor"], ["mes"], ["classe","uf"])',
          },
          ordenar_por: S('valor (padrão), peso, pedidos ou cronologico', { enum: ['valor', 'peso', 'pedidos', 'cronologico'] }),
          limite: N('Máximo de grupos (padrão 15, máx. 60)'),
        },
      },
    },
    async run(a) {
      const rows = filtrarComercial(await carregarComercial(), a)
      const limite = Math.min(Math.max(Number(a.limite) || 15, 1), 60)
      return {
        filtros_aplicados: a,
        total: totais(rows),
        ...(a.agrupar_por?.length ? agrupar(rows, a.agrupar_por, a.ordenar_por || '', limite) : {}),
      }
    },
  },
  {
    name: 'detalhar_pedidos',
    label: 'Pedidos e itens',
    pages: ['dashboard', 'clientes'],
    declaration: {
      name: 'detalhar_pedidos',
      description:
        'Lista pedidos/orçamentos com seus itens (material, quantidade, peso, valor, datas, situação, vendedor, cliente, motivo de perda). Use para "o que tem no pedido 1234", "últimos pedidos do cliente X", "orçamentos abertos do vendedor Y". Para "maior venda/maior pedido" use ordenar="valor" (ou "peso"); para vendas use tipo="faturado".',
      parameters: {
        type: 'OBJECT',
        properties: {
          tipo: TIPO_PARAM,
          ...FILTROS_COMERCIAIS,
          ordenar: { type: 'STRING', enum: ['data', 'valor', 'peso'], description: 'Ordem da lista: data (mais recentes, padrão), valor ou peso (maiores primeiro)' },
          limite: N('Máximo de pedidos (padrão 10, máx. 40)'),
        },
      },
    },
    async run(a) {
      const rows = filtrarComercial(await carregarComercial(), { tipo: 'todos', ...a })
      const porPedido = new Map<string, Linha[]>()
      rows.forEach(r => {
        if (!porPedido.has(r.numeropedido)) porPedido.set(r.numeropedido, [])
        porPedido.get(r.numeropedido)!.push(r)
      })
      const pedidos = [...porPedido.entries()]
        .map(([numero, itens]) => {
          const f = itens[0]
          const d = itens.map(i => i._data).filter(Boolean).sort((x, y) => +y! - +x!)[0]
          return {
            pedido: numero,
            nf: f.numeronf || null,
            situacao: f.situacao,
            data: d ? ymd(d) : null,
            data_inicio: f.data_inicio || null,
            data_emissao: f.data_emissao || null,
            cliente: f.cliente,
            codigo_cliente: f.codigocliente,
            cidade_uf: `${f.cli_cidade}/${f.uf}`,
            vendedor: f.vendedor,
            motivo_perda: f.perdido_motivo || undefined,
            ...totais(itens),
            itens: itens.slice(0, 25).map(i => ({
              material: i.descricaomat,
              obs: i.observacao || undefined,
              qtd: i.qtd,
              un: i.un,
              valor_unitario: i.valor_un_bruto,
              valor: r2(i.valor),
              peso_kg: r2(i.peso),
              classe: i.classe,
            })),
          }
        })
        .sort((x, y) => {
          if (a.ordenar === 'valor') return (Number(y.valor_reais) || 0) - (Number(x.valor_reais) || 0)
          if (a.ordenar === 'peso') return (Number(y.peso_kg) || 0) - (Number(x.peso_kg) || 0)
          return (y.data || '').localeCompare(x.data || '')
        })
      const limite = Math.min(Math.max(Number(a.limite) || 10, 1), 40)
      return { encontrados: pedidos.length, mostrando: Math.min(limite, pedidos.length), pedidos: pedidos.slice(0, limite) }
    },
  },
  {
    name: 'historico_cliente',
    label: 'Histórico do cliente',
    pages: ['dashboard', 'clientes', 'crm'],
    declaration: {
      name: 'historico_cliente',
      description:
        'Raio-X de um cliente: cadastro, vendedor responsável, primeira e última compra, faturamento por ano, mix de classes, orçamentos abertos, perdidos e motivos, leads/negociações no CRM e chamados. Use quando perguntarem sobre um cliente específico.',
      parameters: {
        type: 'OBJECT',
        properties: { cliente: S('Nome (ou parte) ou código do cliente') },
        required: ['cliente'],
      },
    },
    async run(a, ctx) {
      const q = String(a.cliente || '')
      const out: ToolResult = {}

      if (ctx.canView('dashboard') || ctx.canView('clientes')) {
        const todas = await carregarComercial()
        const linhas = todas.filter(r => matches(r.cliente, q) || norm(r.codigocliente) === norm(q))
        const nomes = [...new Set(linhas.map(r => `${r.cliente} (${r.codigocliente})`))]
        out.clientes_encontrados_na_planilha = nomes.slice(0, 10)
        if (nomes.length > 1) out.aviso = 'Mais de um cliente corresponde à busca; os números abaixo somam todos. Se for o caso, pergunte qual é.'

        const fat = linhas.filter(r => r._sit === 'faturado' || r._sit === 'pedido')
        const datas = fat.map(r => r._data).filter(Boolean) as Date[]
        datas.sort((x, y) => +x - +y)
        out.faturamento_total = totais(fat)
        out.primeira_compra = datas[0] ? ymd(datas[0]) : null
        out.ultima_compra = datas.length ? ymd(datas[datas.length - 1]) : null
        out.dias_sem_comprar = datas.length ? Math.floor((Date.now() - +datas[datas.length - 1]) / 864e5) : null
        out.faturamento_por_ano = agrupar(fat, ['ano'], 'cronologico', 20)?.grupos
        out.mix_por_classe = agrupar(fat, ['classe'], 'valor', 10)?.grupos
        out.vendedores = [...new Set(linhas.map(r => r.vendedor))].slice(0, 5)
        const orc = linhas.filter(r => r._sit === 'orcamento')
        out.orcamentos_em_aberto = { ...totais(orc), numeros: [...new Set(orc.map(r => r.numeropedido))].slice(0, 15) }
        const perd = linhas.filter(r => r._sit === 'perdido')
        out.perdidos = { ...totais(perd), por_motivo: agrupar(perd, ['motivo_perda'], 'valor', 8)?.grupos }
        const cidade = linhas[0]
        if (cidade) out.cidade_uf = `${cidade.cli_cidade}/${cidade.uf}`
      }

      if (ctx.canView('clientes') || ctx.canView('crm')) {
        const { data: cad } = await supabase
          .from('clientes')
          .select('nome, cnpj, cidade, estado, segmento, classificacao_abc, telefone, email')
          .ilike('nome', `%${q}%`)
          .limit(5)
        if (cad?.length) out.cadastro = cad
        const { data: cart } = await supabase
          .from('client_vendor_assignments')
          .select('cliente_nome, vendedor_nome')
          .ilike('cliente_nome', `%${q}%`)
          .limit(5)
        if (cart?.length) out.carteira = cart
      }

      if (ctx.canView('crm')) {
        const { data: leads } = await supabase
          .from('leads')
          .select('numero_lead, status, temperatura, valor_estimado, produto_interesse, data_abertura, data_fechamento, updated_at, observacoes')
          .or(`client_name.ilike.%${q}%,cliente_nome.ilike.%${q}%,empresa.ilike.%${q}%`)
          .order('updated_at', { ascending: false })
          .limit(10)
        if (leads?.length) out.leads_no_crm = leads
      }

      if (ctx.canView('chamados')) {
        const { data: tks } = await supabase
          .from('tickets')
          .select('ticket_number, title, status, priority, created_at, resolved_at')
          .ilike('client_name', `%${q}%`)
          .order('created_at', { ascending: false })
          .limit(5)
        if (tks?.length) out.chamados = tks
      }

      if (!Object.keys(out).length) return { erro: 'Sem permissão para consultar clientes.' }
      return out
    },
  },
  {
    name: 'clientes_sem_comprar',
    label: 'Clientes sem comprar',
    pages: ['dashboard', 'clientes'],
    declaration: {
      name: 'clientes_sem_comprar',
      description:
        'Clientes que já compraram e estão há X dias ou mais sem comprar, ordenados pelo quanto compravam. Use para reativação de carteira, churn e "quem sumiu".',
      parameters: {
        type: 'OBJECT',
        properties: {
          dias_minimo: N('Mínimo de dias desde a última compra (padrão 90)'),
          dias_maximo: N('Máximo de dias (opcional, ex.: 365 para ignorar quem sumiu há muito tempo)'),
          vendedor: S('Parte do nome do vendedor'),
          uf: S('Sigla do estado'),
          classe: S('Classe de produto que o cliente comprava'),
          limite: N('Máximo de clientes (padrão 20, máx. 60)'),
        },
      },
    },
    async run(a) {
      const rows = filtrarComercial(await carregarComercial(), { tipo: 'faturado', vendedor: a.vendedor, uf: a.uf, classe: a.classe })
      const min = Number(a.dias_minimo) || 90
      const max = a.dias_maximo ? Number(a.dias_maximo) : Infinity
      const por = new Map<string, Linha[]>()
      rows.forEach(r => {
        const k = r.codigocliente || r.cliente
        if (!por.has(k)) por.set(k, [])
        por.get(k)!.push(r)
      })
      const agora = Date.now()
      const lista = [...por.values()]
        .map(rs => {
          const datas = rs.map(r => r._data).filter(Boolean) as Date[]
          const ultima = datas.sort((x, y) => +y - +x)[0]
          if (!ultima) return null
          const dias = Math.floor((agora - +ultima) / 864e5)
          const ultimoAno = rs.filter(r => r._data && +r._data > +ultima - 365 * 864e5)
          return {
            cliente: rs[0].cliente,
            codigo: rs[0].codigocliente,
            cidade_uf: `${rs[0].cli_cidade}/${rs[0].uf}`,
            vendedor: rs[0].vendedor,
            ultima_compra: ymd(ultima),
            dias_sem_comprar: dias,
            comprou_no_ano_anterior_a_ultima_compra: r2(ultimoAno.reduce((s, r) => s + r.valor, 0)),
            total_historico: r2(rs.reduce((s, r) => s + r.valor, 0)),
          }
        })
        .filter((x): x is NonNullable<typeof x> => !!x && x.dias_sem_comprar >= min && x.dias_sem_comprar <= max)
        .sort((x, y) => y.comprou_no_ano_anterior_a_ultima_compra - x.comprou_no_ano_anterior_a_ultima_compra)
      const limite = Math.min(Math.max(Number(a.limite) || 20, 1), 60)
      return { criterio: `${min}${Number.isFinite(max) ? `-${max}` : '+'} dias sem comprar`, encontrados: lista.length, clientes: lista.slice(0, limite) }
    },
  },
  {
    name: 'listar_nomes',
    label: 'Nomes cadastrados',
    pages: ['dashboard', 'clientes'],
    declaration: {
      name: 'listar_nomes',
      description:
        'Lista os nomes exatos que existem nos dados (vendedores, clientes, classes, UFs, cidades). Use quando o nome citado pela pessoa for ambíguo ou abreviado, para escolher o filtro certo.',
      parameters: {
        type: 'OBJECT',
        properties: {
          campo: S('Qual lista', { enum: ['vendedor', 'cliente', 'classe', 'uf', 'cidade'] }),
          busca: S('Trecho para filtrar (opcional)'),
        },
        required: ['campo'],
      },
    },
    async run(a) {
      const rows = await carregarComercial()
      const pick: Record<string, (r: Linha) => string> = {
        vendedor: r => r.vendedor, cliente: r => r.cliente, classe: r => r.classe, uf: r => r.uf, cidade: r => r.cli_cidade,
      }
      const f = pick[a.campo] || pick.vendedor
      const cont = new Map<string, number>()
      rows.forEach(r => {
        const v = f(r)
        if (v && matches(v, a.busca)) cont.set(v, (cont.get(v) || 0) + 1)
      })
      const lista = [...cont.entries()].sort((x, y) => y[1] - x[1]).slice(0, 40).map(([nome, linhas]) => ({ nome, linhas }))
      return { campo: a.campo, total: cont.size, nomes: lista }
    },
  },
  {
    name: 'consultar_producao',
    label: 'Produção',
    pages: ['producao'],
    declaration: {
      name: 'consultar_producao',
      description:
        'Pedidos na fábrica (planilha de produção): status (PROGRAMAR, PARCIALMENTE_FINALIZADO, ATRASO, FINALIZADO), prazo do PCP, dias de atraso, % concluído, peso e ordens de produção. Use para "o que está atrasado", "situação do pedido X", "carga da fábrica".',
      parameters: {
        type: 'OBJECT',
        properties: {
          numero_pedido: S('Número do pedido'),
          cliente: S('Parte do nome do cliente'),
          status: S('Filtrar por status', { enum: ['PROGRAMAR', 'PARCIALMENTE_FINALIZADO', 'ATRASO', 'FINALIZADO'] }),
          limite: N('Máximo de pedidos listados (padrão 20)'),
        },
      },
    },
    async run(a) {
      const dados = await fetchProducaoData()
      const lista = dados.filter(p =>
        (!a.numero_pedido || String(p.numero_pedido) === String(a.numero_pedido)) &&
        matches(p.cli_nomef, a.cliente) &&
        (!a.status || p.status === a.status),
      )
      const porStatus: Record<string, { pedidos: number; peso_kg: number }> = {}
      dados.forEach(p => {
        porStatus[p.status] ||= { pedidos: 0, peso_kg: 0 }
        porStatus[p.status].pedidos++
        porStatus[p.status].peso_kg = r2(porStatus[p.status].peso_kg + (p.peso_total_kg || 0))
      })
      const limite = Math.min(Math.max(Number(a.limite) || 20, 1), 60)
      return {
        resumo_geral_por_status: porStatus,
        encontrados: lista.length,
        pedidos: lista
          .sort((x, y) => (y.dias_atraso || 0) - (x.dias_atraso || 0))
          .slice(0, limite)
          .map(p => ({
            pedido: p.numero_pedido,
            cliente: p.cli_nomef,
            situacao: p.situacao,
            status: p.status,
            prazo_pcp: p.prazo_pcp,
            dias_atraso: p.dias_atraso || 0,
            percentual_concluido: r2(p.percentual_concluido || 0),
            peso_total_kg: r2(p.peso_total_kg || 0),
            ordens: p.ops.map(o => ({ op: o.numero_op, situacao: o.situacao_op, materiais: o.materiais.length })),
          })),
      }
    },
  },
  {
    name: 'consultar_estoque',
    label: 'Estoque',
    pages: ['estoque', 'producao'],
    declaration: {
      name: 'consultar_estoque',
      description:
        'Itens em estoque: categoria, descrição, quantidade, unidade, espessura, medidas, localização, se está segregado (reservado). Pode trazer as últimas movimentações. Use para "tem chapa 3mm?", "quanto temos de bobina", "o que entrou/saiu".',
      parameters: {
        type: 'OBJECT',
        properties: {
          busca: S('Trecho da descrição, ex.: "PP BRANCA", "U 100"'),
          categoria: S('Categoria, ex.: CHAPAS, BOBINAS, PERFIS, TUBOS'),
          espessura: N('Espessura em mm'),
          incluir_movimentacoes: { type: 'BOOLEAN', description: 'Trazer as últimas movimentações' },
        },
      },
    },
    async run(a) {
      let q = supabase
        .from('estoque_itens')
        .select('categoria, descricao, quantidade, unidade, espessura, largura, comprimento, localizacao, segregado, observacoes, updated_at')
        .eq('ativo', true)
      if (a.categoria) q = q.ilike('categoria', `%${a.categoria}%`)
      if (a.espessura) q = q.eq('espessura', Number(a.espessura))
      if (a.busca) q = q.ilike('descricao', `%${a.busca}%`)
      const { data, error } = await q.order('categoria').limit(200)
      if (error) return { erro: error.message }
      const itens = data || []
      const porCategoria: Record<string, { itens: number; quantidade: number; unidade: string }> = {}
      itens.forEach(i => {
        porCategoria[i.categoria] ||= { itens: 0, quantidade: 0, unidade: i.unidade }
        porCategoria[i.categoria].itens++
        porCategoria[i.categoria].quantidade = r2(porCategoria[i.categoria].quantidade + Number(i.quantidade || 0))
      })
      const out: ToolResult = { encontrados: itens.length, por_categoria: porCategoria, itens: itens.slice(0, 60) }
      if (a.incluir_movimentacoes) {
        const { data: mov } = await supabase
          .from('estoque_movimentacoes')
          .select('created_at, tipo_movimentacao, item_descricao, quantidade_movimentada, quantidade_nova, motivo, usuario_nome')
          .order('created_at', { ascending: false })
          .limit(20)
        out.ultimas_movimentacoes = mov || []
      }
      return out
    },
  },
  {
    name: 'consultar_crm',
    label: 'CRM',
    pages: ['crm'],
    declaration: {
      name: 'consultar_crm',
      description:
        'Dados do CRM: leads (status, temperatura, origem, valor estimado, vendedor), atividades de contato e follow-ups agendados. Pode contar/agrupar ou listar. Use para funil, prospecção, contatos do dia, leads parados, agenda.',
      parameters: {
        type: 'OBJECT',
        properties: {
          consulta: S('O que consultar', { enum: ['leads', 'atividades', 'follow_ups'] }),
          status: S('Status do lead (ex.: novo, em_negociacao, ganho, perdido)'),
          cliente: S('Trecho do nome do cliente/empresa'),
          vendedor: S('Trecho do nome do vendedor/SDR'),
          data_inicio: S('AAAA-MM-DD'),
          data_fim: S('AAAA-MM-DD'),
          agrupar_por: S('Campo para contar', { enum: ['status', 'temperatura', 'origem', 'vendedor', 'dia', 'tipo', 'resultado'] }),
          somente_pendentes: { type: 'BOOLEAN', description: 'Para follow_ups: só os não concluídos' },
          limite: N('Máximo de registros listados (padrão 15)'),
        },
        required: ['consulta'],
      },
    },
    async run(a) {
      const limite = Math.min(Math.max(Number(a.limite) || 15, 1), 50)
      const de = a.data_inicio ? `${a.data_inicio}T00:00:00` : null
      const ate = a.data_fim ? `${a.data_fim}T23:59:59` : null

      const { data: perfis } = await supabase.from('user_profiles').select('id, full_name')
      const nomeDe = new Map((perfis || []).map(p => [p.id, p.full_name]))
      const idsVendedor = a.vendedor
        ? (perfis || []).filter(p => matches(p.full_name, a.vendedor)).map(p => p.id)
        : null

      const contar = (rows: any[], f: (r: any) => string) => {
        const m = new Map<string, number>()
        rows.forEach(r => m.set(f(r) || '—', (m.get(f(r) || '—') || 0) + 1))
        return [...m.entries()].sort((x, y) => y[1] - x[1]).map(([grupo, quantidade]) => ({ grupo, quantidade }))
      }

      if (a.consulta === 'atividades') {
        let q = supabase
          .from('lead_activities')
          .select('created_at, activity_type, contact_channel, result, description, sdr_name, user_id, next_contact_date, lead_id')
          .order('created_at', { ascending: false })
          .limit(3000)
        if (de) q = q.gte('created_at', de)
        if (ate) q = q.lte('created_at', ate)
        if (idsVendedor) q = q.in('user_id', idsVendedor.length ? idsVendedor : ['00000000-0000-0000-0000-000000000000'])
        const { data, error } = await q
        if (error) return { erro: error.message }
        const rows = (data || []).map(r => ({ ...r, quem: r.sdr_name || nomeDe.get(r.user_id) || '—' }))
        const grupos = a.agrupar_por
          ? contar(rows, r => a.agrupar_por === 'dia' ? String(r.created_at).slice(0, 10) : a.agrupar_por === 'vendedor' ? r.quem : a.agrupar_por === 'resultado' ? r.result : r.activity_type)
          : undefined
        return { total: rows.length, grupos, ultimas: rows.slice(0, limite).map(r => ({ data: r.created_at, quem: r.quem, tipo: r.activity_type, canal: r.contact_channel, resultado: r.result, descricao: r.description?.slice(0, 160) })) }
      }

      if (a.consulta === 'follow_ups') {
        let q = supabase
          .from('follow_ups')
          .select('data_agendada, titulo, descricao, tipo, concluido, user_id, lead_id')
          .order('data_agendada', { ascending: true })
          .limit(2000)
        if (de) q = q.gte('data_agendada', de)
        if (ate) q = q.lte('data_agendada', ate)
        if (a.somente_pendentes) q = q.eq('concluido', false)
        if (idsVendedor) q = q.in('user_id', idsVendedor.length ? idsVendedor : ['00000000-0000-0000-0000-000000000000'])
        const { data, error } = await q
        if (error) return { erro: error.message }
        const rows = (data || []).map(r => ({ ...r, quem: nomeDe.get(r.user_id) || '—' }))
        const atrasados = rows.filter(r => !r.concluido && new Date(r.data_agendada) < new Date()).length
        return { total: rows.length, pendentes_atrasados: atrasados, grupos: a.agrupar_por ? contar(rows, r => a.agrupar_por === 'vendedor' ? r.quem : a.agrupar_por === 'dia' ? String(r.data_agendada).slice(0, 10) : r.tipo) : undefined, lista: rows.slice(0, limite).map(r => ({ data: r.data_agendada, quem: r.quem, titulo: r.titulo, tipo: r.tipo, concluido: r.concluido })) }
      }

      let q = supabase
        .from('leads')
        .select('numero_lead, client_name, cliente_nome, empresa, status, temperatura, origem, valor_estimado, produto_interesse, cidade, estado, vendedor_id, data_abertura, data_fechamento, updated_at, created_at')
        .order('updated_at', { ascending: false })
        .limit(5000)
      if (a.status) q = q.ilike('status', `%${a.status}%`)
      if (de) q = q.gte('created_at', de)
      if (ate) q = q.lte('created_at', ate)
      if (a.cliente) q = q.or(`client_name.ilike.%${a.cliente}%,cliente_nome.ilike.%${a.cliente}%,empresa.ilike.%${a.cliente}%`)
      if (idsVendedor) q = q.in('vendedor_id', idsVendedor.length ? idsVendedor : ['00000000-0000-0000-0000-000000000000'])
      const { data, error } = await q
      if (error) return { erro: error.message }
      const rows = (data || []).map(r => ({ ...r, vendedor: nomeDe.get(r.vendedor_id) || '—' }))
      const valor = rows.reduce((s, r) => s + Number(r.valor_estimado || 0), 0)
      return {
        total: rows.length,
        valor_estimado_somado: r2(valor),
        grupos: a.agrupar_por ? contar(rows, r => a.agrupar_por === 'vendedor' ? r.vendedor : a.agrupar_por === 'dia' ? String(r.created_at).slice(0, 10) : String((r as any)[a.agrupar_por] ?? '—')) : undefined,
        lista: rows.slice(0, limite).map(r => ({
          lead: r.numero_lead, cliente: r.client_name || r.cliente_nome || r.empresa, status: r.status, temperatura: r.temperatura,
          origem: r.origem, valor_estimado: r.valor_estimado, produto: r.produto_interesse, vendedor: r.vendedor,
          cidade_uf: [r.cidade, r.estado].filter(Boolean).join('/'), atualizado: r.updated_at,
        })),
      }
    },
  },
  {
    name: 'consultar_precos',
    label: 'Política comercial',
    pages: ['politica'],
    declaration: {
      name: 'consultar_precos',
      description: 'Tabela de preços da Política Comercial: item, classe, preço, preço por kg e por m², unidade e IPI.',
      parameters: {
        type: 'OBJECT',
        properties: { busca: S('Trecho da descrição'), classe: S('Classe do produto') },
      },
    },
    async run(a) {
      let q = supabase.from('politica_comercial_itens').select('classe, descricao, unidade, preco, preco_kg, preco_m2, ipi, updated_at').eq('ativo', true)
      if (a.busca) q = q.ilike('descricao', `%${a.busca}%`)
      if (a.classe) q = q.ilike('classe', `%${a.classe}%`)
      const { data, error } = await q.order('classe').limit(80)
      if (error) return { erro: error.message }
      return { encontrados: data?.length || 0, itens: data || [] }
    },
  },
  {
    name: 'consultar_fretes',
    label: 'Fretes',
    pages: ['fretes', 'producao'],
    declaration: {
      name: 'consultar_fretes',
      description: 'Fretes lançados: pedido, cliente, cidade/UF de entrega, transportadora, peso, valor do frete, status e datas. Calcula custo por kg.',
      parameters: {
        type: 'OBJECT',
        properties: {
          cliente: S('Trecho do nome do cliente'), numero_pedido: S('Número do pedido'), transportadora: S('Trecho do nome da transportadora'),
          uf: S('UF de entrega'), status: S('Status do frete'), data_inicio: S('AAAA-MM-DD'), data_fim: S('AAAA-MM-DD'),
        },
      },
    },
    async run(a) {
      let q = supabase.from('fretes').select('numero_pedido, cliente_nome, cidade_entrega, uf_entrega, transportadora_nome, peso_kg, valor_frete, status, data_embarque, data_entrega, created_at').order('created_at', { ascending: false }).limit(500)
      if (a.cliente) q = q.ilike('cliente_nome', `%${a.cliente}%`)
      if (a.numero_pedido) q = q.eq('numero_pedido', String(a.numero_pedido))
      if (a.transportadora) q = q.ilike('transportadora_nome', `%${a.transportadora}%`)
      if (a.uf) q = q.ilike('uf_entrega', a.uf)
      if (a.status) q = q.ilike('status', `%${a.status}%`)
      if (a.data_inicio) q = q.gte('created_at', `${a.data_inicio}T00:00:00`)
      if (a.data_fim) q = q.lte('created_at', `${a.data_fim}T23:59:59`)
      const { data, error } = await q
      if (error) return { erro: error.message }
      const rows = data || []
      const valor = rows.reduce((s, r) => s + Number(r.valor_frete || 0), 0)
      const peso = rows.reduce((s, r) => s + Number(r.peso_kg || 0), 0)
      return { total: rows.length, valor_fretes: r2(valor), peso_kg: r2(peso), custo_medio_por_kg: peso ? r2(valor / peso) : 0, lista: rows.slice(0, 30) }
    },
  },
  {
    name: 'consultar_chamados',
    label: 'Chamados',
    pages: ['chamados'],
    declaration: {
      name: 'consultar_chamados',
      description: 'Chamados internos (tickets): número, título, cliente, status, prioridade, responsável, prazo (SLA) e datas.',
      parameters: {
        type: 'OBJECT',
        properties: { status: S('Status'), cliente: S('Trecho do cliente'), busca: S('Trecho do título'), limite: N('Máximo listado (padrão 15)') },
      },
    },
    async run(a) {
      let q = supabase.from('tickets').select('ticket_number, title, client_name, status, priority, requester_name, assignee_name, sla_deadline, created_at, resolved_at, valor').order('created_at', { ascending: false }).limit(300)
      if (a.status) q = q.ilike('status', `%${a.status}%`)
      if (a.cliente) q = q.ilike('client_name', `%${a.cliente}%`)
      if (a.busca) q = q.ilike('title', `%${a.busca}%`)
      const { data, error } = await q
      if (error) return { erro: error.message }
      const rows = data || []
      const porStatus: Record<string, number> = {}
      rows.forEach(r => { porStatus[r.status] = (porStatus[r.status] || 0) + 1 })
      const atrasados = rows.filter(r => !r.resolved_at && r.sla_deadline && new Date(r.sla_deadline) < new Date()).length
      return { total: rows.length, por_status: porStatus, fora_do_prazo: atrasados, lista: rows.slice(0, Math.min(Number(a.limite) || 15, 50)) }
    },
  },
  {
    name: 'consultar_manual',
    label: 'Manual do sistema',
    pages: 'any',
    declaration: {
      name: 'consultar_manual',
      description:
        'Manual do Globinho: como usar cada tela, passo a passo, regras ("o que acontece se…", o que é obrigatório, quem pode fazer), perguntas frequentes e erros comuns. Use SEMPRE que a pergunta for sobre como fazer algo no sistema, onde fica uma função, por que algo não funciona, o que significa um status/indicador, ou quem tem acesso. Assuntos: primeiros passos/login/senha, perfis e acessos, Dashboard Comercial, CRM (funil, bastão, perdido, crédito, follow-up), outras abas do CRM (agenda, prospecção, carteira, importar), Clientes, Fábrica/produção/compras, Estoque, Fretes, Política Comercial, Corte Perfil, Corte Blank, Chamados/SLA, Treinamentos, Zé, Administração de usuários, Relatórios.',
      parameters: {
        type: 'OBJECT',
        properties: { assunto: S('Do que se trata, com as palavras da pessoa. Ex.: "passar o bastão", "esqueci a senha", "aprovar frete", "SLA chamado"') },
        required: ['assunto'],
      },
    },
    async run(a, ctx) {
      const visiveis = helpArticlesFor(p => ctx.canView(p as PageKey), ctx.isAdmin)
      const achados = searchHelp(visiveis, String(a.assunto || ''), 3)
      const formatar = (art: HelpArticle) => ({
        titulo: art.title,
        tela: art.route || null,
        resumo: art.intro,
        quem_acessa: art.access,
        passo_a_passo: art.steps.map(st => `${st.title}: ${st.description}`),
        regras: art.rules,
        perguntas_frequentes: art.faq,
        dicas: art.tips,
        erros_comuns: art.troubleshooting,
      })
      if (achados.length) return { artigos: achados.map(formatar) }
      const bloqueado = searchHelp(helpArticles, String(a.assunto || ''), 1)[0]
      if (bloqueado && !visiveis.includes(bloqueado)) {
        return { aviso: `O assunto é da tela "${bloqueado.title}", que não está liberada para o perfil desta pessoa. Explique isso e sugira pedir acesso ao administrador.` }
      }
      return { aviso: 'Nada no manual sobre isso. Não invente botões nem caminhos: diga que não encontrou e sugira a Central de Ajuda ou o administrador.', assuntos_disponiveis: visiveis.map(x => x.title) }
    },
  },
  {
    name: 'mostrar_tutorial',
    label: 'Tutorial na tela',
    pages: 'any',
    declaration: {
      name: 'mostrar_tutorial',
      description:
        'Abre o tutorial guiado (passo a passo destacando os elementos) da tela que a pessoa está vendo agora, ou do menu lateral. Use quando pedirem "me mostra", "faz um tour", "tutorial", "não sei usar essa tela". O painel do Zé fecha para o tutorial aparecer.',
      parameters: {
        type: 'OBJECT',
        properties: { qual: S('"tela" = tutorial da tela atual (padrão); "menu" = tour pelo menu lateral', { enum: ['tela', 'menu'] }) },
      },
    },
    async run(a) {
      const [{ driver }, { tourStepsByRoute, sidebarSteps }] = await Promise.all([
        import('driver.js'),
        import('@/components/tour/tourSteps'),
        import('driver.js/dist/driver.css'),
      ])
      const path = window.location.pathname
      const cfg = a.qual === 'menu' ? { title: 'Menu lateral', steps: sidebarSteps } : tourStepsByRoute[path]
      if (!cfg) return { erro: 'Esta tela não tem tutorial guiado. Explique o uso pelo manual (consultar_manual).' }
      const existe = (st: { element?: unknown }) => typeof st.element !== 'string' || !!document.querySelector(st.element)
      const passos = cfg.steps.filter(existe)
      if (!passos.length) return { erro: 'Os elementos do tutorial não estão visíveis agora. Explique pelo manual.' }
      window.dispatchEvent(new CustomEvent('ze:close'))
      setTimeout(() => {
        const d = driver({
          showProgress: true,
          showButtons: ['next', 'previous', 'close'],
          nextBtnText: 'Próximo',
          prevBtnText: 'Anterior',
          doneBtnText: 'Concluir',
          progressText: '{{current}} de {{total}}',
          popoverClass: 'global-aco-tour-popover',
          overlayColor: 'rgba(0, 0, 0, 0.75)',
          stagePadding: 8,
          stageRadius: 8,
          allowClose: true,
        })
        d.setSteps(cfg.steps.filter(existe))
        d.drive()
      }, 450)
      return { ok: true, tutorial: cfg.title, passos: passos.length, instrucao: 'O tutorial já abriu na tela. Responda em uma frase curta, sem repetir os passos.' }
    },
  },
  {
    name: 'consultar_meta',
    label: 'Meta do mês',
    pages: ['dashboard'],
    declaration: {
      name: 'consultar_meta',
      description:
        'Meta mensal de faturamento x faturado (igual ao indicador "Meta do Mês" do Dashboard): meta, faturado, % atingido, quanto falta, dias restantes e quanto precisa faturar por dia útil. Use para "vamos bater a meta?", "quanto falta?", "% da meta".',
      parameters: {
        type: 'OBJECT',
        properties: { mes: S('Mês no formato AAAA-MM (padrão: mês atual)') },
      },
    },
    async run(a) {
      const hojeD = new Date()
      const [ano, mes] = /^\d{4}-\d{2}$/.test(String(a.mes || ''))
        ? String(a.mes).split('-').map(Number)
        : [hojeD.getFullYear(), hojeD.getMonth() + 1]
      const chave = `${ano}-${String(mes).padStart(2, '0')}`
      const { data: g } = await supabase.from('admin_goals').select('monthly_revenue_goal').eq('month_year', chave).maybeSingle()
      const metaCadastrada = Number(g?.monthly_revenue_goal) || 0
      const meta = metaCadastrada || 2_000_000
      const ultimoDia = new Date(ano, mes, 0).getDate()
      const rows = filtrarComercial(await carregarComercial(), { tipo: 'faturado', data_inicio: `${chave}-01`, data_fim: `${chave}-${ultimoDia}` })
      const t = totais(rows)
      const faturado = Number(t.valor_reais) || 0
      const mesAtual = ano === hojeD.getFullYear() && mes === hojeD.getMonth() + 1
      let diasRestantes = 0
      let diasUteis = 0
      if (mesAtual) {
        diasRestantes = ultimoDia - hojeD.getDate()
        for (let d = hojeD.getDate(); d <= ultimoDia; d++) {
          const wd = new Date(ano, mes - 1, d).getDay()
          if (wd !== 0 && wd !== 6) diasUteis++
        }
      }
      const falta = Math.max(0, meta - faturado)
      return {
        mes: chave,
        meta: r2(meta),
        meta_origem: metaCadastrada ? 'cadastrada pelo Admin' : 'padrão do sistema (mês sem meta cadastrada)',
        faturado: r2(faturado),
        percentual_atingido: r2((faturado / meta) * 100),
        falta: r2(falta),
        ...(mesAtual
          ? { dias_restantes_no_mes: diasRestantes, dias_uteis_restantes_incluindo_hoje: diasUteis, precisa_por_dia_util: diasUteis ? r2(falta / diasUteis) : null }
          : {}),
      }
    },
  },
  {
    name: 'listar_treinamentos',
    label: 'Treinamentos',
    pages: ['treinamentos'],
    declaration: {
      name: 'listar_treinamentos',
      description: 'Lista os materiais de treinamento disponíveis na tela Treinamentos (título, categoria e descrição).',
      parameters: { type: 'OBJECT', properties: { categoria: S('Filtrar por categoria (opcional)') } },
    },
    async run(a) {
      const { data, error } = await supabase.from('treinamentos').select('titulo, categoria, descricao').eq('is_active', true).order('categoria')
      if (error) throw error
      const lista = (data || []).filter(t => !a.categoria || matches(t.categoria, a.categoria))
      return { total: lista.length, treinamentos: lista, onde: 'Menu Treinamentos; clique no card para abrir em tela cheia.' }
    },
  },
  {
    name: 'calcular',
    label: 'Calculadora',
    pages: 'any',
    declaration: {
      name: 'calcular',
      description:
        'Calcula expressões matemáticas com precisão. Use SEMPRE que precisar fazer conta (variação %, margem, média, rateio, conversão peso/área). Ex.: "(1134281-980500)/980500*100", "round(2500*7.85*3/1000, 2)". Aço: peso(kg) = área(m²) × espessura(mm) × 7,85.',
      parameters: {
        type: 'OBJECT',
        properties: { expressao: S('Expressão com números, + - * / ^ %, parênteses e funções sqrt, round(x,casas), min, max, abs') },
        required: ['expressao'],
      },
    },
    async run(a) {
      try {
        return { expressao: a.expressao, resultado: calcular(String(a.expressao)) }
      } catch (e) {
        return { erro: (e as Error).message }
      }
    },
  },
]

// ---------------------------------------------------------------------
// API usada pelo chat
// ---------------------------------------------------------------------

const allowed = (t: ZeTool, ctx: ZeToolContext) =>
  t.pages === 'any' || ctx.isAdmin || t.pages.some(p => ctx.canView(p))

export function getToolDeclarations(ctx: ZeToolContext) {
  return TOOLS.filter(t => allowed(t, ctx)).map(t => t.declaration)
}

export function getAllowedAreas(ctx: ZeToolContext): string[] {
  return TOOLS.filter(t => allowed(t, ctx) && !['calcular', 'listar_nomes', 'consultar_manual', 'mostrar_tutorial'].includes(t.name)).map(t => t.label)
}

export function getToolLabel(name: string) {
  return TOOLS.find(t => t.name === name)?.label || name
}

/** Limita o tamanho do resultado enviado à IA */
function compact(result: ToolResult): ToolResult {
  const text = JSON.stringify(result)
  if (text.length <= 60_000) return result
  return { aviso: 'Resultado grande; mostrando só o começo. Refine os filtros.', parcial: text.slice(0, 60_000) }
}

export async function runZeTool(name: string, args: Args, ctx: ZeToolContext): Promise<ToolResult> {
  const tool = TOOLS.find(t => t.name === name)
  if (!tool) return { erro: `Ferramenta desconhecida: ${name}` }
  if (!allowed(tool, ctx)) {
    return { erro: 'Esta pessoa não tem acesso a essa área do sistema. Diga isso com educação e sugira falar com o administrador.' }
  }
  try {
    return compact(await tool.run(args || {}, ctx))
  } catch (e) {
    console.error(`[Zé] erro na ferramenta ${name}:`, e)
    return { erro: (e as Error).message || 'Falha ao consultar os dados.' }
  }
}

// Exportado só para testes
export const __test = { classify, dataDaLinha, filtrarComercial, totais, agrupar, parseBR, carregarComercial }
