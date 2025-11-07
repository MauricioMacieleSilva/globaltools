import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Plus, Check, X, User, ChevronsUpDown } from 'lucide-react';
import { useFollowUps, FollowUpType } from '@/hooks/useFollowUps';
import { cn } from '@/lib/utils';
import { useComercial } from '@/context/ComercialContext';
import { usePreVendas } from '@/context/PreVendasContext';

interface FollowUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetNumber?: string;
  clientName?: string;
  leadId?: string;
  searchBy?: 'clients' | 'leads';
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

export function FollowUpDialog({ open, onOpenChange, budgetNumber, clientName, leadId, searchBy = 'clients' }: FollowUpDialogProps) {
  const { followUps, loading, loadFollowUps, createFollowUp, markAsCompleted, deleteFollowUp } = useFollowUps();
  const { data } = useComercial();
  
  // Only use PreVendas context when searchBy is 'leads'
  let preVendasContext = null;
  try {
    if (searchBy === 'leads') {
      preVendasContext = usePreVendas();
    }
  } catch (error) {
    // Context not available, fallback to clients mode
  }
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [leadSearchOpen, setLeadSearchOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: 'reforcar_proposta' as FollowUpType,
    subject: '',
    scheduled_date: '',
    scheduled_time: '',
    selectedClient: '',
    selectedLeadId: '',
    customTypeText: ''
  });

  // Get unique clients from commercial data
  const clients = React.useMemo(() => {
    const uniqueClients = new Map();
    data.forEach(item => {
      if (item.cli_nomefantasia && item.codigocliente) {
        uniqueClients.set(item.codigocliente, {
          name: item.cli_nomefantasia,
          code: item.codigocliente
        });
      }
    });
    return Array.from(uniqueClients.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  // Get leads when searchBy is 'leads'
  const leads = React.useMemo(() => {
    if (searchBy !== 'leads' || !preVendasContext) return [];
    return preVendasContext.leads.sort((a, b) => a.client_name.localeCompare(b.client_name));
  }, [searchBy, preVendasContext?.leads]);

  const budgetFollowUps = followUps.filter(f => {
    if (budgetNumber) {
      return f.budget_number === budgetNumber;
    }
    if (leadId) {
      return f.lead_id === leadId;
    }
    if (clientName) {
      return f.client_name === clientName;
    }
    return true; // Show all if no specific filter
  });

  useEffect(() => {
    if (open) {
      if (budgetNumber) {
        loadFollowUps(budgetNumber);
      } else {
        loadFollowUps();
      }
    }
  }, [open, budgetNumber, loadFollowUps]);

  useEffect(() => {
    if (budgetNumber && clientName) {
      // Find the client code for the given client name
      const client = clients.find(c => c.name === clientName);
      if (client) {
        setFormData(prev => ({ ...prev, selectedClient: client.code }));
      }
    }
  }, [budgetNumber, clientName, clients]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject.trim() || !formData.scheduled_date || !formData.scheduled_time) {
      return;
    }

    // Validation based on searchBy mode
    if (!budgetNumber && !leadId) {
      if (searchBy === 'leads' && !formData.selectedLeadId) {
        return;
      }
      if (searchBy === 'clients' && !formData.selectedClient) {
        return;
      }
    }

    setIsSubmitting(true);
    
    const scheduledDateTime = new Date(`${formData.scheduled_date}T${formData.scheduled_time}`);
    
    const selectedClientData = formData.selectedClient ? 
      clients.find(c => c.code === formData.selectedClient) : null;
    const selectedLeadData = formData.selectedLeadId ? 
      leads.find(l => l.id === formData.selectedLeadId) : null;

    const success = await createFollowUp({
      budget_number: budgetNumber || undefined,
      lead_id: leadId || formData.selectedLeadId || undefined,
      type: formData.type,
      subject: formData.subject.trim(),
      scheduled_date: scheduledDateTime.toISOString(),
      is_completed: false,
      show_today: true,
      client_name: selectedLeadData?.client_name || selectedClientData?.name || clientName,
      client_code: selectedLeadData?.client_code || selectedClientData?.code,
      custom_type_text: formData.type === 'outro' ? formData.customTypeText : undefined
    });

    setIsSubmitting(false);

    if (success) {
      setFormData({
        type: 'reforcar_proposta',
        subject: '',
        scheduled_date: '',
        scheduled_time: '',
        selectedClient: budgetNumber ? formData.selectedClient : '',
        selectedLeadId: leadId ? formData.selectedLeadId : '',
        customTypeText: ''
      });
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
            <Calendar className="h-5 w-5" />
            {budgetNumber ? `Follow-up - Pedido ${budgetNumber}` : 'Novo Follow-up'}
          </DialogTitle>
          <DialogDescription>
            {budgetNumber && clientName ? `Cliente: ${clientName}` : 'Criar follow-up para cliente'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden">
          {/* Formulário */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Novo Follow-up
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {!budgetNumber && !leadId && (
                <div>
                  {searchBy === 'leads' ? (
                    <>
                      <label className="text-sm font-medium mb-2 block">Lead *</label>
                      <Popover open={leadSearchOpen} onOpenChange={setLeadSearchOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={leadSearchOpen}
                            className="w-full justify-between"
                          >
                            {formData.selectedLeadId
                              ? leads.find((lead) => lead.id === formData.selectedLeadId)?.client_name
                              : "Selecione o lead..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput placeholder="Pesquisar lead..." />
                            <CommandEmpty>Nenhum lead encontrado.</CommandEmpty>
                            <CommandGroup>
                              <CommandList>
                                {leads.map((lead) => (
                                  <CommandItem
                                    key={lead.id}
                                    value={lead.client_name}
                                    onSelect={() => {
                                      setFormData({ ...formData, selectedLeadId: lead.id });
                                      setLeadSearchOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        formData.selectedLeadId === lead.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <div>
                                      <div>{lead.client_name}</div>
                                      <div className="text-xs text-muted-foreground">{lead.contact_name} - {lead.sdr_name}</div>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandList>
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </>
                  ) : (
                    <>
                      <label className="text-sm font-medium mb-2 block">Cliente *</label>
                      <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={clientSearchOpen}
                            className="w-full justify-between"
                          >
                            {formData.selectedClient
                              ? clients.find((client) => client.code === formData.selectedClient)?.name
                              : "Selecione o cliente..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput placeholder="Pesquisar cliente..." />
                            <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                            <CommandGroup>
                              <CommandList>
                                {clients.map((client) => (
                                  <CommandItem
                                    key={client.code}
                                    value={client.name}
                                    onSelect={() => {
                                      setFormData({ ...formData, selectedClient: client.code });
                                      setClientSearchOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        formData.selectedClient === client.code ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {client.name}
                                  </CommandItem>
                                ))}
                              </CommandList>
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </>
                  )}
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-2 block">Tipo</label>
                <Select value={formData.type} onValueChange={(value: FollowUpType) => setFormData({ ...formData, type: value, customTypeText: '' })}>
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
                {formData.type === 'outro' && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Especificar tipo personalizado</label>
                    <Input
                      placeholder="Digite o tipo de follow-up..."
                      value={formData.customTypeText}
                      onChange={(e) => setFormData({ ...formData, customTypeText: e.target.value })}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Assunto</label>
                <Textarea
                  placeholder="Descreva o assunto do follow-up..."
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="min-h-20"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium mb-2 block">Data</label>
                  <Input
                    type="date"
                    value={formData.scheduled_date}
                    onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Hora</label>
                  <Input
                    type="time"
                    value={formData.scheduled_time}
                    onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={isSubmitting || !formData.subject.trim() || !formData.scheduled_date || !formData.scheduled_time || (!budgetNumber && !leadId && ((searchBy === 'leads' && !formData.selectedLeadId) || (searchBy === 'clients' && !formData.selectedClient)))}
                className="w-full"
              >
                {isSubmitting ? "Salvando..." : "Criar Follow-up"}
              </Button>
            </form>
          </div>

          {/* Lista de Follow-ups */}
          <div className="space-y-4">
            <h3 className="font-medium">
              Follow-ups ({budgetFollowUps.length})
            </h3>
            
            <ScrollArea className="h-96">
              <div className="space-y-3 pr-4">
                {budgetFollowUps.length > 0 ? (
                  budgetFollowUps.map((followUp) => {
                    const { date, time } = formatDateTime(followUp.scheduled_date);
                    return (
                      <div
                        key={followUp.id}
                        className={`border rounded-lg p-3 space-y-2 ${
                          followUp.is_completed ? 'bg-muted/50 opacity-75' : 'bg-background'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className={followUpTypeColors[followUp.type]}>
                              {followUp.type === 'outro' && followUp.custom_type_text 
                                ? followUp.custom_type_text
                                : followUpTypeLabels[followUp.type]
                              }
                            </Badge>
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
                                onClick={() => markAsCompleted(followUp.id)}
                                className="h-6 w-6 p-0"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteFollowUp(followUp.id)}
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        {followUp.client_name && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            {followUp.client_name}
                            {followUp.budget_number && ` - Pedido ${followUp.budget_number}`}
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
                    );
                  })
                ) : (
                  <p className="text-center text-muted-foreground text-sm py-8">
                    Nenhum follow-up criado ainda.
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