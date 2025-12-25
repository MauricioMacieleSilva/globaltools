import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, BarChart3 } from "lucide-react";
import { BaseClientesTable } from "@/components/clientes/BaseClientesTable";
import { AnaliseClientes } from "@/components/clientes/AnaliseClientes";

export default function Clientes() {
  const [activeTab, setActiveTab] = useState("base");

  return (
    <div className="min-h-screen w-full space-y-3 sm:space-y-6 p-2 sm:p-6 overflow-x-hidden max-w-full">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-3xl font-bold truncate">Central de Clientes</h1>
          <p className="text-xs sm:text-base text-muted-foreground">Gerencie e analise sua base de clientes</p>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="p-2 sm:p-6">
          <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
            <Users className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            <span className="truncate">Central de Clientes</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-6 pt-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-9 sm:h-10">
              <TabsTrigger value="base" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2">
                <Users className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate">Clientes</span>
              </TabsTrigger>
              <TabsTrigger value="analise" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2">
                <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate">Análise</span>
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