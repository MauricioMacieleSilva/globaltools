-- Add unsuccessful contacts count field to leads table
ALTER TABLE public.leads 
ADD COLUMN unsuccessful_contacts_count integer DEFAULT 0;