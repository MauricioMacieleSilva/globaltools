import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { fetchProducaoData, ProducaoData, MaterialData } from '@/services/producaoService';
import { loadProductionOrders, ProductionOrderData } from '@/services/productionOrdersService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useExcludedOrders } from '@/hooks/useExcludedOrders';

export interface HiddenProductionOrder {
  id: string;
  numero_pedido: string;
  hidden_by: string | null;
  hidden_by_name: string | null;
  hidden_at: string;
  motivo: string | null;
}

export interface MaterialAgregado {
  descricaomat: string;
  classe: string;
  quantidadeTotal: number;
  unidade: string;
  numPedidos: number;
  numPedidosAtrasados: number;
  pedidos: Array<{
    numero_pedido: string;
    cliente: string;
    atrasado: boolean;
    quantidade: number;
    concluido?: boolean;
  }>;
}

interface ProducaoContextType {
  data: ProducaoData[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refetchData: () => Promise<void>;
  
  // Filters
  selectedCliente: string;
  setSelectedCliente: (cliente: string) => void;
  selectedStatus: string;
  setSelectedStatus: (status: string) => void;
  
  // Filtered data
  filteredData: ProducaoData[];
  
  // Production Orders data
  productionOrders: Record<string, ProductionOrderData>;
  refreshProductionOrders: () => Promise<void>;
  
  // Hidden orders
  hiddenOrders: HiddenProductionOrder[];
  hideOrder: (numeroPedido: string, motivo?: string) => Promise<void>;
  unhideOrder: (numeroPedido: string) => Promise<void>;
  refreshHiddenOrders: () => Promise<void>;
  
  // Material agregado
  getMateriaisPendentesAgregados: () => MaterialAgregado[];
  
  // KPIs
  totalPedidos: number;
  quantidadeTotal: number;
  noPrazo: { count: number; peso: number };
  atrasados: { count: number; peso: number };
  programar: { count: number; peso: number };
  finalizado: { count: number; peso: number };
  parcialmenteFinalizado: { count: number; peso: number };
}

const ProducaoContext = createContext<ProducaoContextType | undefined>(undefined);

interface ProducaoProviderProps {
  children: ReactNode;
}

export function ProducaoProvider({ children }: ProducaoProviderProps) {
  const [data, setData] = useState<ProducaoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCliente, setSelectedCliente] = useState<string>('todos');
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');
  const [productionOrders, setProductionOrders] = useState<Record<string, ProductionOrderData>>({});
  const [hiddenOrders, setHiddenOrders] = useState<HiddenProductionOrder[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { toast } = useToast();
  const { excludedOrders: excludedOrderNumbers, refreshExcludedOrders } = useExcludedOrders();
  const previousStatusesRef = useRef<Record<string, string>>({});
  const isInitialLoadRef = useRef(true);

  // Auto-send notification when order status changes to FINALIZADO
  // This is a frontend fallback — the backend check-finalized-orders handles this automatically
  const sendAutoFinalizadoNotification = useCallback(async (pedido: ProducaoData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user is admin
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (!roleData || roleData.role !== 'admin') return;

      // Check if already notified by the backend to avoid duplicates
      const { data: alreadyNotified } = await supabase
        .from('notified_finalized_orders')
        .select('id')
        .eq('numero_pedido', pedido.numero_pedido)
        .maybeSingle();
      
      if (alreadyNotified) {
        console.log(`ℹ️ Pedido ${pedido.numero_pedido} já foi notificado pelo backend, ignorando.`);
        return;
      }

      // Load production order data for novo_prazo/situacao
      const orderData = productionOrders[pedido.numero_pedido];

      const situacaoMap: Record<string, string> = {
        'aguardando_mp': 'Aguardando MP',
        'em_producao': 'Em Produção',
        'material_em_estoque': 'Material em Estoque',
        'outra': 'Outra',
      };

      const pesoKg = Math.round(pedido.peso_total_kg || 0);

      const payload = {
        numero_pedido: pedido.numero_pedido,
        tipo: 'pedido_finalizado',
        cliente: pedido.cli_nomef,
        prazo: pedido.prazo_pcp,
        novo_prazo: orderData?.novo_prazo || undefined,
        situacao_producao: orderData?.situacao 
          ? (orderData.situacao === 'outra' && orderData.situacao_descricao 
            ? orderData.situacao_descricao 
            : situacaoMap[orderData.situacao] || orderData.situacao)
          : undefined,
        peso_total: `${pesoKg.toLocaleString('pt-BR')}KG`,
        percentual_concluido: pedido.percentual_concluido,
        ops: pedido.ops.map(op => {
          const nonKgUnits = Object.entries(op.pesos_por_unidade)
            .filter(([un]) => un !== 'KG' && un !== 'T')
            .map(([un, peso]) => `${peso.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}${un}`);
          const opPesoKg = Math.round(op.peso_total_kg || 0);
          const kgStr = `${opPesoKg.toLocaleString('pt-BR')}KG`;
          const pesoStr = nonKgUnits.length > 0 ? `${nonKgUnits.join(' / ')} | ${kgStr}` : kgStr;

          return {
            numero_op: op.numero_op,
            situacao_op: op.situacao_op,
            peso: pesoStr,
            materiais: op.materiais.map(mat => ({
              descricaomat: mat.descricaomat,
              observacao: mat.observacao,
              quantidade: mat.qtd_pendente,
              unidade: mat.un,
            })),
          };
        }),
      };

      const response = await supabase.functions.invoke('notify-production-status', {
        body: payload,
      });

      if (response.error) {
        console.error('Erro ao enviar notificação automática:', response.error);
      } else {
        console.log('📧 Notificação automática de pedido finalizado enviada:', pedido.numero_pedido);
        
        // Register in notified_finalized_orders to prevent duplicates with backend
        await supabase
          .from('notified_finalized_orders')
          .insert({ numero_pedido: pedido.numero_pedido })
          .then(({ error: insertErr }) => {
            if (insertErr) console.error('Erro ao registrar notificação:', insertErr);
          });

        toast({
          title: 'Notificação automática enviada',
          description: `Pedido ${pedido.numero_pedido} finalizado - e-mail enviado automaticamente.`,
        });
      }
    } catch (error) {
      console.error('Erro ao enviar notificação automática:', error);
    }
  }, [productionOrders, toast]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('ProducaoContext: Iniciando fetch de dados de produção - força refresh sem cache');
      const producaoData = await fetchProducaoData();
      console.log('ProducaoContext: Dados recebidos:', producaoData.length, 'pedidos');
      
      // Detect status changes to FINALIZADO
      if (!isInitialLoadRef.current) {
        const prevStatuses = previousStatusesRef.current;
        producaoData.forEach(pedido => {
          const prevStatus = prevStatuses[pedido.numero_pedido];
          if (prevStatus && prevStatus !== 'FINALIZADO' && pedido.status === 'FINALIZADO') {
            console.log(`🔔 Pedido ${pedido.numero_pedido} mudou para FINALIZADO (antes: ${prevStatus})`);
            sendAutoFinalizadoNotification(pedido);
          }
        });
      }
      
      // Save current statuses for next comparison
      const currentStatuses: Record<string, string> = {};
      producaoData.forEach(p => { currentStatuses[p.numero_pedido] = p.status; });
      previousStatusesRef.current = currentStatuses;
      isInitialLoadRef.current = false;
      
      setData(producaoData);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados de produção');
      console.error('Erro no ProducaoContext:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshProductionOrders = async () => {
    try {
      const orders = await loadProductionOrders();
      setProductionOrders(orders);
    } catch (err) {
      console.error('Erro ao carregar dados salvos de produção:', err);
    }
  };

  const refreshHiddenOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('hidden_production_orders')
        .select('*')
        .order('hidden_at', { ascending: false });

      if (error) throw error;
      console.log('Pedidos ocultos carregados:', data);
      setHiddenOrders(data || []);
    } catch (error) {
      console.error('Erro ao carregar pedidos ocultos:', error);
    }
  };

  const hideOrder = async (numeroPedido: string, motivo?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      const { error } = await supabase
        .from('hidden_production_orders')
        .insert({
          numero_pedido: numeroPedido,
          hidden_by: user.id,
          hidden_by_name: profile?.full_name || user.email,
          motivo: motivo || null,
        });

      if (error) throw error;

      console.log('Pedido ocultado:', numeroPedido);
      toast({
        title: 'Pedido ocultado',
        description: `Pedido ${numeroPedido} foi ocultado com sucesso.`,
      });

      await refreshHiddenOrders();
    } catch (error: any) {
      console.error('Erro ao ocultar pedido:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível ocultar o pedido.',
        variant: 'destructive',
      });
    }
  };

  const unhideOrder = async (numeroPedido: string) => {
    try {
      const { error } = await supabase
        .from('hidden_production_orders')
        .delete()
        .eq('numero_pedido', numeroPedido);

      if (error) throw error;

      console.log('Pedido reexibido:', numeroPedido);
      toast({
        title: 'Pedido reexibido',
        description: `Pedido ${numeroPedido} voltará a ser exibido.`,
      });

      await refreshHiddenOrders();
    } catch (error: any) {
      console.error('Erro ao reexibir pedido:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível reexibir o pedido.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchData();
    refreshProductionOrders();
    refreshHiddenOrders();

    // Auto-refresh a cada 30 minutos
    const intervalId = setInterval(() => {
      console.log('⏰ Auto-refresh de produção (30min)');
      fetchData();
      refreshProductionOrders();
      refreshHiddenOrders();
    }, 30 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, []);

  // Apply filters and sort
  const filteredData = data.filter(item => {
    // Filtrar pedidos ocultos na produção
    const hiddenOrderNumbers = new Set(hiddenOrders.map(o => o.numero_pedido));
    if (hiddenOrderNumbers.has(item.numero_pedido)) {
      return false;
    }
    // Filtrar pedidos excluídos do dashboard comercial
    if (excludedOrderNumbers.has(item.numero_pedido)) {
      return false;
    }
    
    if (selectedCliente !== 'todos' && item.cli_nomef !== selectedCliente) {
      return false;
    }
    if (selectedStatus !== 'todos' && item.status !== selectedStatus) {
      return false;
    }
    return true;
  }).sort((a, b) => {
    // First criteria: days delayed (higher first)
    const aDias = a.dias_atraso || 0;
    const bDias = b.dias_atraso || 0;
    
    if (aDias !== bDias) {
      return bDias - aDias; // Higher delay first
    }
    
    // Second criteria: status ordering (ATRASO > PARCIALMENTE_FINALIZADO > NO_PRAZO > PROGRAMAR > FINALIZADO)
    const statusOrder = { 
      'ATRASO': 1, 
      'PARCIALMENTE_FINALIZADO': 2, 
      'NO_PRAZO': 3, 
      'PROGRAMAR': 4, 
      'FINALIZADO': 5 
    };
    const aOrder = statusOrder[a.status as keyof typeof statusOrder] || 5;
    const bOrder = statusOrder[b.status as keyof typeof statusOrder] || 5;
    
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    
    // Third criteria: order number
    return a.numero_pedido.localeCompare(b.numero_pedido);
  });

  // Calculate KPIs - usando apenas KG para somas
  const getTotalWeight = (item: ProducaoData) => {
    return Object.entries(item.pesos_por_unidade).reduce((sum, [unidade, peso]) => {
      // Converter tudo para KG para cálculos de KPI
      if (unidade === 'T') return sum + (peso * 1000);
      if (unidade === 'KG') return sum + peso;
      // M não entra no cálculo de peso total
      return sum;
    }, 0);
  };
  
  const totalPedidos = filteredData.length;
  const quantidadeTotal = filteredData.reduce((sum, item) => sum + getTotalWeight(item), 0);
  
  const finalizadoItems = filteredData.filter(item => item.status === 'FINALIZADO');
  const finalizado = {
    count: finalizadoItems.length,
    peso: finalizadoItems.reduce((sum, item) => sum + getTotalWeight(item), 0)
  };

  const parcialmenteFinalizadoItems = filteredData.filter(item => item.status === 'PARCIALMENTE_FINALIZADO');
  const parcialmenteFinalizado = {
    count: parcialmenteFinalizadoItems.length,
    peso: parcialmenteFinalizadoItems.reduce((sum, item) => sum + getTotalWeight(item), 0)
  };
  
  const noPrazoItems = filteredData.filter(item => item.status === 'NO_PRAZO');
  const noPrazo = {
    count: noPrazoItems.length,
    peso: noPrazoItems.reduce((sum, item) => sum + getTotalWeight(item), 0)
  };

  const atrasadosItems = filteredData.filter(item => item.status === 'ATRASO');
  const atrasados = {
    count: atrasadosItems.length,
    peso: atrasadosItems.reduce((sum, item) => sum + getTotalWeight(item), 0)
  };
  
  const programarItems = filteredData.filter(item => item.status === 'PROGRAMAR');
  const programar = {
    count: programarItems.length,
    peso: programarItems.reduce((sum, item) => sum + getTotalWeight(item), 0)
  };

  const getMateriaisPendentesAgregados = (): MaterialAgregado[] => {
    const materiaisMap = new Map<string, MaterialAgregado>();
    
    // Iterar sobre todos os pedidos (incluindo finalizados para mostrar status concluído)
    filteredData.forEach((pedido) => {
      const isPedidoAtrasado = pedido.status === 'ATRASO';
      const isPedidoConcluido = pedido.status === 'FINALIZADO';
      
      // Para cada OP do pedido
      pedido.ops?.forEach((op) => {
        const situacaoOp = op.situacao_op?.toUpperCase() || '';
        const isOpConcluida = situacaoOp === 'FINALIZADA' || situacaoOp === 'CONCLUÍDO' || situacaoOp === 'CONCLUIDO';
        
        // Para cada material da OP
        op.materiais?.forEach((material) => {
          const key = `${material.descricaomat}_${material.un}_${material.classe}`;
          
          if (!materiaisMap.has(key)) {
            materiaisMap.set(key, {
              descricaomat: material.descricaomat,
              classe: material.classe || 'SEM CLASSE',
              quantidadeTotal: 0,
              unidade: material.un,
              numPedidos: 0,
              numPedidosAtrasados: 0,
              pedidos: [],
            });
          }
          
          const materialAgregado = materiaisMap.get(key)!;
          const qtdMaterial = material.qtd_pendente || 0;
          
          // Só soma quantidade se não estiver concluído
          if (!isOpConcluida && !isPedidoConcluido) {
            materialAgregado.quantidadeTotal += qtdMaterial;
          }
          
          // Verificar se já contamos este pedido (independente da OP)
          const pedidoExistente = materialAgregado.pedidos.find(
            p => p.numero_pedido === pedido.numero_pedido
          );
          
          if (!pedidoExistente) {
            // Pedido ainda não foi contado para este material
            materialAgregado.pedidos.push({
              numero_pedido: pedido.numero_pedido,
              cliente: pedido.cli_nomef,
              atrasado: isPedidoAtrasado,
              quantidade: qtdMaterial,
              concluido: isOpConcluida || isPedidoConcluido,
            });
            materialAgregado.numPedidos++; // Conta apenas pedidos únicos
            if (isPedidoAtrasado && !isOpConcluida && !isPedidoConcluido) {
              materialAgregado.numPedidosAtrasados++;
            }
          } else {
            // Pedido já existe, apenas somar quantidade (múltiplas OPs ou linhas)
            if (!isOpConcluida && !isPedidoConcluido) {
              pedidoExistente.quantidade += qtdMaterial;
            }
            // Atualiza para concluído se alguma OP está concluída
            if (isOpConcluida || isPedidoConcluido) {
              pedidoExistente.concluido = true;
            }
          }
        });
      });
    });
    
    // Converter map para array e ordenar por prioridade
    return Array.from(materiaisMap.values()).sort((a, b) => {
      // Priorizar materiais com pedidos atrasados
      if (a.numPedidosAtrasados !== b.numPedidosAtrasados) {
        return b.numPedidosAtrasados - a.numPedidosAtrasados;
      }
      // Depois por quantidade total
      return b.quantidadeTotal - a.quantidadeTotal;
    });
  };

  const value: ProducaoContextType = {
    data,
    loading,
    error,
    lastUpdated,
    refetchData: fetchData,
    selectedCliente,
    setSelectedCliente,
    selectedStatus,
    setSelectedStatus,
    filteredData,
    productionOrders,
    refreshProductionOrders,
    hiddenOrders,
    hideOrder,
    unhideOrder,
    refreshHiddenOrders,
    getMateriaisPendentesAgregados,
    totalPedidos,
    quantidadeTotal,
    noPrazo,
    atrasados,
    programar,
    finalizado,
    parcialmenteFinalizado
  };

  return <ProducaoContext.Provider value={value}>{children}</ProducaoContext.Provider>;
}

export function useProducao(): ProducaoContextType {
  const context = useContext(ProducaoContext);
  if (context === undefined) {
    throw new Error('useProducao must be used within a ProducaoProvider');
  }
  return context;
}