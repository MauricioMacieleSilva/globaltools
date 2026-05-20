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
import { Factory } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const perfilU: Array<{ aba1: number; base: number; aba2: number }> = [
  { aba1: 25, base: 50, aba2: 25 },
  { aba1: 30, base: 68, aba2: 30 },
  { aba1: 40, base: 75, aba2: 40 },
  { aba1: 30, base: 92, aba2: 30 },
  { aba1: 40, base: 92, aba2: 40 },
  { aba1: 40, base: 100, aba2: 40 },
  { aba1: 50, base: 100, aba2: 50 },
  { aba1: 40, base: 120, aba2: 40 },
  { aba1: 40, base: 127, aba2: 40 },
  { aba1: 50, base: 127, aba2: 50 },
  { aba1: 50, base: 142, aba2: 50 },
  { aba1: 50, base: 150, aba2: 50 },
  { aba1: 50, base: 172, aba2: 50 },
  { aba1: 50, base: 180, aba2: 50 },
  { aba1: 50, base: 192, aba2: 50 },
  { aba1: 50, base: 200, aba2: 50 },
];

const perfilUE: Array<{ aba1: number; aba2: number; base: number; aba3: number; aba4: number }> = [
  { aba1: 15, aba2: 40, base: 75, aba3: 40, aba4: 15 },
  { aba1: 15, aba2: 40, base: 100, aba3: 40, aba4: 15 },
  { aba1: 15, aba2: 50, base: 125, aba3: 50, aba4: 15 },
  { aba1: 15, aba2: 50, base: 150, aba3: 50, aba4: 15 },
  { aba1: 15, aba2: 50, base: 180, aba3: 50, aba4: 15 },
  { aba1: 25, aba2: 75, base: 200, aba3: 75, aba4: 25 },
];

export function PerfiladeiraDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 text-xs sm:text-sm">
          <Factory className="h-3 w-3 sm:h-4 sm:w-4" />
          Perfiladeira
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5 text-primary" />
            Perfis Produzidos na Perfiladeira
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="perfil-u" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="perfil-u">Perfil U</TabsTrigger>
            <TabsTrigger value="perfil-ue">Perfil U Enrijecido</TabsTrigger>
          </TabsList>

          <TabsContent value="perfil-u" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground mb-2">
                  <p>Espessuras: <strong>1,95 a 3,00 mm</strong></p>
                  <p>Comprimento máximo: <strong>12 m</strong></p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-primary text-primary-foreground">
                        <th className="border border-border px-3 py-2 text-center" colSpan={3}>PERFIL U</th>
                      </tr>
                      <tr className="bg-primary/80 text-primary-foreground">
                        <th className="border border-border px-3 py-2 text-center">1ª ABA (mm)</th>
                        <th className="border border-border px-3 py-2 text-center">BASE (mm)</th>
                        <th className="border border-border px-3 py-2 text-center">2ª ABA (mm)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {perfilU.map((p, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-muted/30' : 'bg-background'}>
                          <td className="border border-border px-3 py-2 text-center">{p.aba1}</td>
                          <td className="border border-border px-3 py-2 text-center font-medium text-primary">{p.base}</td>
                          <td className="border border-border px-3 py-2 text-center">{p.aba2}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    <strong>Nota:</strong> Perfis disponíveis para produção em série na perfiladeira.
                  </p>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="perfil-ue" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground mb-2">
                  <p>Espessuras: <strong>1,95 a 3,00 mm</strong></p>
                  <p>Comprimento máximo: <strong>12 m</strong></p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-primary text-primary-foreground">
                        <th className="border border-border px-3 py-2 text-center" colSpan={5}>PERFIL U ENRIJECIDO</th>
                      </tr>
                      <tr className="bg-primary/80 text-primary-foreground">
                        <th className="border border-border px-3 py-2 text-center">1ª ABA (mm)</th>
                        <th className="border border-border px-3 py-2 text-center">2ª ABA (mm)</th>
                        <th className="border border-border px-3 py-2 text-center">BASE (mm)</th>
                        <th className="border border-border px-3 py-2 text-center">3ª ABA (mm)</th>
                        <th className="border border-border px-3 py-2 text-center">4ª ABA (mm)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {perfilUE.map((p, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-muted/30' : 'bg-background'}>
                          <td className="border border-border px-3 py-2 text-center">{p.aba1}</td>
                          <td className="border border-border px-3 py-2 text-center">{p.aba2}</td>
                          <td className="border border-border px-3 py-2 text-center font-medium text-primary">{p.base}</td>
                          <td className="border border-border px-3 py-2 text-center">{p.aba3}</td>
                          <td className="border border-border px-3 py-2 text-center">{p.aba4}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    <strong>Nota:</strong> Perfis enrijecidos disponíveis para produção em série na perfiladeira.
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