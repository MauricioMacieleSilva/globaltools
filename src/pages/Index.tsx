
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PerfilU } from '@/components/perfis/PerfilU';
import { PerfilL } from '@/components/perfis/PerfilL';
import { PerfilUEnrijecido } from '@/components/perfis/PerfilUEnrijecido';
import { PerfilCartola } from '@/components/perfis/PerfilCartola';
import { PerfilCartolaEnrijecido } from '@/components/perfis/PerfilCartolaEnrijecido';
import { ResumoGeral } from '@/components/ResumoGeral';
import { usePerfilContext, PerfilProvider } from '@/context/PerfilContext';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

function SystemContent() {
  const {
    calculos
  } = usePerfilContext();

  const exportarPDF = async () => {
    const resumoElement = document.querySelector('[data-export="resumo"]');
    if (!resumoElement) return;

    const canvas = await html2canvas(resumoElement as HTMLElement);
    const imgData = canvas.toDataURL('image/png');
    
    const pdf = new jsPDF();
    const imgWidth = 190;
    const pageHeight = 295;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;

    let position = 0;

    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save('resumo-perfis.pdf');
  };

  const exportarExcel = () => {
    const calculosValidos = Object.values(calculos).filter(calc => calc.pesoTotal > 0 && calc.quantidade > 0);
    
    if (calculosValidos.length === 0) {
      alert('Nenhum dado disponível para exportar.');
      return;
    }

    const dadosExcel = calculosValidos.map(calc => ({
      'Tipo': calc.tipo,
      'Espessura': calc.espessura,
      'Base': calc.base,
      'Aba1': calc.aba1 || 0,
      'Aba2': calc.aba2 || 0,
      'Enrij1': calc.enrij1 || 0,
      'Enrij2': calc.enrij2 || 0,
      'Enrij3': calc.enrij3 || 0,
      'Enrij4': calc.enrij4 || 0,
      'Comprimento': calc.comprimento,
      'Largura': calc.largura,
      'Tira': calc.tira,
      'Tira Perda': calc.tiraPerda,
      'Quantidade': calc.quantidade,
      '% Perda': calc.percentualPerda,
      'Peso Total': calc.pesoTotal,
      'Peso Perda': calc.pesoPerda
    }));

    const worksheet = XLSX.utils.json_to_sheet(dadosExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Resumo Perfis');
    
    XLSX.writeFile(workbook, 'resumo-perfis.xlsx');
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light to-background">
      {/* Header */}
      <div className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-3">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 sm:justify-between">
            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-center sm:justify-start">
              <div className="rounded-lg">
                <img src="/lovable-uploads/385d4fbf-dc72-4bfa-af3a-1ca81c747837.png" alt="Global Aço" className="h-12 sm:h-16 md:h-20 w-auto" />
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Global Aço</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">Cálculo | Plano de Corte</p>
              </div>
            </div>
            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
              <Button 
                variant="outline" 
                className="gap-1 sm:gap-2 text-xs sm:text-sm flex-1 sm:flex-none"
                onClick={exportarPDF}
              >
                <FileDown className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Exportar</span> PDF
              </Button>
              <Button 
                variant="outline" 
                className="gap-1 sm:gap-2 text-xs sm:text-sm flex-1 sm:flex-none"
                onClick={exportarExcel}
              >
                <FileDown className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Exportar</span> Excel
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          {/* Main Content */}
          <div>
            <Tabs defaultValue="perfil-u" className="w-full">
              <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 bg-card p-1 rounded-lg h-auto">
                <TabsTrigger value="perfil-u" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm p-2 sm:p-3">
                  Perfil U
                </TabsTrigger>
                <TabsTrigger value="perfil-l" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm p-2 sm:p-3">
                  Perfil L
                </TabsTrigger>
                <TabsTrigger value="perfil-u-enrijecido" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm p-2 sm:p-3">
                  U Enrijecido
                </TabsTrigger>
                <TabsTrigger value="perfil-cartola" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm p-2 sm:p-3">
                  Cartola
                </TabsTrigger>
                <TabsTrigger value="perfil-cartola-enrijecido" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm p-2 sm:p-3">
                  Cartola Enrijecido
                </TabsTrigger>
                <TabsTrigger value="resumo" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm p-2 sm:p-3">
                  Resumo
                </TabsTrigger>
              </TabsList>

              <TabsContent value="perfil-u" className="mt-4 sm:mt-6">
                <Card className="shadow-lg border-0 bg-gradient-card">
                  <CardHeader className="border-b bg-primary/5 p-3 sm:p-6">
                    <CardTitle className="flex items-center gap-2 text-primary text-base sm:text-lg">
                      Perfil U
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6">
                    <PerfilU />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="perfil-l" className="mt-4 sm:mt-6">
                <Card className="shadow-lg border-0 bg-gradient-card">
                  <CardHeader className="border-b bg-primary/5 p-3 sm:p-6">
                    <CardTitle className="flex items-center gap-2 text-primary text-base sm:text-lg">
                      Perfil L
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6">
                    <PerfilL />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="perfil-u-enrijecido" className="mt-4 sm:mt-6">
                <Card className="shadow-lg border-0 bg-gradient-card">
                  <CardHeader className="border-b bg-primary/5 p-3 sm:p-6">
                    <CardTitle className="flex items-center gap-2 text-primary text-base sm:text-lg">
                      Perfil U Enrijecido
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6">
                    <PerfilUEnrijecido />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="perfil-cartola" className="mt-4 sm:mt-6">
                <Card className="shadow-lg border-0 bg-gradient-card">
                  <CardHeader className="border-b bg-primary/5 p-3 sm:p-6">
                    <CardTitle className="flex items-center gap-2 text-primary text-base sm:text-lg">
                      Perfil Cartola
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6">
                    <PerfilCartola />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="perfil-cartola-enrijecido" className="mt-4 sm:mt-6">
                <Card className="shadow-lg border-0 bg-gradient-card">
                  <CardHeader className="border-b bg-primary/5 p-3 sm:p-6">
                    <CardTitle className="flex items-center gap-2 text-primary text-base sm:text-lg">
                      Perfil Cartola Enrijecido
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6">
                    <PerfilCartolaEnrijecido />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="resumo" className="mt-4 sm:mt-6">
                <Card className="shadow-lg border-0 bg-gradient-card">
                  <CardHeader className="border-b bg-primary/5 p-3 sm:p-6">
                    <CardTitle className="flex items-center gap-2 text-primary text-base sm:text-lg">
                      <Calculator className="h-4 w-4 sm:h-5 sm:w-5" />
                      Resumo Geral
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6" data-export="resumo">
                    <ResumoGeral />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

const Index = () => {
  return (
    <PerfilProvider>
      <SystemContent />
    </PerfilProvider>
  );
};

export default Index;
