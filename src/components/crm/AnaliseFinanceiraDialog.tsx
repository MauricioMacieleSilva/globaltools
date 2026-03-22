import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Upload, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AnaliseFinanceiraDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadName: string;
  onConfirm: () => void;
}

interface UploadedFile {
  name: string;
  url: string;
  size: number;
  type: string;
}

export function AnaliseFinanceiraDialog({ open, onOpenChange, leadId, leadName, onConfirm }: AnaliseFinanceiraDialogProps) {
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      const userName = userData.user?.user_metadata?.full_name || 'Usuário';

      for (const file of Array.from(selectedFiles)) {
        const filePath = `${leadId}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('lead-attachments')
          .upload(filePath, file);

        if (uploadError) {
          toast.error(`Erro ao enviar ${file.name}`);
          console.error(uploadError);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('lead-attachments')
          .getPublicUrl(filePath);

        // Save attachment record
        await (supabase as any).from('lead_attachments').insert({
          lead_id: leadId,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: userId,
          uploaded_by_name: userName,
        });

        setFiles(prev => [...prev, {
          name: file.name,
          url: urlData.publicUrl,
          size: file.size,
          type: file.type,
        }]);
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar arquivos');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = async () => {

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id || '';

      // Log activity with description
      const parts: string[] = ['Enviado para Análise Financeira'];
      if (files.length > 0) parts.push(`(${files.length} documento${files.length > 1 ? 's' : ''} anexado${files.length > 1 ? 's' : ''})`);
      if (description.trim()) parts.push(`- ${description.trim()}`);
      const desc = parts.join(' ');

      await supabase.from('lead_activities').insert({
        lead_id: leadId,
        activity_type: 'nota',
        description: desc,
        user_id: userId,
      } as any);

      onConfirm();
      handleClose();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao registrar análise financeira');
    }
  };

  const handleClose = () => {
    setDescription('');
    setFiles([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-amber-600" />
            Análise Financeira
          </DialogTitle>
          <DialogDescription className="text-xs">
            Anexe documentos (opcional) e adicione uma descrição para análise de <strong>{leadName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* File upload area */}
          <div
            className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
            <p className="text-xs text-muted-foreground">Clique para anexar documentos</p>
            <p className="text-[10px] text-muted-foreground/60">PDF, imagens, planilhas...</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
            />
          </div>

          {uploading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Enviando...
            </div>
          )}

          {/* Uploaded files list */}
          {files.length > 0 && (
            <div className="space-y-1">
              {files.map((file, i) => (
                <div key={i} className="flex items-center gap-2 text-xs bg-accent/50 rounded px-2 py-1.5">
                  <FileText className="h-3 w-3 shrink-0 text-primary" />
                  <span className="truncate flex-1">{file.name}</span>
                  <button onClick={() => removeFile(i)} className="shrink-0 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Optional description */}
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição sobre o cliente ou negociação (opcional)..."
            className="text-sm min-h-[80px] resize-none"
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={handleClose}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={uploading}>
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Enviar para Análise
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
