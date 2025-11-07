
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PDFOptions {
  filename?: string;
  orientation?: 'portrait' | 'landscape';
  format?: 'a4' | 'a3';
  quality?: number;
}

export const generatePDFFromElement = async (
  element: HTMLElement,
  options: PDFOptions = {}
): Promise<void> => {
  const {
    filename = `documento_${new Date().toISOString().split('T')[0]}.pdf`,
    orientation = 'portrait',
    format = 'a4',
    quality = 2
  } = options;

  try {
    // Configurar html2canvas
    const canvas = await html2canvas(element, {
      scale: quality,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false
    });

    const imgData = canvas.toDataURL('image/png');
    
    // Configurar jsPDF
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format
    });

    // Dimensões da página
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    // Calcular dimensões da imagem
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = imgWidth / imgHeight;
    
    let finalWidth, finalHeight;
    
    if (orientation === 'landscape') {
      finalWidth = pageWidth - 20; // margem de 10mm de cada lado
      finalHeight = finalWidth / ratio;
      
      if (finalHeight > pageHeight - 20) {
        finalHeight = pageHeight - 20;
        finalWidth = finalHeight * ratio;
      }
    } else {
      finalWidth = pageWidth - 20;
      finalHeight = finalWidth / ratio;
      
      if (finalHeight > pageHeight - 20) {
        finalHeight = pageHeight - 20;
        finalWidth = finalHeight * ratio;
      }
    }
    
    // Centralizar na página
    const x = (pageWidth - finalWidth) / 2;
    const y = (pageHeight - finalHeight) / 2;
    
    // Adicionar cabeçalho
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Sistema de Corte de Blanks', pageWidth / 2, 15, { align: 'center' });
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, 22, { align: 'center' });
    
    // Adicionar imagem
    pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
    
    // Adicionar rodapé
    pdf.setFontSize(8);
    pdf.text('Página 1 de 1', pageWidth / 2, pageHeight - 10, { align: 'center' });
    
    // Salvar PDF
    pdf.save(filename);
    
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    throw new Error('Falha ao gerar o PDF. Tente novamente.');
  }
};

export const generateMultiPagePDF = async (
  elements: HTMLElement[],
  options: PDFOptions = {}
): Promise<void> => {
  const {
    filename = `relatorio_${new Date().toISOString().split('T')[0]}.pdf`,
    orientation = 'portrait',
    format = 'a4',
    quality = 2
  } = options;

  try {
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      
      if (i > 0) {
        pdf.addPage();
      }
      
      const canvas = await html2canvas(element, {
        scale: quality,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      
      // Calcular dimensões
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = imgWidth / imgHeight;
      
      let finalWidth = pageWidth - 20;
      let finalHeight = finalWidth / ratio;
      
      if (finalHeight > pageHeight - 40) {
        finalHeight = pageHeight - 40;
        finalWidth = finalHeight * ratio;
      }
      
      const x = (pageWidth - finalWidth) / 2;
      const y = 30;
      
      // Cabeçalho
      if (i === 0) {
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Relatório de Aproveitamento', pageWidth / 2, 15, { align: 'center' });
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, 22, { align: 'center' });
      }
      
      // Adicionar imagem
      pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
      
      // Rodapé
      pdf.setFontSize(8);
      pdf.text(`Página ${i + 1} de ${elements.length}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }
    
    pdf.save(filename);
    
  } catch (error) {
    console.error('Erro ao gerar PDF multipáginas:', error);
    throw new Error('Falha ao gerar o PDF. Tente novamente.');
  }
};
