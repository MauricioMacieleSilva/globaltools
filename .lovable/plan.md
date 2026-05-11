## Problemas

### 1. Sem scrollbar horizontal no Kanban
As colunas usam `flex-1` (crescem para preencher o container). Resultado: a soma das larguras das colunas nunca ultrapassa o container, então nem o `overflow-x-scroll` interno (`KanbanBoard`) nem o `overflow-x-auto` externo (`TabsContent` em `CRM.tsx`) acionam barra de rolagem. Em telas estreitas as colunas só encolhem até `min-w-[260px]` e ainda assim o conteúdo cabe porque o flexbox redistribui espaço.

### 2. Valor errado no card do lead (Pedido 1609 — J F GOELLNER: card mostra R$ 103.974,76, dialog do pedido mostra R$ 9.688,35)
O card lê `lead.valor_estimado` direto do banco. Esse campo foi gravado uma única vez (pelo sync em background do `CRM.tsx` ou pelo `LeadDrawer`) usando matching frouxo:

```ts
nome.includes(norm) || norm.includes(nome)
```

Isso casou o pedido 1609 contra itens de outros clientes na planilha comercial e somou tudo, salvando 103k. Como o sync atual em `CRM.tsx` só recalcula quando `valor_estimado` é nulo/zero, o valor incorreto fica congelado para sempre. O `OrderDetailDialog` recalcula sob demanda — por isso mostra o valor certo (9.688,35).

## Plano

### Correção 1 — Scrollbar horizontal sempre presente

**Arquivo:** `src/components/crm/KanbanBoard.tsx`

- Trocar `flex-1` das colunas por `shrink-0` (mantendo `min-w-[240px] sm:min-w-[260px]`) e adicionar uma `w-[280px]` desktop, fazendo com que a soma das colunas exceda a largura do container.
- Garantir que o wrapper externo no `CRM.tsx` (`TabsContent value="kanban"`) **não** tenha `overflow-x-auto` concorrente — deixar só o `overflow-x-scroll` do `KanbanBoard` (com a classe `kanban-scroll` que já tem o estilo da barra estilizada).

**Arquivo:** `src/pages/CRM.tsx` (linha 1015)
- Remover `overflow-x-auto` do `TabsContent value="kanban"`, manter `overflow-y-hidden` e `flex-1 min-h-0`.

Resultado: assim que tiver mais colunas que o viewport comporta, a barra azul horizontal aparece colada na base do Kanban (já estilizada em `index.css`).

### Correção 2 — Valor do lead sempre confiável

**Arquivo:** `src/pages/CRM.tsx` (`loadLeads`, linhas 213–287)

- **Sempre recalcular** o valor de leads com `budget_number` (não só quando é nulo/zero). Isso elimina valores antigos congelados.
- **Endurecer o matching de cliente** dentro do recálculo:
  - Preferir match por `linked_orders_meta[num]` quando existir (nome salvo no momento da vinculação).
  - Quando não houver meta, exigir match exato (igualdade após normalização) em vez do `includes` bilateral. Se nenhum item bater exatamente, ignorar o pedido (não somar nada) em vez de aceitar o conjunto inteiro.
- Fazer `update` no banco somente quando o novo total for diferente do atual, e refletir em `setLeads` para o card atualizar imediatamente.

**Arquivo:** `src/components/crm/LeadDrawer.tsx` (linhas 130–175)

- Aplicar a mesma lógica de matching estrito (preferir `meta[num]`, exigir igualdade quando não houver meta) para que o sync do drawer e do dashboard fiquem alinhados com o `OrderDetailDialog`.

**Arquivo:** `src/components/crm/OrderDetailDialog.tsx` (linhas 36–47)

- Adotar o mesmo critério estrito (preferir `linkedClientName`, igualdade exata como fallback) para consistência total entre as três fontes.

### Verificação após implementação

1. Abrir o CRM no preview, observar barra azul horizontal fixa no rodapé do Kanban e poder rolar entre as colunas.
2. Abrir o card do lead **J F GOELLNER REPRESENTACOES** após o refresh: o valor exibido no card deve ser **R$ 9.688,35** (mesmo do dialog do pedido 1609).
3. Conferir 2–3 outros leads com `budget_number` para garantir que valores corretos foram preservados.

## Notas técnicas

- A planilha comercial (`fetchComercialData`) é cacheada no `googleSheetsService`, então recalcular para todos os leads em background não dispara N requests.
- O recálculo continua em background (não bloqueia a renderização inicial dos cards).
- Nenhuma migração de banco necessária.
