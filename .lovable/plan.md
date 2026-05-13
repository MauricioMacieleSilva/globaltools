## Problema 1 — Gap em branco em todas as abas do CRM (exceto Kanban)

Em `src/pages/CRM.tsx`, o container `Tabs` é `flex flex-col flex-1 min-h-0` e cada `TabsContent` (exceto Kanban) usa `flex-1 ... overflow-y-auto`. Isso faz a área da aba esticar até preencher a viewport — o componente Kanban preenche essa altura porque tem `flex-1 h-full` interno, mas o resto (Dashboard, Agenda, Lista, Minha Carteira, Bastão, Concorrência, Relatório, Prospecção) renderiza conteúdo de fluxo normal, e o resultado visível é uma faixa enorme em branco antes do conteúdo (calendário aparece em y≈460, KPIs do dashboard idem, e o "Carregando agenda…" fica no meio vertical da tela).

### Correção

Manter o comportamento de scroll/altura cheia **somente** para o Kanban. Para as demais abas, deixar fluxo natural (sem `flex-1`), com scroll do container externo:

1. Em `src/pages/CRM.tsx`:
   - Mudar o wrapper raiz da página de `flex flex-col h-[calc(100vh-56px)] overflow-hidden` para um container scrollável tradicional, mas preservar o caso especial do Kanban.
   - Na prática: trocar o `Tabs` para `flex flex-col flex-1 min-h-0` somente quando `activeTab === 'kanban'`; nas outras abas usar layout block normal (`mt-3`) para que cada `TabsContent` flua a partir do topo logo abaixo das linhas de filtros.
   - Remover `flex-1`/`overflow-y-auto`/`min-h-0` dos `TabsContent` não-Kanban (usar apenas `mt-3`). O scroll passa a ser do `<main>`/página.
   - Manter as duas linhas de filtros (`Row 1` tabs + `Row 2` filters) como `shrink-0` no topo.

2. Em `src/components/crm/MinhaCarteira.tsx` (linha 495):
   - Substituir `<ScrollArea className="h-[calc(100vh-320px)]">` por uma área cuja altura siga o fluxo natural (`max-h-[calc(100vh-260px)]`) ou remover a altura fixa para acompanhar o conteúdo.

3. Em `src/components/crm/VisitCalendar.tsx`:
   - O modo "Mês" usa fluxo natural — ok. O modo "Semana" usa `h-[calc(100vh-220px)]` e continua válido pois o pai não impõe mais altura fixa.

## Problema 2 — Carregamento da Agenda extremamente lento

Em `src/components/crm/VisitCalendar.tsx`:

1. **Auto-conclude pesado roda em todo refetch (linhas 71–82).** O `UPDATE` em `follow_ups ... lt('data_agendada', nowIso)` executa toda vez que `leads`/`vendorFilter`/`currentUserId` muda. Mover para rodar **uma vez** por sessão (usar ref `hasAutoConcluded`), e fazer fire-and-forget (sem `await`) para não bloquear o `loadVisits`.

2. **Dependência em `leads` causa refetch em cascata (linha 65).** O CRM pai pagina e atualiza `leads` várias vezes; cada update dispara um `loadVisits` completo. Remover `leads` da dependência do `useEffect`; recarregar apenas quando `vendorFilter` ou `currentUserId` mudar. O enriquecimento com nome do lead pode ser feito em `useMemo` a partir do array atual de `leads` (mapa `Map<id, lead>`), sem refetch.

3. **`leads.find()` por visita/followup (linhas 96–115)** é O(n·m) — substituir por `Map<id, lead>` construído uma vez em `useMemo`.

4. **`loadVisits` define `loading=true` somente uma vez no estado inicial.** Garantir que o `setLoading(false)` ocorra mesmo em erro (try/finally) para não travar em "Carregando agenda…" se uma das queries falhar.

## Arquivos afetados

- `src/pages/CRM.tsx` — ajustar layout do `Tabs`/`TabsContent`.
- `src/components/crm/MinhaCarteira.tsx` — relaxar altura do `ScrollArea`.
- `src/components/crm/VisitCalendar.tsx` — refatorar `loadVisits` (auto-conclude 1×, sem dep em `leads`, `Map` para join, `try/finally`).

## Resultado esperado

- Conteúdo de Dashboard, Agenda, Lista, Minha Carteira, Bastão, Concorrência, Relatório e Prospecção começa imediatamente abaixo dos filtros (sem faixa em branco).
- Kanban segue com seu scroll horizontal/vertical próprios e altura cheia.
- Agenda carrega em uma única consulta rápida e não recarrega a cada update da lista de leads.
