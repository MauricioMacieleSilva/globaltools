import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2 } from 'lucide-react';
import { usePerfilContext, CalculoItem, LinhaPerfilCartola } from '@/context/PerfilContext';
import { formatarNumero, gerarId, validarAbaMinima } from '@/lib/utils-perfil';
import { VisualizacaoPerfilPopover } from './VisualizacaoPerfilPopover';
import { useToast } from '@/hooks/use-toast';
import { IndicadorEstoqueDisponibilidade } from '@/components/estoque';

export function PerfilCartola() {
  const { atualizarCalculo, removerCalculo, linhasCartola, atualizarLinhaCartola } = usePerfilContext();
  const { toast } = useToast();
  const [errosValidacao, setErrosValidacao] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (linhasCartola.length === 0) {
      const linhasIniciais = Array.from({ length: 3 }, () => ({
        id: gerarId(), espessura: '', enrij1: '', aba1: '', base: '', aba2: '', enrij3: '',
        comprimento: '6000', largura: '1200', quantidade: '', percentualPerda: '103', assimetrico: false
      }));
      atualizarLinhaCartola(linhasIniciais);
    }
  }, [linhasCartola.length, atualizarLinhaCartola]);

  const calcularPerfil = (linha: LinhaPerfilCartola): CalculoItem | null => {
    const temErro = Object.keys(errosValidacao).some(key => key.startsWith(linha.id));
    if (temErro) return null;
    const espessura = parseFloat(linha.espessura) || 0;
    const enrij1 = parseFloat(linha.enrij1) || 0;
    const aba1 = parseFloat(linha.aba1) || 0;
    const base = parseFloat(linha.base) || 0;
    const aba2 = parseFloat(linha.aba2) || 0;
    const enrij3 = parseFloat(linha.enrij3) || 0;
    const comprimento = parseFloat(linha.comprimento) || 0;
    const largura = parseFloat(linha.largura) || 0;
    const quantidade = parseInt(linha.quantidade) || 0;
    const percentualPerda = parseFloat(linha.percentualPerda) || 0;
    if (espessura <= 0 || enrij1 <= 0 || aba1 <= 0 || base <= 0 || aba2 <= 0 || enrij3 <= 0 || comprimento <= 0 || largura <= 0 || quantidade <= 0) return null;
    const tira = enrij1 + aba1 + base + aba2 + enrij3 - (2 * espessura * 4);
    const tirasAproveitadas = Math.floor(largura / tira);
    const tiraPerda = largura - (tirasAproveitadas * tira);
    const pesoPorPeca = (espessura * comprimento / 1000) * (tira / 1000) * 8;
    const pesoTotal = quantidade * pesoPorPeca;
    const pesoPerda = pesoTotal * (percentualPerda / 100);
    const pesoPerdaPorPeca = (espessura * comprimento / 1000) * (tiraPerda / 1000) * 8;
    return { id: linha.id, tipo: 'CARTOLA', espessura, aba1, base, aba2, enrij1, enrij3, comprimento, largura, quantidade, percentualPerda, tira, tirasAproveitadas, tiraPerda, pesoPorPeca, pesoTotal, pesoPerda, pesoPerdaPorPeca };
  };

  const validarCampo = (id: string, campo: 'aba1' | 'aba2' | 'base' | 'enrij1' | 'enrij3', valor: string) => {
    const linha = linhasCartola.find(l => l.id === id);
    if (!linha) return;
    const espessura = parseFloat(linha.espessura);
    const valorNum = parseFloat(valor);
    if (!valor || isNaN(valorNum)) { setErrosValidacao(prev => { const n = {...prev}; delete n[`${id}-${campo}`]; return n; }); return; }
    if (!isNaN(espessura) && !isNaN(valorNum)) {
      const validacao = validarAbaMinima(espessura, valorNum);
      if (!validacao.valida && validacao.abaMinimaPermitida) {
        setErrosValidacao(prev => ({ ...prev, [`${id}-${campo}`]: validacao.mensagem }));
        toast({ title: 'Valor inválido', description: validacao.mensagem, variant: "destructive" });
      } else { setErrosValidacao(prev => { const n = {...prev}; delete n[`${id}-${campo}`]; return n; }); }
    }
  };

  const atualizarLinha = (id: string, campo: keyof LinhaPerfilCartola, valor: string | boolean) => {
    const updatedLinhas = linhasCartola.map(l => {
      if (l.id === id) {
        const novaLinha = { ...l, [campo]: valor };
        if (!novaLinha.assimetrico) {
          if (campo === 'enrij1') novaLinha.enrij3 = valor as string;
          else if (campo === 'aba1') novaLinha.aba2 = valor as string;
          else if (campo === 'assimetrico' && valor === false) { novaLinha.enrij3 = novaLinha.enrij1; novaLinha.aba2 = novaLinha.aba1; }
        }
        return novaLinha;
      }
      return l;
    });
    atualizarLinhaCartola(updatedLinhas);
  };

  const adicionarLinha = () => {
    atualizarLinhaCartola([...linhasCartola, { id: gerarId(), espessura: '', enrij1: '', aba1: '', base: '', aba2: '', enrij3: '', comprimento: '6000', largura: '1200', quantidade: '', percentualPerda: '103', assimetrico: false }]);
  };

  const limparLinha = (id: string) => {
    atualizarLinhaCartola(linhasCartola.map(l => l.id === id ? { ...l, espessura: '', enrij1: '', aba1: '', base: '', aba2: '', enrij3: '', comprimento: '6000', largura: '1200', quantidade: '', percentualPerda: '103', assimetrico: false } : l));
    removerCalculo(id);
    setErrosValidacao(prev => { const n = {...prev}; Object.keys(n).filter(k => k.startsWith(id)).forEach(k => delete n[k]); return n; });
  };

  useEffect(() => { linhasCartola.forEach(linha => { const calculo = calcularPerfil(linha); if (calculo) atualizarCalculo(linha.id, calculo); }); }, [linhasCartola]);

  const totalPeso = linhasCartola.reduce((s, l) => s + (calcularPerfil(l)?.pesoTotal || 0), 0);
  const totalPerda = linhasCartola.reduce((s, l) => { const c = calcularPerfil(l); return s + ((c?.pesoPerdaPorPeca || 0) * (c?.quantidade || 0)); }, 0);

  const headers = ['Sim', 'Esp.', 'Enrj1', 'Aba1', 'Base', 'Aba2', 'Enrj2', 'Comp.', 'Larg.', 'Qt.', '%P', 'Tira', 'T.Prd', 'kg/Pç', 'kg/Prd', 'P.T', 'P.+', 'Est', 'Ver', 'Ação'];

  return (
    <div className="space-y-4">
      <div className="grid gap-1 text-[10px] font-medium text-muted-foreground border-b pb-2" style={{ gridTemplateColumns: 'repeat(20, minmax(0, 1fr))' }}>
        {headers.map((h, i) => (<div key={i} className="text-center">{h}</div>))}
      </div>

      <div className="space-y-2">
        {linhasCartola.map(linha => {
          const calculo = calcularPerfil(linha);
          const espessura = parseFloat(linha.espessura) || 0;
          const base = parseFloat(linha.base) || 0;
          const aba1 = parseFloat(linha.aba1) || 0;
          
          return (
            <div key={linha.id} className="grid gap-1 items-center p-1.5 bg-background rounded border" style={{ gridTemplateColumns: 'repeat(20, minmax(0, 1fr))' }}>
              <div className="flex justify-center"><Checkbox checked={!linha.assimetrico} onCheckedChange={(c) => atualizarLinha(linha.id, 'assimetrico', !c)} className="h-4 w-4" /></div>
              <Input type="number" step="0.01" placeholder="0" value={linha.espessura} onChange={e => atualizarLinha(linha.id, 'espessura', e.target.value)} className="text-center text-[10px] h-7 px-1" />
              <Input type="number" placeholder="0" value={linha.enrij1} onChange={e => atualizarLinha(linha.id, 'enrij1', e.target.value)} onBlur={e => validarCampo(linha.id, 'enrij1', e.target.value)} className={`text-center text-[10px] h-7 px-1 ${errosValidacao[`${linha.id}-enrij1`] ? 'border-destructive' : ''}`} />
              <Input type="number" placeholder="0" value={linha.aba1} onChange={e => atualizarLinha(linha.id, 'aba1', e.target.value)} onBlur={e => validarCampo(linha.id, 'aba1', e.target.value)} className={`text-center text-[10px] h-7 px-1 ${errosValidacao[`${linha.id}-aba1`] ? 'border-destructive' : ''}`} />
              <Input type="number" placeholder="0" value={linha.base} onChange={e => atualizarLinha(linha.id, 'base', e.target.value)} onBlur={e => validarCampo(linha.id, 'base', e.target.value)} className={`text-center text-[10px] h-7 px-1 ${errosValidacao[`${linha.id}-base`] ? 'border-destructive' : ''}`} />
              <Input type="number" placeholder="0" value={linha.aba2} onChange={e => atualizarLinha(linha.id, 'aba2', e.target.value)} className={`text-center text-[10px] h-7 px-1 ${!linha.assimetrico ? 'bg-muted text-muted-foreground' : ''}`} disabled={!linha.assimetrico} />
              <Input type="number" placeholder="0" value={linha.enrij3} onChange={e => atualizarLinha(linha.id, 'enrij3', e.target.value)} className={`text-center text-[10px] h-7 px-1 ${!linha.assimetrico ? 'bg-muted text-muted-foreground' : ''}`} disabled={!linha.assimetrico} />
              <Input type="number" placeholder="6000" value={linha.comprimento} onChange={e => atualizarLinha(linha.id, 'comprimento', e.target.value)} className="text-center text-[10px] h-7 px-1" />
              <Input type="number" placeholder="1200" value={linha.largura} onChange={e => atualizarLinha(linha.id, 'largura', e.target.value)} className="text-center text-[10px] h-7 px-1" />
              <Input type="number" placeholder="0" value={linha.quantidade} onChange={e => atualizarLinha(linha.id, 'quantidade', e.target.value)} className="text-center text-[10px] h-7 px-1" />
              <Input type="number" value={linha.percentualPerda} onChange={e => atualizarLinha(linha.id, 'percentualPerda', e.target.value)} className="text-center text-[10px] h-7 px-1" />
              <div className="text-center text-[10px] text-muted-foreground">{calculo ? Math.ceil(calculo.tira) : '-'}</div>
              <div className="text-center text-[10px] text-muted-foreground">{calculo ? Math.ceil(calculo.tiraPerda) : '-'}</div>
              <div className="text-center text-[10px] text-muted-foreground">{calculo ? formatarNumero(calculo.pesoPorPeca) : '-'}</div>
              <div className="text-center text-[10px] text-muted-foreground">{calculo ? formatarNumero(calculo.pesoPerdaPorPeca) : '-'}</div>
              <div className="text-center text-[10px] font-medium text-primary">{calculo ? formatarNumero(calculo.pesoTotal) : '-'}</div>
              <div className="text-center text-[10px] font-medium text-destructive">{calculo ? formatarNumero(calculo.pesoPerda) : '-'}</div>
              <IndicadorEstoqueDisponibilidade
                tipoPerfil="CARTOLA"
                espessura={espessura}
                base={base}
                aba1={aba1}
                aba2={parseFloat(linha.aba2) || undefined}
              />
              <div className="flex justify-center">{calculo ? <VisualizacaoPerfilPopover calculo={calculo} tipoPerfil="Cartola" /> : <span className="text-muted-foreground text-[10px]">-</span>}</div>
              <div className="flex justify-center"><Button variant="ghost" size="sm" onClick={() => limparLinha(linha.id)} className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3 w-3" /></Button></div>
            </div>
          );
        })}
      </div>

      <Button onClick={adicionarLinha} className="w-full" variant="outline" size="sm"><Plus className="h-3 w-3 mr-1" />Adicionar Linha</Button>

      <div className="bg-primary/5 p-3 rounded-lg border border-primary/20">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center"><div className="text-xs text-muted-foreground">Peso Total</div><div className="text-lg font-bold text-primary">{formatarNumero(totalPeso)} kg</div></div>
          <div className="text-center"><div className="text-xs text-muted-foreground">Peso de Perda</div><div className="text-lg font-bold text-destructive">{formatarNumero(totalPerda)} kg</div></div>
        </div>
      </div>
    </div>
  );
}
