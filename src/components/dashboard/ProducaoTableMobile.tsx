import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ChevronDown, ChevronRight, Save, Check, EyeOff } from 'lucide-react';
import { MobileTableCard } from '@/components/ui/mobile-table-card';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProducaoTableMobileProps {
  data: any[];
  expandedRows: Set<string>;
  toggleRowExpansion: (pedidoId: string) => void;
  novosPrazos: Record<string, string>;
  situacoes: Record<string, string>;
  savingStates: Record<string, boolean>;
  savedStates: Record<string, boolean>;
  handleNovoPrazoChange: (numeroPedido: string, value: string) => void;
  handleSituacaoChange: (numeroPedido: string, value: string) => void;
  canEdit: boolean;
  formatDate: (dateString: string) => string;
  formatWeight: (weight: number) => string;
  getStatusBadge: (status: string) => React.ReactNode;
  getMaterialStatusBadge: (status: string) => React.ReactNode;
  isAdmin: boolean;
  onHideOrder: (numeroPedido: string) => void;
}

export function ProducaoTableMobile({
  data,
  expandedRows,
  toggleRowExpansion,
  novosPrazos,
  situacoes,
  savingStates,
  savedStates,
  handleNovoPrazoChange,
  handleSituacaoChange,
  canEdit,
  formatDate,
  formatWeight,
  getStatusBadge,
  getMaterialStatusBadge,
  isAdmin,
  onHideOrder
}: ProducaoTableMobileProps) {
  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={`${item.numero_pedido}-${index}`} className="space-y-2">
          <MobileTableCard
            title={`Pedido ${item.numero_pedido}`}
            subtitle={item.cli_nomef}
            badge={getStatusBadge(item.status)}
            fields={[
              {
                label: 'Peso',
                value: Object.entries(item.pesos_por_unidade)
                  .map(([unidade, peso]) => {
                    const pesoNum = Number(peso);
                    const pesoFormatado = pesoNum.toLocaleString('pt-BR', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 1
                    });
                    return `${pesoFormatado}${unidade}`;
                  })
                  .join(' / ')
              },
              {
                label: '% Concluído',
                value: (
                  <div className="flex items-center gap-2 w-full">
                    <Progress value={item.percentual_concluido} className="w-20 h-2" />
                    <span className="text-sm font-medium">{item.percentual_concluido}%</span>
                  </div>
                ),
                fullWidth: true
              },
              {
                label: 'Prazo',
                value: formatDate(item.prazo_pcp)
              },
              {
                label: 'Novo Prazo',
                value: canEdit ? (
                  <div className="relative w-full">
                    <Input
                      type="date"
                      className="w-full pr-8"
                      value={novosPrazos[item.numero_pedido] || ''}
                      onChange={(e) => handleNovoPrazoChange(item.numero_pedido, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    {savingStates[item.numero_pedido] && (
                      <Save className="absolute right-2 top-2.5 h-3 w-3 text-blue-500 animate-spin" />
                    )}
                    {savedStates[item.numero_pedido] && (
                      <Check className="absolute right-2 top-2.5 h-3 w-3 text-green-500" />
                    )}
                  </div>
                ) : (
                  <span className="text-sm">
                    {novosPrazos[item.numero_pedido] ? formatDate(novosPrazos[item.numero_pedido]) : 'Não definido'}
                  </span>
                ),
                fullWidth: true
              },
              {
                label: 'Dias Atraso',
                value: item.dias_atraso ? (
                  <Badge variant="destructive" className="text-xs">
                    {item.dias_atraso} dias
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">-</span>
                )
              },
              {
                label: 'Situação',
                value: canEdit ? (
                  <Select
                    value={situacoes[item.numero_pedido] || ''}
                    onValueChange={(value) => handleSituacaoChange(item.numero_pedido, value)}
                  >
                    <SelectTrigger className="w-full h-8" onClick={(e) => e.stopPropagation()}>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhuma</SelectItem>
                      <SelectItem value="aguardando_mp">Aguardando MP</SelectItem>
                      <SelectItem value="em_producao">Em Produção</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-sm">
                    {situacoes[item.numero_pedido] 
                      ? situacoes[item.numero_pedido] === 'aguardando_mp' 
                        ? 'Aguardando MP' 
                        : 'Em Produção'
                      : 'Não definido'}
                  </span>
                ),
                fullWidth: true
              }
            ]}
            actions={
              <div className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleRowExpansion(item.numero_pedido);
                  }}
                  className="flex-1"
                >
                  {expandedRows.has(item.numero_pedido) ? (
                    <>
                      <ChevronDown className="h-4 w-4 mr-2" />
                      Ocultar OPs
                    </>
                  ) : (
                    <>
                      <ChevronRight className="h-4 w-4 mr-2" />
                      Ver OPs ({item.ops.length})
                    </>
                  )}
                </Button>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onHideOrder(item.numero_pedido);
                    }}
                    title="Ocultar pedido"
                  >
                    <EyeOff className="h-4 w-4" />
                  </Button>
                )}
              </div>
            }
          />

          {/* Expanded OPs */}
          {expandedRows.has(item.numero_pedido) && (
            <div className="ml-3 space-y-2 border-l-2 border-primary/20 pl-3">
              {item.ops.map((op: any, opIndex: number) => (
                <div key={`op-${opIndex}`} className="space-y-2">
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <div className="font-medium text-sm mb-2">OP {op.numero_op}</div>
                    <div className="space-y-1 text-xs">
                      {op.materiais.map((mat: any, matIndex: number) => (
                        <div key={`mat-${matIndex}`} className="flex justify-between items-center py-1">
                          <span className="text-muted-foreground truncate flex-1">
                            {mat.descricaomat}
                          </span>
                          <div className="flex-shrink-0 ml-2">
                            {getMaterialStatusBadge(mat.status_item)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
