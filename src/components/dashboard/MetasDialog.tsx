import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';

interface MetasDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (metas: { metaMensal: number; metaDiaria: number }) => void;
  metaAtual: { metaMensal: number; metaDiaria: number };
}

export function MetasDialog({ isOpen, onClose, onSave, metaAtual }: MetasDialogProps) {
  const { userProfile } = useAuth();
  const isAdmin = userProfile?.role === 'admin';
  const [metaMensal, setMetaMensal] = useState(metaAtual.metaMensal.toString());
  const [metaDiaria, setMetaDiaria] = useState(metaAtual.metaDiaria.toString());

  useEffect(() => {
    setMetaMensal(metaAtual.metaMensal.toString());
    setMetaDiaria(metaAtual.metaDiaria.toString());
  }, [metaAtual]);

  const handleSave = () => {
    const metaMensalNum = parseFloat(metaMensal) || 2000000;
    const metaDiariaNum = parseFloat(metaDiaria) || 100000;
    
    onSave({
      metaMensal: metaMensalNum,
      metaDiaria: metaDiariaNum
    });
    onClose();
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value.replace(/[^\d]/g, ''));
    if (isNaN(num)) return '';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  const handleMetaMensalChange = (value: string) => {
    const numericValue = value.replace(/[^\d]/g, '');
    setMetaMensal(numericValue);
  };

  const handleMetaDiariaChange = (value: string) => {
    const numericValue = value.replace(/[^\d]/g, '');
    setMetaDiaria(numericValue);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Configurar Metas de Faturamento</DialogTitle>
          {!isAdmin && (
            <p className="text-sm text-muted-foreground mt-2">
              Apenas administradores podem alterar as metas de faturamento.
            </p>
          )}
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="meta-mensal">Meta Mensal</Label>
            <Input
              id="meta-mensal"
              placeholder="2.000.000"
              value={formatCurrency(metaMensal)}
              onChange={(e) => handleMetaMensalChange(e.target.value)}
              disabled={!isAdmin}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="meta-diaria">Meta Diária</Label>
            <Input
              id="meta-diaria"
              placeholder="100.000"
              value={formatCurrency(metaDiaria)}
              onChange={(e) => handleMetaDiariaChange(e.target.value)}
              disabled={!isAdmin}
            />
          </div>
        </div>
        
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>
            {isAdmin ? 'Cancelar' : 'Fechar'}
          </Button>
          {isAdmin && (
            <Button onClick={handleSave}>
              Salvar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}