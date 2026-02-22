import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportConfigTable } from "@/components/admin/ReportConfigTable";
import { ReportHistoryTable } from "@/components/admin/ReportHistoryTable";
import { MonthlyClosingReportDialog } from "@/components/admin/MonthlyClosingReportDialog";
import { ProductionReportSchedule } from "@/components/admin/ProductionReportSchedule";
import { Mail, History, Settings, Factory, FileText, Calendar } from "lucide-react";

export default function ReportsConfig() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Relatórios Automáticos</h1>
        <p className="text-muted-foreground">
          Configure destinatários, horários e acompanhe o histórico de envios
        </p>
      </div>

      <Tabs defaultValue="config" className="space-y-4">
        <TabsList>
          <TabsTrigger value="config" className="gap-2">
            <Settings className="h-4 w-4" />
            Configurações
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Histórico de Envios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-6">
          {/* Relatório Comercial */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Relatório Comercial
              </CardTitle>
              <CardDescription>
                Envio automático de segunda a sexta-feira para os destinatários cadastrados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReportConfigTable />
            </CardContent>
          </Card>

          {/* Relatório de Produção */}
          <ProductionReportSchedule />

          {/* Fechamento Mensal */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Fechamento Mensal
              </CardTitle>
              <CardDescription>
                Gere relatórios completos de meses anteriores para fechamento contábil
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MonthlyClosingReportDialog />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <ReportHistoryTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
