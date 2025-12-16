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
import { BookOpen } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { perfilPadraoU, perfilPadraoUE } from '@/lib/perfil-padrao-utils';

export function PerfilPadraoDialog() {
  const [open, setOpen] = useState(false);

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
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Tabelas de Perfis Padrão
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
                        <th className="border border-border px-3 py-2 text-center" colSpan={7}>Dimensão</th>
                      </tr>
                      <tr className="bg-primary/80 text-primary-foreground">
                        <th className="border border-border px-3 py-2 text-center">h (mm)</th>
                        <th className="border border-border px-3 py-2 text-center">B (mm)</th>
                        <th className="border border-border px-3 py-2 text-center" colSpan={5}>e=r (mm)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {perfilPadraoU.map((perfil, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-muted/30' : 'bg-background'}>
                          <td className="border border-border px-3 py-2 text-center font-medium">{perfil.h.toFixed(2)}</td>
                          <td className="border border-border px-3 py-2 text-center font-medium">{perfil.B.toFixed(2)}</td>
                          {perfil.espessuras.map((esp, espIdx) => (
                            <td key={espIdx} className="border border-border px-3 py-2 text-center">{esp.toFixed(2)}</td>
                          ))}
                          {/* Preencher células vazias se houver menos espessuras */}
                          {Array(5 - perfil.espessuras.length).fill(null).map((_, i) => (
                            <td key={`empty-${i}`} className="border border-border px-3 py-2 text-center">-</td>
                          ))}
                        </tr>
                      ))}
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
                        <th className="border border-border px-3 py-2 text-center" colSpan={7}>Dimensão</th>
                      </tr>
                      <tr className="bg-primary/80 text-primary-foreground">
                        <th className="border border-border px-3 py-2 text-center">h (mm)</th>
                        <th className="border border-border px-3 py-2 text-center">B (mm)</th>
                        <th className="border border-border px-3 py-2 text-center">d (mm)</th>
                        <th className="border border-border px-3 py-2 text-center" colSpan={4}>e=r (mm)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {perfilPadraoUE.map((perfil, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-muted/30' : 'bg-background'}>
                          <td className="border border-border px-3 py-2 text-center font-medium">{perfil.h.toFixed(2)}</td>
                          <td className="border border-border px-3 py-2 text-center font-medium">{perfil.B.toFixed(2)}</td>
                          <td className="border border-border px-3 py-2 text-center font-medium">{perfil.d.toFixed(2)}</td>
                          {perfil.espessuras.map((esp, espIdx) => (
                            <td key={espIdx} className="border border-border px-3 py-2 text-center">{esp.toFixed(2)}</td>
                          ))}
                        </tr>
                      ))}
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
