
-- Add new enum values for CRM funnel
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'lead';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'contato_feito';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'visita_reuniao';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'pedido';
