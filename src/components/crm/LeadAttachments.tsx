
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Paperclip, Upload, Trash2, FileText, Image, File, Download, X } from 'lucide-react';

interface Attachment {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by_name: string | null;
  created_at: string;
}

interface LeadAttachmentsProps {
  leadId: string;
}

export function LeadAttachments({ leadId }: LeadAttachmentsProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', user?.id || '')
        .single();

      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} excede 10MB`);
          continue;
        }

        const ext = file.name.split('.').pop();
        const path = `${leadId}/${Date.now()}_${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from('lead-attachments')
          .upload(path, file);

        if (uploadError) {
          toast.error(`Erro ao enviar ${file.name}`);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('lead-attachments')
          .getPublicUrl(path);

        await (supabase as any).from('lead_attachments').insert({
          lead_id: leadId,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: user?.id,
          uploaded_by_name: profile?.full_name || 'Usuário',
        });
      }

      toast.success('Arquivo(s) anexado(s)');
      loadAttachments();
    } catch {
      toast.error('Erro ao anexar arquivo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (att: Attachment) => {
    try {
      // Extract storage path from URL
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
          onChange={handleUpload}
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
                <p className="text-[10px] text-muted-foreground">
                  {formatSize(att.file_size)} • {att.uploaded_by_name} • {new Date(att.created_at).toLocaleDateString('pt-BR')}
                </p>
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
    </div>
  );
}
