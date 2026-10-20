import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Archive, Clock, Search, AlertCircle, CheckCircle2, User, Loader2, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CRMLead } from '@/pages/CRM';
import type { CRMLeadCardMeta } from '@/context/CRMDataContext';
import { useCommercialVendors } from '@/hooks/useCommercialVendors';

interface BulkArchiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leads: CRMLead[];
  cardMeta?: Record<string, CRMLeadCardMeta>;
  currentUserId: string | null;
  currentUserRole: string | null;
  initialVendorFilter?: string;
  onSuccess: () => void;
}

const STAGE_LABELS: Record<string, string> = {
  lead: 'Lead',
  contato_feito: 'Contato',
  passagem_bastao: 'Bastão',
  visita_reuniao: 'Oportunidade',
  analise_financeira: 'Análise',
  proposta: 'Proposta',
  pedido_fechado: 'Fechado',
  perdido: 'Perdido',
};

export function BulkArchiveDialog({
  open,
  onOpenChange,
  leads,
  cardMeta = {},
  currentUserId,
  currentUserRole,
  initialVendorFilter,
  onSuccess,
}: BulkArchiveDialogProps) {
  const { vendors: commercialVendors } = useCommercialVendors();
  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'comercial';

  const [thresholdDays, setThresholdDays] = useState<number>(30);
  const [selectedVendor, setSelectedVendor] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processedCount, setProcessedCount] = useState<number>(0);

  // Initialize selectedVendor when dialog opens or initialVendorFilter changes
  useEffect(() => {
    if (open) {
      if (initialVendorFilter && initialVendorFilter !== 'all') {
        setSelectedVendor(initialVendorFilter);
      } else if (!isAdmin && currentUserId) {
        setSelectedVendor(currentUserId);
      } else {
        setSelectedVendor('all');
      }
      setSearchTerm('');
      setProcessedCount(0);
      setIsProcessing(false);
    }
  }, [open, initialVendorFilter, isAdmin, currentUserId]);

  // Compute eligible leads
  const eligibleLeads = useMemo(() => {
    const now = Date.now();
    return leads.filter((l) => {
      // Must not be already lost or closed
      if (l.status === 'perdido' || l.status === 'pedido_fechado') return false;

      // Filter by vendor
      if (selectedVendor && selectedVendor !== 'all') {
        if (l.vendedor_id !== selectedVendor) return false;
      } else if (!isAdmin && currentUserId) {
        if (l.vendedor_id !== currentUserId) return false;
      }

      // Must not have a future schedule (protected)
      if (cardMeta[l.id]?.hasFutureSchedule) return false;

      // Calculate days without contact
      const refStr = cardMeta[l.id]?.lastContactAt || l.last_contact_at || l.updated_at || l.created_at;
      if (!refStr) return false;
      const refTime = new Date(refStr).getTime();
      if (isNaN(refTime)) return false;
      const days = Math.floor((now - refTime) / 86400000);

      return days >= thresholdDays;
    }).map((l) => {
      const refStr = cardMeta[l.id]?.lastContactAt || l.last_contact_at || l.updated_at || l.created_at;
      const refTime = new Date(refStr).getTime();
      const days = Math.floor((now - refTime) / 86400000);
      return {
        ...l,
        daysWithoutContact: days,
      };
    }).sort((a, b) => b.daysWithoutContact - a.daysWithoutContact);
  }, [leads, selectedVendor, isAdmin, currentUserId, cardMeta, thresholdDays]);

  // Reset selectedLeadIds when eligibleLeads change
  useEffect(() => {
    setSelectedLeadIds(new Set(eligibleLeads.map((l) => l.id)));
  }, [eligibleLeads]);

  // Leads filtered by local search in dialog
  const displayedLeads = useMemo(() => {
    if (!searchTerm.trim()) return eligibleLeads;
    const q = searchTerm.toLowerCase();
    const qDigits = searchTerm.replace(/\D/g, '');
    return eligibleLeads.filter((l) => {
      const nameMatch = (l.empresa || l.cliente_nome || l.client_name || '').toLowerCase().includes(q);
      const contactMatch = (l.contact_name || '').toLowerCase().includes(q);
      const cnpjMatch = (l.cliente_cnpj || '').includes(q);
      const phoneMatch = qDigits.length >= 3 && [l.contact_phone, l.cliente_telefone, l.cliente_cnpj]
        .some((p) => p && p.replace(/\D/g, '').includes(qDigits));
      return nameMatch || contactMatch || cnpjMatch || phoneMatch;
    });
  }, [eligibleLeads, searchTerm]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeadIds(new Set(eligibleLeads.map((l) => l.id)));
    } else {
      setSelectedLeadIds(new Set());
    }
  };

  const handleToggleLead = (leadId: string) => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(leadId)) {
        next.delete(leadId);
      } else {
        next.add(leadId);
      }
      return next;
    });
  };

  const handleExecuteBulkArchive = async () => {
    const targetIds = Array.from(selectedLeadIds);
    if (targetIds.length === 0) {
      toast.error('Nenhum lead selecionado.');
      return;
    }

    setIsProcessing(true);
    setProcessedCount(0);

    const nowIso = new Date().toISOString();
    const reason = `Sem contato há mais de ${thresholdDays} dias`;
    const user = (await supabase.auth.getUser()).data.user;
    const userId = user?.id || currentUserId || '';

    const targetLeadObjects = eligibleLeads.filter((l) => selectedLeadIds.has(l.id));
    const BATCH_SIZE = 20;
    let successCount = 0;

    try {
      for (let i = 0; i < targetIds.length; i += BATCH_SIZE) {
        const batchIds = targetIds.slice(i, i + BATCH_SIZE);
        const batchObjects = targetLeadObjects.slice(i, i + BATCH_SIZE);

        // 1. Update status on leads table
        const { error: updateError } = await (supabase as any)
          .from('leads')
          .update({
            status: 'perdido',
            notes: reason,
            updated_at: nowIso,
          })
          .in('id', batchIds);

        if (updateError) throw updateError;

        // 2. Insert into lead_dispositions
        const dispositions = batchObjects.map((l) => ({
          lead_id: l.id,
          user_id: userId,
          disposition_type: 'lost',
          reason: reason,
          lead_client_name: l.cliente_nome || l.empresa || '',
        }));
        await supabase.from('lead_dispositions').insert(dispositions as any);

        // 3. Insert into lead_activities
        const activities = batchObjects.map((l) => ({
          lead_id: l.id,
          activity_type: 'mudanca_status',
          description: `Lead movido para a Carteira por inatividade (${reason})`,
          user_id: userId,
        }));
        await supabase.from('lead_activities').insert(activities as any);

        successCount += batchIds.length;
        setProcessedCount(successCount);
      }

      toast.success(`${successCount} lead(s) movidos para a Carteira com sucesso!`, {
        description: 'Os leads saíram do Kanban e continuam na Carteira da vendedora.',
      });

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Erro na movimentação em massa:', err);
      toast.error('Ocorreu um erro ao processar os leads', {
        description: err.message || 'Verifique sua conexão e permissões.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const allSelected = eligibleLeads.length > 0 && selectedLeadIds.size === eligibleLeads.length;
  const someSelected = selectedLeadIds.size > 0 && selectedLeadIds.size < eligibleLeads.length;

  return (
    <Dialog open={open} onOpenChange={(val) => !isProcessing && onOpenChange(val)}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-4 sm:p-6 overflow-hidden">
        <DialogHeader className="shrink-0 space-y-1">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Archive className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            Mover Leads Parados para a Carteira
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Remove os leads sem contato do Kanban para despoluir o funil de vendas, mantendo-os disponíveis na Carteira.
          </DialogDescription>
        </DialogHeader>

        {/* Informational banner */}
        <div className="shrink-0 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-lg p-3 text-xs text-blue-900 dark:text-blue-200 space-y-1">
          <div className="flex items-center gap-1.5 font-medium">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>Como funciona esta movimentação em massa?</span>
          </div>
          <ul className="list-disc list-inside text-blue-800 dark:text-blue-300 pl-1 space-y-0.5 text-[11px]">
            <li>Os leads <strong>saem do Kanban</strong> e vão para a aba <strong>Minha Carteira</strong> da vendedora.</li>
            <li>O motivo registrado será <em>&quot;Sem contato há mais de {thresholdDays} dias&quot;</em> (motivo não bloqueante).</li>
            <li>Leads com <strong>agendamento futuro</strong> no CRM são preservados e protegidos automaticamente.</li>
            <li>A qualquer momento, a vendedora ou a gestão pode clicar em <strong>&quot;Novo Atendimento&quot;</strong> na carteira para reativá-los.</li>
          </ul>
        </div>

        {/* Filters bar */}
        <div className="shrink-0 grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 pb-1">
          {/* Vendor selection */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <User className="h-3 w-3" /> Vendedor
            </label>
            <Select
              value={selectedVendor}
              onValueChange={setSelectedVendor}
              disabled={isProcessing || !isAdmin}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Selecione o vendedor" />
              </SelectTrigger>
              <SelectContent>
                {isAdmin && <SelectItem value="all">Todos os Vendedores</SelectItem>}
                {commercialVendors.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Threshold days */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Tempo sem contato
            </label>
            <Select
              value={String(thresholdDays)}
              onValueChange={(val) => setThresholdDays(Number(val))}
              disabled={isProcessing}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">Mais de 15 dias sem contato</SelectItem>
                <SelectItem value="30">Mais de 30 dias sem contato (Padrão)</SelectItem>
                <SelectItem value="45">Mais de 45 dias sem contato</SelectItem>
                <SelectItem value="60">Mais de 60 dias sem contato</SelectItem>
                <SelectItem value="90">Mais de 90 dias sem contato</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search inside results */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Search className="h-3 w-3" /> Buscar lead
            </label>
            <div className="relative">
              <Input
                placeholder="Filtrar por nome ou CNPJ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 text-xs pl-7"
                disabled={isProcessing}
              />
              <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* Selection Bar */}
        <div className="shrink-0 flex items-center justify-between py-1 px-2 bg-muted/40 rounded-md border text-xs">
          <div className="flex items-center gap-2">
            <Checkbox
              id="select-all-leads"
              checked={allSelected ? true : someSelected ? 'indeterminate' : false}
              onCheckedChange={handleSelectAll}
              disabled={isProcessing || eligibleLeads.length === 0}
            />
            <label htmlFor="select-all-leads" className="cursor-pointer font-medium select-none">
              Selecionar todos ({eligibleLeads.length})
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[11px] font-medium">
              {selectedLeadIds.size} selecionado{selectedLeadIds.size === 1 ? '' : 's'}
            </Badge>
          </div>
        </div>

        {/* Leads Table / List */}
        <div className="flex-1 min-h-[220px] max-h-[320px] border rounded-md overflow-hidden flex flex-col">
          <ScrollArea className="flex-1">
            {displayedLeads.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs space-y-1">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto opacity-70" />
                <p className="font-medium text-foreground">Nenhum lead encontrado com mais de {thresholdDays} dias sem contato.</p>
                <p className="text-[11px]">Tudo em dia para este filtro! 🎉</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {displayedLeads.map((lead) => {
                  const isChecked = selectedLeadIds.has(lead.id);
                  const stageLabel = STAGE_LABELS[lead.status] || lead.status;
                  const vendorName = lead.vendedor?.full_name || 'Não atribuído';
                  const dateStr = lead.updated_at
                    ? new Date(lead.updated_at).toLocaleDateString('pt-BR')
                    : '-';

                  return (
                    <div
                      key={lead.id}
                      className={`flex items-center justify-between p-2.5 hover:bg-muted/40 transition-colors text-xs cursor-pointer ${
                        isChecked ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''
                      }`}
                      onClick={() => !isProcessing && handleToggleLead(lead.id)}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => handleToggleLead(lead.id)}
                          disabled={isProcessing}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground truncate">
                            {lead.empresa || lead.cliente_nome || lead.client_name || 'Sem nome'}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                            <span className="font-medium text-primary">
                              {stageLabel}
                            </span>
                            {selectedVendor === 'all' && (
                              <span>• {vendorName}</span>
                            )}
                            {lead.cidade && <span>• {lead.cidade}/{lead.estado || ''}</span>}
                            <span>• Última att: {dateStr}</span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-semibold gap-1 text-[10px]"
                        >
                          <Clock className="h-3 w-3" />
                          {lead.daysWithoutContact}d sem contato
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Progress Bar while executing */}
        {isProcessing && (
          <div className="shrink-0 space-y-1.5 py-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Processando movimentação para a Carteira...</span>
              <span>{processedCount} de {selectedLeadIds.size} ({Math.round((processedCount / Math.max(1, selectedLeadIds.size)) * 100)}%)</span>
            </div>
            <Progress value={(processedCount / Math.max(1, selectedLeadIds.size)) * 100} className="h-2" />
          </div>
        )}

        <DialogFooter className="shrink-0 pt-2 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="text-[11px] text-muted-foreground w-full sm:w-auto text-left">
            Total selecionado: <strong>{selectedLeadIds.size}</strong> de {eligibleLeads.length} lead(s)
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleExecuteBulkArchive}
              disabled={isProcessing || selectedLeadIds.size === 0}
              className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-600 dark:hover:bg-amber-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Movendo ({processedCount}/{selectedLeadIds.size})...
                </>
              ) : (
                <>
                  <Archive className="h-3.5 w-3.5" />
                  Mover {selectedLeadIds.size} para a Carteira
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
