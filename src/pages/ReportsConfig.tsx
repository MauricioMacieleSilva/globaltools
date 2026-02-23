import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReportConfigTable } from "@/components/admin/ReportConfigTable";
import { ReportHistoryTable } from "@/components/admin/ReportHistoryTable";
import { MonthlyClosingReportDialog } from "@/components/admin/MonthlyClosingReportDialog";
import { ProductionReportSchedule } from "@/components/admin/ProductionReportSchedule";
import { Mail, History, Settings, Factory, Calendar } from "lucide-react";

interface ReportCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  children: React.ReactNode;
}

function ReportCard({ icon, title, description, badge, children }: ReportCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            {icon}
            {title}
          </CardTitle>
          {badge && (
            <Badge variant="outline" className="text-xs">
              {badge}
            </Badge>
          )}
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

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
          <ReportCard
            icon={<Mail className="h-5 w-5 text-primary" />}
            title="Relatório Comercial"
            description="Configure destinatários e horários do relatório comercial diário"
            badge="Seg a Sex"
          >
            <ReportConfigTable />
          </ReportCard>

          <ReportCard
            icon={<Factory className="h-5 w-5 text-primary" />}
            title="Relatório de Produção"
            description="Configure o envio automático do relatório de produção"
            badge="Seg a Sex"
          >
            <ProductionReportSchedule embedded />
          </ReportCard>

          <ReportCard
            icon={<Calendar className="h-5 w-5 text-primary" />}
            title="Fechamento Mensal"
            description="Gere relatórios completos de meses anteriores para fechamento contábil"
            badge="Sob demanda"
          >
            <MonthlyClosingReportDialog />
          </ReportCard>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <ReportHistoryTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
