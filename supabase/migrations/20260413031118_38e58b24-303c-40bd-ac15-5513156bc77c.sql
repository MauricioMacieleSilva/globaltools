
-- Add persistent SDR/handoff columns to leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS first_contact_user_id uuid,
  ADD COLUMN IF NOT EXISTS first_contact_name text,
  ADD COLUMN IF NOT EXISTS handoff_sdr_name text;

-- Backfill first_contact_user_id and first_contact_name from lead_activities
WITH first_contacts AS (
  SELECT DISTINCT ON (la.lead_id)
    la.lead_id,
    COALESCE(la.sdr_id, la.user_id) AS fc_user_id,
    COALESCE(la.sdr_name, up.full_name) AS fc_name
  FROM lead_activities la
  LEFT JOIN user_profiles up ON up.id = COALESCE(la.sdr_id, la.user_id)
  WHERE la.activity_type = 'contato_inicial'
  ORDER BY la.lead_id, la.created_at ASC
)
UPDATE public.leads l
SET
  first_contact_user_id = fc.fc_user_id,
  first_contact_name = fc.fc_name
FROM first_contacts fc
WHERE l.id = fc.lead_id
  AND l.first_contact_user_id IS NULL;

-- Backfill handoff_sdr_name only when the first contact user has role 'sdr'
UPDATE public.leads l
SET handoff_sdr_name = l.first_contact_name
FROM user_roles ur
WHERE l.first_contact_user_id IS NOT NULL
  AND ur.user_id = l.first_contact_user_id
  AND ur.role = 'sdr'
  AND l.handoff_sdr_name IS NULL;
