import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, X, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ColumnMapping {
  empresa: string;
  telefone: string;
  email: string;
  contato: string;
  cnpj: string;
  cidade: string;
  estado: string;
  ramo: string;
}

const FIELD_LABELS: Record<keyof ColumnMapping, string> = {
  empresa: 'Empresa',
  telefone: 'Telefone',
  email: 'E-mail',
  contato: 'Nome do Contato',
  cnpj: 'CNPJ',
  cidade: 'Cidade',
  estado: 'Estado',
  ramo: 'Ramo de Atuação',
};

// Common header synonyms for auto-detection
const FIELD_SYNONYMS: Record<keyof ColumnMapping, string[]> = {
  empresa: ['empresa', 'razão social', 'razao social', 'nome empresa', 'company', 'nome fantasia', 'fantasia', 'nome', 'cliente'],
  telefone: ['telefone', 'tel', 'fone', 'phone', 'celular', 'whatsapp', 'whats', 'contato tel', 'numero'],
  email: ['email', 'e-mail', 'correio', 'mail'],
  contato: ['contato', 'nome contato', 'responsável', 'responsavel', 'contact', 'pessoa'],
  cnpj: ['cnpj', 'cpf/cnpj', 'documento', 'cpf'],
  cidade: ['cidade', 'municipio', 'município', 'city'],
  estado: ['estado', 'uf', 'state'],
  ramo: ['ramo', 'segmento', 'setor', 'atividade', 'ramo de atuação', 'ramo atuacao'],
};

interface Props {
  onUploadComplete: () => void;
}

export function LeadExcelUpload({ onUploadComplete }: Props) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    empresa: '', telefone: '', email: '', contato: '', cnpj: '', cidade: '', estado: '', ramo: '',
  });
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState<'idle' | 'mapping' | 'done'>('idle');
  const [listName, setListName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const autoDetectMapping = (cols: string[]): ColumnMapping => {
    const result: ColumnMapping = { empresa: '', telefone: '', email: '', contato: '', cnpj: '', cidade: '', estado: '', ramo: '' };
    const normalizedCols = cols.map(c => c.toLowerCase().trim());

    for (const [field, synonyms] of Object.entries(FIELD_SYNONYMS) as [keyof ColumnMapping, string[]][]) {
      for (const synonym of synonyms) {
        const idx = normalizedCols.findIndex(c => c === synonym || c.includes(synonym));
        if (idx !== -1 && !result[field]) {
          result[field] = cols[idx];
          break;
        }
      }
    }
    return result;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });

        if (json.length === 0) {
          toast.error('Planilha vazia ou sem dados');
          return;
        }

        const cols = Object.keys(json[0]);
        setHeaders(cols);
        setRows(json);
        setMapping(autoDetectMapping(cols));
        setStep('mapping');
        toast.success(`${json.length} linhas encontradas na planilha`);
      } catch {
        toast.error('Erro ao ler o arquivo. Verifique se é um Excel válido.');
      }
    };
    reader.readAsBinaryString(file);
    // Reset input so the same file can be re-selected
    e.target.value = '';
  };

  const handleUpload = async () => {
    if (!listName.trim()) {
      toast.error('Informe o nome da lista');
      return;
    }
    if (!mapping.empresa && !mapping.telefone) {
      toast.error('Mapeie pelo menos o campo Empresa ou Telefone');
      return;
    }

    setUploading(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const leadsToInsert = rows.map(row => ({
        cliente_nome: row[mapping.empresa] || row[mapping.contato] || 'Sem nome',
        empresa: row[mapping.empresa] || null,
        contact_name: row[mapping.contato] || null,
        cliente_telefone: row[mapping.telefone] || null,
        cliente_email: row[mapping.email] || null,
        cliente_cnpj: row[mapping.cnpj] || null,
        cidade: row[mapping.cidade] || null,
        estado: row[mapping.estado] || null,
        ramo_atuacao: row[mapping.ramo] || null,
        fonte_dados: 'Upload Manual',
        source: 'upload',
        status: 'pending',
      })).filter(l => l.cliente_nome !== 'Sem nome' || l.cliente_telefone);

      if (leadsToInsert.length === 0) {
        toast.error('Nenhum lead válido encontrado na planilha');
        setUploading(false);
        return;
      }

      // Insert in batches of 100
      let inserted = 0;
      for (let i = 0; i < leadsToInsert.length; i += 100) {
        const batch = leadsToInsert.slice(i, i + 100);
        const { error } = await (supabase as any)
          .from('lead_prospecting_results')
          .insert(batch);
        if (error) throw error;
        inserted += batch.length;
      }

      toast.success(`${inserted} leads importados com sucesso!`, {
        description: 'Os leads estão disponíveis para atendimento',
      });
      setStep('done');
      onUploadComplete();
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error('Erro ao importar leads', { description: err.message });
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setStep('idle');
    setHeaders([]);
    setRows([]);
    setMapping({ empresa: '', telefone: '', email: '', contato: '', cnpj: '', cidade: '', estado: '', ramo: '' });
  };

  if (step === 'done') {
    return (
      <Card>
        <CardContent className="py-6 text-center space-y-3">
          <CheckCircle2 className="h-8 w-8 mx-auto text-primary" />
          <p className="text-sm font-medium">Importação concluída!</p>
          <p className="text-xs text-muted-foreground">
            Os leads foram adicionados à lista de pendentes para atendimento.
          </p>
          <Button variant="outline" size="sm" onClick={reset}>
            Importar mais leads
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step === 'mapping') {
    return (
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              Mapear Colunas
              <Badge variant="secondary" className="text-[10px] h-5">{rows.length} linhas</Badge>
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={reset}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="flex items-start gap-2 p-2 rounded-md bg-muted/50 text-xs text-muted-foreground">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>Associe as colunas da sua planilha aos campos do sistema. Os campos foram pré-preenchidos automaticamente.</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(Object.keys(FIELD_LABELS) as (keyof ColumnMapping)[]).map(field => (
              <div key={field} className="space-y-1">
                <Label className="text-xs">
                  {FIELD_LABELS[field]}
                  {(field === 'empresa' || field === 'telefone') && (
                    <span className="text-destructive ml-0.5">*</span>
                  )}
                </Label>
                <Select
                  value={mapping[field] || '__none__'}
                  onValueChange={(v) => setMapping(prev => ({ ...prev, [field]: v === '__none__' ? '' : v }))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Não mapear" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" className="text-xs">— Não mapear —</SelectItem>
                    {headers.map(h => (
                      <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          {/* Preview */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Prévia (primeiros 3 registros)</Label>
            <div className="border rounded-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="bg-muted/50">
                      {Object.entries(FIELD_LABELS).filter(([k]) => mapping[k as keyof ColumnMapping]).map(([k, label]) => (
                        <th key={k} className="px-2 py-1 text-left font-medium">{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 3).map((row, i) => (
                      <tr key={i} className="border-t">
                        {Object.keys(FIELD_LABELS).filter(k => mapping[k as keyof ColumnMapping]).map(k => (
                          <td key={k} className="px-2 py-1 truncate max-w-[150px]">
                            {row[mapping[k as keyof ColumnMapping]] || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={reset}>
              Cancelar
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={handleUpload}
              disabled={uploading || (!mapping.empresa && !mapping.telefone)}
            >
              {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
              Importar {rows.length} leads
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Idle state - upload button
  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xls,.xlsx,.csv"
        className="hidden"
        onChange={handleFileSelect}
      />
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs gap-1.5"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="h-3.5 w-3.5" />
        Importar Excel
      </Button>
    </div>
  );
}
