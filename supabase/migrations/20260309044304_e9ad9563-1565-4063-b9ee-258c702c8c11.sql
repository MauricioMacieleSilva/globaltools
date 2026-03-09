-- Allow comercial and SDR to update crm_lead_sources
CREATE POLICY "Comercial update lead sources"
ON public.crm_lead_sources
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::user_role) OR 
  has_role(auth.uid(), 'comercial'::user_role) OR 
  has_role(auth.uid(), 'sdr'::user_role)
);

-- Allow comercial and SDR to delete crm_lead_sources
CREATE POLICY "Comercial delete lead sources"
ON public.crm_lead_sources
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::user_role) OR 
  has_role(auth.uid(), 'comercial'::user_role) OR 
  has_role(auth.uid(), 'sdr'::user_role)
);

-- Allow comercial and SDR to update crm_business_sectors
CREATE POLICY "Comercial update business sectors"
ON public.crm_business_sectors
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::user_role) OR 
  has_role(auth.uid(), 'comercial'::user_role) OR 
  has_role(auth.uid(), 'sdr'::user_role)
);

-- Allow comercial and SDR to delete crm_business_sectors
CREATE POLICY "Comercial delete business sectors"
ON public.crm_business_sectors
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::user_role) OR 
  has_role(auth.uid(), 'comercial'::user_role) OR 
  has_role(auth.uid(), 'sdr'::user_role)
);