import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArticleManager } from '@/components/knowledge/ArticleManager';
import { CategoryManager } from '@/components/knowledge/CategoryManager';
import { KnowledgeAnalytics } from '@/components/knowledge/KnowledgeAnalytics';
import { FileUpload } from '@/components/knowledge/FileUpload';
import { Brain, FolderOpen, FileText, BarChart3 } from 'lucide-react';

const KnowledgeManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('articles');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Brain className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Gestão de Conhecimento</h1>
          <p className="text-muted-foreground">
            Gerencie a base de conhecimento do Zé da Global
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="articles" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Artigos
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Categorias
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Análises
          </TabsTrigger>
        </TabsList>

        <TabsContent value="articles" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gestão de Artigos</CardTitle>
              <CardDescription>
                Crie, edite e gerencie artigos da base de conhecimento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ArticleManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gestão de Categorias</CardTitle>
              <CardDescription>
                Organize o conhecimento em categorias e subcategorias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CategoryManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload de Documentos</CardTitle>
              <CardDescription>
                Faça upload de documentos para extrair e criar artigos automaticamente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileUpload />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Análises de Conhecimento</CardTitle>
              <CardDescription>
                Veja estatísticas e insights sobre o uso da base de conhecimento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <KnowledgeAnalytics />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default KnowledgeManagement;