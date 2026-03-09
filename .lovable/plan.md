

## Problem

The date sorting logic uses `parseDate` but the issue is likely that the old order's parsed date is coming out as more recent, or the dates aren't parsing correctly. The user's solution is simple: filter out orders older than 10 months, then take the most recent.

## Plan

**File: `src/components/crm/OrderDetailDialog.tsx`** (lines 26-39)

Add a 10-month cutoff filter before selecting the most recent order:

1. After matching by `budgetNumber`, filter out any records where `data_emissao` is older than 10 months from today
2. If the filtered set is empty (all are old), fall back to the full match set sorted by most recent
3. From the remaining set, sort by `parseDate` descending and take items matching the most recent date

This guarantees old duplicate orders from other branches are excluded, and the most recent order is always shown.

