import React, { useState } from 'react';
import { HelpCircle, BookOpen, Layout, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTour } from '@/hooks/useTour';
import { toast } from 'sonner';

export const TourButton: React.FC = () => {
  const { 
    startPageTour, 
    startSidebarTour, 
    startFullTour, 
    resetAllTours,
    getCurrentTourInfo 
  } = useTour();
  const [isOpen, setIsOpen] = useState(false);

  const tourInfo = getCurrentTourInfo();

  const handlePageTour = () => {
    setIsOpen(false);
    setTimeout(() => {
      const started = startPageTour();
      if (!started) {
        toast.info('Nenhum elemento de tutorial encontrado nesta página.');
      }
    }, 100);
  };

  const handleSidebarTour = () => {
    setIsOpen(false);
    setTimeout(() => {
      const started = startSidebarTour();
      if (!started) {
        toast.info('Nenhum elemento do menu encontrado.');
      }
    }, 100);
  };

  const handleFullTour = () => {
    setIsOpen(false);
    setTimeout(() => {
      const started = startFullTour();
      if (!started) {
        toast.info('Nenhum elemento de tutorial encontrado.');
      }
    }, 100);
  };

  const handleResetTours = () => {
    setIsOpen(false);
    resetAllTours();
    toast.success('Histórico de tutoriais resetado!');
  };

  return (
    <TooltipProvider>
      <div className="fixed bottom-4 left-4 z-50">
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  className="h-12 w-12 rounded-full shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground"
                  aria-label="Ajuda e Tutoriais"
                >
                  <HelpCircle className="h-6 w-6" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Ajuda e Tutoriais</p>
            </TooltipContent>
          </Tooltip>

          <DropdownMenuContent align="start" side="top" className="w-56">
            <DropdownMenuItem onClick={handlePageTour} disabled={!tourInfo.hasPageTour}>
              <BookOpen className="mr-2 h-4 w-4" />
              <div className="flex flex-col">
                <span>Tutorial desta página</span>
                <span className="text-xs text-muted-foreground">{tourInfo.title}</span>
              </div>
            </DropdownMenuItem>

            <DropdownMenuItem onClick={handleSidebarTour}>
              <Layout className="mr-2 h-4 w-4" />
              <span>Conhecer o menu</span>
            </DropdownMenuItem>

            <DropdownMenuItem onClick={handleFullTour}>
              <HelpCircle className="mr-2 h-4 w-4" />
              <span>Tour completo</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={handleResetTours}>
              <RefreshCw className="mr-2 h-4 w-4" />
              <span>Resetar tutoriais vistos</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  );
};
