

## Problem

The `OrderDetailDialog` only filters by `numeropedido`, so when two different clients have the same order number (e.g., 1038), it picks the wrong one. The date-based disambiguation keeps failing because of date parsing edge cases.

The Orçamentos section works because it shows ALL orders inline with their client names -- there's no ambiguity.

## Solution

Pass the **client name** from the CRM lead into `OrderDetailDialog` and use it as a secondary filter. This is bulletproof -- no date parsing needed to disambiguate.

### Changes

**1. `src/components/crm/OrderDetailDialog.tsx`**
- Add `clientName?: string` to the props interface
- When filtering matches, if `clientName` is provided, prefer matches where `cli_nomefantasia` contains the client name (case-insensitive partial match)
- Only fall back to all matches if no client-name-filtered results exist

**2. `src/components/crm/KanbanCard.tsx`**
- Pass `clientName={lead.cliente_nome || lead.client_name}` to `OrderDetailDialog`

**3. `src/components/crm/LeadDrawer.tsx`**
- Pass `clientName={lead?.cliente_nome || lead?.client_name}` to `OrderDetailDialog`

### Logic in OrderDetailDialog

```
allMatches = data.filter(by numeropedido)
if (clientName) {
  clientMatches = allMatches.filter(item matches clientName)
  if (clientMatches.length > 0) use clientMatches
  else use allMatches
}
// then apply existing most-recent-date sort as safety net
```

This guarantees order 1038 for "ABSOLUT CONSTRUTORA" shows ABSOLUT's data, not METALURGICA LAY's.

