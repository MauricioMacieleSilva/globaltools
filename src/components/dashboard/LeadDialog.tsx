import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Lead } from '@/context/PreVendasContext';
import { locationsService } from '@/services/locationsService';
import { supabase } from '@/integrations/supabase/client';

interface LeadDialogProps {
  open: boolean;
  onClose: () => void;
  lead?: Lead | null;
  onSave: (leadData: any) => Promise<void>;
}


export const LeadDialog: React.FC<LeadDialogProps> = ({ open, onClose, lead, onSave }) => {
  const [formData, setFormData] = useState({
    cliente_nome: '',
    client_code: '',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    uf: '',
    cidade: '',
    status: 'novo',
    source: '',
    entry_channel: '',
    notes: ''
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openUfPopover, setOpenUfPopover] = useState(false);
  const [openCidadePopover, setOpenCidadePopover] = useState(false);
  const [loadingCidades, setLoadingCidades] = useState(false);
  const [cidadeLoadError, setCidadeLoadError] = useState(false);
  const [estados, setEstados] = useState<Array<{ uf: string; nome: string; id: number }>>([]);
  const [cidadesDisponiveis, setCidadesDisponiveis] = useState<string[]>([]);
  const { toast } = useToast();

  // Carregar estados na inicialização
  useEffect(() => {
    const loadEstados = async () => {
      try {
        const estadosData = await locationsService.getEstados();
        setEstados(estadosData);
      } catch (error) {
        console.error('Erro ao carregar estados:', error);
      }
    };
    loadEstados();
  }, []);

  // Carregar cidades quando UF muda
  useEffect(() => {
    const loadCidades = async () => {
      if (!formData.uf) {
        setCidadesDisponiveis([]);
        setCidadeLoadError(false);
        return;
      }
      
      setLoadingCidades(true);
      setCidadeLoadError(false);
      
      try {
        // API call direto para IBGE
        const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${formData.uf}/municipios`);
        if (!response.ok) throw new Error('API error');
        
        const data = await response.json();
        const cidades = data.map((cidade: any) => cidade.nome).sort();
        setCidadesDisponiveis(cidades);
        
      } catch (error) {
        console.error('Erro ao carregar cidades:', error);
        setCidadesDisponiveis([]);
        setCidadeLoadError(true);
        toast({
          title: "Erro ao carregar cidades",
          description: `Não foi possível carregar as cidades de ${formData.uf}. Tente novamente.`,
          variant: "destructive"
        });
      } finally {
        setLoadingCidades(false);
      }
    };
    
    loadCidades();
  }, [formData.uf, toast]);

  const retryLoadCidades = async () => {
    if (!formData.uf) return;
    
    setLoadingCidades(true);
    setCidadeLoadError(false);
    
    try {
      const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${formData.uf}/municipios`);
      if (!response.ok) throw new Error('API error');
      
      const data = await response.json();
      const cidades = data.map((cidade: any) => cidade.nome).sort();
      setCidadesDisponiveis(cidades);
      
      toast({
        title: "Sucesso", 
        description: "Cidades carregadas com sucesso!"
      });
    } catch (error) {
      console.error('Erro ao recarregar cidades:', error);
      setCidadeLoadError(true);
      toast({
        title: "Erro",
        description: "Ainda não foi possível carregar as cidades. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoadingCidades(false);
    }
  };

  // Mapear valores do banco para UI
  const mapEntryChannelFromDatabase = (dbValue: string): string => {
    const mapping: Record<string, string> = {
      'site': 'Google',
      'redes_sociais': 'LinkedIn', // Assumindo primeiro valor para redes_sociais
      'prospeccao': 'E-mail', // Assumindo primeiro valor para prospecção
      'marketing': 'Feira/Evento',
      'indicacao': 'Indicação',
      'outros': 'Outro'
    };
    
    return mapping[dbValue] || dbValue; // Retorna o valor original se não encontrar mapeamento
  };

  useEffect(() => {
    console.log('=== LeadDialog useEffect triggered ===');
    console.log('open:', open);
    console.log('lead:', lead);
    
    if (open) {
      setIsInitialized(false); // Reset initialization
      
      if (lead) {
        console.log('Loading lead data for editing:', lead.client_name);
        console.log('Full lead object:', lead);
        
        const newFormData = {
          cliente_nome: lead.client_name || '',
          client_code: lead.client_code || '',
          contact_name: lead.contact_name || '',
          contact_phone: lead.contact_phone || '',
          contact_email: lead.contact_email || '',
          uf: lead.uf || '',
          cidade: lead.cidade || '',
          status: lead.status || 'novo',
          source: lead.source || '',
          entry_channel: mapEntryChannelFromDatabase(lead.entry_channel || ''),
          notes: lead.notes || ''
        };
        
        console.log('New form data being set:', newFormData);
        setFormData(newFormData);
        
        // Aguardar o próximo ciclo antes de marcar como inicializado
        setTimeout(() => {
          console.log('Form data after setState (delayed check):', newFormData);
          setIsInitialized(true);
        }, 50);
        
      } else {
        console.log('Setting up form for new lead');
        const emptyFormData = {
          cliente_nome: '',
          client_code: '',
          contact_name: '',
          contact_phone: '',
          contact_email: '',
          uf: '',
          cidade: '',
          status: 'novo',
          source: '',
          entry_channel: '',
          notes: ''
        };
        setFormData(emptyFormData);
        setIsInitialized(true);
      }
    } else {
      setIsInitialized(false);
    }
  }, [open, lead]);

  const generateClientCode = (clientName: string) => {
    const prefix = clientName.split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 3);
    
    const timestamp = Date.now().toString().slice(-4);
    return `${prefix}${timestamp}`;
  };

  const handleClientNameChange = (value: string) => {
    const updatedFormData = { ...formData, cliente_nome: value };
    
    // Só gera código se for um novo lead
    if (!lead && value.trim().length >= 3) {
      updatedFormData.client_code = generateClientCode(value);
    }
    
    setFormData(updatedFormData);
  };

  const handleUfChange = (value: string) => {
    setFormData({ ...formData, uf: value, cidade: '' }); // Limpa a cidade ao trocar UF
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Validações dos campos obrigatórios
    const errors = [];
    
    if (!formData.cliente_nome.trim()) {
      errors.push("Nome do cliente é obrigatório");
    }
    
    if (!formData.contact_name.trim()) {
      errors.push("Nome do contato é obrigatório");
    }
    
    if (!formData.contact_phone.trim()) {
      errors.push("Telefone do contato é obrigatório");
    }
    
    if (!formData.uf.trim()) {
      errors.push("UF é obrigatório");
    }
    
    if (!formData.cidade.trim()) {
      errors.push("Cidade é obrigatória");
    }
    
    if (!formData.source.trim()) {
      errors.push("Fonte do lead é obrigatória");
    }
    
    if (!formData.entry_channel.trim()) {
      errors.push("Canal de entrada é obrigatório");
    }
    
    // Se houver erros, mostrar todos
    if (errors.length > 0) {
      toast({
        title: "Campos obrigatórios não preenchidos",
        description: errors.join(", "),
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Para novo lead, verificar duplicatas antes de salvar
      if (!lead) {
        console.log('LeadDialog: Verificando duplicatas para novo lead');
        const duplicateCheck = await checkForDuplicates(formData);
        console.log('LeadDialog: Resultado da verificação de duplicatas', duplicateCheck);
        if (duplicateCheck.hasDuplicates) {
          const confirmMessage = `Possível lead duplicado encontrado:\n\n${duplicateCheck.duplicateInfo}\n\nDeseja continuar mesmo assim?`;
          if (!confirm(confirmMessage)) {
            console.log('LeadDialog: Usuário cancelou devido a duplicata');
            setIsSubmitting(false);
            return;
          }
        }
      }

      // Para novo lead, remover status do formData e gerar client_code se necessário
      const dataToSave = { ...formData };
      if (!lead) {
        delete dataToSave.status; // Deixa o default do banco assumir "novo"
        
        // Gerar client_code se não foi fornecido
        if (!dataToSave.client_code) {
          const timestamp = Date.now().toString().slice(-6);
          const namePrefix = dataToSave.cliente_nome.trim().replace(/\s+/g, '').substring(0, 4).toUpperCase();
          dataToSave.client_code = `${namePrefix}${timestamp}`;
        }
      }
      
      await onSave(dataToSave);
      
      toast({
        title: "Sucesso",
        description: lead ? "Lead atualizado com sucesso!" : "Lead criado com sucesso!"
      });
      onClose();
    } catch (error) {
      console.error('LeadDialog: Erro ao salvar lead:', error);
      // O erro já foi tratado no contexto, não mostra toast duplicado
    } finally {
      setIsSubmitting(false);
    }
  };

  const checkForDuplicates = async (newLeadData: any) => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Buscar leads com critérios de duplicação
      const { data: existingLeads, error } = await supabase
        .from('leads')
        .select('id, cliente_nome, contact_name, contact_phone, contact_email, client_code')
        .or(`cliente_nome.ilike.%${newLeadData.cliente_nome}%,contact_name.ilike.%${newLeadData.contact_name || ''}%,contact_phone.eq.${newLeadData.contact_phone || ''},contact_email.eq.${newLeadData.contact_email || ''}`);

      if (error) {
        console.error('Erro ao verificar duplicatas:', error);
        return { hasDuplicates: false, duplicateInfo: '' };
      }

      if (existingLeads && existingLeads.length > 0) {
        const duplicateReasons = [];
        const duplicateLead = existingLeads[0];

        if (duplicateLead.cliente_nome.toLowerCase().includes(newLeadData.cliente_nome.toLowerCase()) || 
            newLeadData.cliente_nome.toLowerCase().includes(duplicateLead.cliente_nome.toLowerCase())) {
          duplicateReasons.push(`Nome da empresa similar: ${duplicateLead.cliente_nome}`);
        }

        if (newLeadData.contact_name && duplicateLead.contact_name && 
            duplicateLead.contact_name.toLowerCase().includes(newLeadData.contact_name.toLowerCase())) {
          duplicateReasons.push(`Nome do contato: ${duplicateLead.contact_name}`);
        }

        if (newLeadData.contact_phone && duplicateLead.contact_phone === newLeadData.contact_phone) {
          duplicateReasons.push(`Telefone: ${duplicateLead.contact_phone}`);
        }

        if (newLeadData.contact_email && duplicateLead.contact_email === newLeadData.contact_email) {
          duplicateReasons.push(`E-mail: ${duplicateLead.contact_email}`);
        }

        if (duplicateReasons.length > 0) {
          return {
            hasDuplicates: true,
            duplicateInfo: `Lead existente (${duplicateLead.client_code}):\n${duplicateReasons.join('\n')}`
          };
        }
      }

      return { hasDuplicates: false, duplicateInfo: '' };
    } catch (error) {
      console.error('Erro na verificação de duplicatas:', error);
      return { hasDuplicates: false, duplicateInfo: '' };
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{lead ? 'Editar Lead' : 'Novo Lead'}</DialogTitle>
          <DialogDescription>
            {lead ? 'Edite as informações do lead' : 'Preencha as informações do novo lead'}
          </DialogDescription>
        </DialogHeader>

        {/* Debug info */}
        {import.meta.env.DEV && (
          <div className="bg-gray-100 p-2 text-xs">
            <div>Lead ID: {lead?.id || 'New'}</div>
            <div>Form cliente_nome: "{formData.cliente_nome}"</div>
            <div>Form contact_name: "{formData.contact_name}"</div>
            <div>Form uf: "{formData.uf}"</div>
          </div>
        )}

        {isInitialized ? (
          <form key={lead?.id || 'new'} onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Nome do Cliente *</label>
                <Input
                  placeholder="Digite o nome do cliente"
                  value={formData.cliente_nome}
                  onChange={(e) => {
                    console.log('Client name changed to:', e.target.value);
                    handleClientNameChange(e.target.value);
                  }}
                  required
                />
                {process.env.NODE_ENV === 'development' && (
                  <div className="text-xs text-gray-500 mt-1">
                    Current value: "{formData.cliente_nome}"
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Código do Cliente</label>
                <Input
                  placeholder="Código será gerado automaticamente"
                  value={formData.client_code}
                  disabled
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Nome do Contato *</label>
                <Input
                  placeholder="Nome da pessoa de contato"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Telefone *</label>
                <Input
                  placeholder="(11) 99999-9999"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">E-mail</label>
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Estado (UF) *</label>
                <Popover open={openUfPopover} onOpenChange={setOpenUfPopover}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openUfPopover}
                      className="w-full justify-between"
                    >
                      {formData.uf
                        ? estados.find((estado) => estado.uf === formData.uf)?.nome + ' (' + formData.uf + ')'
                        : "Selecione o estado"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" side="bottom" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar estado..." />
                      <CommandList>
                        <CommandEmpty>Nenhum estado encontrado.</CommandEmpty>
                        <CommandGroup>
                          {estados.map((estado) => (
                            <CommandItem
                              key={estado.uf}
                              value={estado.nome + ' ' + estado.uf}
                              onSelect={() => {
                                handleUfChange(estado.uf);
                                setOpenUfPopover(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.uf === estado.uf ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {estado.nome} ({estado.uf})
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Cidade *</label>
                  {cidadeLoadError && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={retryLoadCidades}
                      disabled={loadingCidades}
                      className="text-xs h-6 px-2"
                    >
                      Tentar novamente
                    </Button>
                  )}
                </div>
                <Popover open={openCidadePopover} onOpenChange={setOpenCidadePopover}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openCidadePopover}
                      disabled={!formData.uf}
                      className="w-full justify-between"
                    >
                      {loadingCidades ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Carregando...
                        </span>
                      ) : cidadeLoadError ? (
                        <span className="text-destructive">Erro ao carregar - clique em "Tentar novamente"</span>
                      ) : (
                        formData.cidade || (formData.uf ? "Selecione a cidade" : "Primeiro selecione o estado")
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" side="bottom" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar cidade..." />
                      <CommandList>
                        <CommandEmpty>Nenhuma cidade encontrada.</CommandEmpty>
                        <CommandGroup>
                          {cidadesDisponiveis.map((cidade) => (
                            <CommandItem
                              key={cidade}
                              value={cidade}
                              onSelect={() => {
                                setFormData({ ...formData, cidade: cidade });
                                setOpenCidadePopover(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.cidade === cidade ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {cidade}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Mostrar Status apenas quando editando */}
              {lead && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="novo">Novo</SelectItem>
                      <SelectItem value="contatado">Contatado</SelectItem>
                      <SelectItem value="respondeu">Respondeu</SelectItem>
                      <SelectItem value="qualificado">Qualificado</SelectItem>
                      <SelectItem value="encaminhado">Encaminhado</SelectItem>
                      <SelectItem value="perdido">Perdido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <label className="text-sm font-medium mb-2 block">Origem *</label>
                <Select value={formData.source} onValueChange={(value) => setFormData({ ...formData, source: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a origem" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prospeccao_ativa">Prospecção Ativa</SelectItem>
                    <SelectItem value="indicacao">Indicação</SelectItem>
                    <SelectItem value="site">Site</SelectItem>
                    <SelectItem value="evento">Evento</SelectItem>
                    <SelectItem value="rede_social">Rede Social</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Canal de Entrada *</label>
              <Select value={formData.entry_channel} onValueChange={(value) => setFormData({ ...formData, entry_channel: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o canal de entrada" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Google">Google</SelectItem>
                  <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                  <SelectItem value="Instagram">Instagram</SelectItem>
                  <SelectItem value="Facebook">Facebook</SelectItem>
                  <SelectItem value="E-mail">E-mail</SelectItem>
                  <SelectItem value="Telefone">Telefone</SelectItem>
                  <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                  <SelectItem value="Feira/Evento">Feira/Evento</SelectItem>
                  <SelectItem value="Indicação">Indicação</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Observações</label>
              <Textarea
                placeholder="Informações adicionais sobre o lead..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="min-h-20"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : (lead ? "Atualizar" : "Criar Lead")}
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex justify-center items-center h-40">
            <div className="text-sm text-gray-500">Carregando dados...</div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};