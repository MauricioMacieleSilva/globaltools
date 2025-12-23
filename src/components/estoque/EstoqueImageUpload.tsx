import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { uploadEstoqueImage, deleteEstoqueImage } from '@/services/estoqueService';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface EstoqueImageUploadProps {
  currentImageUrl: string | null;
  onImageChange: (url: string | null) => void;
  disabled?: boolean;
}

export function EstoqueImageUpload({ 
  currentImageUrl, 
  onImageChange, 
  disabled = false 
}: EstoqueImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione apenas arquivos de imagem');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    setIsUploading(true);

    try {
      // Delete old image if exists
      if (currentImageUrl) {
        await deleteEstoqueImage(currentImageUrl);
      }

      // Upload new image
      const { url, error } = await uploadEstoqueImage(file);
      
      if (error) throw error;
      
      onImageChange(url);
      toast.success('Imagem enviada com sucesso!');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Erro ao enviar imagem');
    } finally {
      setIsUploading(false);
      // Reset input
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = async () => {
    if (!currentImageUrl) return;

    setIsUploading(true);

    try {
      await deleteEstoqueImage(currentImageUrl);
      onImageChange(null);
      toast.success('Imagem removida');
    } catch (error) {
      console.error('Error removing image:', error);
      toast.error('Erro ao remover imagem');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>Imagem do Item</Label>
      
      {currentImageUrl ? (
        <div className="relative group">
          <div className="w-full h-40 rounded-md border overflow-hidden bg-muted">
            <img 
              src={currentImageUrl} 
              alt="Preview"
              className="w-full h-full object-contain"
            />
          </div>
          {!disabled && (
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-md">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleRemoveImage}
                disabled={isUploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div
          onClick={() => !disabled && inputRef.current?.click()}
          className={`
            w-full h-40 rounded-md border-2 border-dashed 
            flex flex-col items-center justify-center gap-2
            transition-colors
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary hover:bg-muted/50'}
          `}
        >
          {isUploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <>
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Clique para adicionar imagem
              </span>
              <span className="text-xs text-muted-foreground">
                (máximo 5MB)
              </span>
            </>
          )}
        </div>
      )}

      <Input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />
    </div>
  );
}
