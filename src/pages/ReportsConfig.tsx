import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ReportConfigTable } from "@/components/admin/ReportConfigTable";
import { ReportHistoryTable } from "@/components/admin/ReportHistoryTable";
import { Mail, History, Info, Clock, Calendar, BarChart3 } from "lucide-react";

export default function ReportsConfig() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Relatórios Automáticos</h1>
        <p className="text-muted-foreground">
          Configure e gerencie o envio automático de relatórios comerciais por e-mail
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Os relatórios são enviados automaticamente de acordo com a configuração de cada destinatário. 
          O sistema está configurado para executar diariamente às 8h da manhã.
        </AlertDescription>
      </Alert>

      {/* Cards de informações */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Frequências</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              <div>• Diário: Todo dia às 8h</div>
              <div>• Semanal: Segundas-feiras</div>
              <div>• Mensal: Primeiro dia do mês</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conteúdo</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              <div>• KPIs de vendas</div>
              <div>• Funil de conversão</div>
              <div>• Análise de perdidos</div>
              <div>• Top clientes e produtos</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Automação</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              <div>• Envio automático</div>
              <div>• Dados em tempo real</div>
              <div>• Design responsivo</div>
              <div>• Logs detalhados</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="config" className="space-y-4">
        <TabsList>
          <TabsTrigger value="config" className="gap-2">
            <Mail className="h-4 w-4" />
            Configurações
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-4">
          <ReportConfigTable />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <ReportHistoryTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}