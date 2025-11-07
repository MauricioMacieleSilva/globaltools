import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, BarChart3, Map } from "lucide-react";
import { useComercial } from "@/context/ComercialContext";
import { BaseClientesTable } from "@/components/clientes/BaseClientesTable";
import { AnaliseClientes } from "@/components/clientes/AnaliseClientes";
export default function Clientes() {
  const { data } = useComercial();
  const [activeTab, setActiveTab] = useState("base");
  return <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Central de Clientes</h1>
          <p className="text-muted-foreground">Gerencie e analise sua base de clientes</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Central de Clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="base" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Base de Clientes
              </TabsTrigger>
              <TabsTrigger value="analise" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Análise de Clientes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="base" className="mt-6">
              <BaseClientesTable />
            </TabsContent>

            <TabsContent value="analise" className="mt-6">
              <AnaliseClientes />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>;
}