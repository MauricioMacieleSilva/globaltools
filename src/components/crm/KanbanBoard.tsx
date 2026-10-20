
import { useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { KanbanCard } from './KanbanCard';
import type { CRMLead } from '@/pages/CRM';
import type { CRMLeadCardMeta } from '@/context/CRMDataContext';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';

const STORAGE_KEY = 'crm_kanban_collapsed_stages';

interface Stage {
  key: string;
  label: string;
  color: string;
}

interface KanbanBoardProps {
  leads: CRMLead[];
  stages: readonly Stage[];
  loading: boolean;
  onStatusChange: (leadId: string, newStatus: string) => void;
  onCardClick: (lead: CRMLead) => void;
  cardMeta?: Record<string, CRMLeadCardMeta>;
}

export function KanbanBoard({ leads, stages, loading, onStatusChange, onCardClick, cardMeta = {} }: KanbanBoardProps) {
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [collapsedStages, setCollapsedStages] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Erro ao carregar colunas recolhidas:', e);
      return [];
    }
  });
  const isMobile = useIsMobile();

  const toggleStageCollapse = (stageKey: string) => {
    setCollapsedStages(prev => {
      const next = prev.includes(stageKey)
        ? prev.filter(k => k !== stageKey)
        : [...prev, stageKey];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.error('Erro ao salvar colunas recolhidas no localStorage:', e);
      }
      return next;
    });
  };

  const leadsByStage = useMemo(() => {
    const grouped = new Map<string, CRMLead[]>();
    stages.forEach(stage => grouped.set(stage.key, []));
    leads.forEach(lead => grouped.get(lead.status)?.push(lead));
    grouped.forEach(stageLeads => {
      stageLeads.sort((a, b) => {
        const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return aTime - bTime;
      });
    });
    return grouped;
  }, [leads, stages]);

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('text/plain', leadId);
    setDraggedLeadId(leadId);
  };

  const handleDragOver = (e: React.DragEvent, stageKey: string) => {
    e.preventDefault();
    setDragOverColumn(stageKey);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, stageKey: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain');
    setDragOverColumn(null);
    setDraggedLeadId(null);
    if (leadId) {
      // Check if lead is being dropped in the same column — do nothing
      const lead = leads.find(l => l.id === leadId);
      if (lead && lead.status === stageKey) return;
      onStatusChange(leadId, stageKey);
    }
  };

  // Lost drop zone
  const handleDropLost = (e: React.DragEvent) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain');
    setDragOverColumn(null);
    setDraggedLeadId(null);
    if (leadId) onStatusChange(leadId, 'perdido');
  };

  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map(s => {
          const isCollapsed = collapsedStages.includes(s.key);
          if (isCollapsed) {
            return (
              <div key={s.key} className="w-11 sm:w-12 shrink-0 h-full">
                <Skeleton className="h-full w-full min-h-[300px] rounded-xl" />
              </div>
            );
          }
          return (
            <div key={s.key} className="min-w-[260px] flex-1 space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      <div
        className={`kanban-scroll flex gap-3 overflow-x-scroll overflow-y-hidden flex-1 min-h-0 ${isMobile ? 'snap-x snap-mandatory' : ''}`}
      >
        {stages.map(stage => {
          const stageLeads = leadsByStage.get(stage.key) || [];
          const isOver = dragOverColumn === stage.key;
          const isCollapsed = collapsedStages.includes(stage.key);

          if (isCollapsed) {
            return (
              <div
                key={stage.key}
                role="button"
                tabIndex={0}
                onClick={() => toggleStageCollapse(stage.key)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleStageCollapse(stage.key);
                  }
                }}
                className={`shrink-0 w-11 sm:w-12 h-full flex flex-col items-center py-3 rounded-xl transition-all min-h-0 select-none cursor-pointer group hover:bg-accent/40 ${isMobile ? 'snap-center' : ''}`}
                style={{
                  backgroundColor: isOver ? `${stage.color}15` : 'hsl(var(--card))',
                  border: isOver ? `2px dashed ${stage.color}` : '1px solid hsl(var(--border))',
                }}
                title={`Clique para expandir lista "${stage.label}"`}
                aria-label={`Lista ${stage.label} recolhida. Clique para expandir.`}
                onDragOver={(e) => handleDragOver(e, stage.key)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage.key)}
              >
                {/* Header recolhido: botão expandir, bolinha com a cor do stage, contagem */}
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStageCollapse(stage.key);
                    }}
                    className="h-6 w-6 inline-flex items-center justify-center rounded-md text-muted-foreground group-hover:text-foreground group-hover:bg-muted/80 transition-colors"
                    title={`Expandir lista "${stage.label}"`}
                    aria-label={`Expandir lista ${stage.label}`}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </button>
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                  <span className="text-[10px] font-semibold text-muted-foreground bg-muted/80 px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                    {stageLeads.length}
                  </span>
                </div>

                <div className="w-4 border-b my-3 border-border/60 shrink-0" />

                {/* Nome da lista escrito na vertical */}
                <div className="flex-1 flex items-center justify-center min-h-0 overflow-hidden py-1">
                  <span
                    className="text-xs sm:text-sm font-semibold text-foreground/80 tracking-wider whitespace-nowrap group-hover:text-foreground transition-colors"
                    style={{
                      writingMode: 'vertical-rl',
                      transform: 'rotate(180deg)',
                    }}
                  >
                    {stage.label}
                  </span>
                </div>
              </div>
            );
          }

          return (
            <div
              key={stage.key}
              className={`shrink-0 w-[260px] sm:w-[280px] h-full flex flex-col rounded-xl transition-all min-h-0 ${isMobile ? 'snap-center' : ''}`}
              style={{
                backgroundColor: isOver ? `${stage.color}15` : 'hsl(var(--card))',
                border: isOver ? `2px dashed ${stage.color}` : '1px solid hsl(var(--border))',
              }}
              onDragOver={(e) => handleDragOver(e, stage.key)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.key)}
            >
              {/* Column Header */}
              <div className="p-3 flex items-center justify-between border-b shrink-0" style={{ borderColor: 'hsl(var(--border))' }}>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                  <span className="text-sm font-semibold text-foreground truncate">{stage.label}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant="secondary" className="text-xs">{stageLeads.length}</Badge>
                  <button
                    type="button"
                    onClick={() => toggleStageCollapse(stage.key)}
                    className="h-6 w-6 p-0 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                    title={`Ocultar lista "${stage.label}"`}
                    aria-label={`Ocultar lista ${stage.label}`}
                  >
                    <ChevronsLeft className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Cards */}
              <div className="p-2 space-y-2 flex-1 min-h-0 overflow-y-auto">
                {stageLeads.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">Nenhum lead</p>
                ) : (
                  stageLeads.map(lead => (
                    <KanbanCard
                      key={lead.id}
                      lead={lead}
                      onDragStart={handleDragStart}
                      onClick={() => onCardClick(lead)}
                      isDragging={draggedLeadId === lead.id}
                      cardMeta={cardMeta[lead.id]}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lost drop zone */}
      {draggedLeadId && (
        <div
          className="border-2 border-dashed rounded-xl p-4 text-center transition-all"
          style={{
            borderColor: dragOverColumn === 'perdido' ? 'hsl(var(--warning))' : 'hsl(var(--border))',
            backgroundColor: dragOverColumn === 'perdido' ? 'hsl(38, 92%, 50%, 0.08)' : 'transparent',
          }}
          onDragOver={(e) => { e.preventDefault(); setDragOverColumn('perdido'); }}
          onDragLeave={() => setDragOverColumn(null)}
          onDrop={handleDropLost}
        >
          <span className="text-sm text-muted-foreground">Solte aqui para marcar como <strong>Perdido</strong></span>
        </div>
      )}
    </div>
  );
}
