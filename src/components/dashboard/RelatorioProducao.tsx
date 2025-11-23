import React, { forwardRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useProducao } from '@/context/ProducaoContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RelatorioProducaoProps {
  className?: string;
}

export const RelatorioProducao = forwardRef<HTMLDivElement, RelatorioProducaoProps>(
  ({ className }, ref) => {
    const { filteredData, totalPedidos, quantidadeTotal, noPrazo, atrasados, selectedCliente, selectedStatus } = useProducao();

    // Ordenar dados do mais atrasado para o menos atrasado (igual à interface)
    const sortedData = [...filteredData].sort((a, b) => {
      // Priorizar por status (ATRASO primeiro)
      if (a.status === 'ATRASO' && b.status !== 'ATRASO') return -1;
      if (b.status === 'ATRASO' && a.status !== 'ATRASO') return 1;
      
      // Se ambos estão atrasados, ordenar por dias de atraso (maior primeiro)
      if (a.status === 'ATRASO' && b.status === 'ATRASO') {
        return b.dias_atraso - a.dias_atraso;
      }
      
      // Se ambos estão no prazo, ordenar por número do pedido
      return a.numero_pedido.localeCompare(b.numero_pedido);
    });

    const formatWeight = (weight: number) => {
      if (!weight || weight === 0) return '0kg';
      if (weight >= 1000) {
        const tons = weight / 1000;
        return tons % 1 === 0 ? `${tons.toFixed(0)}t` : `${tons.toFixed(1)}t`;
      }
      return weight % 1 === 0 ? `${weight.toFixed(0)}kg` : `${weight.toFixed(1)}kg`;
    };

    const formatDate = (dateString: string) => {
      if (!dateString) return 'N/A';
      try {
        return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
      } catch {
        return dateString;
      }
    };

    const getStatusBadge = (status: string) => {
      if (status === 'ATRASO') {
        return <Badge variant="destructive">{status}</Badge>;
      }
      if (status === 'FINALIZADO') {
        return <Badge className="bg-green-600 text-white">{status}</Badge>;
      }
      return <Badge variant="default">{status}</Badge>;
    };

    // Calculate additional metrics
    const pesoAtrasado = atrasados.peso;
    const pesoNoPrazo = noPrazo.peso;

    const clientesUnicos = [...new Set(sortedData.map(p => p.cli_nomef))].length;

    // Filtrar materiais válidos antes de calcular
    const materialMaisComum = sortedData
      .flatMap(p => p.ops.flatMap(op => op.materiais))
      .filter(mat => mat.qtd_pendente > 0) // Filtrar materiais com quantidade válida
      .reduce((acc, mat) => {
        const key = mat.descricaomat;
        acc[key] = (acc[key] || 0) + mat.qtd_pendente;
        return acc;
      }, {} as Record<string, number>);

    const topMaterial = Object.entries(materialMaisComum)
      .filter(([, peso]) => peso > 0) // Garantir que o peso seja válido
      .sort(([,a], [,b]) => (b as number) - (a as number))[0];

    return (
      <div 
        ref={ref} 
        className={`bg-white text-black ${className}`}
        style={{ 
          width: '210mm', 
          minHeight: '297mm', 
          padding: '12mm',
          fontSize: '10px',
          lineHeight: '1.2',
          fontFamily: 'Arial, sans-serif'
        }}
      >
        {/* Header */}
        <div className="text-center mb-3 border-b border-gray-300 pb-2">
          <h1 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '3px' }}>
            Relatório de Controle de Produção
          </h1>
          <p style={{ fontSize: '9px', color: '#666', marginBottom: '2px' }}>
            Global Aço - Gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
          {(selectedCliente || selectedStatus) && (
            <div style={{ marginTop: '4px', display: 'flex', justifyContent: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {selectedCliente && (
                <span style={{ fontSize: '8px', padding: '2px 5px', border: '1px solid #0066cc', borderRadius: '3px', color: '#0066cc' }}>
                  Cliente: {selectedCliente}
                </span>
              )}
              {selectedStatus && (
                <span style={{ fontSize: '8px', padding: '2px 5px', border: '1px solid #0066cc', borderRadius: '3px', color: '#0066cc' }}>
                  Status: {selectedStatus}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Executive Summary */}
        <div style={{ marginBottom: '10px', padding: '6px', border: '1px solid #e0e0e0', borderRadius: '3px' }}>
          <h2 style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', borderBottom: '1px solid #e0e0e0', paddingBottom: '3px' }}>
            Resumo Executivo
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            <div style={{ textAlign: 'center', padding: '4px', backgroundColor: '#f8f9fa', borderRadius: '2px' }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0066cc', marginBottom: '1px' }}>{totalPedidos}</div>
              <div style={{ fontSize: '8px', color: '#666' }}>Total Pedidos</div>
            </div>
            <div style={{ textAlign: 'center', padding: '4px', backgroundColor: '#f8f9fa', borderRadius: '2px' }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0066cc', marginBottom: '1px' }}>{formatWeight(quantidadeTotal)}</div>
              <div style={{ fontSize: '8px', color: '#666' }}>Peso Total</div>
            </div>
            <div style={{ textAlign: 'center', padding: '4px', backgroundColor: '#e8f5e8', borderRadius: '2px' }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#28a745', marginBottom: '1px' }}>{noPrazo.count}</div>
              <div style={{ fontSize: '8px', color: '#666' }}>No Prazo</div>
            </div>
            <div style={{ textAlign: 'center', padding: '4px', backgroundColor: '#ffe8e8', borderRadius: '2px' }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#dc3545', marginBottom: '1px' }}>{atrasados.count}</div>
              <div style={{ fontSize: '8px', color: '#666' }}>Atrasados</div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
          <div style={{ padding: '6px', border: '1px solid #e0e0e0', borderRadius: '3px' }}>
            <h3 style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>Análise de Performance</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '9px', color: '#666' }}>Taxa Cumprimento</span>
                <span style={{ fontSize: '10px', fontWeight: 'bold' }}>
                  {totalPedidos > 0 ? Math.round((noPrazo.count / totalPedidos) * 100) : 0}%
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '9px', color: '#666' }}>Peso no Prazo</span>
                <span style={{ fontSize: '10px', fontWeight: 'bold' }}>{formatWeight(pesoNoPrazo)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '9px', color: '#666' }}>Peso Atrasado</span>
                <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#dc3545' }}>{formatWeight(pesoAtrasado)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '9px', color: '#666' }}>Clientes Únicos</span>
                <span style={{ fontSize: '10px', fontWeight: 'bold' }}>{clientesUnicos}</span>
              </div>
            </div>
          </div>

          <div style={{ padding: '6px', border: '1px solid #e0e0e0', borderRadius: '3px' }}>
            <h3 style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>Material Principal</h3>
            {topMaterial ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#0066cc', lineHeight: '1.2' }}>
                  {topMaterial[0].length > 35 ? `${topMaterial[0].substring(0, 32)}...` : topMaterial[0]}
                </div>
                <div style={{ fontSize: '9px', color: '#666' }}>
                  Peso total: {formatWeight(topMaterial[1] as number)}
                </div>
                <div style={{ fontSize: '8px', color: '#666' }}>
                  Material mais utilizado
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '9px', color: '#666' }}>Nenhum material encontrado</div>
            )}
          </div>
        </div>

        {/* Pedidos em Produção - Matching Interface Layout */}
        <div style={{ marginBottom: '10px', padding: '6px', border: '1px solid #e0e0e0', borderRadius: '3px' }}>
          <h2 style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', borderBottom: '1px solid #e0e0e0', paddingBottom: '3px' }}>
            Pedidos em Produção
          </h2>
          <div style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #ddd', backgroundColor: '#f8f9fa' }}>
                  <th style={{ textAlign: 'left', padding: '4px 6px', fontWeight: 'bold', fontSize: '9px' }}>Pedido</th>
                  <th style={{ textAlign: 'left', padding: '4px 6px', fontWeight: 'bold', fontSize: '9px' }}>Cliente</th>
                  <th style={{ textAlign: 'right', padding: '4px 6px', fontWeight: 'bold', fontSize: '9px' }}>Peso</th>
                  <th style={{ textAlign: 'center', padding: '4px 6px', fontWeight: 'bold', fontSize: '9px' }}>Prazo</th>
                  <th style={{ textAlign: 'center', padding: '4px 6px', fontWeight: 'bold', fontSize: '9px' }}>Status</th>
                  <th style={{ textAlign: 'center', padding: '4px 6px', fontWeight: 'bold', fontSize: '9px' }}>Dias Atraso</th>
                </tr>
              </thead>
              <tbody>
                {sortedData.slice(0, 30).map((pedido, index) => (
                  <tr key={pedido.numero_pedido} style={{ 
                    borderBottom: '1px solid #eee', 
                    backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9'
                  }}>
                    <td style={{ padding: '3px 6px', fontSize: '9px', fontWeight: 'bold', color: '#0066cc' }}>
                      {pedido.numero_pedido}
                    </td>
                    <td style={{ padding: '3px 6px', fontSize: '9px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {pedido.cli_nomef}
                    </td>
                    <td style={{ padding: '3px 6px', textAlign: 'right', fontSize: '9px', fontWeight: 'bold' }}>
                      {formatWeight(pedido.peso_total)}
                    </td>
                    <td style={{ padding: '3px 6px', textAlign: 'center', fontSize: '9px' }}>
                      {formatDate(pedido.prazo_pcp)}
                    </td>
                    <td style={{ padding: '3px 6px', textAlign: 'center' }}>
                      <span style={{ 
                        padding: '2px 6px', 
                        borderRadius: '12px', 
                        fontSize: '8px',
                        fontWeight: 'bold',
                        backgroundColor: pedido.status === 'ATRASO' ? '#fee2e2' : pedido.status === 'NO PRAZO' ? '#dcfce7' : '#f3f4f6',
                        color: pedido.status === 'ATRASO' ? '#dc2626' : pedido.status === 'NO PRAZO' ? '#16a34a' : '#6b7280',
                        border: `1px solid ${pedido.status === 'ATRASO' ? '#fecaca' : pedido.status === 'NO PRAZO' ? '#bbf7d0' : '#d1d5db'}`
                      }}>
                        {pedido.status}
                      </span>
                    </td>
                    <td style={{ padding: '3px 6px', textAlign: 'center', fontSize: '9px' }}>
                      {pedido.dias_atraso > 0 ? (
                        <span style={{ 
                          color: '#dc2626', 
                          fontWeight: 'bold',
                          padding: '2px 4px',
                          backgroundColor: '#fee2e2',
                          borderRadius: '4px',
                          fontSize: '8px'
                        }}>
                          {pedido.dias_atraso} dias
                        </span>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: '8px' }}>-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sortedData.length > 30 && (
              <div style={{ padding: '4px', textAlign: 'center', fontSize: '8px', color: '#666', fontStyle: 'italic' }}>
                Mostrando 30 de {sortedData.length} pedidos (ordenados do mais atrasado para o menos atrasado)
              </div>
            )}
          </div>
        </div>

        {/* Materials Summary */}
        <div style={{ padding: '6px', border: '1px solid #e0e0e0', borderRadius: '3px' }}>
          <h2 style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', borderBottom: '1px solid #e0e0e0', paddingBottom: '3px' }}>
            Resumo de Materiais (Top 10)
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px' }}>
            {Object.entries(materialMaisComum)
              .sort(([,a], [,b]) => (b as number) - (a as number))
              .slice(0, 10)
              .map(([material, peso], index) => (
                <div key={material} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '2px 0', 
                  borderBottom: '1px solid #f5f5f5',
                  fontSize: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <div style={{ 
                      width: '12px', 
                      height: '12px', 
                      borderRadius: '50%', 
                      backgroundColor: '#e3f2fd', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontSize: '6px', 
                      fontWeight: 'bold', 
                      color: '#0066cc' 
                    }}>
                      {index + 1}
                    </div>
                    <span style={{ fontSize: '8px', maxWidth: '70px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {material}
                    </span>
                  </div>
                  <span style={{ fontWeight: 'bold', fontSize: '8px' }}>{formatWeight(peso as number)}</span>
                </div>
              ))}
          </div>
          {Object.keys(materialMaisComum).length === 0 && (
            <div style={{ textAlign: 'center', fontSize: '9px', color: '#666', padding: '8px' }}>
              Nenhum material com peso válido encontrado
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ 
          marginTop: '12px', 
          paddingTop: '6px', 
          borderTop: '1px solid #e0e0e0', 
          textAlign: 'center', 
          fontSize: '8px', 
          color: '#666' 
        }}>
          <p style={{ fontWeight: 'bold' }}>Sistema de Controle de Produção - Global Aço</p>
          <p style={{ marginTop: '1px' }}>
            Relatório gerado em {format(new Date(), 'dd/MM/yyyy HH:mm')} | Dados ordenados por prioridade de atraso
          </p>
        </div>
      </div>
    );
  }
);

RelatorioProducao.displayName = 'RelatorioProducao';