
-- Business hours helper: add N minutes to a timestamp considering Mon-Fri 08:00-17:45 (America/Sao_Paulo)
CREATE OR REPLACE FUNCTION public.add_business_minutes(start_ts timestamptz, mins integer)
RETURNS timestamptz
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  tz constant text := 'America/Sao_Paulo';
  day_start_min constant integer := 8 * 60;        -- 08:00
  day_end_min constant integer := 17 * 60 + 45;    -- 17:45
  day_minutes constant integer := day_end_min - day_start_min; -- 585
  cur timestamp;        -- local (no tz) running cursor
  remaining integer := mins;
  dow integer;
  cur_min integer;
  available integer;
  consume integer;
BEGIN
  IF mins IS NULL OR mins <= 0 THEN
    RETURN start_ts;
  END IF;

  -- Convert to local time of business tz
  cur := (start_ts AT TIME ZONE tz);

  WHILE remaining > 0 LOOP
    dow := EXTRACT(ISODOW FROM cur)::int; -- 1=Mon..7=Sun
    cur_min := (EXTRACT(HOUR FROM cur)::int) * 60 + EXTRACT(MINUTE FROM cur)::int;

    IF dow >= 6 THEN
      -- Weekend: jump to next Monday 08:00
      cur := date_trunc('day', cur) + ((8 - dow) || ' days')::interval + (day_start_min || ' minutes')::interval;
    ELSIF cur_min < day_start_min THEN
      cur := date_trunc('day', cur) + (day_start_min || ' minutes')::interval;
    ELSIF cur_min >= day_end_min THEN
      -- After hours: next day 08:00 (handle Fri -> Mon)
      IF dow = 5 THEN
        cur := date_trunc('day', cur) + interval '3 days' + (day_start_min || ' minutes')::interval;
      ELSE
        cur := date_trunc('day', cur) + interval '1 day' + (day_start_min || ' minutes')::interval;
      END IF;
    ELSE
      available := day_end_min - cur_min;
      consume := LEAST(available, remaining);
      cur := cur + (consume || ' minutes')::interval;
      remaining := remaining - consume;
    END IF;
  END LOOP;

  RETURN (cur AT TIME ZONE tz);
END;
$$;

-- Update SLA deadline trigger to use business hours
CREATE OR REPLACE FUNCTION public.set_ticket_sla_deadline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sla_mins integer;
BEGIN
  SELECT sla_minutes INTO sla_mins
  FROM public.ticket_categories
  WHERE id = NEW.category_id;

  IF sla_mins IS NOT NULL THEN
    NEW.sla_deadline := public.add_business_minutes(NEW.created_at, sla_mins);
  END IF;

  RETURN NEW;
END;
$$;

-- Recalculate sla_deadline for existing open/in_progress tickets
UPDATE public.tickets t
SET sla_deadline = public.add_business_minutes(t.created_at, tc.sla_minutes)
FROM public.ticket_categories tc
WHERE t.category_id = tc.id
  AND t.status IN ('aberto', 'em_andamento')
  AND tc.sla_minutes IS NOT NULL;
