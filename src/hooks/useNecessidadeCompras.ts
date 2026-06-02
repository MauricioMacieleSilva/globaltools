import { useMemo } from 'react';
import { useProducao } from '@/context/ProducaoContext';
import { useEstoque } from '@/context/EstoqueContext';
import {
  EstoqueCategoria,
  categorizeForStock,
  extractThickness,
  parseThicknessNumber,
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
  categorias: EstoqueCategoria[]; // categorias onde pode buscar (ex.: CHAPAS+BOBINAS)
  espessura: string; // ex.: "1,95"
  espessuraNum: number;
  necessarioKg: number;
  estoqueKg: number;
  faltaKg: number; // positivo = precisa comprar; <=0 = atendido
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
    // 1) Agrega estoque disponível por (categoria, espessura) em KG
    const estoquePorChave = new Map<string, number>();
    estoqueItems.forEach(item => {
      if (!item.ativo || !item.espessura) return;
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
      const espStr = String(item.espessura).replace('.', ',');
      const key = `${item.categoria}|${espStr}`;
      estoquePorChave.set(key, (estoquePorChave.get(key) || 0) + peso);
    });

    // 2) Agrega necessidade por (categoriasAlvo, espessura) — pedidos não finalizados
    type Bucket = {
      categorias: EstoqueCategoria[];
      espessura: string;
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
          if (!shouldSummarizeByThickness(mat.descricaomat)) return;
          const espessura = extractThickness(mat.descricaomat);
          if (!espessura) return;
          const categorias = categorizeForStock(mat.descricaomat);
          if (categorias.length === 0) return;

          const peso = mat.peso_kg || mat.qtd_pendente || 0;
          if (peso <= 0) return;

          // Chave única por conjunto de categorias + espessura
          const catKey = [...categorias].sort().join('+');
          const bucketKey = `${catKey}|${espessura}`;

          let bucket = necessidadeMap.get(bucketKey);
          if (!bucket) {
            bucket = {
              categorias,
              espessura,
              necessarioKg: 0,
              pedidosMap: new Map(),
              urgencia: pedidoUrgencia,
            };
            necessidadeMap.set(bucketKey, bucket);
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

    // 3) Constrói lista final cruzando com estoque disponível
    const todos: NecessidadeCompra[] = [];

    necessidadeMap.forEach((bucket, key) => {
      const estoqueKg = bucket.categorias.reduce((sum, cat) => {
        return sum + (estoquePorChave.get(`${cat}|${bucket.espessura}`) || 0);
      }, 0);
      const faltaKg = bucket.necessarioKg - estoqueKg;
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
        espessuraNum: parseThicknessNumber(bucket.espessura),
        necessarioKg: bucket.necessarioKg,
        estoqueKg,
        faltaKg,
        clientes,
        pedidos,
        urgencia: bucket.urgencia,
      });
    });

    // Ordena: urgência (atraso primeiro) e maior falta
    const ordemUrgencia: Record<Urgencia, number> = { atraso: 1, prazo: 2, programar: 3 };
    todos.sort((a, b) => {
      const u = ordemUrgencia[a.urgencia] - ordemUrgencia[b.urgencia];
      if (u !== 0) return u;
      return b.faltaKg - a.faltaKg;
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
