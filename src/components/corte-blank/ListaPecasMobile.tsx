import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Play, Package } from 'lucide-react';
import { useCorteBlanks, Peca } from '@/context/CorteBlanksContext';

export function ListaPecasMobile() {
  const { pecas, adicionarPeca, removerPeca, atualizarPeca, executarOtimizacao } = useCorteBlanks();
  const [novaPeca, setNovaPeca] = useState<Omit<Peca, 'id'>>({
    nome: '',
    largura: 0,
    altura: 0,
    quantidade: 1
  });

  const handleAdicionarPeca = () => {
    if (novaPeca.largura > 0 && novaPeca.altura > 0) {
      adicionarPeca(novaPeca as Peca);
      setNovaPeca({
        nome: '',
        largura: 0,
        altura: 0,
        quantidade: 1
      });
    }
  };

  const handleInputChange = (field: keyof Omit<Peca, 'id'>, value: string) => {
    setNovaPeca(prev => ({
      ...prev,
      [field]: field === 'nome' ? value : parseFloat(value) || 0
    }));
  };

  const handlePecaChange = (id: string, field: keyof Peca, value: string) => {
    const peca = pecas.find(p => p.id === id);
    if (peca) {
      const updatedPeca = {
        ...peca,
        [field]: field === 'nome' ? value : parseFloat(value) || 0
      };
      atualizarPeca(id, updatedPeca);
    }
  };

  const podeExecutar = pecas.length > 0 && pecas.some(p => p.quantidade > 0);

  return (
    <Card>
      <CardHeader className="p-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="h-5 w-5" />
          Lista de Peças
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-4">
        {/* Formulário para adicionar nova peça */}
        <div className="p-3 bg-muted/50 rounded-lg space-y-3">
          <div>
            <Label htmlFor="nome" className="text-xs">Nome (opcional)</Label>
            <Input
              id="nome"
              value={novaPeca.nome}
              onChange={(e) => handleInputChange('nome', e.target.value)}
              placeholder="Ex: Peça A"
              className="h-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="largura" className="text-xs">Largura (mm)</Label>
              <Input
                id="largura"
                type="number"
                value={novaPeca.largura || ''}
                onChange={(e) => handleInputChange('largura', e.target.value)}
                min="1"
                className="h-9"
              />
            </div>
            <div>
              <Label htmlFor="altura" className="text-xs">Comprimento (mm)</Label>
              <Input
                id="altura"
                type="number"
                value={novaPeca.altura || ''}
                onChange={(e) => handleInputChange('altura', e.target.value)}
                min="1"
                className="h-9"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="quantidade" className="text-xs">Quantidade</Label>
              <Input
                id="quantidade"
                type="number"
                value={novaPeca.quantidade}
                onChange={(e) => handleInputChange('quantidade', e.target.value)}
                min="1"
                className="h-9"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAdicionarPeca} className="w-full h-9">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>
          </div>
        </div>

        {/* Lista de peças em cards */}
        {pecas.length > 0 && (
          <div className="space-y-3">
            {pecas.map((peca, index) => (
              <Card key={peca.id} className="overflow-hidden">
                <CardContent className="p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {peca.nome || `Peça ${index + 1}`}
                    </span>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removerPeca(peca.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Largura (mm)</Label>
                      <Input
                        type="number"
                        value={peca.largura}
                        onChange={(e) => handlePecaChange(peca.id, 'largura', e.target.value)}
                        min="1"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Comprimento (mm)</Label>
                      <Input
                        type="number"
                        value={peca.altura}
                        onChange={(e) => handlePecaChange(peca.id, 'altura', e.target.value)}
                        min="1"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Quantidade</Label>
                      <Input
                        type="number"
                        value={peca.quantidade}
                        onChange={(e) => handlePecaChange(peca.id, 'quantidade', e.target.value)}
                        min="1"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="flex items-end">
                      <div className="bg-muted/50 rounded px-2 py-1 w-full text-center">
                        <span className="text-xs text-muted-foreground">Área: </span>
                        <span className="text-sm font-medium">
                          {((peca.largura * peca.altura * peca.quantidade) / 1000000).toFixed(3)} m²
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {pecas.length === 0 && (
          <div className="text-center py-6 text-muted-foreground text-sm">
            Nenhuma peça adicionada. Use o formulário acima para adicionar peças.
          </div>
        )}

        {/* Botão Gerar Simulação */}
        {pecas.length > 0 && (
          <Button 
            onClick={executarOtimizacao} 
            disabled={!podeExecutar}
            className="w-full"
          >
            <Play className="h-4 w-4 mr-2" />
            Gerar Simulação
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
