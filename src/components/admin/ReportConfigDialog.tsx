import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Mail, Clock } from "lucide-react";

interface ReportConfigDialogProps {
  onConfigAdded?: () => void;
  editConfig?: {
    id: string;
    email: string;
    full_name: string | null;
    frequency: string;
    send_time: string;
    custom_days: string[] | null;
  } | null;
}

export function ReportConfigDialog({ onConfigAdded, editConfig }: ReportConfigDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: editConfig?.email || '',
    fullName: editConfig?.full_name || '',
    frequency: editConfig?.frequency || 'daily',
    sendTime: editConfig?.send_time || '08:00',
    customDays: editConfig?.custom_days || [] as string[]
  });

  const weekDays = [
    { value: 'monday', label: 'Segunda' },
    { value: 'tuesday', label: 'Terça' },
    { value: 'wednesday', label: 'Quarta' },
    { value: 'thursday', label: 'Quinta' },
    { value: 'friday', label: 'Sexta' },
    { value: 'saturday', label: 'Sábado' },
    { value: 'sunday', label: 'Domingo' }
  ];

  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('📝 Dados do formulário:', formData);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Erro de autenticação",
          description: "Você precisa estar logado para adicionar configurações.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Validar dias personalizados se frequência for custom
      if (formData.frequency === 'custom' && formData.customDays.length === 0) {
        toast({
          title: "Dias não selecionados",
          description: "Selecione pelo menos um dia da semana para envio personalizado.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      console.log('✅ Validações passaram, salvando no banco...');

      const dataToSave = {
        email: formData.email,
        full_name: formData.fullName || null,
        frequency: formData.frequency,
        send_time: formData.sendTime,
        custom_days: formData.frequency === 'custom' ? formData.customDays : null,
        include_vendas: true,
        include_funil: true,
        include_perdidos: true,
        include_cancelamentos: true,
      };

      let data, error;

      if (editConfig) {
        // Atualizar configuração existente
        const result = await supabase
          .from('email_reports_config')
          .update(dataToSave)
          .eq('id', editConfig.id)
          .select();
        data = result.data;
        error = result.error;
      } else {
        // Criar nova configuração
        const result = await supabase
          .from('email_reports_config')
          .insert({
            ...dataToSave,
            created_by: user.id
          })
          .select();
        data = result.data;
        error = result.error;
      }

      console.log('📊 Resposta do Supabase:', { data, error });

      if (error) {
        console.error('❌ Erro do Supabase:', error);
        throw error;
      }

      toast({
        title: editConfig ? "Configuração atualizada" : "Configuração adicionada",
        description: editConfig 
          ? "A configuração foi atualizada com sucesso."
          : "O destinatário foi adicionado com sucesso aos relatórios automáticos.",
      });

      setFormData({
        email: '',
        fullName: '',
        frequency: 'daily',
        sendTime: '08:00',
        customDays: []
      });

      setOpen(false);
      onConfigAdded?.();

    } catch (error: any) {
      console.error('❌ Erro ao adicionar configuração:', error);
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
    <Dialog open={open || !!editConfig} onOpenChange={setOpen}>
      {!editConfig && (
        <DialogTrigger asChild>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Adicionar Destinatário
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {editConfig ? 'Editar' : 'Configurar'} Relatório Automático
          </DialogTitle>
          <DialogDescription>
            {editConfig 
              ? 'Atualize as configurações do relatório automático.'
              : 'Adicione um novo destinatário para receber relatórios comerciais automaticamente.'
            }
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

          <div className="space-y-2">
            <Label htmlFor="frequency">Frequência</Label>
            <Select value={formData.frequency} onValueChange={(value) => setFormData(prev => ({ ...prev, frequency: value, customDays: value !== 'custom' ? [] : prev.customDays }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Diário</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="monthly">Mensal</SelectItem>
                <SelectItem value="custom">Personalizada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.frequency === 'custom' && (
            <div className="space-y-3">
              <Label>Selecionar Dias</Label>
              <div className="grid grid-cols-2 gap-3">
                {weekDays.map((day) => (
                  <div key={day.value} className="flex items-center space-x-2">
                    <Checkbox 
                      id={day.value}
                      checked={formData.customDays.includes(day.value)}
                      onCheckedChange={(checked) => {
                        setFormData(prev => ({
                          ...prev,
                          customDays: checked 
                            ? [...prev.customDays, day.value]
                            : prev.customDays.filter(d => d !== day.value)
                        }));
                      }}
                    />
                    <Label htmlFor={day.value} className="text-sm font-normal cursor-pointer">
                      {day.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

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