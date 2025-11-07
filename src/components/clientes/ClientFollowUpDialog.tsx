import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, Plus, Check, X, User, MessageSquare } from 'lucide-react';
import { useFollowUps, FollowUpType } from '@/hooks/useFollowUps';

interface ClientFollowUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
}

const followUpTypeLabels: Record<FollowUpType, string> = {
  reativar_cliente: "Reativar cliente",
  ligar_followup: "Ligar para follow-up",
  enviar_material: "Enviar material",
  reforcar_proposta: "Reforçar proposta",
  ajustar_proposta: "Ajustar proposta",
  agendar_reuniao: "Agendar reunião",
  agendar_visita: "Agendar visita",
  cobrar_retorno: "Cobrar retorno",
  enviar_novo_orcamento: "Enviar novo orçamento",
  checar_status_decisao: "Checar status da decisão",
  agendar_nova_tentativa: "Agendar nova tentativa",
  solicitar_documentos: "Solicitar documentos",
  reabrir_negociacao_futura: "Reabrir negociação futura",
  outro: "Outro",
};

const followUpTypeColors: Record<FollowUpType, string> = {
  reativar_cliente: "bg-red-100 text-red-800",
  ligar_followup: "bg-blue-100 text-blue-800",
  enviar_material: "bg-purple-100 text-purple-800",
  reforcar_proposta: "bg-green-100 text-green-800",
  ajustar_proposta: "bg-orange-100 text-orange-800",
  agendar_reuniao: "bg-indigo-100 text-indigo-800",
  agendar_visita: "bg-pink-100 text-pink-800",
  cobrar_retorno: "bg-yellow-100 text-yellow-800",
  enviar_novo_orcamento: "bg-teal-100 text-teal-800",
  checar_status_decisao: "bg-cyan-100 text-cyan-800",
  agendar_nova_tentativa: "bg-amber-100 text-amber-800",
  solicitar_documentos: "bg-lime-100 text-lime-800",
  reabrir_negociacao_futura: "bg-gray-100 text-gray-800",
  outro: "bg-slate-100 text-slate-800",
};

export function ClientFollowUpDialog({ open, onOpenChange, clientName }: ClientFollowUpDialogProps) {
  const { loadFollowUpsByClient, createFollowUp, markAsCompleted, deleteFollowUp } = useFollowUps();
  const [clientFollowUps, setClientFollowUps] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    type: "reforcar_proposta" as FollowUpType,
    subject: "",
    date: "",
    time: "",
    customTypeText: "",
  });

  useEffect(() => {
    if (open && clientName) {
      loadClientFollowUps();
    }
  }, [open, clientName]);

  const loadClientFollowUps = async () => {
    setLoading(true);
    try {
      const data = await loadFollowUpsByClient(clientName);
      setClientFollowUps(data);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject.trim() || !formData.date || !formData.time) {
      return;
    }

    if (formData.type === "outro" && !formData.customTypeText.trim()) {
      return;
    }

    setIsSubmitting(true);
    
    const scheduledDate = new Date(`${formData.date}T${formData.time}`);

    const followUpData = {
      type: formData.type,
      subject: formData.subject,
      scheduled_date: scheduledDate.toISOString(),
      client_name: clientName,
      client_code: "",
      budget_number: "",
      is_completed: false,
      show_today: true,
      custom_type_text: formData.type === "outro" ? formData.customTypeText : undefined,
    };

    const success = await createFollowUp(followUpData);

    setIsSubmitting(false);

    if (success) {
      setFormData({
        type: "reforcar_proposta" as FollowUpType,
        subject: "",
        date: "",
        time: "",
        customTypeText: "",
      });
      loadClientFollowUps();
    }
  };

  const handleMarkCompleted = async (id: string) => {
    const success = await markAsCompleted(id);
    if (success) {
      loadClientFollowUps();
    }
  };

  const handleDelete = async (id: string) => {
    const success = await deleteFollowUp(id);
    if (success) {
      loadClientFollowUps();
      setShowDeleteDialog(null);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('pt-BR'),
      time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Follow-ups - {clientName}
          </DialogTitle>
          <DialogDescription>
            Gerencie todos os follow-ups deste cliente
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden">
          {/* Formulário para novo follow-up */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Novo Follow-up
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="type">Tipo</Label>
                <div className="space-y-2">
                  <Select
                    value={formData.type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, type: value as FollowUpType, customTypeText: "" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(followUpTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.type === "outro" && (
                    <div className="space-y-2">
                      <Label htmlFor="customType">Especificar tipo personalizado</Label>
                      <Input
                        id="customType"
                        value={formData.customTypeText}
                        onChange={(e) =>
                          setFormData({ ...formData, customTypeText: e.target.value })
                        }
                        placeholder="Digite o tipo de follow-up..."
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="subject">Assunto</Label>
                <Textarea
                  id="subject"
                  placeholder="Descreva o assunto do follow-up..."
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="min-h-20"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="date">Data</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="time">Hora</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={
                  isSubmitting || 
                  !formData.subject.trim() || 
                  !formData.date || 
                  !formData.time ||
                  (formData.type === "outro" && !formData.customTypeText.trim())
                }
                className="w-full"
              >
                {isSubmitting ? "Salvando..." : "Criar Follow-up"}
              </Button>
            </form>
          </div>

          {/* Histórico de Follow-ups */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">
                Histórico ({clientFollowUps.length})
              </h3>
              {loading && (
                <div className="text-xs text-muted-foreground">Carregando...</div>
              )}
            </div>
            
            <ScrollArea className="h-96">
              <div className="space-y-3 pr-4">
                {clientFollowUps.length > 0 ? (
                  clientFollowUps.map((followUp) => {
                    const { date, time } = formatDateTime(followUp.scheduled_date);
                    return (
                      <div key={followUp.id}>
                        <div
                          className={`border rounded-lg p-3 space-y-2 ${
                            followUp.is_completed ? 'bg-muted/50 opacity-75' : 'bg-background'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                followUpTypeColors[followUp.type as keyof typeof followUpTypeColors]
                              }`}>
                                {followUp.type === "outro" && followUp.custom_type_text 
                                  ? followUp.custom_type_text
                                  : followUpTypeLabels[followUp.type as keyof typeof followUpTypeLabels]
                                }
                              </span>
                              {followUp.is_completed && (
                                <Badge variant="secondary" className="bg-green-100 text-green-800">
                                  Concluído
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {!followUp.is_completed && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleMarkCompleted(followUp.id)}
                                  className="h-6 w-6 p-0"
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                              )}
                              {showDeleteDialog === followUp.id ? (
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDelete(followUp.id)}
                                    className="h-6 w-6 p-0 text-destructive"
                                  >
                                    <Check className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setShowDeleteDialog(null)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setShowDeleteDialog(followUp.id)}
                                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>

                          {followUp.budget_number && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <User className="h-3 w-3" />
                              Pedido {followUp.budget_number}
                            </div>
                          )}

                          <p className="text-sm text-muted-foreground">
                            {followUp.subject}
                          </p>

                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {date}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {time}
                            </span>
                            <span>por {followUp.user_name}</span>
                          </div>
                        </div>
                        {followUp !== clientFollowUps[clientFollowUps.length - 1] && (
                          <Separator className="my-2" />
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center text-muted-foreground text-sm py-8">
                    Nenhum follow-up criado para este cliente ainda.
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}