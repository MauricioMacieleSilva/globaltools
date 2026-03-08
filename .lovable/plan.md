

# Plano: Nova Pagina CRM Unificada

## Visao Geral

Unificar as paginas Pre-Vendas (`/pre-vendas`) e Pipeline de Vendas (`/pipeline`) em uma unica pagina CRM (`/crm`) com interface Kanban e funil simplificado.

## Etapas do Funil

As 5 etapas solicitadas mapeadas ao banco de dados:

```text
Lead → Contato Feito → Visita/Reuniao → Proposta → Pedido
         (+ coluna "Perdidos" separada)
```

Sera necessario alterar o enum `lead_status` no banco para refletir as novas etapas: `lead`, `contato_feito`, `visita_reuniao`, `proposta`, `pedido`, `perdido`.

## Estrutura da Pagina

```text
┌─────────────────────────────────────────────────────┐
│ KPIs: Contatos Hoje (X/meta) │ Funil │ Perdidos     │
├─────────────────────────────────────────────────────┤
│  Kanban Board (drag & drop entre colunas)           │
│  ┌──────┐ ┌──────────┐ ┌────────┐ ┌────────┐ ┌───┐ │
│  │Lead  │ │Contato   │ │Visita/ │ │Proposta│ │Ped│ │
│  │      │ │Feito     │ │Reuniao │ │        │ │ido│ │
│  │card  │ │card      │ │card    │ │card    │ │   │ │
│  │card  │ │          │ │        │ │        │ │   │ │
│  └──────┘ └──────────┘ └────────┘ └────────┘ └───┘ │
└─────────────────────────────────────────────────────┘
```

## Componentes Principais

1. **KPI Bar** (topo):
   - Contatos diarios (atual/meta) com barra de progresso
   - Mini funil visual com contagem por etapa
   - Indicador de perdidos (quantidade + valor estimado)

2. **Kanban Board**:
   - 5 colunas (Lead, Contato Feito, Visita/Reuniao, Proposta, Pedido)
   - Cards compactos: nome cliente, valor, dias na etapa, proximo passo
   - Drag & drop para mover entre etapas (atualiza status no banco)
   - Ao mover para "Perdido", abre dialog pedindo motivo

3. **Card do Lead** (compacto):
   - Nome do cliente, cidade/UF
   - Valor estimado
   - Dias na etapa atual
   - Icone de WhatsApp para contato rapido
   - Click abre drawer lateral com detalhes + historico + acoes

4. **Drawer Lateral** (ao clicar no card):
   - Dados do lead completos
   - Timeline de atividades
   - Botoes de acao rapida: registrar contato, agendar visita, criar proposta
   - Marcar como perdido (com motivo)

5. **Filtros** (acima do kanban):
   - Busca por cliente
   - Filtro por SDR/vendedor
   - Periodo

## Detalhes Tecnicos

### Migracao de Banco
- Adicionar novos valores ao enum `lead_status`: `lead`, `contato_feito`, `visita_reuniao`, `proposta`, `pedido`
- Migrar dados existentes: `novo` → `lead`, `contatado`/`respondeu` → `contato_feito`, `qualificado`/`encaminhado` → `proposta`
- O campo `pipeline_status` pode ser descontinuado — usar apenas `status`

### Arquivos a Criar
- `src/pages/CRM.tsx` — pagina principal
- `src/components/crm/KanbanBoard.tsx` — board com colunas
- `src/components/crm/KanbanCard.tsx` — card individual do lead
- `src/components/crm/LeadDrawer.tsx` — drawer lateral com detalhes
- `src/components/crm/CRMKPIs.tsx` — barra de KPIs
- `src/components/crm/LostDealsDialog.tsx` — dialog/indicador de perdidos
- `src/components/crm/QuickActionButtons.tsx` — acoes rapidas no drawer

### Arquivos a Modificar
- `src/App.tsx` — adicionar rota `/crm`, redirecionar `/pre-vendas` e `/pipeline` para `/crm`
- `src/components/AppSidebar.tsx` — substituir 2 itens (Pre-Vendas + Pipeline) por 1 item "CRM"
- `src/hooks/useUserPermissions.ts` — substituir `prevendas` + `pipeline` por `crm`
- `src/context/PreVendasContext.tsx` — adaptar para novos status (ou criar novo CRMContext)

### Drag & Drop
- Usar a lib existente ou CSS nativo com `draggable` + `onDragOver`/`onDrop` para manter leve
- Ao soltar em nova coluna, chamar `supabase.from('leads').update({ status: novoStatus })` 
- Se soltar em "Perdido", abrir dialog de motivo antes de confirmar

### Mobile
- Kanban com scroll horizontal (snap) nas colunas
- Cards empilhados verticalmente dentro de cada coluna
- Drawer vira sheet de baixo (vaul)

### Meta Diaria de Contatos
- Reutilizar `admin_goals.daily_contacts_goal` ja existente
- Contar atividades do tipo `contato_inicial` do dia atual
- Exibir progresso visual no KPI bar

### Controle de Perdidos
- Card/badge no topo mostrando total de perdidos no periodo
- Click abre lista filtrada dos leads perdidos com motivo e data
- Indicador percentual (perdidos / total do funil)

