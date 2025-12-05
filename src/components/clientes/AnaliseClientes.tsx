import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LabelList } from "recharts";
import { MapPin, Users, Calendar, TrendingUp, ArrowLeft, Building2, UserPlus } from "lucide-react";
import { useComercial } from "@/context/ComercialContext";
import { isFaturado, formatCurrency } from "@/lib/utils-comercial";
import { useIsMobile } from "@/hooks/use-mobile";

interface ClienteUF {
  uf: string;
  qtdClientes: number;
  faturamento: number;
  percentual: number;
}

interface ClienteCidade {
  cidade: string;
  uf: string;
  qtdClientes: number;
  qtdClientesNovos: number;
  percentualNovos: number;
  faturamento: number;
  percentual: number;
}

interface ClientePerfil {
  tipo: 'Novo' | 'Antigo';
  qtd: number;
  faturamento: number;
  percentual: number;
  color: string;
}

export function AnaliseClientes() {
  const { data } = useComercial();
  const [drillDownState, setDrillDownState] = useState<{ mode: 'uf' | 'cidade'; selectedUF?: string }>({ mode: 'uf' });
  const isMobile = useIsMobile();

  const analiseUF = useMemo(() => {
    if (!data) return [];

    const ufMap = new Map<string, { clientes: Set<string>, faturamento: number }>();
    
    data.forEach(item => {
      if (isFaturado(item.situacao)) {
        const uf = item.uf || 'N/I';
        
        if (!ufMap.has(uf)) {
          ufMap.set(uf, { clientes: new Set(), faturamento: 0 });
        }
        
        const ufData = ufMap.get(uf)!;
        ufData.clientes.add(item.cliente);
        ufData.faturamento += item.valor;
      }
    });

    const totalFaturamento = Array.from(ufMap.values())
      .reduce((sum, uf) => sum + uf.faturamento, 0);

    return Array.from(ufMap.entries())
      .map(([uf, data]) => ({
        uf,
        qtdClientes: data.clientes.size,
        faturamento: data.faturamento,
        percentual: (data.faturamento / totalFaturamento) * 100
      }))
      .sort((a, b) => b.qtdClientes - a.qtdClientes);
  }, [data]);

  const analisePerfil = useMemo(() => {
    if (!data) return [];

    const clientesMap = new Map<string, { primeiraCompra: Date, faturamento: number }>();
    const umAnoAtras = new Date();
    umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);

    data.forEach(item => {
      if (isFaturado(item.situacao)) {
        const cliente = item.cliente;
        const dataCompra = new Date(item.data_emissao);
        
        if (!clientesMap.has(cliente)) {
          clientesMap.set(cliente, { 
            primeiraCompra: dataCompra, 
            faturamento: 0 
          });
        }
        
        const clienteData = clientesMap.get(cliente)!;
        
        if (dataCompra < clienteData.primeiraCompra) {
          clienteData.primeiraCompra = dataCompra;
        }
        
        clienteData.faturamento += item.valor;
      }
    });

    let novos = 0;
    let antigos = 0;
    let faturamentoNovos = 0;
    let faturamentoAntigos = 0;

    clientesMap.forEach(clienteData => {
      if (clienteData.primeiraCompra >= umAnoAtras) {
        novos++;
        faturamentoNovos += clienteData.faturamento;
      } else {
        antigos++;
        faturamentoAntigos += clienteData.faturamento;
      }
    });

    const total = novos + antigos;
    const faturamentoTotal = faturamentoNovos + faturamentoAntigos;

    return [
      {
        tipo: 'Novo' as const,
        qtd: novos,
        faturamento: faturamentoNovos,
        percentual: total > 0 ? (novos / total) * 100 : 0,
        color: 'hsl(142 76% 36%)'
      },
      {
        tipo: 'Antigo' as const,
        qtd: antigos,
        faturamento: faturamentoAntigos,
        percentual: total > 0 ? (antigos / total) * 100 : 0,
        color: 'hsl(212 100% 47%)'
      }
    ];
  }, [data]);

  const analiseCidade = useMemo(() => {
    if (!data || drillDownState.mode === 'uf' || !drillDownState.selectedUF) {
      console.log('Debug analiseCidade - early return:', { 
        hasData: !!data, 
        mode: drillDownState.mode, 
        selectedUF: drillDownState.selectedUF 
      });
      return [];
    }

    console.log('Debug analiseCidade - processing for UF:', drillDownState.selectedUF);

    const cidadeMap = new Map<string, { clientes: Set<string>, clientesNovos: Set<string>, faturamento: number }>();
    const umAnoAtras = new Date();
    umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);
    
    let processedItems = 0;
    
    data.forEach(item => {
      if (isFaturado(item.situacao) && item.uf === drillDownState.selectedUF) {
        processedItems++;
        
        // Tratamento robusto de cidade
        let cidade = item.cli_cidade;
        if (!cidade || 
            cidade.trim() === '' || 
            cidade === 'undefined' || 
            cidade === 'null' || 
            cidade === 'NULL' ||
            cidade === 'N/A' ||
            cidade.toLowerCase() === 'null') {
          cidade = 'Não Informado';
        } else {
          cidade = cidade.trim(); // Remove espaços extras
        }
        
        if (!cidadeMap.has(cidade)) {
          cidadeMap.set(cidade, { clientes: new Set(), clientesNovos: new Set(), faturamento: 0 });
        }
        
        const cidadeData = cidadeMap.get(cidade)!;
        cidadeData.clientes.add(item.cliente);
        cidadeData.faturamento += item.valor;
        
        // Verificar se é cliente novo
        const dataCompra = new Date(item.data_emissao);
        if (dataCompra >= umAnoAtras) {
          cidadeData.clientesNovos.add(item.cliente);
        }
      }
    });

    console.log('Debug analiseCidade - processed items:', processedItems);
    console.log('Debug analiseCidade - cities found:', Array.from(cidadeMap.keys()));

    const totalFaturamento = Array.from(cidadeMap.values())
      .reduce((sum, cidade) => sum + cidade.faturamento, 0);

    const result = Array.from(cidadeMap.entries())
      .map(([cidade, data]) => ({
        cidade,
        uf: drillDownState.selectedUF!,
        qtdClientes: data.clientes.size,
        qtdClientesNovos: data.clientesNovos.size,
        percentualNovos: data.clientes.size > 0 ? (data.clientesNovos.size / data.clientes.size) * 100 : 0,
        faturamento: data.faturamento,
        percentual: totalFaturamento > 0 ? (data.faturamento / totalFaturamento) * 100 : 0
      }))
      .sort((a, b) => b.qtdClientes - a.qtdClientes);

    console.log('Debug analiseCidade - final result:', result.slice(0, 3));
    return result;
  }, [data, drillDownState]);

  const estatisticas = useMemo(() => {
    if (drillDownState.mode === 'cidade') {
      const totalCidades = analiseCidade.length;
      const cidadeMaisClientes = analiseCidade[0];
      const cidadeMaisNovos = [...analiseCidade].sort((a, b) => b.percentualNovos - a.percentualNovos)[0];
      
      return {
        totalCidades,
        cidadeMaisClientes,
        cidadeMaisNovos,
        selectedUF: drillDownState.selectedUF
      };
    }
    
    const totalUFs = analiseUF.length;
    const ufMaisClientes = analiseUF[0];
    const ufMaiorFaturamento = [...analiseUF].sort((a, b) => b.faturamento - a.faturamento)[0];
    const clientesNovos = analisePerfil.find(p => p.tipo === 'Novo');
    
    return {
      totalUFs,
      ufMaisClientes,
      ufMaiorFaturamento,
      percentualNovos: clientesNovos?.percentual || 0
    };
  }, [analiseUF, analisePerfil, analiseCidade, drillDownState]);

  const chartData = drillDownState.mode === 'uf' ? analiseUF.slice(0, 10) : analiseCidade.slice(0, 10);

  const handleBarClick = (data: any) => {
    if (drillDownState.mode === 'uf') {
      console.log('Debug handleBarClick - clicked UF:', data.uf);
      setDrillDownState({ mode: 'cidade', selectedUF: data.uf });
    }
  };

  const handleBackToUF = () => {
    setDrillDownState({ mode: 'uf' });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Navegação */}
      {drillDownState.mode === 'cidade' && (
        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
          <Button variant="ghost" size="sm" onClick={handleBackToUF} className="p-1 h-auto">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span>UFs</span>
          <span>→</span>
          <span className="font-medium text-foreground">{drillDownState.selectedUF || 'N/A'}</span>
        </div>
      )}

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
        {drillDownState.mode === 'uf' ? (
          <>
            <Card>
              <CardHeader className="p-3 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm flex items-center gap-1 sm:gap-2">
                  <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">UFs Atendidas</span>
                  <span className="sm:hidden">UFs</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="text-xl sm:text-2xl font-bold">{estatisticas.totalUFs}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="p-3 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm flex items-center gap-1 sm:gap-2">
                  <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">UF Mais Clientes</span>
                  <span className="sm:hidden">+ Clientes</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="text-xl sm:text-2xl font-bold">
                  {estatisticas.ufMaisClientes?.uf || 'N/A'}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  {estatisticas.ufMaisClientes?.qtdClientes || 0} clientes
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="p-3 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm flex items-center gap-1 sm:gap-2">
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">UF Maior Faturamento</span>
                  <span className="sm:hidden">+ Fatur.</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="text-xl sm:text-2xl font-bold">
                  {estatisticas.ufMaiorFaturamento?.uf || 'N/A'}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground truncate">
                  {formatCurrency(estatisticas.ufMaiorFaturamento?.faturamento || 0)}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="p-3 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm flex items-center gap-1 sm:gap-2">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Clientes Novos</span>
                  <span className="sm:hidden">Novos</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="text-xl sm:text-2xl font-bold text-green-600">
                  {estatisticas.percentualNovos?.toFixed(1)}%
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  <span className="hidden sm:inline">Últimos 12 meses</span>
                  <span className="sm:hidden">12 meses</span>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="p-3 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm flex items-center gap-1 sm:gap-2">
                  <Building2 className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Cidades Atendidas</span>
                  <span className="sm:hidden">Cidades</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="text-xl sm:text-2xl font-bold">{estatisticas.totalCidades}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  em {estatisticas.selectedUF || 'N/A'}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="p-3 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm flex items-center gap-1 sm:gap-2">
                  <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Cidade Mais Clientes</span>
                  <span className="sm:hidden">+ Clientes</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="text-lg sm:text-2xl font-bold truncate">
                  {estatisticas.cidadeMaisClientes?.cidade || 'N/A'}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  {estatisticas.cidadeMaisClientes?.qtdClientes || 0} clientes
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="p-3 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm flex items-center gap-1 sm:gap-2">
                  <UserPlus className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Mais Abertura de Novos</span>
                  <span className="sm:hidden">+ Novos</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="text-lg sm:text-2xl font-bold truncate">
                  {estatisticas.cidadeMaisNovos?.cidade || 'N/A'}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  {estatisticas.cidadeMaisNovos?.percentualNovos?.toFixed(1) || 0}% novos
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="p-3 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm flex items-center gap-1 sm:gap-2">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Total Clientes Novos</span>
                  <span className="sm:hidden">Tot. Novos</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="text-xl sm:text-2xl font-bold text-green-600">
                  {analiseCidade.reduce((sum, cidade) => sum + cidade.qtdClientesNovos, 0)}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  na {estatisticas.selectedUF || 'N/A'}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-sm sm:text-base">
              {drillDownState.mode === 'uf' 
                ? (isMobile ? 'Por UF (Top 10)' : 'Clientes por UF (Top 10)')
                : (isMobile ? `${drillDownState.selectedUF || 'N/A'} (Top 10)` : `Cidades em ${drillDownState.selectedUF || 'N/A'} (Top 10)`)
              }
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <ResponsiveContainer width="100%" height={isMobile ? 200 : 300}>
              <BarChart 
                data={chartData}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey={drillDownState.mode === 'uf' ? 'uf' : 'cidade'} 
                  tick={{ fontSize: isMobile ? 10 : 12 }}
                  interval={0}
                  angle={isMobile ? -45 : 0}
                  textAnchor={isMobile ? "end" : "middle"}
                  height={isMobile ? 50 : 30}
                />
                <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} width={isMobile ? 30 : 40} />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'qtdClientes' ? `${value} clientes` : formatCurrency(value as number),
                    name === 'qtdClientes' ? 'Quantidade' : 'Faturamento'
                  ]}
                />
                <Bar 
                  dataKey="qtdClientes" 
                  fill="hsl(212 100% 47%)" 
                  cursor={drillDownState.mode === 'uf' ? 'pointer' : 'default'}
                  onClick={drillDownState.mode === 'uf' ? (data) => {
                    console.log('Bar clicked - raw data:', data);
                    if (data && data.payload) {
                      handleBarClick(data.payload);
                    }
                  } : undefined}
                >
                  {!isMobile && <LabelList dataKey="qtdClientes" position="top" fontSize={12} />}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-sm sm:text-base">Perfil dos Clientes</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <ResponsiveContainer width="100%" height={isMobile ? 200 : 300}>
              <PieChart>
                <Pie
                  data={analisePerfil}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ tipo, percentual }) => isMobile ? `${percentual.toFixed(0)}%` : `${tipo}: ${percentual.toFixed(1)}%`}
                  outerRadius={isMobile ? 60 : 80}
                  fill="#8884d8"
                  dataKey="qtd"
                >
                  {analisePerfil.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, name) => [`${value} clientes`, 'Quantidade']}
                />
              </PieChart>
            </ResponsiveContainer>
            {isMobile && (
              <div className="flex justify-center gap-4 mt-2">
                {analisePerfil.map((entry) => (
                  <div key={entry.tipo} className="flex items-center gap-1 text-xs">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span>{entry.tipo}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabelas Detalhadas - Esconder em mobile e mostrar cards */}
      {/* Mobile: Cards view */}
      {isMobile ? (
        <div className="space-y-4">
          <Card>
            <CardHeader className="p-3">
              <CardTitle className="text-sm">
                {drillDownState.mode === 'uf' ? 'Top UFs' : `${drillDownState.selectedUF || 'N/A'}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-2">
              {drillDownState.mode === 'uf' 
                ? analiseUF.slice(0, 5).map((uf) => (
                    <div 
                      key={uf.uf} 
                      className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                      onClick={() => handleBarClick(uf)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{uf.uf}</span>
                        <Badge variant="outline" className="text-xs">
                          {uf.percentual.toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{uf.qtdClientes} clientes</span>
                        <span>{formatCurrency(uf.faturamento)}</span>
                      </div>
                    </div>
                  ))
                : analiseCidade.slice(0, 5).map((cidade) => (
                    <div key={cidade.cidade} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm truncate max-w-[150px]">{cidade.cidade}</span>
                        <Badge variant="outline" className="text-xs">
                          {cidade.percentual.toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{cidade.qtdClientes} cli.</span>
                        <span>{cidade.percentualNovos.toFixed(1)}% novos</span>
                      </div>
                    </div>
                  ))
              }
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="p-3">
              <CardTitle className="text-sm">Perfil Detalhado</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-2">
              {analisePerfil.map((perfil) => (
                <div key={perfil.tipo} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">Clientes {perfil.tipo}s</span>
                    <Badge style={{ backgroundColor: perfil.color, color: 'white' }} className="text-xs">
                      {perfil.percentual.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-muted-foreground">Quantidade</div>
                      <div className="font-medium">{perfil.qtd}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Faturamento</div>
                      <div className="font-medium">{formatCurrency(perfil.faturamento)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Desktop: Tables view */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>
                {drillDownState.mode === 'uf' ? 'Detalhes por UF' : `Detalhes das Cidades - ${drillDownState.selectedUF || 'N/A'}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{drillDownState.mode === 'uf' ? 'UF' : 'Cidade'}</TableHead>
                    <TableHead>Clientes</TableHead>
                    <TableHead>Faturamento</TableHead>
                    <TableHead>%</TableHead>
                    {drillDownState.mode === 'cidade' && <TableHead>% Novos</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drillDownState.mode === 'uf' 
                    ? analiseUF.slice(0, 10).map((uf) => (
                        <TableRow key={uf.uf} className="cursor-pointer hover:bg-muted/50" onClick={() => handleBarClick(uf)}>
                          <TableCell className="font-medium">{uf.uf}</TableCell>
                          <TableCell>{uf.qtdClientes}</TableCell>
                          <TableCell>{formatCurrency(uf.faturamento)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {uf.percentual.toFixed(1)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    : analiseCidade.slice(0, 10).map((cidade) => (
                        <TableRow key={cidade.cidade}>
                          <TableCell className="font-medium">{cidade.cidade}</TableCell>
                          <TableCell>{cidade.qtdClientes}</TableCell>
                          <TableCell>{formatCurrency(cidade.faturamento)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {cidade.percentual.toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {cidade.percentualNovos.toFixed(1)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                  }
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Perfil Detalhado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analisePerfil.map((perfil) => (
                  <div key={perfil.tipo} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">Clientes {perfil.tipo}s</h4>
                      <Badge 
                        style={{ backgroundColor: perfil.color, color: 'white' }}
                      >
                        {perfil.percentual.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Quantidade</div>
                        <div className="font-medium">{perfil.qtd} clientes</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Faturamento</div>
                        <div className="font-medium">{formatCurrency(perfil.faturamento)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}