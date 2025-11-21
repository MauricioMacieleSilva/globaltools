import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Eye, Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface ReportPreviewDialogProps {
  configId: string;
  disabled?: boolean;
}

export function ReportPreviewDialog({ configId, disabled }: ReportPreviewDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();

  const loadPreview = async () => {
    setLoading(true);
    try {
      console.log("📊 Carregando pré-visualização do relatório...");
      
      const { data, error } = await supabase.functions.invoke('generate-report-preview', {
        body: { configId }
      });

      if (error) throw error;

      if (data?.html) {
        setHtmlContent(data.html);
      } else {
        throw new Error("Conteúdo HTML não recebido");
      }
    } catch (error: any) {
      console.error("❌ Erro ao carregar pré-visualização:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível carregar a pré-visualização.",
        variant: "destructive"
      });
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const previewElement = document.getElementById('report-preview-content');
      if (!previewElement) {
        throw new Error("Elemento de pré-visualização não encontrado");
      }

      toast({
        title: "Gerando PDF",
        description: "Por favor, aguarde enquanto o PDF é gerado...",
      });

      // Captura o elemento como canvas
      const canvas = await html2canvas(previewElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      // Cria o PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Adiciona a primeira página
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Adiciona páginas extras se necessário
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Salva o PDF
      const fileName = `relatorio-comercial-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      toast({
        title: "PDF Gerado",
        description: "O PDF foi baixado com sucesso!",
      });
    } catch (error: any) {
      console.error("❌ Erro ao gerar PDF:", error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o PDF.",
        variant: "destructive"
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen && !htmlContent) {
      loadPreview();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          title="Pré-visualizar relatório"
        >
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Pré-visualização do Relatório</DialogTitle>
          <DialogDescription>
            Confira como o relatório será enviado por e-mail
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-end gap-2 pb-3 border-b">
          <Button
            onClick={handleDownloadPDF}
            disabled={loading || !htmlContent || downloading}
            size="sm"
            variant="outline"
          >
            {downloading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Baixar PDF
              </>
            )}
          </Button>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Carregando pré-visualização...</span>
            </div>
          ) : htmlContent ? (
            <div id="report-preview-content" className="bg-[#f5f5f5] p-6">
              <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum conteúdo disponível
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
