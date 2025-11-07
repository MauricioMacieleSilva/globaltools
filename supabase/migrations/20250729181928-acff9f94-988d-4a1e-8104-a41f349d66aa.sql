-- Enable pg_cron extension for scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create cron job to send daily reports at 15:15 (3:15 PM) Brazil time
SELECT cron.schedule(
  'send-daily-report',
  '15 15 * * *', -- Every day at 15:15
  $$
  SELECT net.http_post(
    url := 'https://kqltnuyfwobzkdmxqrqm.supabase.co/functions/v1/send-daily-report',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxbHRudXlmd29iemtkbXhxcnFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MDY3MjEsImV4cCI6MjA2OTI4MjcyMX0.GKhHagERNyn8iyIBVtGJFYF1w3CglvuYRKmKfBDFZwQ"}'::jsonb,
    body := '{"scheduled": true}'::jsonb
  );
  $$
);