import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Star, MessageSquare, Search, Target } from "lucide-react";
import { useComercial } from "@/context/ComercialContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

export function OrcamentosTable() {
  const { data } = useComercial();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBudget, setSelectedBudget] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [ratings, setRatings] = useState<Record<string, Rating>>({});
  const [loading, setLoading] = useState(false);
  const [sdrBudgets, setSdrBudgets] = useState<Set<string>>(new Set());

  // Filtrar orçamentos únicos
  const orcamentos = useMemo(() => {
    if (!data) return [];
    
    const orcamentosMap = new Map();
    data
      .filter(item => item.situacao === "Orçamento" && item.idtiponf === 1)
      .forEach(item => {
        const key = item.numeropedido;
        if (!orcamentosMap.has(key)) {
          orcamentosMap.set(key, {
            numero_pedido: item.numeropedido,
            cliente: item.cliente,
            vendedor: item.vendedor,
            valor_total: item.valor,
            data_emissao: item.data_emissao,
            dias_orcamento: Math.floor((new Date().getTime() - new Date(item.data_emissao).getTime()) / (1000 * 60 * 60 * 24))
          });
        }
      });
    
    return Array.from(orcamentosMap.values())
      .filter(orcamento => 
        searchTerm === "" || 
        orcamento.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        orcamento.numero_pedido.toString().includes(searchTerm) ||
        (orcamento.vendedor && orcamento.vendedor.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .sort((a, b) => new Date(b.data_emissao).getTime() - new Date(a.data_emissao).getTime());
  }, [data, searchTerm]);

  const loadSdrBudgets = async () => {
    try {
      const { data: leadsData, error } = await supabase
        .from('leads')
        .select('budget_number')
        .not('budget_number', 'is', null);

      if (error) throw error;
      
      const budgetNumbers = new Set(
        leadsData?.map(lead => lead.budget_number).filter(Boolean) || []
      );
      
      setSdrBudgets(budgetNumbers);
    } catch (error) {
      console.error('Erro ao carregar orçamentos do pipeline SDR:', error);
    }
  };

  const loadComments = async (budgetNumber: string) => {
    try {
      const { data: commentsData, error } = await supabase
        .from('client_budget_comments')
        .select('*')
        .eq('budget_number', budgetNumber)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setComments(prev => ({
        ...prev,
        [budgetNumber]: commentsData || []
      }));
    } catch (error) {
      console.error('Erro ao carregar comentários:', error);
    }
  };

  const loadRatings = async () => {
    try {
      const { data: ratingsData, error } = await supabase
        .from('client_budget_ratings')
        .select('*');

      if (error) throw error;
      
      const ratingsMap = ratingsData?.reduce((acc, rating) => {
        // Garantir rating mínimo de 1 estrela
        acc[rating.budget_number] = {
          ...rating,
          rating: Math.max(1, rating.rating)
        };
        return acc;
      }, {} as Record<string, Rating>) || {};
      
      setRatings(ratingsMap);
    } catch (error) {
      console.error('Erro ao carregar classificações:', error);
    }
  };

  const addComment = async () => {
    if (!selectedBudget || !newComment.trim() || !userProfile) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('client_budget_comments')
        .insert({
          budget_number: selectedBudget,
          comment: newComment.trim(),
          user_id: userProfile.id,
          user_name: userProfile.full_name
        });

      if (error) throw error;

      // Criar novo comentário para adicionar ao estado local imediatamente
      const newCommentObj: Comment = {
        id: crypto.randomUUID(), // ID temporário
        comment: newComment.trim(),
        user_name: userProfile.full_name,
        created_at: new Date().toISOString()
      };

      // Atualizar estado local imediatamente para feedback instantâneo
      setComments(prev => ({
        ...prev,
        [selectedBudget]: [newCommentObj, ...(prev[selectedBudget] || [])]
      }));

      toast({
        title: "Comentário adicionado",
        description: "O comentário foi salvo com sucesso."
      });

      setNewComment("");
      
      // Recarregar comentários para sincronizar com o banco (IDs corretos)
      setTimeout(() => loadComments(selectedBudget), 100);
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar comentário.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const setRating = async (budgetNumber: string, rating: number) => {
    if (!userProfile) return;
    
    // Garantir rating mínimo de 1 estrela
    const validRating = Math.max(1, rating);

    try {
      const { error } = await supabase
        .from('client_budget_ratings')
        .upsert({
          budget_number: budgetNumber,
          rating: validRating,
          user_id: userProfile.id,
          user_name: userProfile.full_name
        });

      if (error) throw error;

      toast({
        title: "Classificação salva",
        description: `Orçamento classificado com ${validRating} estrela${validRating !== 1 ? 's' : ''}.`
      });

      loadRatings();
    } catch (error) {
      console.error('Erro ao salvar classificação:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar classificação.",
        variant: "destructive"
      });
    }
  };

  const openCommentsDialog = (budgetNumber: string) => {
    setSelectedBudget(budgetNumber);
    loadComments(budgetNumber);
  };

  // Carregar classificações e orçamentos do SDR na inicialização
  useEffect(() => {
    loadRatings();
    loadSdrBudgets();
  }, []);

  const renderStars = (budgetNumber: string) => {
    const rating = ratings[budgetNumber]?.rating || 1; // Mínimo 1 estrela
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 cursor-pointer transition-colors ${
              star <= rating 
                ? "fill-yellow-400 text-yellow-400" 
                : "text-gray-300 hover:text-yellow-400"
            }`}
            onClick={() => setRating(budgetNumber, star)}
          />
        ))}
      </div>
    );
  };

  const getStatusColor = (dias: number) => {
    if (dias <= 7) return "bg-green-100 text-green-800";
    if (dias <= 30) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por cliente, número do pedido ou vendedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Orçamentos em Aberto ({orcamentos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Dias</TableHead>
                <TableHead>Classificação</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orcamentos.map((orcamento) => (
                <TableRow key={orcamento.numero_pedido}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span>{orcamento.numero_pedido}</span>
                      {sdrBudgets.has(orcamento.numero_pedido) && (
                        <div title="Orçamento originado do pipeline SDR">
                          <Target className="h-4 w-4 text-blue-600" />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{orcamento.cliente}</TableCell>
                  <TableCell>{orcamento.vendedor}</TableCell>
                  <TableCell>
                    {orcamento.valor_total.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}
                  </TableCell>
                  <TableCell>
                    {new Date(orcamento.data_emissao).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(orcamento.dias_orcamento)}>
                      {orcamento.dias_orcamento} dias
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {renderStars(orcamento.numero_pedido)}
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openCommentsDialog(orcamento.numero_pedido)}
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Comentários
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>
                            Comentários - Pedido {selectedBudget}
                          </DialogTitle>
                          <DialogDescription>
                            Adicione comentários sobre este orçamento para acompanhar o progresso.
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Novo Comentário</label>
                            <Textarea
                              placeholder="Digite seu comentário sobre este orçamento..."
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                            />
                          </div>
                          
                          <Button 
                            onClick={addComment}
                            disabled={!newComment.trim() || loading}
                          >
                            {loading ? "Salvando..." : "Adicionar Comentário"}
                          </Button>
                          
                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              Histórico de Comentários ({comments[selectedBudget || ""]?.length || 0})
                            </label>
                            <ScrollArea className="h-64 border rounded-md p-3">
                              {comments[selectedBudget || ""]?.length > 0 ? (
                                <div className="space-y-3">
                                  {comments[selectedBudget || ""].map((comment) => (
                                    <div key={comment.id} className="border-b pb-2 last:border-b-0">
                                      <div className="flex justify-between items-start mb-1">
                                        <span className="font-medium text-sm">
                                          {comment.user_name}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          {new Date(comment.created_at).toLocaleString('pt-BR')}
                                        </span>
                                      </div>
                                      <p className="text-sm text-muted-foreground">
                                        {comment.comment}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground text-center">
                                  Nenhum comentário ainda.
                                </p>
                              )}
                            </ScrollArea>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}