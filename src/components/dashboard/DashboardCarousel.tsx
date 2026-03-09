import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Minimize2, Settings, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

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
      <div className="fixed top-4 right-4 z-[110] flex items-center gap-2">
        <Button variant="secondary" size="icon" className="shadow-lg" onClick={() => setPaused(p => !p)} title={paused ? 'Retomar' : 'Pausar'}>
          {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
        </Button>
        <Button variant="secondary" size="icon" className="shadow-lg" onClick={() => { setTempDurations([...durations]); setSettingsOpen(true); }} title="Configurar tempos">
          <Settings className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="icon" className="shadow-lg" onClick={onClose} title="Sair">
          <Minimize2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Tab indicator */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[110] flex items-center gap-2 bg-card/80 backdrop-blur rounded-full px-3 py-1.5 shadow-lg">
        {labels.map((label, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className={cn(
              "text-xs px-3 py-1 rounded-full transition-all font-medium",
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
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Tempo de exibição (segundos)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
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
          <DialogFooter>
            <Button onClick={saveDurations}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
