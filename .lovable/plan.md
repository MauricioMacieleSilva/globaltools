

## Problem

The `origem` column in the `leads` table is defined as `GENERATED ALWAYS AS (source)`. Any attempt to insert a value into it triggers the error: *"cannot insert a non-DEFAULT value into column 'origem'"*.

The `ProspeccaoReviewPanel` component (and the bulk approve logic) both explicitly set `origem: 'Auto Prospecção'` in the insert — which is invalid for a generated column.

## Solution

Remove `origem` from all insert statements and ensure `source` is set to `'Auto Prospecção'` (since `origem` is auto-derived from `source`).

### Files to modify

**`src/components/crm/ProspeccaoReviewPanel.tsx`**
- Remove `origem: 'Auto Prospecção'` from **both** insert locations (bulk approve ~line 82 and single approve ~line 213)
- The `source: 'Auto Prospecção'` line already exists in both places, so `origem` will be auto-populated

### Changes (2 locations in the same file)

1. **Bulk approve** (~line 82): Remove `origem: 'Auto Prospecção',`
2. **Single approve** (~line 213): Remove `origem: 'Auto Prospecção',`

No database migration needed — the schema is correct as-is.

