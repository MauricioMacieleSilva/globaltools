import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, Search, Eye, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { KnowledgeArticle, KnowledgeCategory } from '@/services/knowledgeService';

export const ArticleManager: React.FC = () => {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [categories, setCategories] = useState<KnowledgeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingArticle, setEditingArticle] = useState<KnowledgeArticle | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    summary: '',
    category_id: '',
    keywords: '',
    search_terms: '',
    difficulty_level: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    article_type: 'general' as 'general' | 'faq' | 'tutorial' | 'calculation' | 'policy' | 'process',
    is_published: false,
    is_featured: false,
    priority: 0
  });

  useEffect(() => {
    loadArticles();
    loadCategories();
    checkForPendingArticle();
  }, []);

  const loadArticles = async () => {
    try {
      const { data, error } = await supabase
        .from('knowledge_articles')
        .select(`
          *,
          category:knowledge_categories(name, color)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setArticles((data || []) as any);
    } catch (error) {
      console.error('Erro ao carregar artigos:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar artigos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('knowledge_categories')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const checkForPendingArticle = () => {
    const pendingArticle = localStorage.getItem('pending_article');
    if (pendingArticle) {
      try {
        const articleData = JSON.parse(pendingArticle);
        setFormData({
          title: articleData.title || '',
          content: articleData.content || '',
          summary: articleData.summary || '',
          category_id: articleData.category_id || '',
          keywords: (articleData.keywords || []).join(', '),
          search_terms: (articleData.search_terms || []).join(', '),
          difficulty_level: articleData.difficulty_level || 'beginner',
          article_type: articleData.article_type || 'general',
          is_published: articleData.is_published || false,
          is_featured: articleData.is_featured || false,
          priority: articleData.priority || 0
        });
        localStorage.removeItem('pending_article');
        setIsDialogOpen(true);
        toast({
          title: "Artigo carregado",
          description: "Artigo do upload foi carregado para edição"
        });
      } catch (error) {
        console.error('Erro ao carregar artigo pendente:', error);
        localStorage.removeItem('pending_article');
      }
    }
  };

  const handleSave = async () => {
    try {
      const articleData = {
        titulo: formData.title,
        conteudo: formData.content,
        title: formData.title,
        content: formData.content,
        summary: formData.summary,
        difficulty_level: formData.difficulty_level,
        article_type: formData.article_type,
        is_published: formData.is_published,
        is_featured: formData.is_featured,
        priority: formData.priority,
        keywords: formData.keywords.split(',').map(k => k.trim()).filter(Boolean),
        search_terms: formData.search_terms.split(',').map(t => t.trim()).filter(Boolean),
        category_id: formData.category_id || null
      };

      if (editingArticle) {
        const { error } = await supabase
          .from('knowledge_articles')
          .update(articleData)
          .eq('id', editingArticle.id);

        if (error) throw error;
        toast({
          title: "Sucesso",
          description: "Artigo atualizado com sucesso"
        });
      } else {
        const { error } = await supabase
          .from('knowledge_articles')
          .insert([articleData]);

        if (error) throw error;
        toast({
          title: "Sucesso",
          description: "Artigo criado com sucesso"
        });
      }

      setIsDialogOpen(false);
      resetForm();
      loadArticles();
    } catch (error) {
      console.error('Erro ao salvar artigo:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar artigo",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este artigo?')) return;

    try {
      const { error } = await supabase
        .from('knowledge_articles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({
        title: "Sucesso",
        description: "Artigo excluído com sucesso"
      });
      loadArticles();
    } catch (error) {
      console.error('Erro ao excluir artigo:', error);
      toast({
        title: "Erro",
        description: "Falha ao excluir artigo",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      summary: '',
      category_id: '',
      keywords: '',
      search_terms: '',
      difficulty_level: 'beginner',
      article_type: 'general',
      is_published: false,
      is_featured: false,
      priority: 0
    });
    setEditingArticle(null);
  };

  const openEditDialog = (article: KnowledgeArticle) => {
    setEditingArticle(article);
    setFormData({
      title: article.title,
      content: article.content,
      summary: article.summary || '',
      category_id: article.category_id || '',
      keywords: (article.keywords || []).join(', '),
      search_terms: (article.search_terms || []).join(', '),
      difficulty_level: article.difficulty_level || 'beginner',
      article_type: article.article_type || 'general',
      is_published: article.is_published || false,
      is_featured: article.is_featured || false,
      priority: article.priority || 0
    });
    setIsDialogOpen(true);
  };

  const filteredArticles = articles.filter(article =>
    article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex justify-center p-8">Carregando artigos...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar artigos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Artigo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingArticle ? 'Editar Artigo' : 'Novo Artigo'}
              </DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Título do artigo"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="summary">Resumo</Label>
                <Textarea
                  id="summary"
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  placeholder="Resumo do artigo"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Conteúdo</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Conteúdo completo do artigo"
                  rows={8}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="keywords">Palavras-chave (separadas por vírgula)</Label>
                  <Input
                    id="keywords"
                    value={formData.keywords}
                    onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                    placeholder="palavra1, palavra2, palavra3"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="search_terms">Termos de busca (separados por vírgula)</Label>
                  <Input
                    id="search_terms"
                    value={formData.search_terms}
                    onChange={(e) => setFormData({ ...formData, search_terms: e.target.value })}
                    placeholder="termo1, termo2, termo3"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="difficulty">Dificuldade</Label>
                  <Select value={formData.difficulty_level} onValueChange={(value: any) => setFormData({ ...formData, difficulty_level: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Iniciante</SelectItem>
                      <SelectItem value="intermediate">Intermediário</SelectItem>
                      <SelectItem value="advanced">Avançado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Tipo</Label>
                  <Select value={formData.article_type} onValueChange={(value: any) => setFormData({ ...formData, article_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">Geral</SelectItem>
                      <SelectItem value="faq">FAQ</SelectItem>
                      <SelectItem value="tutorial">Tutorial</SelectItem>
                      <SelectItem value="calculation">Cálculo</SelectItem>
                      <SelectItem value="policy">Política</SelectItem>
                      <SelectItem value="process">Processo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Prioridade</Label>
                  <Input
                    id="priority"
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="published"
                    checked={formData.is_published}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
                  />
                  <Label htmlFor="published">Publicado</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="featured"
                    checked={formData.is_featured}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                  />
                  <Label htmlFor="featured">Em destaque</Label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                {editingArticle ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Articles List */}
      <div className="grid gap-4">
        {filteredArticles.map((article) => (
          <Card key={article.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{article.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    {article.category && (
                      <Badge variant="secondary" style={{ backgroundColor: article.category.color + '20' }}>
                        {article.category.name}
                      </Badge>
                    )}
                    <Badge variant={article.is_published ? 'default' : 'secondary'}>
                      {article.is_published ? 'Publicado' : 'Rascunho'}
                    </Badge>
                    {article.is_featured && (
                      <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                        Destaque
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEditDialog(article)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDelete(article.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                {article.summary || article.content.substring(0, 150) + '...'}
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {article.view_count || 0} visualizações
                  </span>
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="h-3 w-3" />
                    {article.helpful_count || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <ThumbsDown className="h-3 w-3" />
                    {article.unhelpful_count || 0}
                  </span>
                </div>
                <span>
                  Criado em {new Date(article.created_at || '').toLocaleDateString('pt-BR')}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredArticles.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          {searchTerm ? 'Nenhum artigo encontrado para esta busca.' : 'Nenhum artigo criado ainda.'}
        </div>
      )}
    </div>
  );
};