
import { useState, useRef } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { KanbanCard } from './KanbanCard';
import type { CRMLead } from '@/pages/CRM';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';

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
}

export function KanbanBoard({ leads, stages, loading, onStatusChange, onCardClick }: KanbanBoardProps) {
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const isMobile = useIsMobile();

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
        {stages.map(s => (
          <div key={s.key} className="min-w-[260px] flex-1 space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        className={`flex gap-3 overflow-x-auto pb-4 ${isMobile ? 'snap-x snap-mandatory' : ''}`}
        style={{ scrollbarWidth: 'thin' }}
      >
        {stages.map(stage => {
          const stageLeads = leads.filter(l => l.status === stage.key);
          const isOver = dragOverColumn === stage.key;

          return (
            <div
              key={stage.key}
              className={`min-w-[240px] sm:min-w-[260px] flex-1 flex flex-col rounded-xl transition-all ${isMobile ? 'snap-center' : ''}`}
              style={{
                backgroundColor: isOver ? `${stage.color}15` : 'hsl(var(--card))',
                border: isOver ? `2px dashed ${stage.color}` : '1px solid hsl(var(--border))',
              }}
              onDragOver={(e) => handleDragOver(e, stage.key)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.key)}
            >
              {/* Column Header */}
              <div className="p-3 flex items-center justify-between border-b" style={{ borderColor: 'hsl(var(--border))' }}>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                  <span className="text-sm font-semibold text-foreground">{stage.label}</span>
                </div>
                <Badge variant="secondary" className="text-xs">{stageLeads.length}</Badge>
              </div>

              {/* Cards */}
              <div className="p-2 space-y-2 flex-1 min-h-[200px] max-h-[calc(100vh-380px)] overflow-y-auto">
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
