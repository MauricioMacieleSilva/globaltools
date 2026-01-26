import React, { useMemo, useState } from 'react';
import { usePerfilContext } from '@/context/PerfilContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  calcularOtimizacaoCompleta, 
  OtimizacaoGrupo, 
  formatarTipoPerfil,
  getCorPerfil 
} from '@/lib/otimizacao-perfis';
import { VisualizacaoChapaCombinada } from './VisualizacaoChapaCombinada';
import { 
  Layers, 
  TrendingDown, 
  TrendingUp, 
  ChevronDown, 
  ChevronUp,
  Package,
  Scale,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export function AproveitamentoOtimizado() {
  const { calculos } = usePerfilContext();
  const [filtroEspessura, setFiltroEspessura] = useState<string>('all');
  const [expandidos, setExpandidos] = useState<Set<number>>(new Set([0]));
  
  const otimizacoes = useMemo(() => {
    return calcularOtimizacaoCompleta(calculos);
  }, [calculos]);
  
  const espessurasDisponiveis = useMemo(() => {
    return Array.from(new Set(otimizacoes.map(o => o.espessura))).sort((a, b) => a - b);
  }, [otimizacoes]);
  
  const otimizacoesFiltradas = useMemo(() => {
    if (filtroEspessura === 'all') return otimizacoes;
    return otimizacoes.filter(o => o.espessura.toString() === filtroEspessura);
  }, [otimizacoes, filtroEspessura]);
  
  const toggleExpandido = (index: number) => {
    const novo = new Set(expandidos);
    if (novo.has(index)) {
      novo.delete(index);
    } else {
      novo.add(index);
    }
    setExpandidos(novo);
  };
  
  const expandirTodos = () => {
    setExpandidos(new Set(otimizacoesFiltradas.map((_, i) => i)));
  };
  
  const recolherTodos = () => {
    setExpandidos(new Set());
  };
  
  if (Object.keys(calculos).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">Nenhum perfil calculado</p>
        <p className="text-sm mt-1">Preencha os perfis nas outras abas para ver a otimização</p>
      </div>
    );
  }
  
  if (otimizacoes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Package className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">Otimização não disponível</p>
        <p className="text-sm mt-1 text-center max-w-md">
          Para otimizar o aproveitamento, é necessário ter pelo menos 2 perfis 
          com a mesma espessura e largura de chapa.
        </p>
      </div>
    );
  }
  
  // Totais gerais
  const totais = otimizacoes.reduce((acc, o) => ({
    chapasOtimizadas: acc.chapasOtimizadas + o.chapasNecessarias,
    chapasIndividuais: acc.chapasIndividuais + o.comparativoIndividual.chapasIndividuais,
    pesoPerdaOtimizado: acc.pesoPerdaOtimizado + o.pesoPerdaOtimizado,
    pesoPerdaIndividual: acc.pesoPerdaIndividual + o.comparativoIndividual.pesoPerdaIndividual
  }), { chapasOtimizadas: 0, chapasIndividuais: 0, pesoPerdaOtimizado: 0, pesoPerdaIndividual: 0 });
  
  const economiaChapas = totais.chapasIndividuais - totais.chapasOtimizadas;
  const economiaPeso = totais.pesoPerdaIndividual - totais.pesoPerdaOtimizado;
  const percentualEconomia = totais.chapasIndividuais > 0 
    ? ((economiaChapas / totais.chapasIndividuais) * 100).toFixed(1)
    : '0';
  
  return (
    <div className="space-y-4">
      {/* Header com resumo geral */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-primary">
            <Sparkles className="h-5 w-5" />
            Resumo da Otimização
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-background rounded-lg border">
              <div className="text-2xl font-bold text-primary">{totais.chapasOtimizadas}</div>
              <div className="text-xs text-muted-foreground">Chapas Otimizadas</div>
              <div className="text-xs text-muted-foreground mt-1">
                (era {totais.chapasIndividuais})
              </div>
            </div>
            <div className="text-center p-3 bg-background rounded-lg border">
              <div className="text-2xl font-bold text-green-600 flex items-center justify-center gap-1">
                <TrendingDown className="h-4 w-4" />
                {economiaChapas}
              </div>
              <div className="text-xs text-muted-foreground">Chapas Economizadas</div>
              <div className="text-xs text-green-600 mt-1">-{percentualEconomia}%</div>
            </div>
            <div className="text-center p-3 bg-background rounded-lg border">
              <div className="text-2xl font-bold text-orange-600">
                {totais.pesoPerdaOtimizado.toFixed(1)} kg
              </div>
              <div className="text-xs text-muted-foreground">Peso Perda Otimizado</div>
              <div className="text-xs text-muted-foreground mt-1">
                (era {totais.pesoPerdaIndividual.toFixed(1)} kg)
              </div>
            </div>
            <div className="text-center p-3 bg-background rounded-lg border">
              <div className="text-2xl font-bold text-green-600 flex items-center justify-center gap-1">
                <Scale className="h-4 w-4" />
                {economiaPeso.toFixed(1)} kg
              </div>
              <div className="text-xs text-muted-foreground">Peso Economizado</div>
              <div className="text-xs text-green-600 mt-1">
                -{((economiaPeso / totais.pesoPerdaIndividual) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Espessura:</span>
          <Select value={filtroEspessura} onValueChange={setFiltroEspessura}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {espessurasDisponiveis.map(esp => (
                <SelectItem key={esp} value={esp.toString()}>{esp} mm</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={expandirTodos}>
            <ChevronDown className="h-4 w-4 mr-1" />
            Expandir
          </Button>
          <Button variant="outline" size="sm" onClick={recolherTodos}>
            <ChevronUp className="h-4 w-4 mr-1" />
            Recolher
          </Button>
        </div>
      </div>
      
      {/* Cards de otimização */}
      <div className="space-y-4">
        {otimizacoesFiltradas.map((otim, index) => (
          <GrupoOtimizacaoCard 
            key={`${otim.espessura}-${otim.larguraChapa}`}
            otimizacao={otim}
            isExpanded={expandidos.has(index)}
            onToggle={() => toggleExpandido(index)}
          />
        ))}
      </div>
    </div>
  );
}

interface GrupoOtimizacaoCardProps {
  otimizacao: OtimizacaoGrupo;
  isExpanded: boolean;
  onToggle: () => void;
}

function GrupoOtimizacaoCard({ otimizacao, isExpanded, onToggle }: GrupoOtimizacaoCardProps) {
  const economiaChapas = otimizacao.comparativoIndividual.chapasIndividuais - otimizacao.chapasNecessarias;
  const percentualEconomia = ((economiaChapas / otimizacao.comparativoIndividual.chapasIndividuais) * 100).toFixed(1);
  const economiaPeso = otimizacao.comparativoIndividual.pesoPerdaIndividual - otimizacao.pesoPerdaOtimizado;
  
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <Card className="overflow-hidden">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="font-mono text-sm">
                  {otimizacao.espessura} mm
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Chapa {otimizacao.larguraChapa}mm
                </span>
                <div className="hidden sm:flex items-center gap-1">
                  {otimizacao.perfis.slice(0, 3).map(p => (
                    <Badge 
                      key={p.id} 
                      variant="secondary" 
                      className="text-xs"
                      style={{ backgroundColor: getCorPerfil(p.tipo), color: 'white' }}
                    >
                      {formatarTipoPerfil(p.tipo)}
                    </Badge>
                  ))}
                  {otimizacao.perfis.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{otimizacao.perfis.length - 3}
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">
                    {otimizacao.chapasNecessarias} chapas
                    <span className="text-green-600 ml-1">(-{economiaChapas})</span>
                  </span>
                  <span className="text-green-600">
                    -{percentualEconomia}%
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Comparativo */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Individual</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Chapas:</span>
                    <span className="font-medium">{otimizacao.comparativoIndividual.chapasIndividuais}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Aproveitamento:</span>
                    <span className="font-medium">{otimizacao.comparativoIndividual.aproveitamentoIndividual.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Peso Perda:</span>
                    <span className="font-medium">{otimizacao.comparativoIndividual.pesoPerdaIndividual.toFixed(2)} kg</span>
                  </div>
                </div>
              </div>
              <div className="border-l pl-4">
                <h4 className="text-sm font-medium text-primary mb-2 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Otimizado
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Chapas:</span>
                    <span className="font-medium text-green-600">
                      {otimizacao.chapasNecessarias}
                      <span className="text-xs ml-1">(-{economiaChapas})</span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Aproveitamento:</span>
                    <span className="font-medium text-green-600">
                      {otimizacao.aproveitamentoTotal.toFixed(1)}%
                      <TrendingUp className="inline h-3 w-3 ml-1" />
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Peso Perda:</span>
                    <span className="font-medium text-green-600">
                      {otimizacao.pesoPerdaOtimizado.toFixed(2)} kg
                      <span className="text-xs ml-1">(-{economiaPeso.toFixed(2)})</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Perfis incluídos */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Perfis incluídos</h4>
              <div className="flex flex-wrap gap-2">
                {otimizacao.perfis.map(perfil => (
                  <Badge 
                    key={perfil.id} 
                    variant="outline"
                    className="text-xs"
                  >
                    <div 
                      className="w-2 h-2 rounded-full mr-1.5"
                      style={{ backgroundColor: getCorPerfil(perfil.tipo) }}
                    />
                    {formatarTipoPerfil(perfil.tipo)} {perfil.base}×{perfil.aba1 || '-'}
                    <span className="ml-1 text-muted-foreground">
                      (tira: {Math.ceil(perfil.tira)}mm × {perfil.quantidade})
                    </span>
                  </Badge>
                ))}
              </div>
            </div>
            
            {/* Visualização das chapas */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Distribuição nas Chapas ({otimizacao.distribuicao.length} chapas)
              </h4>
              <div className="space-y-3">
                {otimizacao.distribuicao.slice(0, 5).map((dist, idx) => (
                  <VisualizacaoChapaCombinada 
                    key={idx}
                    distribuicao={dist}
                    larguraChapa={otimizacao.larguraChapa}
                    comprimento={otimizacao.perfis[0]?.comprimento}
                  />
                ))}
                {otimizacao.distribuicao.length > 5 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    + {otimizacao.distribuicao.length - 5} chapas adicionais
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
