import { useMemo } from 'react';
import { useProducao } from '@/context/ProducaoContext';
import { useEstoque } from '@/context/EstoqueContext';
import {
  EstoqueCategoria,
  categorizeForStock,
  extractThickness,
  parseThicknessNumber,
  normalizeThicknessKey,
  displayThickness,
  extractColor,
  shouldSummarizeByThickness,
} from '@/lib/material-matching';
import { calcularPesoTotal } from '@/services/estoqueService';

export type Urgencia = 'atraso' | 'prazo' | 'programar';

export interface PedidoImpactado {
  numero_pedido: string;
  cliente: string;
  prazo: string;
  pesoKg: number;
  status: string;
}

export interface NecessidadeCompra {
  key: string;
  categorias: EstoqueCategoria[]; // categorias onde pode buscar (ex.: CHAPAS+BOBINAS) — vazio para "outros"
  espessura: string; // exibição (ex.: "1,95") — vazio para "outros"
  espessuraKey: string; // canônico (ex.: "1.95") — vazio para "outros"
  espessuraNum: number;
  cor: string | null; // cor/acabamento (ex.: "PP BRANCA") — null se não aplicável
  descricao: string; // rótulo exibido na coluna Material
  isOutro: boolean;
  necessarioKg: number;
  estoqueKg: number;
  faltaKg: number; // positivo = precisa comprar; <=0 = atendido
  saldoKg: number; // saldo virtual após consumir necessidade (>=0)
  clientes: string[];
  pedidos: PedidoImpactado[];
  urgencia: Urgencia;
}

export interface TotaisCompras {
  skusFaltantes: number;
  pesoTotal: number;
  clientesImpactados: number;
  pedidosAtrasados: number;
}

function urgenciaDoPedido(status: string): Urgencia {
  if (status === 'ATRASO') return 'atraso';
  if (status === 'PROGRAMAR') return 'programar';
  return 'prazo';
}

function urgenciaMaxima(a: Urgencia, b: Urgencia): Urgencia {
  const order: Record<Urgencia, number> = { atraso: 3, prazo: 2, programar: 1 };
  return order[a] >= order[b] ? a : b;
}

export function useNecessidadeCompras() {
  const { filteredData } = useProducao();
  const { items: estoqueItems } = useEstoque();

  return useMemo(() => {
    // 1) Indexa estoque disponível por (categoria, espessura-canônica, cor?)
    // Estrutura: para cada categoria/espessura, lista de pacotes {peso, cor (ou null)}
    type StockEntry = { peso: number; cor: string | null };
    const stockIndex = new Map<string, StockEntry[]>(); // key: `${cat}|${espKey}`

    const addStock = (cat: string, espKey: string, peso: number, cor: string | null) => {
      const k = `${cat}|${espKey}`;
      const arr = stockIndex.get(k) || [];
      arr.push({ peso, cor });
      stockIndex.set(k, arr);
    };

    estoqueItems.forEach(item => {
      if (!item.ativo || !item.espessura) return;
      if (item.segregado) return; // segregado não conta como disponível
      const peso = calcularPesoTotal(
        item.categoria as EstoqueCategoria,
        item.quantidade,
        item.espessura,
        item.largura,
        item.comprimento,
        item.base,
        item.aba1,
        item.aba2,
        item.tipo_perfil,
      );
      if (!peso || peso <= 0) return;

      const cor = extractColor(item.descricao);
      const espKeyMain = normalizeThicknessKey(item.espessura);
      if (espKeyMain) addStock(item.categoria, espKeyMain, peso, cor);

      // Espessuras equivalentes (item 2,60 com ["2,65"] também supre necessidade de 2,65)
      (item.espessuras_equivalentes || []).forEach(eq => {
        const ek = normalizeThicknessKey(eq);
        if (ek && ek !== espKeyMain) addStock(item.categoria, ek, peso, cor);
      });
    });

    // 2) Agrega necessidade por (categoriasAlvo, espessura) — pedidos não finalizados
    type Bucket = {
      categorias: EstoqueCategoria[];
      espessura: string;     // display ex: "0,50"
      espessuraKey: string;  // canônica ex: "0.50"
      cor: string | null;
      descricao: string;
      isOutro: boolean;
      necessarioKg: number;
      pedidosMap: Map<string, PedidoImpactado>;
      urgencia: Urgencia;
    };
    const necessidadeMap = new Map<string, Bucket>();

    const dataAtiva = filteredData.filter(p => p.status !== 'FINALIZADO');

    dataAtiva.forEach(pedido => {
      const pedidoUrgencia = urgenciaDoPedido(pedido.status);
      pedido.ops.forEach(op => {
        const sit = (op.situacao_op || '').toUpperCase();
        if (sit === 'FINALIZADA' || sit === 'CONCLUÍDO' || sit === 'CONCLUIDO') return;

        op.materiais.forEach(mat => {
          const peso = mat.peso_kg || mat.qtd_pendente || 0;
          if (peso <= 0) return;

          let bucketKey: string;
          let categorias: EstoqueCategoria[] = [];
          let espessura = '';
          let espessuraKey = '';
          let cor: string | null = null;
          let descricao = '';
          let isOutro = false;

          const espThick = shouldSummarizeByThickness(mat.descricaomat)
            ? extractThickness(mat.descricaomat)
            : null;
          const cats = espThick ? categorizeForStock(mat.descricaomat) : [];

          if (espThick && cats.length > 0) {
            categorias = cats;
            espessura = espThick;
            espessuraKey = normalizeThicknessKey(espThick);
            cor = extractColor(mat.descricaomat);
            descricao = cor ? `${espessura} mm • ${cor}` : `${espessura} mm`;
            // Agrupa por espessura + cor, independente da origem (CHAPA/BOBINA/SLITTER).
            // As categorias dos diferentes pedidos se acumulam no bucket para varredura de estoque.
            bucketKey = `T|${espessuraKey}|${cor || ''}`;
          } else {
            // Outros materiais: agrupa por descricaomat
            isOutro = true;
            descricao = mat.descricaomat;
            bucketKey = `O|${mat.descricaomat}`;
          }

          let bucket = necessidadeMap.get(bucketKey);
          if (!bucket) {
            bucket = {
              categorias,
              espessura,
              espessuraKey,
              cor,
              descricao,
              isOutro,
              necessarioKg: 0,
              pedidosMap: new Map(),
              urgencia: pedidoUrgencia,
            };
            necessidadeMap.set(bucketKey, bucket);
          } else if (!isOutro) {
            // União das categorias candidatas vindas de diferentes itens da mesma espessura+cor
            const merged = new Set<EstoqueCategoria>([...bucket.categorias, ...categorias]);
            bucket.categorias = Array.from(merged);
          }
          bucket.necessarioKg += peso;
          bucket.urgencia = urgenciaMaxima(bucket.urgencia, pedidoUrgencia);

          const pkey = pedido.numero_pedido;
          const existing = bucket.pedidosMap.get(pkey);
          if (existing) {
            existing.pesoKg += peso;
          } else {
            bucket.pedidosMap.set(pkey, {
              numero_pedido: pedido.numero_pedido,
              cliente: pedido.cli_nomef,
              prazo: pedido.prazo_pcp,
              pesoKg: peso,
              status: pedido.status,
            });
          }
        });
      });
    });

    // 3) Constrói lista final cruzando com estoque disponível.
    //    Regras de matching cor: estoque sem cor é universal (cobre qualquer cor),
    //    estoque com cor só cobre necessidades da mesma cor.
    const todos: NecessidadeCompra[] = [];

    necessidadeMap.forEach((bucket, key) => {
      let estoqueKg = 0;
      if (!bucket.isOutro && bucket.espessuraKey) {
        bucket.categorias.forEach(cat => {
          const entries = stockIndex.get(`${cat}|${bucket.espessuraKey}`) || [];
          entries.forEach(e => {
            if (!bucket.cor || !e.cor || e.cor === bucket.cor) {
              estoqueKg += e.peso;
            }
          });
        });
      }
      const faltaKg = bucket.necessarioKg - estoqueKg;
      const saldoKg = Math.max(0, estoqueKg - bucket.necessarioKg);
      const pedidos = Array.from(bucket.pedidosMap.values()).sort((a, b) => {
        const da = a.prazo || '9999-99-99';
        const db = b.prazo || '9999-99-99';
        return da.localeCompare(db);
      });
      const clientes = Array.from(new Set(pedidos.map(p => p.cliente)));

      todos.push({
        key,
        categorias: bucket.categorias,
        espessura: bucket.espessura,
        espessuraKey: bucket.espessuraKey,
        espessuraNum: parseThicknessNumber(bucket.espessura),
        cor: bucket.cor,
        descricao: bucket.descricao,
        isOutro: bucket.isOutro,
        necessarioKg: bucket.necessarioKg,
        estoqueKg,
        faltaKg,
        saldoKg,
        clientes,
        pedidos,
        urgencia: bucket.urgencia,
      });
    });

    // Ordenação padrão: por espessura crescente. "Outros" ao final (ordem alfabética).
    todos.sort((a, b) => {
      if (a.isOutro !== b.isOutro) return a.isOutro ? 1 : -1;
      if (a.isOutro && b.isOutro) return a.descricao.localeCompare(b.descricao);
      const diff = a.espessuraNum - b.espessuraNum;
      if (diff !== 0) return diff;
      return (a.cor || '').localeCompare(b.cor || '');
    });

    const faltantes = todos.filter(t => t.faltaKg > 0);

    const clientesUnicos = new Set<string>();
    let pedidosAtrasadosUnicos = new Set<string>();
    let pesoTotal = 0;
    faltantes.forEach(f => {
      f.clientes.forEach(c => clientesUnicos.add(c));
      f.pedidos.forEach(p => {
        if (p.status === 'ATRASO') pedidosAtrasadosUnicos.add(p.numero_pedido);
      });
      pesoTotal += f.faltaKg;
    });

    const totais: TotaisCompras = {
      skusFaltantes: faltantes.length,
      pesoTotal,
      clientesImpactados: clientesUnicos.size,
      pedidosAtrasados: pedidosAtrasadosUnicos.size,
    };

    return { todos, faltantes, totais };
  }, [filteredData, estoqueItems]);
}
