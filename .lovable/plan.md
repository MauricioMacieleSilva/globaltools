## Diagnóstico

Auditando `src/pages/CRM.tsx` (1286 linhas), `CRMDashboard.tsx` (1091), `ProspeccaoPanel.tsx` (811), `LeadDrawer.tsx` (1118), `NewLeadDialog.tsx` (846), `MinhaCarteira.tsx` (564), etc., identifiquei as causas reais do peso:

1. **Tudo remonta ao trocar de tela.** O componente `CRM` mantém `leads`, `pendingFollowUps`, `currentUser*` em `useState` local. Quando o usuário sai de `/crm` e volta, a página é desmontada, perde o estado e refaz todo o `loadLeads()` (paginado, com JOIN em `user_profiles`) + `loadFollowUps()` + recomputações.
2. **Bundle inicial enorme.** O `CRM.tsx` importa estaticamente, no topo: `CRMDashboard`, `ProspeccaoPanel`, `MinhaCarteira`, `HandoffHistory`, `CompetitorProposalsView`, `CRMReport`, `VisitCalendar`, `LeadDrawer`, `NewLeadDialog`, `DashboardComercial`, `DashboardCarousel`, todos os dialogs (`LostDealsDialog`, `LeadEnrichGateDialog`, `OrderLinkDialog`, `AnaliseFinanceiraDialog`, `PassagemBastaoDialog`, etc.). Mesmo para abrir só o Kanban, o navegador baixa/parseia tudo (>6 mil linhas de JSX + recharts + date-fns + driver.js).
3. **Background sync custosíssimo em cada `loadLeads`.** Após carregar leads, o código faz um `import('@/services/googleSheetsService')` que dispara `fetchComercialData()` — a planilha do Google Sheets tem ~20 MB / 39 mil linhas (logs confirmam: `CSV response length: 19739075`), com `cache: "no-store"`. Isso acontece toda vez que a página remonta ou o auto-refresh dispara, mesmo que o valor estimado não mude.
4. **Trocar de aba dispara recarga em filhos.** `CRMDashboard`, `MinhaCarteira`, `VisitCalendar`, `ProspeccaoPanel`, `HandoffHistory` têm `useEffect` próprios que recarregam Supabase ao montar. Como o shadcn `TabsContent` desmonta a aba inativa, qualquer ida e volta entre Kanban → Dashboard → Kanban força refetch.
5. **Recomputações em cada render.** `filteredLeads`, `kanbanLeads`, `funnelCounts`, `lostLeads` são recalculados a cada render sem `useMemo` (rodam sobre milhares de leads).
6. **JOIN pesado no paginador.** `select('*, vendedor:user_profiles!...(full_name, avatar_url)')` em cada página de 1000 leads.

## O que vai mudar (frontend apenas, sem mexer em regras de negócio)

### 1. Criar `CRMDataProvider` global (cache vivo entre navegações)

Novo `src/context/CRMDataContext.tsx` registrado dentro de `App.tsx` (acima do `Routes`, mesmo nível dos providers existentes), expondo:

- `leads`, `pendingFollowUps`, `lastUpdated`, `loading`, `currentUserId`, `currentUserRole`
- `loadLeads()`, `loadFollowUps()`, `applyLocalLeadPatch(id, patch)`
- Auto-refresh único de 15 min movido para cá (não duplica mais quando o usuário entra/sai da rota)
- Primeira carga: dispara só uma vez na vida da sessão

Resultado: sair de `/crm` para outra tela e voltar não dispara mais nenhuma requisição.

### 2. Mover o recálculo de `valor_estimado` para fora do hot path

- Remover o `import('@/services/googleSheetsService')` de dentro de `loadLeads`.
- Disparar essa reconciliação **uma vez por sessão** (flag em memória no provider) e **só se ainda não houver um `comercialData` em cache** (o `cacheService` já existe — usar/expandir para guardar a planilha por 5 min).
- No `googleSheetsService.fetchComercialData`, reaproveitar a resposta cacheada quando dentro do TTL em vez de sempre `cache: "no-store"` na recarga subsequente.

### 3. Lazy-load por aba e por diálogo

Em `CRM.tsx`:

- Trocar imports estáticos pesados por `React.lazy` envolto em `<Suspense fallback={<Skeleton/>}>`:
  - `CRMDashboard`, `ProspeccaoPanel`, `MinhaCarteira`, `HandoffHistory`, `CompetitorProposalsView`, `CRMReport`, `VisitCalendar`, `DashboardComercial`, `DashboardCarousel`.
- Renderizar cada `TabsContent` somente quando a aba já foi visitada (`mountedTabs` set + `forceMount` controlado), para que voltar a uma aba já aberta **não** desmonte/remonte o filho — fim do refetch ao alternar abas.
- Diálogos (`NewLeadDialog`, `LeadDrawer`, `LostDealsDialog`, `LeadEnrichGateDialog`, `OrderLinkDialog`, `AnaliseFinanceiraDialog`, `PassagemBastaoDialog`, `VisitScheduleDialog`, `ContactDescriptionDialog`, `FollowUpScheduleDialog`) viram `React.lazy` e só montam quando `open === true`.

### 4. Memoização das listas derivadas

Em `CRM.tsx`, envolver com `useMemo` (dependências corretas):
- `filteredLeads`
- `leadsWithFutureFollowUp`
- `kanbanLeads`, `scheduledLeadsCount`
- `lostLeads`, `lostValue`, `funnelCounts`
- A filtragem por `kanbanDateFilter` aplicada ao `KanbanBoard`

Adicionar `useCallback` em `openLeadDrawer`, `updateLeadStatus` e nos handlers passados aos dialogs/abas, para evitar re-render em cascata.

### 5. Reduzir custo do `loadLeads`

- Remover o JOIN `vendedor:user_profiles(...)` do `select` paginado. Carregar `user_profiles(id, full_name, avatar_url)` **uma única vez** (cacheado no provider, já carregado também pelo `useCommercialVendors`) e fazer o "join" no cliente via `Map<id, profile>`.
- Aumentar `PAGE_SIZE` para 2000 (o limite de 1000 era do PostgREST default; com `Prefer: count=exact` não muda, mas reduzir round-trips ajuda) — manter loop por segurança.
- O bloco de reativação de leads "perdido" expirados continua, mas só roda quando `loadLeads` é chamado de fato (na primeira carga ou no auto-refresh), não em cada navegação.

### 6. Pequenos ganhos colaterais

- `KanbanBoard` recebe a lista já memoizada; manter como está.
- Marcar `CRMFilters`, `KanbanCard` (já são puros) com `React.memo` se ainda não estiverem, para que `setSearchQuery` não re-renderize tudo.
- `setSearchQuery` continua disparando filtro a cada tecla; aplicar `useDebounce` (hook já existe em `src/hooks/useDebounce.ts`) de ~150 ms no valor usado pelo `filteredLeads` — campo do input continua respondendo instantâneo.

## O que NÃO muda

- Toda a lógica de negócio, ordem de stages, validações de ownership, regras de movimentação, diálogos, textos, toasts, cores, tour, realtime, deep-links (`?lead=`, `?tv=1`).
- Esquema do banco, RLS, edge functions.
- API de cada componente filho (assinaturas mantidas; só a forma de receber os dados muda para vir do provider).

## Detalhes técnicos

```text
App.tsx
└── <CRMDataProvider>          ← novo, vive acima das rotas
      └── <Routes>
            └── /crm → CRM.tsx
                       ├── useCRMData()       ← lê leads/followUps do contexto
                       ├── <Tabs>
                       │     ├── Kanban       (sempre montado)
                       │     ├── Lista        (lazy + keep-alive)
                       │     ├── Dashboard    (lazy + keep-alive)
                       │     └── ...          (idem)
                       └── Dialogs lazy (montados só com open=true)
```

Estratégia de keep-alive sem reescrever shadcn: manter um `Set<string>` de abas já abertas; renderizar `<TabsContent forceMount hidden={activeTab !== key}>` apenas para abas já visitadas. Assim a aba inativa não desmonta e seus `useEffect`s não disparam de novo.

Cache da planilha comercial: usar o `cacheService` existente com TTL de 5 min e chave `"comercial-csv"`; `fetchComercialData` consulta o cache antes do fetch.

## Resultados esperados

- Primeira renderização do `/crm` baixa apenas o chunk do Kanban + filtros (estimado ~70–80% menor).
- Trocar de aba: 0 requisições adicionais após a primeira visita.
- Sair e voltar de `/crm`: 0 requisições (dados vivem no provider).
- Auto-refresh continua a cada 15 min, agora único.
- Eliminação do download de ~20 MB do Google Sheets a cada recarga.

## Fora de escopo

Otimizações de backend (índices, RLS, edge functions, mudar o esquema) — não foram pedidas e o usuário enfatizou "sem perder funcionalidade". Se mesmo após estas mudanças a carga inicial ainda incomodar, posso propor numa próxima rodada um endpoint resumido para o Kanban (somente colunas usadas) e mover o reconcile de `valor_estimado` para uma edge function.
