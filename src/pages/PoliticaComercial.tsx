import { useEffect, useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PoliticaComercialProvider, usePoliticaComercial } from '@/context/PoliticaComercialContext';
import { fetchAllPoliticaComercialData } from '@/services/politicaComercialService';
import { PoliticaDescontos } from '@/components/politica-comercial/PoliticaDescontos';
import { TabelaPrecos } from '@/components/politica-comercial/TabelaPrecos';
import { TabelaPerfis } from '@/components/politica-comercial/TabelaPerfis';
import { SimuladorPreco } from '@/components/politica-comercial/SimuladorPreco';

import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { fetchPerfilPrecos } from '@/services/perfilPrecosService';
import { formatarFaixaLabel } from '@/hooks/useFaixasDesconto';
import { AjusteMassaPrecosDialog } from '@/components/politica-comercial/AjusteMassaPrecosDialog';
import { HistoricoPrecosDialog } from '@/components/politica-comercial/HistoricoPrecosDialog';
import { FileDown, Loader2 } from 'lucide-react';
import XLSX from 'xlsx-js-style';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

const classes = [
  { key: 'ARAMES', label: 'Arames' },
  { key: 'BOBINAS', label: 'Bobinas' },
  { key: 'PERFIS', label: 'Perfis' },
  { key: 'CHAPAS', label: 'Chapas' },
  { key: 'TELHAS', label: 'Telhas' },
  { key: 'TUBOS', label: 'Tubos' },
  { key: 'LAMINADOS', label: 'Laminados' },
  { key: 'VERGALHAO', label: 'Construção Civil' },
  { key: 'BLANK', label: 'Blank' }
];

function PoliticaComercialContent() {
  const {
    dados,
    setDados,
    loading,
    setLoading,
    simulador,
    setSimulador,
    classeAtiva,
    setClasseAtiva,
    faixasDesconto
  } = usePoliticaComercial();
  
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [perfilCount, setPerfilCount] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const perfilRes = await fetchPerfilPrecos();
      const perfis = perfilRes.data || [];
      const wb = XLSX.utils.book_new();

      // 1. Create cover sheet for volume discounts policy
      const sortedFaixas = [...faixasDesconto].sort((a, b) => a.ordem - b.ordem);
      const descontoMaximo = sortedFaixas.reduce((m, f) => Math.max(m, f.desconto_max_percent), 0);

      const wsDiscounts: any = {};

      // Initialize all cells in A1:N40 to white background to hide gridlines
      for (let r = 0; r < 40; ++r) {
        for (let c = 0; c < 14; ++c) {
          const ref = XLSX.utils.encode_cell({ r, c });
          wsDiscounts[ref] = {
            t: 's',
            v: '',
            s: {
              fill: { fgColor: { rgb: "FFFFFF" } } // White background hides gridlines
            }
          };
        }
      }

      wsDiscounts['!ref'] = 'A1:N40';

      // Merges
      wsDiscounts['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }, // Title A1:H1
        { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } }, // Subtitle A2:H2
        { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } }, // Section 1 Title A4:B4
        { s: { r: 3, c: 3 }, e: { r: 3, c: 6 } }, // Section 2 Title D4:G4
        { s: { r: 4, c: 3 }, e: { r: 4, c: 6 } }, // Warning Title D5:G5
        { s: { r: 5, c: 3 }, e: { r: 7, c: 6 } }, // Warning Text D6:G8
      ];

      // Helper to apply styles to a range of cells
      const styleRange = (
        sRow: number,
        sCol: number,
        eRow: number,
        eCol: number,
        styleFunc: (r: number, c: number) => any
      ) => {
        for (let r = sRow; r <= eRow; ++r) {
          for (let c = sCol; c <= eCol; ++c) {
            const ref = XLSX.utils.encode_cell({ r, c });
            wsDiscounts[ref] = wsDiscounts[ref] || { t: 's', v: '' };
            wsDiscounts[ref].s = {
              ...wsDiscounts[ref].s,
              ...styleFunc(r, c)
            };
          }
        }
      };

      // Set Title values and styles
      wsDiscounts['A1'] = { t: 's', v: 'DIRETRIZES DA POLÍTICA COMERCIAL - GLOBAL AÇO' };
      styleRange(0, 0, 0, 7, () => ({
        font: { name: "Arial", sz: 14, bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "0369A1" } },
        alignment: { vertical: "center", horizontal: "center" }
      }));

      wsDiscounts['A2'] = { t: 's', v: 'Diretrizes para aplicação de descontos conforme volume e regras gerais' };
      styleRange(1, 0, 1, 7, () => ({
        font: { name: "Arial", sz: 10, italic: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "0284C7" } },
        alignment: { vertical: "center", horizontal: "center" }
      }));

      // Section 1 Header (POLÍTICA DE DESCONTOS POR VOLUME)
      wsDiscounts['A4'] = { t: 's', v: 'POLÍTICA DE DESCONTOS POR VOLUME' };
      styleRange(3, 0, 3, 1, () => ({
        font: { name: "Arial", sz: 11, bold: true, color: { rgb: "0F172A" } },
        fill: { fgColor: { rgb: "F1F5F9" } },
        alignment: { vertical: "center", horizontal: "center" },
        border: { bottom: { style: "medium", color: { rgb: "475569" } } }
      }));

      // Section 2 Header (OBSERVAÇÕES IMPORTANTES)
      wsDiscounts['D4'] = { t: 's', v: 'OBSERVAÇÕES IMPORTANTES' };
      styleRange(3, 3, 3, 6, () => ({
        font: { name: "Arial", sz: 11, bold: true, color: { rgb: "92400E" } },
        fill: { fgColor: { rgb: "FEF3C7" } },
        alignment: { vertical: "center", horizontal: "center" },
        border: { bottom: { style: "medium", color: { rgb: "D97706" } } }
      }));

      // Table Headers (Volume / Desconto)
      wsDiscounts['A5'] = { t: 's', v: 'Volume de Compra' };
      wsDiscounts['B5'] = { t: 's', v: 'Desconto Máximo Autorizado' };
      styleRange(4, 0, 4, 1, () => ({
        font: { name: "Arial", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "334155" } },
        alignment: { vertical: "center", horizontal: "center" },
        border: {
          top: { style: "thin", color: { rgb: "475569" } },
          bottom: { style: "thin", color: { rgb: "475569" } },
          left: { style: "thin", color: { rgb: "475569" } },
          right: { style: "thin", color: { rgb: "475569" } }
        }
      }));

      // Table Data (faixas)
      sortedFaixas.forEach((f, idx) => {
        const R = 5 + idx;
        const label = formatarFaixaLabel(f);
        
        const cellA = XLSX.utils.encode_cell({ r: R, c: 0 });
        const cellB = XLSX.utils.encode_cell({ r: R, c: 1 });
        
        wsDiscounts[cellA] = { t: 's', v: label };
        wsDiscounts[cellB] = { t: 's', v: `Até ${f.desconto_max_percent}%` };
        
        styleRange(R, 0, R, 0, () => ({
          font: { name: "Arial", sz: 10, color: { rgb: "1F2937" } },
          alignment: { vertical: "center", horizontal: "left", indent: 1 },
          border: {
            bottom: { style: "thin", color: { rgb: "E2E8F0" } },
            left: { style: "thin", color: { rgb: "E2E8F0" } },
            right: { style: "thin", color: { rgb: "E2E8F0" } }
          }
        }));
        
        styleRange(R, 1, R, 1, () => ({
          font: { name: "Arial", sz: 10, bold: true, color: { rgb: "047857" } },
          alignment: { vertical: "center", horizontal: "center" },
          border: {
            bottom: { style: "thin", color: { rgb: "E2E8F0" } },
            left: { style: "thin", color: { rgb: "E2E8F0" } },
            right: { style: "thin", color: { rgb: "E2E8F0" } }
          }
        }));
      });

      // Warning Card Box
      wsDiscounts['D5'] = { t: 's', v: '⚠️ Aprovação Necessária' };
      wsDiscounts['D6'] = {
        t: 's',
        v: `Descontos que excedam o máximo por volume (${descontoMaximo}%) deverão ser avaliados pela gestão.`
      };

      styleRange(4, 3, 7, 6, (r, c) => {
        const style: any = {
          fill: { fgColor: { rgb: "FFFDF2" } },
          border: {
            top: r === 4 ? { style: "thin", color: { rgb: "FDE68A" } } : undefined,
            bottom: r === 7 ? { style: "thin", color: { rgb: "FDE68A" } } : undefined,
            left: c === 3 ? { style: "thin", color: { rgb: "FDE68A" } } : undefined,
            right: c === 6 ? { style: "thin", color: { rgb: "FDE68A" } } : undefined
          }
        };
        
        if (r === 4) {
          style.font = { name: "Arial", sz: 10, bold: true, color: { rgb: "B45309" } };
          style.alignment = { vertical: "center", horizontal: "left", indent: 1 };
        } else if (r >= 5) {
          style.font = { name: "Arial", sz: 9, color: { rgb: "78350F" } };
          style.alignment = { vertical: "top", horizontal: "left", wrapText: true };
        }
        
        return style;
      });

      // Export Date Row
      const dateRow = 5 + Math.max(sortedFaixas.length, 4) + 1;
      
      const cellDateLabel = XLSX.utils.encode_cell({ r: dateRow, c: 0 });
      const cellDateVal = XLSX.utils.encode_cell({ r: dateRow, c: 1 });
      
      wsDiscounts[cellDateLabel] = { t: 's', v: 'Data de Exportação:' };
      wsDiscounts[cellDateVal] = { t: 's', v: new Date().toLocaleDateString('pt-BR') };
      
      styleRange(dateRow, 0, dateRow, 0, () => ({
        font: { name: "Arial", sz: 10, bold: true, color: { rgb: "6B7280" } },
        alignment: { vertical: "center", horizontal: "left" }
      }));
      styleRange(dateRow, 1, dateRow, 1, () => ({
        font: { name: "Arial", sz: 10, italic: true, color: { rgb: "6B7280" } },
        alignment: { vertical: "center", horizontal: "left" }
      }));

      wsDiscounts['!cols'] = [
        { wch: 30 }, // A
        { wch: 30 }, // B
        { wch: 5 },  // C (separator)
        { wch: 15 }, // D
        { wch: 15 }, // E
        { wch: 15 }, // F
        { wch: 15 }  // G
      ];

      XLSX.utils.book_append_sheet(wb, wsDiscounts, 'Política de Descontos');

      // 2. Create sheets for each pricing class
      classes.forEach((classe) => {
        let rows: any[] = [];

        if (classe.key === 'PERFIS') {
          const padrao = perfis.filter(p => p.tipo === 'padrao');
          const especial = perfis.filter(p => p.tipo === 'especial');

          rows = [
            { 'Tipo': 'Perfil Padrão', 'Espessura (mm)': '', 'Preço (R$/KG)': '' },
            ...padrao.map(p => ({
              'Tipo': 'Padrão',
              'Espessura (mm)': p.espessura,
              'Preço (R$/KG)': p.preco_kg
            })),
            { 'Tipo': '', 'Espessura (mm)': '', 'Preço (R$/KG)': '' },
            { 'Tipo': 'Perfil Especial', 'Espessura (mm)': '', 'Preço (R$/KG)': '' },
            ...especial.map(p => ({
              'Tipo': 'Especial',
              'Espessura (mm)': p.espessura,
              'Preço (R$/KG)': p.preco_kg
            }))
          ];
        } else if (classe.key === 'TELHAS') {
          const items = dados[classe.key] || [];
          rows = items.map(item => ({
            'Descrição': item.descricao,
            'Unidade': item.unidade,
            'Preço M (R$)': item.precoM2 || item.preco,
            'Preço KG (R$)': item.precoKg ?? 0,
            'IPI (%)': item.ipi
          }));
        } else {
          const items = dados[classe.key] || [];
          rows = items.map(item => ({
            'Descrição': item.descricao,
            'Unidade': item.unidade,
            'Preço (R$)': item.preco,
            'IPI (%)': item.ipi
          }));
        }

        let ws: any;
        if (rows.length > 0) {
          ws = XLSX.utils.json_to_sheet(rows);

          // Apply styling to pricing sheet cells
          const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
          for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
              const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
              const cell = ws[cellRef];
              if (!cell) continue;

              const cellStyle: any = {
                font: { name: "Arial", sz: 10, color: { rgb: "1F2937" } },
                border: {
                  bottom: { style: "thin", color: { rgb: "E5E7EB" } },
                  top: { style: "thin", color: { rgb: "E5E7EB" } },
                  left: { style: "thin", color: { rgb: "E5E7EB" } },
                  right: { style: "thin", color: { rgb: "E5E7EB" } }
                }
              };

              if (R === 0) {
                // Header style
                cellStyle.fill = { fgColor: { rgb: "0284C7" } };
                cellStyle.font = { name: "Arial", sz: 11, bold: true, color: { rgb: "FFFFFF" } };
                cellStyle.alignment = { vertical: "center", horizontal: "center" };
              } else {
                // Data style
                if (cell.t === 'n') {
                  cellStyle.alignment = { vertical: "center", horizontal: "right" };
                  // Format price columns (Col C for general classes/PERFIS, Col C and D for TELHAS)
                  const colLetter = cellRef.replace(/[0-9]/g, '');
                  const isPriceCol = 
                    colLetter === 'C' || 
                    (classe.key === 'TELHAS' && colLetter === 'D');
                  
                  if (isPriceCol) {
                    cell.z = '"R$"#,##0.00';
                  }
                } else {
                  cellStyle.alignment = { vertical: "center", horizontal: "left" };
                }

                // Perfil section header formatting
                if (classe.key === 'PERFIS' && cell.v && (cell.v === 'Perfil Padrão' || cell.v === 'Perfil Especial')) {
                  cellStyle.fill = { fgColor: { rgb: "F0F9FF" } };
                  cellStyle.font = { name: "Arial", sz: 11, bold: true, color: { rgb: "0369A1" } };
                  cellStyle.alignment = { vertical: "center", horizontal: "left" };
                }
              }

              cell.s = cellStyle;
            }
          }

          // Column auto-widths
          const colWidths = Object.keys(rows[0] || {}).map(key => {
            const maxLength = Math.max(
              key.length,
              ...rows.map(row => {
                const val = row[key];
                return val ? val.toString().length : 0;
              })
            );
            return { wch: maxLength + 3 };
          });
          ws['!cols'] = colWidths;
        } else {
          ws = XLSX.utils.json_to_sheet([{ 'Mensagem': 'Nenhum produto cadastrado nesta categoria' }]);
          ws['!cols'] = [{ wch: 45 }];
          ws['A1'].s = {
            font: { name: "Arial", sz: 10, italic: true, color: { rgb: "6B7280" } },
            alignment: { vertical: "center", horizontal: "left" }
          };
        }

        XLSX.utils.book_append_sheet(wb, ws, classe.label);
      });

      const today = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      XLSX.writeFile(wb, `Política Comercial Global Aço - ${today}.xlsx`);
      toast.success('Tabela de preços exportada com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      toast.error('Erro ao exportar tabela de preços para Excel.');
    } finally {
      setIsExporting(false);
    }
  };

  // Check if user is admin
  useEffect(() => {
    async function checkAdminRole() {
      if (!user?.id) {
        setIsAdmin(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        setIsAdmin(data.role === 'admin');
      }
    }

    checkAdminRole();
  }, [user?.id]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [dadosCompletos, perfilData] = await Promise.all([
        fetchAllPoliticaComercialData(),
        fetchPerfilPrecos()
      ]);
      setDados(dadosCompletos);
      setPerfilCount(perfilData.data?.length || 0);
    } catch (error) {
      console.error('Erro ao carregar dados da política comercial:', error);
    } finally {
      setLoading(false);
    }
  }, [setDados, setLoading]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleItemClick = (preco: number) => {
    setSimulador({
      ...simulador,
      precoBase: preco
    });
  };

  const handleDataChanged = () => {
    loadData();
  };

  const getItemCount = (key: string) => {
    if (key === 'PERFIS') {
      return perfilCount;
    }
    return dados[key]?.length || 0;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Conteúdo Principal */}
        <div className="lg:col-span-3 space-y-6">
          {/* Política de Descontos */}
          <PoliticaDescontos isAdmin={isAdmin} />

          {/* Tabelas de Preços */}
          <Tabs value={classeAtiva} onValueChange={setClasseAtiva} className="w-full">
            <TabsList className="flex flex-wrap w-full h-auto gap-1 bg-muted/50 p-1 justify-start" data-tour="politica-categorias">
              {classes.map(classe => (
                <TabsTrigger 
                  key={classe.key} 
                  value={classe.key} 
                  className="text-xs data-[state=active]:bg-background flex-1 md:flex-initial py-1.5 px-3"
                >
                  {classe.label}
                  {getItemCount(classe.key) > 0 && (
                    <Badge 
                      variant="secondary" 
                      className="ml-1.5 text-[10px] px-1.5 py-0 h-4 min-w-[18px]"
                    >
                      {getItemCount(classe.key)}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {classes.map(classe => (
              <TabsContent key={classe.key} value={classe.key} className="mt-6">
                {classe.key === 'PERFIS' ? (
                  <TabelaPerfis 
                    isAdmin={isAdmin}
                    onItemClick={handleItemClick}
                  />
                ) : (
                  <TabelaPrecos 
                    titulo={classe.label} 
                    dados={dados[classe.key] || []} 
                    loading={loading} 
                    onItemClick={handleItemClick}
                    isAdmin={isAdmin}
                    classeAtiva={classe.key}
                    onDataChanged={handleDataChanged}
                  />
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {/* Sidebar com Simulador */}
        <div className="lg:col-span-1 space-y-6">
          {isAdmin && (
            <div className="bg-card p-4 rounded-xl border border-border/60 shadow-sm space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">Gestão de Preços</h3>
              <div className="grid grid-cols-1 gap-2">
                <AjusteMassaPrecosDialog onDataChanged={loadData} />
                <HistoricoPrecosDialog />
              </div>
            </div>
          )}

          {/* Ações Rápidas (Exportação) */}
          <div className="bg-card p-4 rounded-xl border border-border/60 shadow-sm space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">Ações</h3>
            <Button 
              onClick={handleExportExcel} 
              disabled={isExporting} 
              className="w-full gap-2 py-5" 
              variant="outline"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4 text-primary" />
                  Exportar para Excel
                </>
              )}
            </Button>
          </div>

          <SimuladorPreco />
        </div>
      </div>
    </div>
  );
}

export default function PoliticaComercial() {
  return (
    <PoliticaComercialProvider>
      <PoliticaComercialContent />
    </PoliticaComercialProvider>
  );
}
