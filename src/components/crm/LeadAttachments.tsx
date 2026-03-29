
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Paperclip, Upload, Trash2, FileText, Image, File, Download, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface Attachment {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by_name: string | null;
  created_at: string;
  document_type?: string;
  competitor_name?: string;
  competitor_materials?: string;
  competitor_value?: number;
  competitor_date?: string;
}

const DOCUMENT_TYPES = [
  { value: 'cadastro_credito', label: 'Cadastro e Análise de Crédito' },
  { value: 'proposta_global', label: 'Proposta Global' },
  { value: 'proposta_concorrencia', label: 'Proposta Concorrência' },
  { value: 'geral', label: 'Outro' },
];

interface LeadAttachmentsProps {
  leadId: string;
}

export function LeadAttachments({ leadId }: LeadAttachmentsProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [docType, setDocType] = useState('geral');
  const [competitorName, setCompetitorName] = useState('');
  const [competitorMaterials, setCompetitorMaterials] = useState('');
  const [competitorValue, setCompetitorValue] = useState('');
  const [competitorDate, setCompetitorDate] = useState('');

  useEffect(() => {
    loadAttachments();
  }, [leadId]);

  const loadAttachments = async () => {
    const { data } = await (supabase as any)
      .from('lead_attachments')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });
    setAttachments(data || []);
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setPendingFiles(Array.from(files));
    setDocType('geral');
    setCompetitorName('');
    setCompetitorMaterials('');
    setCompetitorValue('');
    setCompetitorDate('');
    setTypeDialogOpen(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUploadConfirm = async () => {
    if (pendingFiles.length === 0) return;
    if (docType === 'proposta_concorrencia' && !competitorName.trim()) {
      toast.error('Informe o nome do concorrente');
      return;
    }

    setTypeDialogOpen(false);
    setUploading(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', user?.id || '')
        .single();

      for (const file of pendingFiles) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} excede 10MB`);
          continue;
        }

        const path = `${leadId}/${Date.now()}_${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from('lead-attachments')
          .upload(path, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error(`Erro ao enviar ${file.name}`, { description: uploadError.message });
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('lead-attachments')
          .getPublicUrl(path);

        const insertData: any = {
          lead_id: leadId,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: user?.id,
          uploaded_by_name: profile?.full_name || 'Usuário',
          document_type: docType,
        };

        if (docType === 'proposta_concorrencia') {
          insertData.competitor_name = competitorName;
          insertData.competitor_materials = competitorMaterials;
          insertData.competitor_value = competitorValue ? parseFloat(competitorValue) : null;
          insertData.competitor_date = competitorDate || null;
        }

        const { error: insertError } = await (supabase as any).from('lead_attachments').insert(insertData);

        if (insertError) {
          console.error('Insert error:', insertError);
          toast.error(`Erro ao salvar registro de ${file.name}`, { description: insertError.message });
          continue;
        }
      }

      toast.success('Arquivo(s) anexado(s)');
      loadAttachments();
    } catch {
      toast.error('Erro ao anexar arquivo');
    } finally {
      setUploading(false);
      setPendingFiles([]);
    }
  };

  const handleDelete = async (att: Attachment) => {
    try {
      const urlParts = att.file_url.split('/lead-attachments/');
      const storagePath = urlParts[1] ? decodeURIComponent(urlParts[1]) : null;

      if (storagePath) {
        await supabase.storage.from('lead-attachments').remove([storagePath]);
      }
      await (supabase as any).from('lead_attachments').delete().eq('id', att.id);
      toast.success('Anexo removido');
      loadAttachments();
    } catch {
      toast.error('Erro ao remover anexo');
    }
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getIcon = (type: string | null) => {
    if (!type) return <File className="h-4 w-4" />;
    if (type.startsWith('image/')) return <Image className="h-4 w-4 text-blue-500" />;
    if (type.includes('pdf')) return <FileText className="h-4 w-4 text-red-500" />;
    return <File className="h-4 w-4 text-muted-foreground" />;
  };

  const isImage = (type: string | null) => type?.startsWith('image/');

  const getDocTypeBadge = (docType?: string) => {
    if (!docType || docType === 'geral') return null;
    const dt = DOCUMENT_TYPES.find(d => d.value === docType);
    if (!dt) return null;
    const colors: Record<string, string> = {
      cadastro_credito: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
      proposta_global: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
      proposta_concorrencia: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
    };
    return <Badge variant="outline" className={`text-[8px] px-1 py-0 ${colors[docType] || ''}`}>{dt.label}</Badge>;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Paperclip className="h-3.5 w-3.5" />
          Anexos ({attachments.length})
        </p>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="h-3 w-3" />
          {uploading ? 'Enviando...' : 'Anexar'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
          className="hidden"
          onChange={handleFileSelected}
        />
      </div>

      {attachments.length > 0 && (
        <div className="space-y-1.5">
          {attachments.map(att => (
            <div key={att.id} className="flex items-center gap-2 p-2 rounded-md border bg-muted/30 group">
              {isImage(att.file_type) ? (
                <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                  <img
                    src={att.file_url}
                    alt={att.file_name}
                    className="h-10 w-10 rounded object-cover border"
                  />
                </a>
              ) : (
                <div className="h-10 w-10 rounded border bg-background flex items-center justify-center shrink-0">
                  {getIcon(att.file_type)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <a
                  href={att.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-foreground hover:underline truncate block"
                >
                  {att.file_name}
                </a>
                <div className="flex items-center gap-1 flex-wrap">
                  <p className="text-[10px] text-muted-foreground">
                    {formatSize(att.file_size)} • {att.uploaded_by_name} • {new Date(att.created_at).toLocaleDateString('pt-BR')}
                  </p>
                  {getDocTypeBadge(att.document_type)}
                </div>
                {att.document_type === 'proposta_concorrencia' && att.competitor_name && (
                  <p className="text-[9px] text-amber-600 dark:text-amber-400 mt-0.5">
                    🏢 {att.competitor_name}
                    {att.competitor_value ? ` • R$ ${att.competitor_value.toLocaleString('pt-BR')}` : ''}
                    {att.competitor_date ? ` • ${new Date(att.competitor_date + 'T12:00:00').toLocaleDateString('pt-BR')}` : ''}
                  </p>
                )}
              </div>
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="icon" variant="ghost" className="h-6 w-6" asChild>
                  <a href={att.file_url} target="_blank" rel="noopener noreferrer">
                    <Download className="h-3 w-3" />
                  </a>
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleDelete(att)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Document type selection dialog */}
      <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Tipo de documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Categoria do documento</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map(dt => (
                    <SelectItem key={dt.value} value={dt.value} className="text-xs">{dt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {docType === 'proposta_concorrencia' && (
              <div className="space-y-2 border rounded-md p-3 bg-muted/30">
                <div>
                  <Label className="text-xs">Concorrente *</Label>
                  <Input value={competitorName} onChange={e => setCompetitorName(e.target.value)} placeholder="Nome do concorrente" className="h-8 text-xs mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Materiais da proposta</Label>
                  <Input value={competitorMaterials} onChange={e => setCompetitorMaterials(e.target.value)} placeholder="Ex: Perfil U, Chapa..." className="h-8 text-xs mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Valor total</Label>
                    <Input type="number" value={competitorValue} onChange={e => setCompetitorValue(e.target.value)} placeholder="R$" className="h-8 text-xs mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Data da proposta</Label>
                    <Input type="date" value={competitorDate} onChange={e => setCompetitorDate(e.target.value)} className="h-8 text-xs mt-1" />
                  </div>
                </div>
              </div>
            )}

            <p className="text-[10px] text-muted-foreground">
              {pendingFiles.length} arquivo(s) selecionado(s): {pendingFiles.map(f => f.name).join(', ')}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setTypeDialogOpen(false); setPendingFiles([]); }}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleUploadConfirm}>
              <Upload className="h-3 w-3 mr-1" />
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
