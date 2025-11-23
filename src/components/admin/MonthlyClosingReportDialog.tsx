import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Send, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const MONTHS = [
  { value: "1", label: "Janeiro" },
  { value: "2", label: "Fevereiro" },
  { value: "3", label: "Março" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Maio" },
  { value: "6", label: "Junho" },
  { value: "7", label: "Julho" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

interface MonthlyClosingReportDialogProps {
  onReportSent?: () => void;
}

export function MonthlyClosingReportDialog({ onReportSent }: MonthlyClosingReportDialogProps) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<string>("");
  
  // Definir ano padrão baseado no mês atual
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentYear = now.getFullYear();
  
  // Se mês não selecionado ainda, usar ano do mês anterior como padrão
  const [year, setYear] = useState<string>(currentYear.toString());
  
  const [customEmails, setCustomEmails] = useState("");
  const [useRegistered, setUseRegistered] = useState(true);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const getMonthName = (monthValue: string) => {
    return MONTHS.find(m => m.value === monthValue)?.label || "";
  };

  const getLastDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const getPeriodPreview = () => {
    if (!month || !year) return "";
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);
    const lastDay = getLastDayOfMonth(yearNum, monthNum);
    return `01/${month.padStart(2, '0')}/${year} a ${lastDay}/${month.padStart(2, '0')}/${year}`;
  };

  const handleSubmit = async () => {
    if (!month || !year) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione o mês e ano",
        variant: "destructive"
      });
      return;
    }

    // Validar que não é um mês futuro
    const selectedDate = new Date(parseInt(year), parseInt(month) - 1, 1); // Primeiro dia do mês selecionado
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1); // Primeiro dia do mês atual
    
    if (selectedDate >= currentMonthStart) {
      toast({
        title: "Data inválida",
        description: "Selecione um mês anterior ao mês atual. O mês ainda não foi concluído.",
        variant: "destructive"
      });
      return;
    }

    let recipients: string[] = [];
    
    if (useRegistered) {
      // Buscar emails cadastrados ativos
      const { data: configs, error } = await supabase
        .from('email_reports_config')
        .select('email')
        .eq('is_active', true);

      if (error) {
        toast({
          title: "Erro ao buscar destinatários",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      recipients = configs?.map(c => c.email) || [];
    }

    if (customEmails.trim()) {
      const customRecipients = customEmails
        .split(',')
        .map(e => e.trim())
        .filter(e => e.includes('@'));
      recipients = [...recipients, ...customRecipients];
    }

    // Remover duplicatas
    recipients = [...new Set(recipients)];

    if (recipients.length === 0) {
      toast({
        title: "Nenhum destinatário",
        description: "Configure destinatários ou insira emails manualmente",
        variant: "destructive"
      });
      return;
    }

    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-monthly-closing', {
        body: {
          month: parseInt(month),
          year: parseInt(year),
          recipients
        }
      });

      if (error) throw error;

      toast({
        title: "Relatório enviado!",
        description: `Relatório de ${getMonthName(month)}/${year} enviado para ${recipients.length} destinatário(s)`,
      });

      setOpen(false);
      setMonth("");
      setYear(new Date().getFullYear().toString());
      setCustomEmails("");
      onReportSent?.();

    } catch (error: any) {
      console.error('Erro ao enviar relatório:', error);
      toast({
        title: "Erro ao enviar",
        description: error.message || "Erro inesperado ao gerar relatório",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Calendar className="h-4 w-4" />
          Gerar Fechamento Mensal
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Relatório de Fechamento Mensal</DialogTitle>
          <DialogDescription>
            Gere e envie o relatório completo de um mês específico
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="month">Mês</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger id="month">
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map(m => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">Ano</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger id="year">
                  <SelectValue placeholder="Selecione o ano" />
                </SelectTrigger>
                <SelectContent>
                  {years.map(y => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {month && year && (
            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm text-muted-foreground">
                <strong>Período:</strong> {getPeriodPreview()}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <Label>Destinatários</Label>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="use-registered"
                checked={useRegistered}
                onCheckedChange={(checked) => setUseRegistered(checked as boolean)}
              />
              <label
                htmlFor="use-registered"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Usar destinatários cadastrados ativos
              </label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-emails">Emails adicionais (separados por vírgula)</Label>
              <Input
                id="custom-emails"
                type="text"
                placeholder="email1@exemplo.com, email2@exemplo.com"
                value={customEmails}
                onChange={(e) => setCustomEmails(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Adicione emails extras além dos cadastrados (opcional)
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={sending || !month || !year} className="gap-2">
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Gerar e Enviar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
