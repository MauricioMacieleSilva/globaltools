-- Reatribuir follow-ups futuros (ainda não concluídos) para o novo dono do lead
-- Aplica-se a todos os casos onde o lead foi transferido mas o follow-up ficou com o dono anterior
UPDATE public.follow_ups fu
SET user_id = l.vendedor_id,
    updated_at = now()
FROM public.leads l
WHERE fu.lead_id = l.id
  AND fu.concluido = false
  AND fu.data_agendada >= now()
  AND l.vendedor_id IS NOT NULL
  AND fu.user_id <> l.vendedor_id;