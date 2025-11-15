import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { parseDate } from '@/lib/utils-comercial';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface Comment {
  id: string;
  comment: string;
  user_name: string;
  created_at: string;
}

interface Rating {
  budget_number: string;
  rating: number;
  user_name: string;
  created_at: string;
}

export function useOrcamentosData() {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  
  const [expandedPedidos, setExpandedPedidos] = useState<Set<string>>(new Set());
  const [selectedBudget, setSelectedBudget] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [ratings, setRatings] = useState<Record<string, Rating>>({});
  const [loading, setLoading] = useState(false);

  const loadComments = async (budgetNumber: string) => {
    // Sem banco de dados, não há comentários
  };

  const loadRatings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('client_budget_ratings')
        .select('*');

      if (error) {
        console.error('Erro ao carregar classificações:', error);
        return;
      }

      // Criar mapeamento de budget_number -> rating
      const ratingsMap: Record<string, Rating> = {};
      data?.forEach(rating => {
        ratingsMap[rating.budget_number] = rating as Rating;
      });
      
      setRatings(ratingsMap);
    } catch (error) {
      console.error('Erro ao carregar classificações:', error);
    } finally {
      setLoading(false);
    }
  };

  const addComment = async () => {
    // Sem banco de dados, não é possível adicionar comentários
    toast({
      title: "Indisponível",
      description: "Comentários não disponíveis sem banco de dados.",
      variant: "destructive"
    });
  };

  const setRating = async (budgetNumber: string, rating: number) => {
    if (!userProfile) {
      toast({
        title: "Erro",
        description: "Você precisa estar autenticado para classificar orçamentos.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Atualizar estado local imediatamente para feedback rápido
      const newRating: Rating = {
        budget_number: budgetNumber,
        rating: rating,
        user_name: userProfile.full_name || userProfile.email,
        created_at: new Date().toISOString()
      };
      
      setRatings(prev => ({
        ...prev,
        [budgetNumber]: newRating
      }));

      // Salvar no banco de dados
      const { error } = await supabase
        .from('client_budget_ratings')
        .upsert({
          budget_number: budgetNumber,
          rating: rating,
          user_name: userProfile.full_name || userProfile.email
        }, {
          onConflict: 'budget_number'
        });

      if (error) {
        console.error('Erro ao salvar classificação:', error);
        toast({
          title: "Erro",
          description: "Não foi possível salvar a classificação.",
          variant: "destructive"
        });
        // Reverter estado local em caso de erro
        await loadRatings();
        return;
      }

      toast({
        title: "Classificação salva",
        description: `Orçamento classificado com ${rating} estrela${rating !== 1 ? 's' : ''}.`
      });
    } catch (error) {
      console.error('Erro ao salvar classificação:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a classificação.",
        variant: "destructive"
      });
      // Reverter estado local em caso de erro
      await loadRatings();
    }
  };

  const openCommentsDialog = (budgetNumber: string) => {
    setSelectedBudget(budgetNumber);
    loadComments(budgetNumber);
  };

  const togglePedido = (pedidoNumber: string) => {
    const newExpanded = new Set(expandedPedidos);
    if (newExpanded.has(pedidoNumber)) {
      newExpanded.delete(pedidoNumber);
    } else {
      newExpanded.add(pedidoNumber);
    }
    setExpandedPedidos(newExpanded);
  };

  const groupedData = (data: any[]) => {
    const groups: Record<string, any[]> = {};
    data.forEach(item => {
      const pedidoKey = item.numeropedido || 'Sem Pedido';
      if (!groups[pedidoKey]) {
        groups[pedidoKey] = [];
      }
      groups[pedidoKey].push(item);
    });

    // Ordenar os grupos por data do mais novo para o mais antigo
    const sortedGroups: Record<string, any[]> = {};
    Object.entries(groups)
      .sort(([, itemsA], [, itemsB]) => {
        const dataA = parseDate(itemsA[0]?.data_pedido_pronto || '1900-01-01')?.getTime() || 0;
        const dataB = parseDate(itemsB[0]?.data_pedido_pronto || '1900-01-01')?.getTime() || 0;
        return dataB - dataA; // Mais novo primeiro
      })
      .forEach(([key, items]) => {
        sortedGroups[key] = items;
      });

    return sortedGroups;
  };

  const groupedDataWithRatings = (data: any[], ratingsData: Record<string, Rating>) => {
    const groups: Record<string, any[]> = {};
    data.forEach(item => {
      const pedidoKey = item.numeropedido || 'Sem Pedido';
      if (!groups[pedidoKey]) {
        groups[pedidoKey] = [];
      }
      groups[pedidoKey].push(item);
    });

    // Ordenar os grupos por classificação (estrelas) e retornar array de tuplas para preservar ordem
    return Object.entries(groups)
      .sort(([pedidoA, itemsA], [pedidoB, itemsB]) => {
        const ratingA = ratingsData[pedidoA]?.rating || 1; // Padrão 1 (mínimo obrigatório)
        const ratingB = ratingsData[pedidoB]?.rating || 1; // Padrão 1 (mínimo obrigatório)
        
        // Ordenação única por classificação (mais estrelas primeiro)
        return ratingB - ratingA;
      });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    if (!dateString || dateString === 'Invalid Date') return '-';
    const date = parseDate(dateString);
    return !date ? '-' : date.toLocaleDateString('pt-BR');
  };

  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return (value / 1000000).toLocaleString('pt-BR', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      }) + 'mi';
    } else if (value >= 1000) {
      return Math.round(value / 1000) + 'k';
    } else {
      return value.toLocaleString('pt-BR');
    }
  };

  const calculateTemperatureStats = (data: any[], ratingsData: Record<string, Rating>) => {
    const groups: Record<string, any[]> = {};
    data.forEach(item => {
      const pedidoKey = item.numeropedido || 'Sem Pedido';
      if (!groups[pedidoKey]) {
        groups[pedidoKey] = [];
      }
      groups[pedidoKey].push(item);
    });

    const stats = {
      total: Object.keys(groups).length,
      estrelas5: 0,
      estrelas4: 0,
      estrelas3: 0,
      estrelas2: 0,
      estrelas1: 0,
      semClassificacao: 0,
      valores: {
        estrelas5: 0,
        estrelas4: 0,
        estrelas3: 0,
        estrelas2: 0,
        estrelas1: 0,
        semClassificacao: 0
      }
    };

    Object.keys(groups).forEach(pedidoKey => {
      const rating = ratingsData[pedidoKey]?.rating || 1; // Padrão 1 (mínimo obrigatório)
      const totalPedido = groups[pedidoKey].reduce((sum, item) => sum + item.valor, 0);
      
      switch (rating) {
        case 5:
          stats.estrelas5++;
          stats.valores.estrelas5 += totalPedido;
          break;
        case 4:
          stats.estrelas4++;
          stats.valores.estrelas4 += totalPedido;
          break;
        case 3:
          stats.estrelas3++;
          stats.valores.estrelas3 += totalPedido;
          break;
        case 2:
          stats.estrelas2++;
          stats.valores.estrelas2 += totalPedido;
          break;
        case 1:
          stats.estrelas1++;
          stats.valores.estrelas1 += totalPedido;
          break;
        default:
          // Não deveria chegar aqui com rating mínimo de 1
          stats.estrelas1++;
          stats.valores.estrelas1 += totalPedido;
          break;
      }
    });

    return stats;
  };

  // Carregar ratings ao montar
  useEffect(() => {
    loadRatings();
  }, []);

  return {
    // Estados
    expandedPedidos,
    selectedBudget,
    newComment,
    comments,
    ratings,
    loading,
    
    // Setters
    setNewComment,
    setSelectedBudget,
    
    // Funções
    loadComments,
    loadRatings,
    addComment,
    setRating,
    openCommentsDialog,
    togglePedido,
    groupedData,
    groupedDataWithRatings,
    calculateTemperatureStats,
    formatCurrency,
    formatDate,
    formatValue
  };
}