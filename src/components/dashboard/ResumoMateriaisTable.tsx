import React, { useMemo, useState } from 'react';
import { useProducao } from '@/context/ProducaoContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

// Categories that should NOT be summarized to thickness
const EXCLUDED_CATEGORIES = [
  'TUBO', 'CANTONEIRA', 'VIGA', 'BARRA', 'TELA', 'VERGALH', 'LAMINAD'
];

function shouldSummarize(descricaomat: string): boolean {
  const upper = descricaomat.toUpperCase();
  return !EXCLUDED_CATEGORIES.some(cat => upper.includes(cat));
}

/**
 * Extract thickness from material description.
 * Examples:
 * - PERFIL CH #2,65MM → 2,65
 * - BLANK CH #2,65MM → 2,65
 * - SLITTER 0,50MM → 0,50
 * - CHAPA 0,50 X 1200 X 3000 → 0,50
 * - TELHA TP40 0,50MM → 0,50
 * - TELHA SANDUICHE TP40 0,50 + EPS + TP40 0,50 → 0,50
 * - CUMEEIRAS TP40 0,50 → 0,50
 */
function extractThickness(descricaomat: string): string | null {
  const desc = descricaomat.toUpperCase().trim();

  // Pattern 1: CH #X,XXMM or CH#X,XXMM
  const chPattern = /CH\s*#\s*(\d+[.,]\d+)\s*MM/i;
  const chMatch = desc.match(chPattern);
  if (chMatch) return chMatch[1].replace('.', ',');

  // Pattern 2: SLITTER X,XXMM
  const slitterPattern = /SLITTER\s+(\d+[.,]\d+)\s*MM/i;
  const slitterMatch = desc.match(slitterPattern);
  if (slitterMatch) return slitterMatch[1].replace('.', ',');

  // Pattern 3: CHAPA X,XX X ... (first number is thickness)
  const chapaPattern = /CHAPA\s+(\d+[.,]\d+)\s*X/i;
  const chapaMatch = desc.match(chapaPattern);
  if (chapaMatch) return chapaMatch[1].replace('.', ',');

  // Pattern 4: TP40 X,XX or similar telha pattern
  const telhaPattern = /TP\d+\s+(\d+[.,]\d+)/i;
  const telhaMatch = desc.match(telhaPattern);
  if (telhaMatch) return telhaMatch[1].replace('.', ',');

  // Pattern 5: Generic - first decimal number followed by MM
  const genericMmPattern = /(\d+[.,]\d+)\s*MM/i;
  const genericMmMatch = desc.match(genericMmPattern);
  if (genericMmMatch) return genericMmMatch[1].replace('.', ',');

  // Pattern 6: Standalone decimal like \"0,50\" at start after keyword
  const standalonePattern = /\b(\d+[.,]\d+)\b/;
  const standaloneMatch = desc.match(standalonePattern);
  if (standaloneMatch) return standaloneMatch[1].replace('.', ',');

  return null;
}

function parseThicknessNumber(thickness: string): number {
  return parseFloat(thickness.replace(',', '.')) || 0;
}

interface PivotRow {
  entrega: string;
  cliente: string;
  values: Record<string, number>; // thickness -> weight in KG
}

export function ResumoMateriaisTable() {
  const { filteredData } = useProducao();
  const [showFinalizados, setShowFinalizados] = useState(false);

  const { pivotRows, thicknesses, otherMaterials, totals, grandTotal } = useMemo(() => {
    // Map: \"entrega|cliente\" -> { thickness -> totalKG }
    const rowMap = new Map<string, { entrega: string; cliente: string; values: Record<string, number> }>();
    const thicknessSet = new Set<string>();
    const otherMats: Array<{ entrega: string; cliente: string; material: string; peso: number; unidade: string }> = [];

    const dataToProcess = showFinalizados
      ? filteredData
      : filteredData.filter(p => p.status !== 'FINALIZADO');

    dataToProcess.forEach(pedido => {
      const entrega = pedido.prazo_pcp || 'Sem prazo';
      const cliente = pedido.cli_nomef;

      pedido.ops.forEach(op => {
        const situacaoOp = op.situacao_op?.toUpperCase() || '';
        const isOpFinalizada = situacaoOp === 'FINALIZADA' || situacaoOp === 'CONCLUÍDO' || situacaoOp === 'CONCLUIDO';
        if (isOpFinalizada && !showFinalizados) return;

        op.materiais.forEach(mat => {
          if (shouldSummarize(mat.descricaomat)) {
            const thickness = extractThickness(mat.descricaomat);
            if (thickness) {
              thicknessSet.add(thickness);
              const key = `${entrega}|${cliente}`;
              if (!rowMap.has(key)) {
                rowMap.set(key, { entrega, cliente, values: {} });
              }
              const row = rowMap.get(key)!;
              row.values[thickness] = (row.values[thickness] || 0) + (mat.peso_kg || mat.qtd_pendente || 0);
            } else {
              // Could not extract thickness, treat as \"other\"
              otherMats.push({
                entrega,
                cliente,
                material: mat.descricaomat,
                peso: mat.peso_kg || mat.qtd_pendente || 0,
                unidade: mat.un,
              });
            }
          } else {
            otherMats.push({
              entrega,
              cliente,
              material: mat.descricaomat,
              peso: mat.peso_kg || mat.qtd_pendente || 0,
              unidade: mat.un,
            });
          }
        });
      });
    });

    // Sort thicknesses numerically
    const sortedThicknesses = Array.from(thicknessSet).sort(
      (a, b) => parseThicknessNumber(a) - parseThicknessNumber(b)
    );

    // Sort rows by date, then client
    const rows = Array.from(rowMap.values()).sort((a, b) => {
      const dateA = a.entrega === 'Sem prazo' ? '9999-99-99' : a.entrega;
      const dateB = b.entrega === 'Sem prazo' ? '9999-99-99' : b.entrega;
      const dateCmp = dateA.localeCompare(dateB);
      if (dateCmp !== 0) return dateCmp;
      return a.cliente.localeCompare(b.cliente);
    });

    // Calculate totals per thickness
    const totalsByThickness: Record<string, number> = {};
    let grand = 0;
    rows.forEach(row => {
      sortedThicknesses.forEach(t => {
        const v = row.values[t] || 0;
        totalsByThickness[t] = (totalsByThickness[t] || 0) + v;
        grand += v;
      });
    });

    return {
      pivotRows: rows,
      thicknesses: sortedThicknesses,
      otherMaterials: otherMats,
      totals: totalsByThickness,
      grandTotal: grand,
    };
  }, [filteredData, showFinalizados]);

  const formatDate = (dateStr: string) => {
    if (dateStr === 'Sem prazo') return dateStr;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  const formatWeight = (value: number) => {
    if (!value || value === 0) return '';
    return Math.round(value).toLocaleString('pt-BR');
  };

  // Calculate row total
  const getRowTotal = (row: PivotRow) => {
    return thicknesses.reduce((sum, t) => sum + (row.values[t] || 0), 0);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg">Resumo de Materiais por Espessura</CardTitle>
              <CardDescription>
                Visão consolidada dos pesos (KG) por cliente e espessura de material
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="show-finalizados"
                checked={showFinalizados}
                onCheckedChange={setShowFinalizados}
              />
              <Label htmlFor="show-finalizados" className="text-sm">Incluir finalizados</Label>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {pivotRows.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              Nenhum material com espessura identificada nos pedidos atuais.
            </div>
          ) : (
            <ScrollArea className="w-full">
              <div className="min-w-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-primary/10">
                      <TableHead className="font-bold text-primary sticky left-0 bg-primary/10 z-10 min-w-[100px]">
                        ENTREGA
                      </TableHead>
                      <TableHead className="font-bold text-primary min-w-[120px]">CLIENTE</TableHead>
                      {thicknesses.map(t => (
                        <TableHead key={t} className="font-bold text-primary text-right min-w-[70px]">
                          {t}
                        </TableHead>
                      ))}
                      <TableHead className="font-bold text-primary text-right min-w-[80px]">TOTAL</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pivotRows.map((row, idx) => {
                      const rowTotal = getRowTotal(row);
                      return (
                        <TableRow key={idx} className={idx % 2 === 0 ? 'bg-muted/30' : ''}>
                          <TableCell className="font-medium sticky left-0 bg-inherit z-10">
                            {formatDate(row.entrega)}
                          </TableCell>
                          <TableCell className="font-medium truncate max-w-[150px]" title={row.cliente}>
                            {row.cliente}
                          </TableCell>
                          {thicknesses.map(t => (
                            <TableCell key={t} className="text-right tabular-nums">
                              {formatWeight(row.values[t] || 0)}
                            </TableCell>
                          ))}
                          <TableCell className="text-right font-bold tabular-nums">
                            {formatWeight(rowTotal)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {/* Total row */}
                    <TableRow className="bg-primary/10 font-bold border-t-2 border-primary/30">
                      <TableCell className="sticky left-0 bg-primary/10 z-10" />
                      <TableCell className="font-bold">TOTAL</TableCell>
                      {thicknesses.map(t => (
                        <TableCell key={t} className="text-right font-bold tabular-nums">
                          {formatWeight(totals[t] || 0)}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-bold tabular-nums">
                        {formatWeight(grandTotal)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Other materials that couldn't be summarized */}
      {otherMaterials.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              Outros Materiais
              <Badge variant="secondary">{otherMaterials.length}</Badge>
            </CardTitle>
            <CardDescription>
              Tubos, cantoneiras, vigas, barras, telas, vergalhões e laminados (sem resumo por espessura)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-bold">ENTREGA</TableHead>
                    <TableHead className="font-bold">CLIENTE</TableHead>
                    <TableHead className="font-bold">MATERIAL</TableHead>
                    <TableHead className="font-bold text-right">PESO</TableHead>
                    <TableHead className="font-bold">UN</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {otherMaterials.map((mat, idx) => (
                    <TableRow key={idx} className={idx % 2 === 0 ? 'bg-muted/30' : ''}>
                      <TableCell>{formatDate(mat.entrega)}</TableCell>
                      <TableCell className="truncate max-w-[150px]" title={mat.cliente}>
                        {mat.cliente}
                      </TableCell>
                      <TableCell className="truncate max-w-[200px]" title={mat.material}>
                        {mat.material}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatWeight(mat.peso)}
                      </TableCell>
                      <TableCell>{mat.unidade}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
