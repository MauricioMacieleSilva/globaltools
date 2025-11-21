import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface ReportDownloadButtonProps {
  configId: string;
  disabled?: boolean;
}

export function ReportDownloadButton({ configId, disabled }: ReportDownloadButtonProps) {
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      console.log("📊 Gerando relatório para download...");
      
      // Busca o HTML do relatório
      const { data, error } = await supabase.functions.invoke('generate-report-preview', {
        body: { configId }
      });

      if (error) throw error;

      if (!data?.html) {
        throw new Error("Conteúdo HTML não recebido");
      }

      toast({
        title: "Gerando PDF",
        description: "Por favor, aguarde enquanto o PDF é gerado...",
      });

      // Cria um elemento temporário para renderizar o HTML
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.width = '800px';
      tempDiv.innerHTML = data.html;
      document.body.appendChild(tempDiv);

      // Aguarda um momento para o conteúdo renderizar
      await new Promise(resolve => setTimeout(resolve, 500));

      // Captura o elemento como canvas
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 800
      });

      // Remove o elemento temporário
      document.body.removeChild(tempDiv);

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
        description: error.message || "Não foi possível gerar o PDF.",
        variant: "destructive"
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDownloadPDF}
      disabled={disabled || downloading}
      className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
      title="Baixar relatório em PDF"
    >
      {downloading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
    </Button>
  );
}
