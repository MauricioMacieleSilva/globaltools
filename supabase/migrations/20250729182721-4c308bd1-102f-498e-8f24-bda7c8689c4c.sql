-- Atualizar o cron job para 15:25
SELECT cron.unschedule('send-daily-report');

SELECT cron.schedule(
  'send-daily-report',
  '25 15 * * *', -- Every day at 15:25
  $$
  SELECT net.http_post(
    url := 'https://kqltnuyfwobzkdmxqrqm.supabase.co/functions/v1/send-daily-report',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxbHRudXlmd29iemtkbXhxcnFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MDY3MjEsImV4cCI6MjA2OTI4MjcyMX0.GKhHagERNyn8iyIBVtGJFYF1w3CglvuYRKmKfBDFZwQ"}'::jsonb,
    body := '{"scheduled": true}'::jsonb
  );
  $$
);