import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Download } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { perfilPadraoU, perfilPadraoUE } from '@/lib/perfil-padrao-utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function PerfilPadraoDialog() {
  const [open, setOpen] = useState(false);

  const handleDownloadPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Cabeçalho
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Tabelas de Perfis Padrão', pageWidth / 2, 15, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Gerado em ${new Date().toLocaleDateString('pt-BR')}`,
      pageWidth / 2,
      21,
      { align: 'center' }
    );

    // ===== Perfil U =====
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Perfil U', 14, 32);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('h = Altura (alma)   |   B = Largura da aba (mesa)   |   e=r = Espessura', 14, 37);

    const perfilUBody = perfilPadraoU.map((perfil) => {
      const tira = perfil.h + 2 * perfil.B;
      const espessuras = [...perfil.espessuras.map((e) => e.toFixed(2))];
      while (espessuras.length < 5) espessuras.push('-');
      return [
        perfil.h.toFixed(2),
        perfil.B.toFixed(2),
        tira.toFixed(2),
        ...espessuras,
      ];
    });

    autoTable(doc, {
      startY: 41,
      head: [
        [
          { content: 'Dimensão', colSpan: 8, styles: { halign: 'center', fillColor: [41, 128, 185] } },
        ],
        [
          { content: 'h (mm)', styles: { halign: 'center' } },
          { content: 'B (mm)', styles: { halign: 'center' } },
          { content: 'Tira (mm)', styles: { halign: 'center' } },
          { content: 'e=r (mm)', colSpan: 5, styles: { halign: 'center' } },
        ],
      ],
      body: perfilUBody,
      theme: 'grid',
      headStyles: { fillColor: [52, 152, 219], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, halign: 'center', cellPadding: 2 },
      columnStyles: { 2: { textColor: [41, 128, 185], fontStyle: 'bold' } },
    });

    // ===== Perfil UE =====
    const finalY = (doc as any).lastAutoTable.finalY || 60;
    let yStart = finalY + 12;

    if (yStart > 230) {
      doc.addPage();
      yStart = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Perfil UE (Enrijecido)', 14, yStart);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      'h = Altura (alma)   |   B = Largura da aba   |   d = Enrijecedor   |   e=r = Espessura',
      14,
      yStart + 5
    );

    const perfilUEBody = perfilPadraoUE.map((perfil) => {
      const tira = perfil.h + 2 * perfil.B + 2 * perfil.d;
      const espessuras = [...perfil.espessuras.map((e) => e.toFixed(2))];
      while (espessuras.length < 4) espessuras.push('-');
      return [
        perfil.h.toFixed(2),
        perfil.B.toFixed(2),
        perfil.d.toFixed(2),
        tira.toFixed(2),
        ...espessuras,
      ];
    });

    autoTable(doc, {
      startY: yStart + 9,
      head: [
        [
          { content: 'Dimensão', colSpan: 8, styles: { halign: 'center', fillColor: [41, 128, 185] } },
        ],
        [
          { content: 'h (mm)', styles: { halign: 'center' } },
          { content: 'B (mm)', styles: { halign: 'center' } },
          { content: 'd (mm)', styles: { halign: 'center' } },
          { content: 'Tira (mm)', styles: { halign: 'center' } },
          { content: 'e=r (mm)', colSpan: 4, styles: { halign: 'center' } },
        ],
      ],
      body: perfilUEBody,
      theme: 'grid',
      headStyles: { fillColor: [52, 152, 219], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, halign: 'center', cellPadding: 2 },
      columnStyles: { 3: { textColor: [41, 128, 185], fontStyle: 'bold' } },
    });

    doc.save(`tabelas-perfis-padrao-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 text-xs sm:text-sm">
          <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />
          Perfis Padrão
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2 pr-8">
            <span className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Tabelas de Perfis Padrão
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPDF}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Baixar PDF
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="perfil-u" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="perfil-u">Perfil U</TabsTrigger>
            <TabsTrigger value="perfil-ue">Perfil UE (Enrijecido)</TabsTrigger>
          </TabsList>
          
          <TabsContent value="perfil-u" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground mb-4">
                  <p><strong>h</strong> = Altura (alma)</p>
                  <p><strong>B</strong> = Largura da aba (mesa)</p>
                  <p><strong>e=r</strong> = Espessura</p>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-primary text-primary-foreground">
                        <th className="border border-border px-3 py-2 text-center" colSpan={8}>Dimensão</th>
                      </tr>
                      <tr className="bg-primary/80 text-primary-foreground">
                        <th className="border border-border px-3 py-2 text-center">h (mm)</th>
                        <th className="border border-border px-3 py-2 text-center">B (mm)</th>
                        <th className="border border-border px-3 py-2 text-center">Tira (mm)</th>
                        <th className="border border-border px-3 py-2 text-center" colSpan={5}>e=r (mm)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {perfilPadraoU.map((perfil, idx) => {
                        // Tira = 2*B + h (dimensão desenvolvida base)
                        const tira = perfil.h + 2 * perfil.B;
                        return (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-muted/30' : 'bg-background'}>
                            <td className="border border-border px-3 py-2 text-center font-medium">{perfil.h.toFixed(2)}</td>
                            <td className="border border-border px-3 py-2 text-center font-medium">{perfil.B.toFixed(2)}</td>
                            <td className="border border-border px-3 py-2 text-center font-medium text-primary">{tira.toFixed(2)}</td>
                            {perfil.espessuras.map((esp, espIdx) => (
                              <td key={espIdx} className="border border-border px-3 py-2 text-center">{esp.toFixed(2)}</td>
                            ))}
                            {/* Preencher células vazias se houver menos espessuras */}
                            {Array(5 - perfil.espessuras.length).fill(null).map((_, i) => (
                              <td key={`empty-${i}`} className="border border-border px-3 py-2 text-center">-</td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    <strong>Nota:</strong> As medidas acima são padrões comerciais. Perfis especiais podem ter dimensões diferentes.
                  </p>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="perfil-ue" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground mb-4">
                  <p><strong>h</strong> = Altura (alma)</p>
                  <p><strong>B</strong> = Largura da aba (mesa)</p>
                  <p><strong>d</strong> = Enrijecedor</p>
                  <p><strong>e=r</strong> = Espessura</p>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-primary text-primary-foreground">
                        <th className="border border-border px-3 py-2 text-center" colSpan={8}>Dimensão</th>
                      </tr>
                      <tr className="bg-primary/80 text-primary-foreground">
                        <th className="border border-border px-3 py-2 text-center">h (mm)</th>
                        <th className="border border-border px-3 py-2 text-center">B (mm)</th>
                        <th className="border border-border px-3 py-2 text-center">d (mm)</th>
                        <th className="border border-border px-3 py-2 text-center">Tira (mm)</th>
                        <th className="border border-border px-3 py-2 text-center" colSpan={4}>e=r (mm)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {perfilPadraoUE.map((perfil, idx) => {
                        // Tira = h + 2*B + 2*d (dimensão desenvolvida base)
                        const tira = perfil.h + 2 * perfil.B + 2 * perfil.d;
                        return (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-muted/30' : 'bg-background'}>
                            <td className="border border-border px-3 py-2 text-center font-medium">{perfil.h.toFixed(2)}</td>
                            <td className="border border-border px-3 py-2 text-center font-medium">{perfil.B.toFixed(2)}</td>
                            <td className="border border-border px-3 py-2 text-center font-medium">{perfil.d.toFixed(2)}</td>
                            <td className="border border-border px-3 py-2 text-center font-medium text-primary">{tira.toFixed(2)}</td>
                            {perfil.espessuras.map((esp, espIdx) => (
                              <td key={espIdx} className="border border-border px-3 py-2 text-center">{esp.toFixed(2)}</td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    <strong>Nota:</strong> UE = Perfil U Enrijecido. O enrijecedor (d) aumenta a resistência à flambagem.
                  </p>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
