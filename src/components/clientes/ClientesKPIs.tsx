import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, UserX, TrendingUp } from "lucide-react";
import { useComercial } from "@/context/ComercialContext";
import { isFaturado, formatCurrency } from "@/lib/utils-comercial";

export function ClientesKPIs() {
  const { data } = useComercial();

  const kpis = useMemo(() => {
    if (!data) return null;

    // Clientes únicos
    const clientesUnicos = new Set(data.map(item => item.cliente)).size;

    // Clientes com faturamento nos últimos 3 meses
    const tresMesesAtras = new Date();
    tresMesesAtras.setMonth(tresMesesAtras.getMonth() - 3);
    
    const clientesAtivos = new Set(
      data
        .filter(item => 
          isFaturado(item.situacao) && 
          new Date(item.data_emissao) >= tresMesesAtras
        )
        .map(item => item.cliente)
    ).size;

    const clientesInativos = clientesUnicos - clientesAtivos;

    // Ticket médio por cliente
    const faturamentoPorCliente = new Map<string, number>();
    data
      .filter(item => isFaturado(item.situacao))
      .forEach(item => {
        const atual = faturamentoPorCliente.get(item.cliente) || 0;
        faturamentoPorCliente.set(item.cliente, atual + item.valor);
      });

    const ticketMedio = faturamentoPorCliente.size > 0 
      ? Array.from(faturamentoPorCliente.values()).reduce((a, b) => a + b, 0) / faturamentoPorCliente.size
      : 0;

    return {
      clientesUnicos,
      clientesAtivos,
      clientesInativos,
      ticketMedio,
      percentualAtivos: clientesUnicos > 0 ? (clientesAtivos / clientesUnicos) * 100 : 0
    };
  }, [data]);

  if (!kpis) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{kpis.clientesUnicos}</div>
          <p className="text-xs text-muted-foreground">
            Clientes únicos na base
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
          <UserCheck className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{kpis.clientesAtivos}</div>
          <p className="text-xs text-muted-foreground">
            {kpis.percentualAtivos.toFixed(1)}% da base total
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Clientes Inativos</CardTitle>
          <UserX className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{kpis.clientesInativos}</div>
          <p className="text-xs text-muted-foreground">
            +3 meses sem faturamento
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(kpis.ticketMedio)}
          </div>
          <p className="text-xs text-muted-foreground">
            Por cliente
          </p>
        </CardContent>
      </Card>
    </div>
  );
}