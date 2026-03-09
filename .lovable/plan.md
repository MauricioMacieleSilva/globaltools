

## Problem Analysis

The `OrderDetailDialog` uses `fetchComercialData()` which fetches from the **BASE ANTIGA** sheet (gid=1086211541). However, recent orders like 1038 exist in the **PRODUCAO** sheet (gid=407047369) -- confirmed by the network data showing order 1038 there. The session replay confirms the dialog shows "Nenhum dado encontrado" because order 1038 simply doesn't exist (or is filtered out) in the old base.

The issue is **wrong data source**, not a filtering/sorting problem.

## Plan

**File: `src/components/crm/OrderDetailDialog.tsx`**

1. Add a dedicated fetch to the **production sheet** (gid=407047369) as the primary data source for order details, since that sheet contains recent/active orders
2. Parse the production CSV directly (columns: pedido[2], nf[3], situacao[4], vendedor[6], cli_nomef[7], descricaomat[10], descricao2[11], qtd_venda[12], un[13], data aprovado[0])
3. If the production sheet returns no results for the order number, fall back to `fetchComercialData()` (BASE ANTIGA) for historical orders
4. Keep the 10-month filter and most-recent-date logic as a safety net
5. Map the production sheet columns to the display fields used in the dialog

This ensures recent orders like 1038 are found in the correct sheet, while older historical orders still work via the fallback.

