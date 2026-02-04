

# Adicionar Menu "Reuniões" com Link Externo

## Resumo

Adicionar um novo item no menu lateral chamado "Reuniões" que direciona o usuário para a aplicação externa do Secretário Digital da Global Aço.

## O Que Será Feito

Seguindo o padrão já existente do "Central de Preços", será adicionado um novo item de menu que:
- Aparece no menu lateral com o nome "Reuniões"
- Abre em uma nova aba ao clicar
- Direciona para: `https://global-a-o-secret-rio-digital-399093119582.us-west1.run.app/`
- Pode ter permissões controladas pelo sistema de administração

## Alterações Necessárias

### 1. Arquivo: `src/components/AppSidebar.tsx`

Adicionar novo item no array `menuItems`:

```text
{
  title: 'Reuniões',
  url: 'https://global-a-o-secret-rio-digital-399093119582.us-west1.run.app/',
  icon: Calendar,  // Ícone de calendário do Lucide
  pageKey: 'reunioes',
  external: true,
  tourId: 'sidebar-reunioes',
}
```

Também será necessário importar o ícone `Calendar` do lucide-react.

### 2. Arquivo: `src/hooks/useUserPermissions.ts`

Adicionar entrada no objeto `SYSTEM_PAGES`:

```text
reunioes: { 
  label: 'Reuniões', 
  category: 'Principais',
  supportsEdit: false,
  route: '/reunioes'
}
```

### 3. Tutorial do Sidebar (Opcional)

Adicionar passo no arquivo `src/components/tour/tourSteps/sidebarSteps.ts`:

```text
{
  element: '[data-tour="sidebar-reunioes"]',
  popover: {
    title: 'Reuniões',
    description: 'Acesse o Secretário Digital para gerenciar reuniões e atas.',
    side: 'right',
    align: 'start'
  }
}
```

## Posicionamento no Menu

O item será inserido após "Assistente Global" e antes de "Central de Preços", agrupando os links externos no final da lista.

## Resultado Final

```text
Menu Lateral:
├── Dashboard Comercial
├── Pré-Vendas
├── Pipeline de Vendas
├── Clientes
├── Produção
├── Política Comercial
├── Corte Perfil
├── Corte Blank
├── Assistente Global
├── Reuniões          ← NOVO (abre nova aba)
└── Central de Preços (abre nova aba)
```

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/AppSidebar.tsx` | Adicionar item no array menuItems + import Calendar |
| `src/hooks/useUserPermissions.ts` | Adicionar entrada reunioes no SYSTEM_PAGES |
| `src/components/tour/tourSteps/sidebarSteps.ts` | Adicionar passo do tutorial |

