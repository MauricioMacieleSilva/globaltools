import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface TemperaturaExplanationProps {
  children?: React.ReactNode;
}

export function TemperaturaExplanation({ children }: TemperaturaExplanationProps) {
  const temperatureLevels = [
    {
      stars: "⭐⭐⭐⭐⭐",
      level: "Muito Forte",
      color: "🟢",
      description: "Cliente decidido, aguardando fechamento",
      actions: "Processo avançado de negociação"
    },
    {
      stars: "⭐⭐⭐⭐",
      level: "Forte", 
      color: "🟡",
      description: "Cliente engajado, negociação ativa",
      actions: "Interesse demonstrado, negociação em andamento"
    },
    {
      stars: "⭐⭐⭐",
      level: "Mediana",
      color: "🟠", 
      description: "Interesse sinalizado, houve proposta ou orçamento",
      actions: "Solicitação de proposta comercial"
    },
    {
      stars: "⭐⭐",
      level: "Fraca",
      color: "🔴",
      description: "Houve troca de mensagens, mas pouca clareza",
      actions: "Contato inicial, informações básicas"
    },
    {
      stars: "⭐",
      level: "Muito Fraca",
      color: "⚫",
      description: "Contato inicial ou desinteressado",
      actions: "Primeiro contato ou resposta fria"
    }
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="sm">
            <Info className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Níveis de Confiança dos Orçamentos</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            A classificação por estrelas ajuda a identificar o nível de interesse e probabilidade de fechamento de cada orçamento:
          </p>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Classificação</TableHead>
                <TableHead>Nível</TableHead>
                <TableHead>Indicador</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Características</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {temperatureLevels.map((level, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{level.stars}</TableCell>
                  <TableCell>
                    <span className="font-semibold">{level.level}</span>
                  </TableCell>
                  <TableCell className="text-center text-lg">{level.color}</TableCell>
                  <TableCell>{level.description}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{level.actions}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-semibold mb-2">Como usar:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Clique nas estrelas para classificar cada orçamento</li>
              <li>• Use o indicador de temperatura para visualizar o status geral</li>
              <li>• Priorize orçamentos com mais estrelas para acompanhamento</li>
              <li>• Atualize as classificações conforme evolui a negociação</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}