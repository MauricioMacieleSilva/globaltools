import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Mail, Clock, Settings } from "lucide-react";

interface ReportConfigDialogProps {
  onConfigAdded?: () => void;
}

export function ReportConfigDialog({ onConfigAdded }: ReportConfigDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    frequency: 'daily',
    sendTime: '08:00',
    includeVendas: true,
    includeFunil: true,
    includePerdidos: true,
    includeCancelamentos: true
  });

  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Erro de autenticação",
          description: "Você precisa estar logado para adicionar configurações.",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('email_reports_config' as any)
        .insert({
          email: formData.email,
          full_name: formData.fullName || null,
          frequency: formData.frequency,
          send_time: formData.sendTime,
          include_vendas: formData.includeVendas,
          include_funil: formData.includeFunil,
          include_perdidos: formData.includePerdidos,
          include_cancelamentos: formData.includeCancelamentos,
          created_by: user.id
        });

      if (error) throw error;

      toast({
        title: "Configuração adicionada",
        description: "O destinatário foi adicionado com sucesso aos relatórios automáticos.",
      });

      setFormData({
        email: '',
        fullName: '',
        frequency: 'daily',
        sendTime: '08:00',
        includeVendas: true,
        includeFunil: true,
        includePerdidos: true,
        includeCancelamentos: true
      });

      setOpen(false);
      onConfigAdded?.();

    } catch (error: any) {
      console.error('Erro ao adicionar configuração:', error);
      toast({
        title: "Erro ao adicionar",
        description: error.message || "Erro inesperado ao adicionar configuração.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Adicionar Destinatário
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Configurar Relatório Automático
          </DialogTitle>
          <DialogDescription>
            Adicione um novo destinatário para receber relatórios comerciais automaticamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@empresa.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome</Label>
              <Input
                id="fullName"
                placeholder="Nome completo"
                value={formData.fullName}
                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="frequency">Frequência</Label>
              <Select value={formData.frequency} onValueChange={(value) => setFormData(prev => ({ ...prev, frequency: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diário</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sendTime" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Horário de Envio
              </Label>
              <Input
                id="sendTime"
                type="time"
                value={formData.sendTime}
                onChange={(e) => setFormData(prev => ({ ...prev, sendTime: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label className="flex items-center gap-1">
              <Settings className="h-3 w-3" />
              Seções do Relatório
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="includeVendas"
                  checked={formData.includeVendas}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includeVendas: !!checked }))}
                />
                <Label htmlFor="includeVendas" className="text-sm">Vendas</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="includeFunil"
                  checked={formData.includeFunil}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includeFunil: !!checked }))}
                />
                <Label htmlFor="includeFunil" className="text-sm">Funil</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="includePerdidos"
                  checked={formData.includePerdidos}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includePerdidos: !!checked }))}
                />
                <Label htmlFor="includePerdidos" className="text-sm">Perdidos</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="includeCancelamentos"
                  checked={formData.includeCancelamentos}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includeCancelamentos: !!checked }))}
                />
                <Label htmlFor="includeCancelamentos" className="text-sm">Cancelamentos</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar Configuração"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}