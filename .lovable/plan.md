
## Plano: Filtrar pedidos excluidos nos relatorios por e-mail

### Problema
Os pedidos excluidos no Dashboard Comercial (via "excluded_orders") continuam aparecendo nos KPIs dos relatorios enviados por e-mail. O relatorio diario (`send-daily-report`) nao filtra pedidos excluidos. O relatorio manual (`send-manual-report`) filtra apenas nos "Perdidos", mas nao no Faturamento, Orcamentos e Pedidos Nao Faturados.

### Solucao

#### 1. `send-daily-report/index.ts`
- Adicionar consulta a tabela `excluded_orders` para obter a lista de pedidos excluidos
- Atualizar a funcao `calculateKPIs` para aceitar um parametro `excludedOrders: Set<string>`
- Filtrar pedidos excluidos de TODOS os calculos: faturamento, orcamentos, pedidos nao faturados e perdidos
- Aplicar o filtro em todas as chamadas de `calculateKPIs` (KPIs do dia, mes atual, mes anterior, melhor mes)

#### 2. `send-manual-report/index.ts`
- Expandir o filtro de `excludedOrders` que ja existe nos "Perdidos" para tambem filtrar:
  - Faturamento (Emitida/Pedido com faturamento_tipo=1)
  - Pedidos Nao Faturados
  - Orcamentos
- Aplicar o filtro no inicio do `calculateKPIs`, removendo os pedidos excluidos do `allData` antes de qualquer calculo
- Tambem filtrar no ranking de vendedores e orcamentos quentes

### Detalhes Tecnicos

Em ambas as funcoes, a logica sera:

```text
// Antes de calcular KPIs, remover pedidos excluidos
const dataWithoutExcluded = allData.filter(item => !excludedOrders.has(item.numeropedido));
// Usar dataWithoutExcluded para todos os calculos
```

Isso garante consistencia total com o Dashboard Comercial, onde `ComercialContext` filtra `isOrderExcluded` de todo o `filteredData`.

### Arquivos a modificar
- `supabase/functions/send-daily-report/index.ts`
- `supabase/functions/send-manual-report/index.ts`
