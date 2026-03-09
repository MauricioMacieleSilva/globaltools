import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogOverlay, DialogPortal } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Minimize2, Settings, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as DialogPrimitive from '@radix-ui/react-dialog';

interface DashboardCarouselProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode[];
  labels: string[];
}

export function DashboardCarousel({ open, onClose, children, labels }: DashboardCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [durations, setDurations] = useState<number[]>(() => {
    const saved = localStorage.getItem('dashboard-carousel-durations');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return labels.map(() => 30);
  });
  const [paused, setPaused] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tempDurations, setTempDurations] = useState<number[]>(durations);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ensure durations array matches children length
  useEffect(() => {
    if (durations.length !== children.length) {
      const newDurations = children.map((_, i) => durations[i] || 30);
      setDurations(newDurations);
    }
  }, [children.length]);

  const scheduleNext = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (paused || !open) return;
    const duration = (durations[activeIndex] || 30) * 1000;
    timerRef.current = setTimeout(() => {
      setActiveIndex(prev => (prev + 1) % children.length);
    }, duration);
  }, [activeIndex, durations, paused, open, children.length]);

  useEffect(() => {
    scheduleNext();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [scheduleNext]);

  const saveDurations = () => {
    setDurations(tempDurations);
    localStorage.setItem('dashboard-carousel-durations', JSON.stringify(tempDurations));
    setSettingsOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background overflow-hidden">
      {/* Controls */}
      <div className="fixed top-2 right-2 z-[110] flex items-center gap-1 opacity-30 hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPaused(p => !p)} title={paused ? 'Retomar' : 'Pausar'}>
          {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setTempDurations([...durations]); setSettingsOpen(true); }} title="Configurar tempos">
          <Settings className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose} title="Sair">
          <Minimize2 className="h-3 w-3" />
        </Button>
      </div>

      {/* Tab indicator */}
      <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[110] flex items-center gap-1 opacity-40 hover:opacity-100 transition-opacity bg-card/60 backdrop-blur rounded-full px-2 py-1 shadow-sm">
        {labels.map((label, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className={cn(
              "text-[10px] px-2 py-0.5 rounded-full transition-all font-medium",
              activeIndex === i
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="w-full h-full overflow-auto pt-14 pb-4 px-4">
        {children[activeIndex]}
      </div>

      {/* Settings dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[200] bg-black/80" />
          <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-[200] w-full max-w-sm translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg rounded-lg">
            <DialogHeader>
              <DialogTitle>Tempo de exibição (segundos)</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-4">
              {labels.map((label, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Label className="flex-1 text-sm">{label}</Label>
                  <Input
                    type="number"
                    min={5}
                    max={600}
                    value={tempDurations[i] || 30}
                    onChange={(e) => {
                      const v = [...tempDurations];
                      v[i] = Math.max(5, parseInt(e.target.value) || 30);
                      setTempDurations(v);
                    }}
                    className="w-20"
                  />
                </div>
              ))}
            </div>
            <DialogFooter className="mt-4">
              <Button onClick={saveDurations}>Salvar</Button>
            </DialogFooter>
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100">
              ✕
            </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </Dialog>
    </div>
  );
}
