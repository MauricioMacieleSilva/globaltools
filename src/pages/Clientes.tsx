import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, BarChart3, FileSpreadsheet } from "lucide-react";
import { BaseClientesTable } from "@/components/clientes/BaseClientesTable";
import { AnaliseClientes } from "@/components/clientes/AnaliseClientes";
import { RelatorioClientes } from "@/components/clientes/RelatorioClientes";
import { LastUpdatedIndicator } from "@/components/ui/last-updated-indicator";
import { useComercial } from "@/context/ComercialContext";

export default function Clientes() {
  const [activeTab, setActiveTab] = useState("base");
  const { cacheStatus, refreshData, isLoading } = useComercial();

  return (
    <div className="min-h-screen p-3 sm:p-6 space-y-4">
      {/* Header */}
      <div data-tour="clientes-header">
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-3xl font-bold">Central de Clientes</h1>
          <LastUpdatedIndicator lastUpdated={cacheStatus.lastUpdate} onRefresh={refreshData} loading={isLoading} />
        </div>
        <p className="text-sm text-muted-foreground">
          Gerencie e analise sua base de clientes
        </p>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            Central de Clientes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 h-9" data-tour="clientes-tabs">
              <TabsTrigger value="base" className="w-full min-w-0 px-2 text-xs sm:text-sm gap-1">
                <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="min-w-0 truncate">Clientes</span>
              </TabsTrigger>
              <TabsTrigger value="analise" className="w-full min-w-0 px-2 text-xs sm:text-sm gap-1">
                <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="min-w-0 truncate">Análise</span>
              </TabsTrigger>
              <TabsTrigger value="relatorio" className="w-full min-w-0 px-2 text-xs sm:text-sm gap-1">
                <FileSpreadsheet className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="min-w-0 truncate">Relatório</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="base" className="mt-4">
              <BaseClientesTable />
            </TabsContent>

            <TabsContent value="analise" className="mt-4">
              <AnaliseClientes />
            </TabsContent>

            <TabsContent value="relatorio" className="mt-4">
              <RelatorioClientes />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}