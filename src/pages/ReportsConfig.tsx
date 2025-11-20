import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ReportConfigTable } from "@/components/admin/ReportConfigTable";
import { ReportHistoryTable } from "@/components/admin/ReportHistoryTable";
import { SampleDataGenerator } from "@/components/admin/SampleDataGenerator";
import { Mail, History, Info } from "lucide-react";

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
          Configure destinatários e gerencie o envio automático de relatórios comerciais por email.
        </AlertDescription>
      </Alert>

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
          <SampleDataGenerator />
          <ReportConfigTable />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <ReportHistoryTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}