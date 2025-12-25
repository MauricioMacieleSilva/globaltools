import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, BarChart3 } from "lucide-react";
import { BaseClientesTable } from "@/components/clientes/BaseClientesTable";
import { AnaliseClientes } from "@/components/clientes/AnaliseClientes";

export default function Clientes() {
  const [activeTab, setActiveTab] = useState("base");

  return (
    <div className="space-y-3 sm:space-y-6 p-2 sm:p-6 overflow-x-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Central de Clientes</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Gerencie e analise sua base de clientes</p>
        </div>
      </div>

      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            Central de Clientes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="base" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Base de</span> Clientes
              </TabsTrigger>
              <TabsTrigger value="analise" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
                Análise
              </TabsTrigger>
            </TabsList>

            <TabsContent value="base" className="mt-4 sm:mt-6">
              <BaseClientesTable />
            </TabsContent>

            <TabsContent value="analise" className="mt-4 sm:mt-6">
              <AnaliseClientes />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}