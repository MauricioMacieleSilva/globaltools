import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { formatarNumero } from '@/lib/utils-perfil';

export interface CampoDimensao {
  key: string;
  label: string;
  /** Se true, este campo é "espelhado" do principal quando simétrico (ficará desabilitado e auto-preenchido) */
  mirrorOf?: string;
}

interface LinhaBase {
  id: string;
  espessura: string;
  comprimento: string;
  largura: string;
  quantidade: string;
  percentualPerda: string;
  assimetrico?: boolean;
  orientacaoUZ?: 'U' | 'Z';
  [key: string]: any;
}

interface CalculoBase {
  id: string;
  tira: number;
  tiraPerda: number;
  pesoPorPeca: number;
  pesoTotal: number;
  pesoPerda: number;
}

interface PerfilMobileGenericProps<L extends LinhaBase, C extends CalculoBase> {
  titulo: string;
  /** Mostra dropdown U/Z */
  comOrientacaoUZ?: boolean;
  /** Mostra checkbox simétrico */
  comSimetrico?: boolean;
  /** Campos de dimensão na ordem de apresentação */
  campos: CampoDimensao[];
  linhas: L[];
  setLinhas: (l: L[]) => void;
  novaLinhaFactory: () => L;
  resetLinha: (l: L) => L;
  calcular: (l: L) => C | null;
  removerCalculo: (id: string) => void;
}

export function PerfilMobileGeneric<L extends LinhaBase, C extends CalculoBase>({
  titulo,
  comOrientacaoUZ = false,
  comSimetrico = false,
  campos,
  linhas,
  setLinhas,
  novaLinhaFactory,
  resetLinha,
  calcular,
  removerCalculo,
}: PerfilMobileGenericProps<L, C>) {
  const [openCards, setOpenCards] = useState<Set<string>>(new Set());

  const atualizarLinha = (id: string, campo: string, valor: string | boolean) => {
    const updated = linhas.map(l => {
      if (l.id !== id) return l;
      const novaLinha: any = { ...l, [campo]: valor };
      if (comSimetrico && !novaLinha.assimetrico) {
        // Auto-mirror: se um campo tem mirrorOf, espelha
        campos.forEach(c => {
          if (c.mirrorOf === campo) {
            novaLinha[c.key] = valor as string;
          }
        });
        // Quando desliga assimétrico, sincroniza espelhos
        if (campo === 'assimetrico' && valor === false) {
          campos.forEach(c => {
            if (c.mirrorOf) novaLinha[c.key] = novaLinha[c.mirrorOf];
          });
        }
      }
      return novaLinha as L;
    });
    setLinhas(updated);
  };

  const adicionarLinha = () => {
    const nova = novaLinhaFactory();
    setLinhas([...linhas, nova]);
    setOpenCards(prev => new Set(prev).add(nova.id));
  };

  const limparLinha = (id: string) => {
    setLinhas(linhas.map(l => l.id === id ? resetLinha(l) : l));
    removerCalculo(id);
  };

  const toggleCard = (id: string) => {
    setOpenCards(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const totalPeso = linhas.reduce((s, l) => {
    const c = calcular(l);
    if (!c) return s;
    const p = parseFloat(l.percentualPerda) || 100;
    return s + (c.pesoTotal * p / 100);
  }, 0);
  const totalPerda = linhas.reduce((s, l) => {
    const c = calcular(l);
    return s + (c?.pesoPerda || 0);
  }, 0);
  const percPerda = totalPeso > 0 ? (totalPerda / totalPeso * 100) : 0;

  return (
    <div className="space-y-4">
      {linhas.map((linha, index) => {
        const calculo = calcular(linha);
        const isOpen = openCards.has(linha.id);

        return (
          <Card key={linha.id} className="overflow-hidden">
            <Collapsible open={isOpen} onOpenChange={() => toggleCard(linha.id)}>
              <CollapsibleTrigger asChild>
                <CardHeader className="p-3 cursor-pointer hover:bg-muted/50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      Linha {index + 1}
                      {calculo && (
                        <span className="text-xs font-normal text-muted-foreground">
                          ({formatarNumero(calculo.pesoTotal)} kg)
                        </span>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          limparLinha(linha.id);
                        }}
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <CardContent className="p-3 pt-0 space-y-4">
                  {(comOrientacaoUZ || comSimetrico) && (
                    <div className="grid grid-cols-2 gap-3">
                      {comOrientacaoUZ && (
                        <div>
                          <Label className="text-xs">U/Z</Label>
                          <Select
                            value={linha.orientacaoUZ || 'U'}
                            onValueChange={(v: 'U' | 'Z') => atualizarLinha(linha.id, 'orientacaoUZ', v)}
                          >
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent className="z-50">
                              <SelectItem value="U">U</SelectItem>
                              <SelectItem value="Z">Z</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {comSimetrico && (
                        <div className={`flex items-center gap-2 ${comOrientacaoUZ ? 'pt-5' : ''}`}>
                          <Checkbox
                            id={`sim-${linha.id}`}
                            checked={!linha.assimetrico}
                            onCheckedChange={(checked) => atualizarLinha(linha.id, 'assimetrico', !checked)}
                          />
                          <Label htmlFor={`sim-${linha.id}`} className="text-xs">Simétrico</Label>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Espessura</Label>
                      <Input
                        type="number" step="0.01" placeholder="0.00"
                        value={linha.espessura}
                        onChange={e => atualizarLinha(linha.id, 'espessura', e.target.value)}
                        className="h-9"
                      />
                    </div>
                    {campos.map(c => {
                      const isMirrored = !!c.mirrorOf && comSimetrico && !linha.assimetrico;
                      return (
                        <div key={c.key}>
                          <Label className="text-xs">{c.label}</Label>
                          <Input
                            type="number" placeholder="0"
                            value={linha[c.key] || ''}
                            onChange={e => atualizarLinha(linha.id, c.key, e.target.value)}
                            className={`h-9 ${isMirrored ? 'bg-muted text-muted-foreground' : ''}`}
                            disabled={isMirrored}
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Comprimento</Label>
                      <Input type="number" placeholder="6000" value={linha.comprimento}
                        onChange={e => atualizarLinha(linha.id, 'comprimento', e.target.value)} className="h-9" />
                    </div>
                    <div>
                      <Label className="text-xs">Largura</Label>
                      <Input type="number" placeholder="1200" value={linha.largura}
                        onChange={e => atualizarLinha(linha.id, 'largura', e.target.value)} className="h-9" />
                    </div>
                    <div>
                      <Label className="text-xs">Quantidade</Label>
                      <Input type="number" placeholder="0" value={linha.quantidade}
                        onChange={e => atualizarLinha(linha.id, 'quantidade', e.target.value)} className="h-9" />
                    </div>
                    <div>
                      <Label className="text-xs">% Perda</Label>
                      <Input type="number" value={linha.percentualPerda}
                        onChange={e => atualizarLinha(linha.id, 'percentualPerda', e.target.value)} className="h-9" />
                    </div>
                  </div>

                  {calculo && (
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center">
                          <div className="text-muted-foreground">Tira</div>
                          <div className="font-medium">{formatarNumero(calculo.tira)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-muted-foreground">T.Perda</div>
                          <div className="font-medium">{formatarNumero(calculo.tiraPerda)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-muted-foreground">kg/Pç</div>
                          <div className="font-medium">{formatarNumero(calculo.pesoPorPeca)}</div>
                        </div>
                        <div className="text-center col-span-3 pt-2 border-t mt-2">
                          <div className="flex justify-around">
                            <div>
                              <div className="text-muted-foreground">Peso Total</div>
                              <div className="font-medium text-primary">{formatarNumero(calculo.pesoTotal)} kg</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Peso Perda</div>
                              <div className="font-medium text-destructive">{formatarNumero(calculo.pesoPerda)} kg</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}

      <Button onClick={adicionarLinha} className="w-full" variant="outline">
        <Plus className="h-4 w-4 mr-2" />
        Adicionar Linha
      </Button>

      <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Peso Total</div>
            <div className="text-xl font-bold text-primary">{formatarNumero(totalPeso)} kg</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Peso de Perda</div>
            <div className="text-xl font-bold text-destructive">
              {formatarNumero(totalPerda)} kg <span className="text-sm font-normal">({formatarNumero(percPerda)}%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
