import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAppUpdate } from '@/hooks/useAppUpdate';
import { SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';

export const UpdateNotification: React.FC = () => {
  const { updateAvailable, isUpdating, triggerUpdate } = useAppUpdate();
  const { toast } = useToast();

  const handleUpdate = async () => {
    try {
      await triggerUpdate();
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      
      toast({
        title: "Erro na atualização",
        description: "Não foi possível atualizar. Tente recarregar a página.",
        variant: "destructive"
      });
    }
  };

  if (!updateAvailable) {
    return null;
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton 
        onClick={handleUpdate}
        disabled={isUpdating}
        className="text-primary bg-primary/5 hover:bg-primary/10"
      >
        <RefreshCw className={`h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
        <span>Atualização</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};