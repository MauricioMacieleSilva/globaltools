

# Plan: Reset Failed Attempts on Oportunidade + Fix Estoque Report Scheduling

## Issue 1: Reset Failed Contact Attempts When Lead Moves to Oportunidade

**Problem**: When a lead is moved from "Passagem de Bastão" to "Oportunidade" (assigned to a new user), the failed contact attempt counter ("tentativas sem sucesso") continues showing the old count from the previous SDR.

**Root Cause**: The `KanbanCard.tsx` counts ALL `contato_sem_sucesso` activities for a lead regardless of when they happened or who performed them. When a lead transitions to Oportunidade with a new owner, the counter should restart from zero.

**Solution**:
1. **In `KanbanCard.tsx`**: Modify the failed attempts query to only count `contato_sem_sucesso` activities that occurred AFTER the lead was moved to "Oportunidade" (or whatever the current stage is). Specifically, find the latest `mudanca_status` activity containing `"Oportunidade"` and only count failed attempts after that timestamp.
2. **In `CRM.tsx` (`handlePassagemBastaoConfirmed`)**: No changes needed to the status update logic — the filtering in KanbanCard will handle the reset automatically by scoping to activities after the stage transition.

**Technical approach**:
- Query `lead_activities` for the most recent `mudanca_status` that moved to the current stage (e.g., "Oportunidade")
- Use that timestamp as a floor to count `contato_sem_sucesso` entries after it
- This ensures each stage owner starts fresh

## Issue 2: Fix Estoque Report Automatic Scheduling

**Problem**: The estoque report at 17:30 is not being sent automatically despite the cron job and edge function being properly configured.

**Root Cause**: From analyzing the edge function logs, the function runs every 5 minutes and correctly converts to Brasilia time. The `last_sent_date` is `null`, meaning it has never sent successfully. The most likely cause is that the function wasn't deployed (or was redeployed) after the 17:30 window passed. Additionally, the `send-estoque-report` function relies on `RESEND_API_KEY` — if this secret is missing, the inner function call would fail silently.

**Solution**:
1. **Redeploy both edge functions** (`send-scheduled-estoque-report` and `send-estoque-report`) to ensure the latest code is live
2. **Verify `RESEND_API_KEY`** secret is configured
3. **Add better error logging** in `send-scheduled-estoque-report` to capture failures from the inner function invoke, including logging the response body
4. **Ensure recipients exist**: The `send-estoque-report` function needs to know who to send to — verify the estoque report has configured recipients (check if it reads from `estoque_report_schedule` or another config table)

**Files to modify**:
- `supabase/functions/send-scheduled-estoque-report/index.ts` — Improve error handling and logging
- `supabase/functions/send-estoque-report/index.ts` — Verify recipient loading logic

## Summary of Changes

| File | Change |
|------|--------|
| `src/components/crm/KanbanCard.tsx` | Scope failed attempts count to activities after the last stage transition |
| `supabase/functions/send-scheduled-estoque-report/index.ts` | Improve error logging for debugging |
| Deploy edge functions | Redeploy `send-scheduled-estoque-report` and `send-estoque-report` |

