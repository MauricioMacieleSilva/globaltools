import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VendorAvatarDialogProps {
  isOpen: boolean;
  onClose: () => void;
  vendorName: string;
  currentAvatarUrl?: string;
  onAvatarUpdated: () => void;
}

export function VendorAvatarDialog({ 
  isOpen, 
  onClose, 
  vendorName, 
  currentAvatarUrl,
  onAvatarUpdated 
}: VendorAvatarDialogProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida');
      return;
    }

    // Validar tamanho (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB');
      return;
    }

    setUploading(true);

    try {
      // Criar nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const sanitizedName = vendorName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const fileName = `vendor_${sanitizedName}_${Date.now()}.${fileExt}`;

      // Upload para o bucket avatars
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Upsert na tabela vendor_avatars
      const { error: dbError } = await supabase
        .from('vendor_avatars')
        .upsert({
          vendor_name: vendorName,
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'vendor_name'
        });

      if (dbError) throw dbError;

      setPreviewUrl(publicUrl);
      toast.success('Foto atualizada com sucesso!');
      onAvatarUpdated();
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao enviar imagem: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setUploading(true);
    try {
      const { error } = await supabase
        .from('vendor_avatars')
        .delete()
        .eq('vendor_name', vendorName);

      if (error) throw error;

      setPreviewUrl(null);
      toast.success('Foto removida com sucesso!');
      onAvatarUpdated();
    } catch (error: any) {
      console.error('Erro ao remover foto:', error);
      toast.error('Erro ao remover foto: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[350px]">
        <DialogHeader>
          <DialogTitle className="text-base">Foto do Vendedor</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="relative">
            <Avatar className="h-24 w-24">
              <AvatarImage src={previewUrl || undefined} alt={vendorName} />
              <AvatarFallback className="text-xl bg-primary/10 text-primary">
                {getInitials(vendorName)}
              </AvatarFallback>
            </Avatar>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
            </button>
          </div>

          <p className="font-medium text-center">{vendorName}</p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Camera className="h-4 w-4 mr-2" />
              {previewUrl ? 'Alterar Foto' : 'Adicionar Foto'}
            </Button>
            
            {previewUrl && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRemoveAvatar}
                disabled={uploading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remover
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
