import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface SessionResetDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SessionResetDialog({ isOpen, onClose }: SessionResetDialogProps) {
  const [userEmail, setUserEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const { toast } = useToast();

  const handleResetSession = async () => {
    if (!userEmail.trim()) {
      toast({
        title: "Email obrigatório",
        description: "Por favor, informe o email do usuário.",
        variant: "destructive"
      });
      return;
    }

    setIsResetting(true);

    try {
      console.log('🔄 Iniciando reset de sessão para:', userEmail);

      // Chamar edge function para reset de sessão
      const { data, error } = await supabase.functions.invoke('reset-user-session', {
        body: { userEmail: userEmail.trim() }
      });

      if (error) {
        console.error('❌ Erro ao resetar sessão:', error);
        throw error;
      }

      console.log('✅ Sessão resetada com sucesso:', data);

      toast({
        title: "Sessão resetada",
        description: `A sessão do usuário ${userEmail} foi resetada com sucesso. O usuário precisará fazer login novamente.`,
      });

      setUserEmail('');
      onClose();

    } catch (error: any) {
      console.error('❌ Erro no reset de sessão:', error);
      
      toast({
        title: "Erro ao resetar sessão",
        description: error?.message || "Erro interno do servidor.",
        variant: "destructive"
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Reset de Sessão de Usuário
          </DialogTitle>
          <DialogDescription>
            Esta ferramenta force o reset da sessão de um usuário específico, 
            forçando-o a fazer login novamente.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Atenção:</strong> Esta ação irá desconectar o usuário de todas as sessões ativas.
            Use apenas quando um usuário estiver com problemas específicos de autenticação.
          </AlertDescription>
        </Alert>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="userEmail" className="text-right">
              Email
            </Label>
            <Input
              id="userEmail"
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="usuario@globalaco.com.br"
              className="col-span-3"
              disabled={isResetting}
            />
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isResetting}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleResetSession}
            disabled={isResetting || !userEmail.trim()}
          >
            {isResetting ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Resetando...
              </>
            ) : (
              'Resetar Sessão'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}