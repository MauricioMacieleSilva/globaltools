import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  extractedText?: string;
  error?: string;
}

export const FileUpload: React.FC = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileSelect = (selectedFiles: FileList) => {
    const newFiles: UploadedFile[] = Array.from(selectedFiles).map(file => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'uploading',
      progress: 0
    }));

    setFiles(prev => [...prev, ...newFiles]);
    
    // Processar arquivos reais
    newFiles.forEach((fileData, index) => {
      const file = selectedFiles[index];
      simulateFileProcessing(fileData, file);
    });
  };

  const processFileContent = async (file: File, fileData: UploadedFile) => {
    try {
      let extractedText = '';
      
      if (file.type === 'text/plain') {
        extractedText = await file.text();
      } else if (file.type === 'application/pdf') {
        // Para PDFs, vamos usar uma abordagem simplificada por enquanto
        extractedText = 'Conteúdo extraído do PDF: ' + file.name + '\n\nTexto do documento seria processado aqui...';
      } else if (file.type.includes('word') || file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
        extractedText = 'Conteúdo extraído do Word: ' + file.name + '\n\nTexto do documento seria processado aqui...';
      } else {
        throw new Error('Formato de arquivo não suportado');
      }

      return extractedText;
    } catch (error) {
      throw new Error('Erro ao processar arquivo: ' + error.message);
    }
  };

  const simulateFileProcessing = async (fileData: UploadedFile, file: File) => {
    try {
      // Simular upload
      for (let progress = 0; progress <= 100; progress += 20) {
        await new Promise(resolve => setTimeout(resolve, 200));
        updateFileProgress(fileData.id, progress, 'uploading');
      }

      // Processamento real
      updateFileStatus(fileData.id, 'processing');
      
      const extractedText = await processFileContent(file, fileData);
      
      updateFileStatus(fileData.id, 'completed', {
        extractedText: extractedText.substring(0, 500) + (extractedText.length > 500 ? '...' : '')
      });
      
      toast({
        title: "Sucesso",
        description: `Arquivo ${fileData.name} processado com sucesso`
      });
    } catch (error) {
      updateFileStatus(fileData.id, 'error', {
        error: error.message || 'Falha ao processar o arquivo'
      });
      toast({
        title: "Erro",
        description: `Erro ao processar ${fileData.name}: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const updateFileProgress = (id: string, progress: number, status?: UploadedFile['status']) => {
    setFiles(prev => prev.map(file => 
      file.id === id 
        ? { ...file, progress, ...(status && { status }) }
        : file
    ));
  };

  const updateFileStatus = (id: string, status: UploadedFile['status'], data?: Partial<UploadedFile>) => {
    setFiles(prev => prev.map(file => 
      file.id === id 
        ? { ...file, status, ...data }
        : file
    ));
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(file => file.id !== id));
  };

  const createArticleFromFile = async (fileData: UploadedFile) => {
    if (!fileData.extractedText) return;

    try {
      // Navigate to article creation with pre-filled content
      const articleData = {
        title: `Artigo baseado em: ${fileData.name}`,
        content: fileData.extractedText,
        summary: fileData.extractedText.substring(0, 200) + '...',
        keywords: [fileData.name.replace(/\.[^/.]+$/, ""), "documento", "upload"],
        search_terms: [fileData.name],
        is_published: false
      };

      // Store in localStorage temporarily for the ArticleManager to pick up
      localStorage.setItem('pending_article', JSON.stringify(articleData));
      
      toast({
        title: "Artigo preparado",
        description: "Vá para a gestão de artigos para revisar e publicar"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao preparar artigo: " + error.message,
        variant: "destructive"
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusText = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
        return 'Enviando...';
      case 'processing':
        return 'Processando...';
      case 'completed':
        return 'Concluído';
      case 'error':
        return 'Erro';
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card 
        className={`border-2 border-dashed transition-colors ${
          isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Upload className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Upload de Documentos</h3>
          <p className="text-muted-foreground text-center mb-4">
            Arraste e solte arquivos aqui ou clique para selecionar
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Suportamos: PDF, DOC, DOCX, TXT (máx. 10MB)
          </p>
          
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt"
            onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
            className="hidden"
            id="file-upload"
          />
          <label 
            htmlFor="file-upload"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 cursor-pointer"
          >
            Selecionar Arquivos
          </label>
        </CardContent>
      </Card>

      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Os documentos serão processados automaticamente para extrair texto e criar artigos da base de conhecimento.
          O processamento pode levar alguns minutos dependendo do tamanho do arquivo.
        </AlertDescription>
      </Alert>

      {/* Files List */}
      {files.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Arquivos em Processamento</h3>
          
          {files.map((file) => (
            <Card key={file.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{file.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(file.size)} • {file.type}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(file.status)}
                          <Badge variant={file.status === 'error' ? 'destructive' : 'secondary'}>
                            {getStatusText(file.status)}
                          </Badge>
                        </div>
                      </div>

                      {(file.status === 'uploading' || file.status === 'processing') && (
                        <Progress value={file.status === 'uploading' ? file.progress : 50} className="h-2" />
                      )}

                      {file.status === 'error' && file.error && (
                        <Alert variant="destructive">
                          <AlertDescription>{file.error}</AlertDescription>
                        </Alert>
                      )}

                      {file.status === 'completed' && file.extractedText && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Texto extraído:</p>
                          <div className="p-3 bg-muted rounded-md">
                            <p className="text-sm">
                              {file.extractedText.substring(0, 200)}...
                            </p>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => createArticleFromFile(file)}
                          >
                            Criar Artigo
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeFile(file.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};