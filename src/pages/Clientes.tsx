import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, BarChart3 } from "lucide-react";
import { BaseClientesTable } from "@/components/clientes/BaseClientesTable";
import { AnaliseClientes } from "@/components/clientes/AnaliseClientes";

export default function Clientes() {
  const [activeTab, setActiveTab] = useState("base");

  return (
    <div className="min-h-screen w-full space-y-3 sm:space-y-6 p-2 sm:p-6 overflow-hidden max-w-full box-border">
      <div className="flex items-center justify-between min-w-0">
        <div className="min-w-0 flex-1 overflow-hidden">
          <h1 className="text-lg sm:text-3xl font-bold truncate">Central de Clientes</h1>
          <p className="text-xs sm:text-base text-muted-foreground truncate">Gerencie e analise sua base de clientes</p>
        </div>
      </div>

      <Card className="w-full min-w-0 overflow-hidden">
        <CardHeader className="p-2 sm:p-6">
          <CardTitle className="text-sm sm:text-lg flex items-center gap-2 min-w-0">
            <Users className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            <span className="truncate min-w-0">Central de Clientes</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-6 pt-0 min-w-0 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full min-w-0">
            <TabsList className="grid w-full grid-cols-2 h-9 sm:h-10 min-w-0">
              <TabsTrigger value="base" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 min-w-0 overflow-hidden">
                <Users className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate min-w-0">Clientes</span>
              </TabsTrigger>
              <TabsTrigger value="analise" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 min-w-0 overflow-hidden">
                <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate min-w-0">Análise</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="base" className="mt-3 sm:mt-6">
              <BaseClientesTable />
            </TabsContent>

            <TabsContent value="analise" className="mt-3 sm:mt-6">
              <AnaliseClientes />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}