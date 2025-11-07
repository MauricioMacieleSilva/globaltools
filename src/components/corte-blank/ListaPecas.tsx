
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Play } from 'lucide-react';
import { useCorteBlanks, Peca } from '@/context/CorteBlanksContext';

export function ListaPecas() {
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
      <CardHeader>
        <CardTitle>Lista de Peças</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Formulário para adicionar nova peça */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 p-4 bg-muted/50 rounded-lg">
          <div>
            <Label htmlFor="nome">Nome (opcional)</Label>
            <Input
              id="nome"
              value={novaPeca.nome}
              onChange={(e) => handleInputChange('nome', e.target.value)}
              placeholder="Ex: Peça A"
            />
          </div>
          <div>
            <Label htmlFor="largura">Largura (mm)</Label>
            <Input
              id="largura"
              type="number"
              value={novaPeca.largura || ''}
              onChange={(e) => handleInputChange('largura', e.target.value)}
              min="1"
            />
          </div>
          <div>
            <Label htmlFor="altura">Comprimento (mm)</Label>
            <Input
              id="altura"
              type="number"
              value={novaPeca.altura || ''}
              onChange={(e) => handleInputChange('altura', e.target.value)}
              min="1"
            />
          </div>
          <div>
            <Label htmlFor="quantidade">Qtde</Label>
            <Input
              id="quantidade"
              type="number"
              value={novaPeca.quantidade}
              onChange={(e) => handleInputChange('quantidade', e.target.value)}
              min="1"
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handleAdicionarPeca} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </div>

        {/* Tabela de peças */}
        {pecas.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Largura (mm)</TableHead>
                <TableHead>Comprimento (mm)</TableHead>
                <TableHead>Qtde</TableHead>
                <TableHead>Área Total (m²)</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pecas.map((peca) => (
                <TableRow key={peca.id}>
                  <TableCell>
                    <Input
                      value={peca.nome}
                      onChange={(e) => handlePecaChange(peca.id, 'nome', e.target.value)}
                      placeholder="Nome da peça"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={peca.largura}
                      onChange={(e) => handlePecaChange(peca.id, 'largura', e.target.value)}
                      className="w-20"
                      min="1"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={peca.altura}
                      onChange={(e) => handlePecaChange(peca.id, 'altura', e.target.value)}
                      className="w-20"
                      min="1"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={peca.quantidade}
                      onChange={(e) => handlePecaChange(peca.id, 'quantidade', e.target.value)}
                      className="w-20"
                      min="1"
                    />
                  </TableCell>
                  <TableCell>
                    {((peca.largura * peca.altura * peca.quantidade) / 1000000).toFixed(3)} m²
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removerPeca(peca.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {pecas.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma peça adicionada. Use o formulário acima para adicionar peças.
          </div>
        )}

        {/* Botão Gerar Simulação */}
        {pecas.length > 0 && (
          <div className="flex justify-center pt-4">
            <Button 
              onClick={executarOtimizacao} 
              disabled={!podeExecutar}
              size="lg"
              className="min-w-[200px]"
            >
              <Play className="h-4 w-4 mr-2" />
              Gerar Simulação
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
