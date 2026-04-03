
-- Replace single send_day with send_days array for configurable weekday selection
ALTER TABLE public.estoque_report_schedule 
  ADD COLUMN send_days TEXT[] NOT NULL DEFAULT '{seg,ter,qua,qui,sex}';

-- Migrate existing data
UPDATE public.estoque_report_schedule SET send_days = '{seg,ter,qua,qui,sex}';

-- Drop old column
ALTER TABLE public.estoque_report_schedule DROP COLUMN send_day;
