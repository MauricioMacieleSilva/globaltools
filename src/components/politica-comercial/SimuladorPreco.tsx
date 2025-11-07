import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { usePoliticaComercial } from '@/context/PoliticaComercialContext';
import { Calculator, AlertTriangle, Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
export function SimuladorPreco() {
  const {
    simulador,
    setSimulador,
    calcularSimulacao,
    calcularDesconto,
    classeAtiva
  } = usePoliticaComercial();
  const [resultado, setResultado] = useState(calcularSimulacao(simulador));
  const [tipoPrecoTelha, setTipoPrecoTelha] = useState<'kg' | 'm2'>('m2');
  const [precoOriginalM2, setPrecoOriginalM2] = useState(simulador.precoBase);
  // Funções de conversão de preço
  const converterPrecoM2ParaKg = (precoM2: number, espessura: number): number => {
    return precoM2 / (espessura * 1.2 * 8 * 0.96);
  };

  const converterPrecoKgParaM2 = (precoKg: number, espessura: number): number => {
    return precoKg * (espessura * 1.2 * 8 * 0.96);
  };

  useEffect(() => {
    const novoResultado = calcularSimulacao(simulador);
    setResultado(novoResultado);
  }, [simulador, calcularSimulacao]);

  // Efeito para armazenar preço original quando precoBase muda
  useEffect(() => {
    if (classeAtiva === 'TELHAS' && tipoPrecoTelha === 'm2') {
      setPrecoOriginalM2(simulador.precoBase);
    }
  }, [simulador.precoBase, classeAtiva, tipoPrecoTelha]);

  // Efeito para conversão quando tipo de preço muda
  useEffect(() => {
    if (classeAtiva === 'TELHAS') {
      const espessura = simulador.espessura || 0.5;
      
      if (tipoPrecoTelha === 'kg' && precoOriginalM2) {
        const precoKg = converterPrecoM2ParaKg(precoOriginalM2, espessura);
        setSimulador({
          ...simulador,
          precoBase: parseFloat(precoKg.toFixed(2))
        });
      } else if (tipoPrecoTelha === 'm2' && precoOriginalM2) {
        setSimulador({
          ...simulador,
          precoBase: precoOriginalM2
        });
      }
    }
  }, [tipoPrecoTelha, classeAtiva]);

  // Efeito para recalcular preço quando espessura muda no modo KG
  useEffect(() => {
    if (classeAtiva === 'TELHAS' && tipoPrecoTelha === 'kg' && precoOriginalM2) {
      const espessura = simulador.espessura || 0.5;
      const precoKg = converterPrecoM2ParaKg(precoOriginalM2, espessura);
      setSimulador({
        ...simulador,
        precoBase: parseFloat(precoKg.toFixed(2))
      });
    }
  }, [simulador.espessura, tipoPrecoTelha, classeAtiva, precoOriginalM2]);

  const handleTipoPrecoChange = (tipo: 'kg' | 'm2') => {
    if (classeAtiva === 'TELHAS') {
      const espessura = simulador.espessura || 0.5;
      
      if (tipo === 'kg' && tipoPrecoTelha === 'm2') {
        // Convertendo de M² para KG
        setPrecoOriginalM2(simulador.precoBase);
        const precoKg = converterPrecoM2ParaKg(simulador.precoBase, espessura);
        setSimulador({
          ...simulador,
          precoBase: parseFloat(precoKg.toFixed(2))
        });
      } else if (tipo === 'm2' && tipoPrecoTelha === 'kg') {
        // Voltando para M²
        setSimulador({
          ...simulador,
          precoBase: precoOriginalM2
        });
      }
    }
    setTipoPrecoTelha(tipo);
  };
  const handleInputChange = (field: string, value: string | number | undefined) => {
    if (field === 'descontoManual') {
      setSimulador({
        ...simulador,
        [field]: value === undefined || value === '' ? undefined : typeof value === 'string' ? parseFloat(value) || 0 : value
      });
    } else {
      setSimulador({
        ...simulador,
        [field]: typeof value === 'string' ? parseFloat(value) || 0 : value
      });
    }
  };
  return <Card className="sticky top-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="h-4 w-4" />
          Simulador de Preço
        </CardTitle>
        <CardDescription className="text-xs">
          Calcule o preço final com ICMS, desconto e condições comerciais
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {/* Campos de Entrada */}
        <div className="space-y-2">
          <div>
            <Label htmlFor="precoBase" className="text-xs">Preço da Tabela (c/ 12% ICMS)</Label>
            <Input id="precoBase" type="number" step="0.01" value={simulador.precoBase} onChange={e => handleInputChange('precoBase', e.target.value)} placeholder="0,00" className="h-8 text-sm" />
          </div>

          {classeAtiva === 'TELHAS' && (
            <>
              <div>
                <Label className="text-xs">Tipo de Preço</Label>
                <div className="flex gap-2">
                  <Button
                    variant={tipoPrecoTelha === 'kg' ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 text-xs flex-1"
                    onClick={() => handleTipoPrecoChange('kg')}
                  >
                    Preço/KG
                  </Button>
                  <Button
                    variant={tipoPrecoTelha === 'm2' ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 text-xs flex-1"
                    onClick={() => handleTipoPrecoChange('m2')}
                  >
                    Preço/M²
                  </Button>
                </div>
              </div>
              {tipoPrecoTelha === 'kg' && (
                <div>
                  <Label htmlFor="espessura" className="text-xs">Espessura</Label>
                  <Input id="espessura" type="number" step="0.01" value={simulador.espessura ?? ''} onChange={e => handleInputChange('espessura', e.target.value)} placeholder="0,50" className="h-8 text-sm" />
                </div>
              )}
            </>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="icms" className="text-xs">% ICMS</Label>
              <div className="flex items-center gap-1">
                <Select value={simulador.icms.toString()} onValueChange={(value) => handleInputChange('icms', parseFloat(value))}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="12%" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">4%</SelectItem>
                    <SelectItem value="7">7%</SelectItem>
                    <SelectItem value="12">12%</SelectItem>
                    <SelectItem value="17">17%</SelectItem>
                  </SelectContent>
                </Select>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                      <Info className="h-3 w-3" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>Tabela de ICMS Interestadual</DialogTitle>
                    </DialogHeader>
                    <div className="flex justify-center">
                      <img 
                        src="/lovable-uploads/720a3884-35c7-4421-96d1-5c29d67d1fb4.png" 
                        alt="Tabela de ICMS Interestadual" 
                        className="max-w-full h-auto"
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            <div>
              <Label htmlFor="peso" className="text-xs">Peso (KG)</Label>
              <Input id="peso" type="number" value={simulador.peso === 1000 ? '' : simulador.peso} onChange={e => handleInputChange('peso', e.target.value)} placeholder="1000" className="h-8 text-sm" />
            </div>
          </div>

          <div>
            <Label htmlFor="condicao" className="text-xs">Condição Pagamento</Label>
            <Input id="condicao" type="text" value={simulador.condicaoPagamento === 'À Vista' ? '' : simulador.condicaoPagamento} onChange={e => handleInputChange('condicaoPagamento', e.target.value)} placeholder="À Vista, 30 dias, etc." className="h-8 text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="desconto" className="text-xs">% Desconto</Label>
              <Input id="desconto" type="number" step="0.1" value={simulador.descontoManual || ''} onChange={e => handleInputChange('descontoManual', e.target.value || undefined)} placeholder={`${calcularDesconto(simulador.peso)}%`} className="h-8 text-sm" />
            </div>
            <div>
              <Label htmlFor="financeiro" className="text-xs">% Financeiro</Label>
              <Input id="financeiro" type="number" step="0.1" value={simulador.financeiro} onChange={e => handleInputChange('financeiro', e.target.value)} placeholder="0" className="h-8 text-sm" />
            </div>
          </div>

          <div>
            <Label htmlFor="frete" className="text-xs">Valor do Frete (R$)</Label>
            <Input id="frete" type="number" step="0.01" value={simulador.frete} onChange={e => handleInputChange('frete', e.target.value)} placeholder="0,00" className="h-8 text-sm" />
          </div>
        </div>

        {/* Separador */}
        <div className="border-t pt-2">
          <h4 className="font-medium text-xs mb-2">Resultado da Simulação</h4>
        </div>

        {/* Resultados */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span>Preço com ICMS:</span>
            <span className="font-medium">
              {resultado.precoComIcms.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL'
            })}
            </span>
          </div>

          <div className="flex justify-between text-xs">
            <span>% Desconto:</span>
            <span className="font-medium">
              {simulador.descontoManual !== undefined ? `${simulador.descontoManual}%` : 'Não aplicado'}
            </span>
          </div>

          <div className="flex justify-between text-xs">
            <span>% Financeiro:</span>
            <span className="font-medium">{simulador.financeiro}%</span>
          </div>

          {simulador.frete > 0 && (
            <div className="flex justify-between text-xs">
              <span>Frete:</span>
              <span className="font-medium">
                {simulador.frete.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                })}
              </span>
            </div>
          )}

          <div className="flex justify-between text-xs">
            <span>Preço Unitário:</span>
            <span className="font-medium">
              {resultado.precoUnitario.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              })}
            </span>
          </div>

          <div className="flex justify-between text-sm font-semibold border-t pt-1.5">
            <span>Preço Total:</span>
            <span className="text-primary">
              {resultado.precoTotal.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL'
            })}
            </span>
          </div>
        </div>

        {/* Alerta para desconto alto */}
        {resultado.precisaAprovacao && (
          <Alert className="bg-amber-50 border-amber-200 py-2">
            <AlertTriangle className="h-3 w-3 text-amber-600" />
            <AlertDescription className="text-amber-800 text-xs">
              <p className="font-medium">Atenção!</p>
              <p>Desconto de {simulador.descontoManual}% excede o máximo de {calcularDesconto(simulador.peso)}%, conforme faixa de volume da política comercial.</p>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>;
}