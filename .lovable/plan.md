

## Plano: Página de Treinamentos

### Objetivo
Criar uma página de Treinamentos onde admins podem fazer upload de materiais (PDF, PPT, vídeos, etc.) e todos os usuários autenticados possam acessar e visualizar os treinamentos.

### Avaliação dos arquivos
O PDF é a melhor opção para visualização no navegador, pois pode ser renderizado diretamente via `<iframe>` ou embed. Arquivos PPTX não possuem visualização nativa no browser. A recomendação é aceitar ambos os formatos para upload, mas usar PDF como formato principal de visualização inline.

### Estrutura

**1. Tabela no banco: `treinamentos`**
- `id`, `titulo`, `descricao`, `categoria` (texto livre ou enum), `file_url` (path no storage), `file_name`, `file_type` (pdf/pptx/mp4...), `file_size`, `created_by` (uuid), `created_at`, `updated_at`, `is_active`
- RLS: SELECT para todos autenticados; INSERT/UPDATE/DELETE apenas admin

**2. Storage bucket: `treinamentos`**
- Bucket público para facilitar acesso aos arquivos
- RLS: upload/delete apenas admin; leitura para todos autenticados

**3. Página `src/pages/Treinamentos.tsx`**
- Lista de treinamentos em cards organizados por categoria
- Cada card mostra: título, descrição, tipo de arquivo (ícone), data de upload
- Clique abre o arquivo (PDF inline via iframe em dialog, outros formatos via download)
- Admins veem botão "Novo Treinamento" para upload com formulário (título, descrição, categoria, arquivo)
- O primeiro treinamento será o "Plano Global Aço" já enviado pelo usuário (upload automático do PDF)

**4. Integração no sistema**
- Adicionar rota `/treinamentos` em `App.tsx` com `ProtectedRoute`
- Adicionar item "Treinamentos" no sidebar (`AppSidebar.tsx`) com ícone `GraduationCap`
- Adicionar `treinamentos` no `SYSTEM_PAGES` em `useUserPermissions.ts` para controle de acesso
- Adicionar título/subtítulo no `getPageTitle`/`getPageSubtitle`

### Detalhes técnicos

```text
Fluxo de Upload (Admin):
  [Botão "Novo Treinamento"]
    → Dialog com form (título, descrição, categoria, arquivo)
    → Upload para storage bucket "treinamentos"
    → Insert na tabela "treinamentos" com file_url
    → Refresh da lista

Fluxo de Visualização (Todos):
  [Card do treinamento]
    → PDF: abre dialog com iframe embed
    → Outros: download direto
```

### Arquivos a criar/modificar
- **Criar**: `src/pages/Treinamentos.tsx` (página principal com lista + upload dialog + viewer)
- **Modificar**: `src/App.tsx` (rota), `src/components/AppSidebar.tsx` (menu), `src/hooks/useUserPermissions.ts` (pageKey)
- **Migration SQL**: criar tabela `treinamentos` + bucket storage + RLS policies

