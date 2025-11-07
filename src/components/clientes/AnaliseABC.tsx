import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useComercial } from "@/context/ComercialContext";

interface ClienteABC {
  nome: string;
  faturamento: number;
  percentualAcumulado: number;
  percentualIndividual: number;
  classificacao: 'A' | 'B' | 'C';
  pedidos: number;
  ticketMedio: number;
}

export function AnaliseABC() {
  const { data } = useComercial();

  const analiseABC = useMemo(() => {
    if (!data) return { clientes: [], resumo: null, dadosGrafico: [] };

    // Agrupar faturamento por cliente
    const faturamentoPorCliente = new Map<string, { faturamento: number; pedidos: number }>();
    
    data
      .filter(item => item.situacao === "Faturado")
      .forEach(item => {
        const cliente = item.cliente;
        const atual = faturamentoPorCliente.get(cliente) || { faturamento: 0, pedidos: 0 };
        faturamentoPorCliente.set(cliente, {
          faturamento: atual.faturamento + item.valor,
          pedidos: atual.pedidos + 1
        });
      });

    // Converter para array e ordenar por faturamento
    const clientesOrdenados = Array.from(faturamentoPorCliente.entries())
      .map(([nome, dados]) => ({
        nome,
        faturamento: dados.faturamento,
        pedidos: dados.pedidos,
        ticketMedio: dados.faturamento / dados.pedidos
      }))
      .sort((a, b) => b.faturamento - a.faturamento);

    const faturamentoTotal = clientesOrdenados.reduce((sum, cliente) => sum + cliente.faturamento, 0);

    // Calcular percentuais e classificação ABC
    let acumulado = 0;
    const clientesABC: ClienteABC[] = clientesOrdenados.map((cliente, index) => {
      const percentualIndividual = (cliente.faturamento / faturamentoTotal) * 100;
      acumulado += percentualIndividual;
      
      let classificacao: 'A' | 'B' | 'C';
      if (acumulado <= 80) {
        classificacao = 'A';
      } else if (acumulado <= 95) {
        classificacao = 'B';
      } else {
        classificacao = 'C';
      }

      return {
        nome: cliente.nome,
        faturamento: cliente.faturamento,
        percentualAcumulado: acumulado,
        percentualIndividual,
        classificacao,
        pedidos: cliente.pedidos,
        ticketMedio: cliente.ticketMedio
      };
    });

    // Resumo por classificação
    const resumo = {
      A: {
        quantidade: clientesABC.filter(c => c.classificacao === 'A').length,
        faturamento: clientesABC.filter(c => c.classificacao === 'A').reduce((sum, c) => sum + c.faturamento, 0),
        percentual: clientesABC.filter(c => c.classificacao === 'A').reduce((sum, c) => sum + c.percentualIndividual, 0)
      },
      B: {
        quantidade: clientesABC.filter(c => c.classificacao === 'B').length,
        faturamento: clientesABC.filter(c => c.classificacao === 'B').reduce((sum, c) => sum + c.faturamento, 0),
        percentual: clientesABC.filter(c => c.classificacao === 'B').reduce((sum, c) => sum + c.percentualIndividual, 0)
      },
      C: {
        quantidade: clientesABC.filter(c => c.classificacao === 'C').length,
        faturamento: clientesABC.filter(c => c.classificacao === 'C').reduce((sum, c) => sum + c.faturamento, 0),
        percentual: clientesABC.filter(c => c.classificacao === 'C').reduce((sum, c) => sum + c.percentualIndividual, 0)
      }
    };

    const dadosGrafico = [
      { classe: 'A', quantidade: resumo.A.quantidade, faturamento: resumo.A.faturamento },
      { classe: 'B', quantidade: resumo.B.quantidade, faturamento: resumo.B.faturamento },
      { classe: 'C', quantidade: resumo.C.quantidade, faturamento: resumo.C.faturamento }
    ];

    return { clientes: clientesABC, resumo, dadosGrafico };
  }, [data]);

  const getClasseBadge = (classe: 'A' | 'B' | 'C') => {
    const colors = {
      A: "bg-green-100 text-green-800",
      B: "bg-yellow-100 text-yellow-800", 
      C: "bg-red-100 text-red-800"
    };
    
    return <Badge className={colors[classe]}>Classe {classe}</Badge>;
  };

  const COLORS = {
    A: '#22c55e',
    B: '#eab308',
    C: '#ef4444'
  };

  return (
    <div className="space-y-6">
      {/* Resumo da Análise ABC */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              Classe A - Premium
              {getClasseBadge('A')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {analiseABC.resumo?.A.quantidade || 0} clientes
              </div>
              <div className="text-sm text-muted-foreground">
                {(analiseABC.resumo?.A.percentual || 0).toFixed(1)}% do faturamento
              </div>
              <div className="text-lg font-semibold">
                {(analiseABC.resumo?.A.faturamento || 0).toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              Classe B - Intermediário
              {getClasseBadge('B')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {analiseABC.resumo?.B.quantidade || 0} clientes
              </div>
              <div className="text-sm text-muted-foreground">
                {(analiseABC.resumo?.B.percentual || 0).toFixed(1)}% do faturamento
              </div>
              <div className="text-lg font-semibold">
                {(analiseABC.resumo?.B.faturamento || 0).toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              Classe C - Básico
              {getClasseBadge('C')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {analiseABC.resumo?.C.quantidade || 0} clientes
              </div>
              <div className="text-sm text-muted-foreground">
                {(analiseABC.resumo?.C.percentual || 0).toFixed(1)}% do faturamento
              </div>
              <div className="text-lg font-semibold">
                {(analiseABC.resumo?.C.faturamento || 0).toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Faturamento</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analiseABC.dadosGrafico}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="classe" />
                <YAxis tickFormatter={(value) => 
                  new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                    notation: 'compact'
                  }).format(value)
                } />
                <Tooltip 
                  formatter={(value: number) => [
                    new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(value),
                    'Faturamento'
                  ]}
                />
                <Bar dataKey="faturamento" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Quantidade de Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analiseABC.dadosGrafico}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ classe, quantidade }) => `${classe}: ${quantidade}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="quantidade"
                >
                  {analiseABC.dadosGrafico.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.classe as keyof typeof COLORS]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabela Detalhada */}
      <Card>
        <CardHeader>
          <CardTitle>Análise ABC Detalhada ({analiseABC.clientes.length} clientes)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Classificação</TableHead>
                <TableHead>Faturamento</TableHead>
                <TableHead>% Individual</TableHead>
                <TableHead>% Acumulado</TableHead>
                <TableHead>Pedidos</TableHead>
                <TableHead>Ticket Médio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analiseABC.clientes.slice(0, 50).map((cliente, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{cliente.nome}</TableCell>
                  <TableCell>{getClasseBadge(cliente.classificacao)}</TableCell>
                  <TableCell>
                    {cliente.faturamento.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}
                  </TableCell>
                  <TableCell>{cliente.percentualIndividual.toFixed(2)}%</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={cliente.percentualAcumulado} className="w-16" />
                      <span className="text-sm">{cliente.percentualAcumulado.toFixed(1)}%</span>
                    </div>
                  </TableCell>
                  <TableCell>{cliente.pedidos}</TableCell>
                  <TableCell>
                    {cliente.ticketMedio.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {analiseABC.clientes.length > 50 && (
            <div className="text-center mt-4 text-sm text-muted-foreground">
              Mostrando os primeiros 50 clientes de {analiseABC.clientes.length} total
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}