import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  BookOpen, 
  MessageSquare, 
  ThumbsUp, 
  Eye, 
  TrendingUp, 
  Users,
  Clock,
  HelpCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AnalyticsData {
  totalArticles: number;
  totalConversations: number;
  totalViews: number;
  avgHelpfulRating: number;
  publishedArticles: number;
  categoriesData: { name: string; count: number; color: string }[];
  conversationTrends: { date: string; count: number }[];
  topArticles: { title: string; views: number; helpful_count: number }[];
  searchQueries: { query: string; count: number }[];
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

export const KnowledgeAnalytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Carregar estatísticas gerais
      const [articlesResult, categoriesResult] = await Promise.all([
        supabase.from('knowledge_articles').select('id, view_count, helpful_count, unhelpful_count, is_published, title'),
        supabase.from('knowledge_categories').select('id, name, color').eq('is_active', true)
      ]);

      if (articlesResult.error) throw articlesResult.error;
      if (categoriesResult.error) throw categoriesResult.error;

      const articles = articlesResult.data || [];
      const conversations: any[] = [];
      const categories = categoriesResult.data || [];

      // Calcular estatísticas
      const totalArticles = articles.length;
      const publishedArticles = articles.filter(a => a.is_published).length;
      const totalViews = articles.reduce((sum, a) => sum + (a.view_count || 0), 0);
      const totalHelpful = articles.reduce((sum, a) => sum + (a.helpful_count || 0), 0);
      const totalUnhelpful = articles.reduce((sum, a) => sum + (a.unhelpful_count || 0), 0);
      const avgHelpfulRating = totalHelpful + totalUnhelpful > 0 
        ? (totalHelpful / (totalHelpful + totalUnhelpful)) * 100 
        : 0;

      // Top artigos
      const topArticles = articles
        .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
        .slice(0, 5)
        .map(a => ({
          title: a.title,
          views: a.view_count || 0,
          helpful_count: a.helpful_count || 0
        }));

      // Dados de categorias (simulado)
      const categoriesData = categories.map((cat, index) => ({
        name: cat.name,
        count: Math.floor(Math.random() * 20) + 1, // Simulado
        color: cat.color || COLORS[index % COLORS.length]
      }));

      // Tendências de conversação (últimos 30 dias)
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      }).reverse();

      const conversationTrends = last30Days.map(date => {
        const dayConversations = conversations.filter(c => 
          c.created_at?.startsWith(date)
        ).length;
        return {
          date: new Date(date).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' }),
          count: dayConversations
        };
      });

      // Queries mais populares (simulado)
      const searchQueries = [
        { query: 'corte de perfis', count: 45 },
        { query: 'cálculo de peso', count: 32 },
        { query: 'tipos de aço', count: 28 },
        { query: 'tabela de preços', count: 22 },
        { query: 'especificações técnicas', count: 18 }
      ];

      setData({
        totalArticles,
        totalConversations: conversations.length,
        totalViews,
        avgHelpfulRating,
        publishedArticles,
        categoriesData,
        conversationTrends,
        topArticles,
        searchQueries
      });

    } catch (error) {
      console.error('Erro ao carregar analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Carregando análises...</div>;
  }

  if (!data) {
    return <div className="text-center p-8 text-muted-foreground">Erro ao carregar dados</div>;
  }

  return (
    <div className="space-y-6">
      {/* KPIs Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Artigos</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalArticles}</div>
            <p className="text-xs text-muted-foreground">
              {data.publishedArticles} publicados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversas</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalConversations}</div>
            <p className="text-xs text-muted-foreground">
              últimos {timeRange}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Visualizações</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalViews.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              total de visualizações
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Satisfação</CardTitle>
            <ThumbsUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.avgHelpfulRating.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              avaliações positivas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Details */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Tendências</TabsTrigger>
          <TabsTrigger value="content">Conteúdo</TabsTrigger>
          <TabsTrigger value="queries">Consultas</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Conversas por Dia</CardTitle>
                <CardDescription>Últimos 30 dias</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.conversationTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Categoria</CardTitle>
                <CardDescription>Artigos por categoria</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.categoriesData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {data.categoriesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Artigos Mais Visualizados</CardTitle>
                <CardDescription>Top 5 artigos por visualizações</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.topArticles.map((article, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{article.title}</p>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {article.views}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <ThumbsUp className="h-3 w-3" />
                          {article.helpful_count}
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline">#{index + 1}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status dos Artigos</CardTitle>
                <CardDescription>Distribuição por status de publicação</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Publicados</span>
                      <span className="text-sm text-muted-foreground">
                        {data.publishedArticles}/{data.totalArticles}
                      </span>
                    </div>
                    <Progress value={(data.publishedArticles / data.totalArticles) * 100} />
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Rascunhos</span>
                      <span className="text-sm text-muted-foreground">
                        {data.totalArticles - data.publishedArticles}/{data.totalArticles}
                      </span>
                    </div>
                    <Progress value={((data.totalArticles - data.publishedArticles) / data.totalArticles) * 100} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="queries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Consultas Mais Frequentes</CardTitle>
              <CardDescription>Termos de busca mais utilizados pelos usuários</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.searchQueries} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="query" type="category" width={120} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};