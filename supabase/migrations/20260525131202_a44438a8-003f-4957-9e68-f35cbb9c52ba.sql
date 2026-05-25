
-- ============================================================
-- Lock down RLS policies that incorrectly target `public` role
-- (unauthenticated). Restrict to `authenticated` only.
-- ============================================================

-- crm_business_sectors
DROP POLICY IF EXISTS "Auth view sectors" ON public.crm_business_sectors;
CREATE POLICY "Auth view sectors" ON public.crm_business_sectors
  FOR SELECT TO authenticated USING (true);

-- crm_lead_sources
DROP POLICY IF EXISTS "Anyone can view lead sources" ON public.crm_lead_sources;
CREATE POLICY "Authenticated can view lead sources" ON public.crm_lead_sources
  FOR SELECT TO authenticated USING (true);

-- crm_loss_reasons
DROP POLICY IF EXISTS "Authenticated can view loss reasons" ON public.crm_loss_reasons;
CREATE POLICY "Authenticated can view loss reasons" ON public.crm_loss_reasons
  FOR SELECT TO authenticated USING (true);

-- crm_product_interests
DROP POLICY IF EXISTS "Auth view product interests" ON public.crm_product_interests;
CREATE POLICY "Auth view product interests" ON public.crm_product_interests
  FOR SELECT TO authenticated USING (true);

-- default_role_permissions
DROP POLICY IF EXISTS "Authenticated users can view default permissions" ON public.default_role_permissions;
CREATE POLICY "Authenticated users can view default permissions" ON public.default_role_permissions
  FOR SELECT TO authenticated USING (true);

-- estoque_itens
DROP POLICY IF EXISTS "Authenticated users can view estoque items" ON public.estoque_itens;
CREATE POLICY "Authenticated users can view estoque items" ON public.estoque_itens
  FOR SELECT TO authenticated USING (true);

-- estoque_report_schedule
DROP POLICY IF EXISTS "Authenticated users can view estoque report schedule" ON public.estoque_report_schedule;
CREATE POLICY "Authenticated users can view estoque report schedule" ON public.estoque_report_schedule
  FOR SELECT TO authenticated USING (true);

-- frete_historico
DROP POLICY IF EXISTS "Authenticated users can view frete history" ON public.frete_historico;
DROP POLICY IF EXISTS "Authenticated users can insert frete history" ON public.frete_historico;
CREATE POLICY "Authenticated users can view frete history" ON public.frete_historico
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert frete history" ON public.frete_historico
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- fretes
DROP POLICY IF EXISTS "Authenticated users can view fretes" ON public.fretes;
DROP POLICY IF EXISTS "Admin, comercial, operacional can insert fretes" ON public.fretes;
DROP POLICY IF EXISTS "Admin, comercial, operacional can update fretes" ON public.fretes;
DROP POLICY IF EXISTS "Only admin can delete fretes" ON public.fretes;
CREATE POLICY "Authenticated users can view fretes" ON public.fretes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin, comercial, operacional can insert fretes" ON public.fretes
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin'::user_role) OR has_role(auth.uid(),'comercial'::user_role) OR has_role(auth.uid(),'operacional'::user_role));
CREATE POLICY "Admin, comercial, operacional can update fretes" ON public.fretes
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin'::user_role) OR has_role(auth.uid(),'comercial'::user_role) OR has_role(auth.uid(),'operacional'::user_role));
CREATE POLICY "Only admin can delete fretes" ON public.fretes
  FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'::user_role));

-- politica_comercial_itens
DROP POLICY IF EXISTS "Authenticated users can view items" ON public.politica_comercial_itens;
CREATE POLICY "Authenticated users can view items" ON public.politica_comercial_itens
  FOR SELECT TO authenticated USING (true);

-- transportadoras
DROP POLICY IF EXISTS "Authenticated users can view transportadoras" ON public.transportadoras;
DROP POLICY IF EXISTS "Operacional e comercial can manage transportadoras" ON public.transportadoras;
CREATE POLICY "Authenticated users can view transportadoras" ON public.transportadoras
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Operacional e comercial can manage transportadoras" ON public.transportadoras
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::user_role) OR has_role(auth.uid(),'comercial'::user_role) OR has_role(auth.uid(),'operacional'::user_role))
  WITH CHECK (has_role(auth.uid(),'admin'::user_role) OR has_role(auth.uid(),'comercial'::user_role) OR has_role(auth.uid(),'operacional'::user_role));

-- vendor_avatars: lock to authenticated, mutations to admin/comercial
DROP POLICY IF EXISTS "Authenticated users can manage vendor avatars" ON public.vendor_avatars;
DROP POLICY IF EXISTS "Authenticated users can view vendor avatars" ON public.vendor_avatars;
CREATE POLICY "Authenticated users can view vendor avatars" ON public.vendor_avatars
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin and comercial manage vendor avatars" ON public.vendor_avatars
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::user_role) OR has_role(auth.uid(),'comercial'::user_role))
  WITH CHECK (has_role(auth.uid(),'admin'::user_role) OR has_role(auth.uid(),'comercial'::user_role));

-- production_orders: scope to authenticated + role checks (service role bypasses RLS)
DROP POLICY IF EXISTS "Authenticated users can view production orders" ON public.production_orders;
DROP POLICY IF EXISTS "Authenticated users can insert production orders" ON public.production_orders;
DROP POLICY IF EXISTS "Authenticated users can update production orders" ON public.production_orders;
CREATE POLICY "Authenticated users can view production orders" ON public.production_orders
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert production orders" ON public.production_orders
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update production orders" ON public.production_orders
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- lead_prospecting_results: restrict to authenticated CRM roles
DROP POLICY IF EXISTS "Service role can insert prospecting results" ON public.lead_prospecting_results;
DROP POLICY IF EXISTS "All CRM roles can view prospecting results" ON public.lead_prospecting_results;
DROP POLICY IF EXISTS "All CRM roles can update prospecting results" ON public.lead_prospecting_results;
CREATE POLICY "CRM roles can insert prospecting results" ON public.lead_prospecting_results
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin'::user_role) OR has_role(auth.uid(),'comercial'::user_role) OR has_role(auth.uid(),'sdr'::user_role));
CREATE POLICY "CRM roles can view prospecting results" ON public.lead_prospecting_results
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::user_role) OR has_role(auth.uid(),'comercial'::user_role) OR has_role(auth.uid(),'sdr'::user_role));
CREATE POLICY "CRM roles can update prospecting results" ON public.lead_prospecting_results
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin'::user_role) OR has_role(auth.uid(),'comercial'::user_role) OR has_role(auth.uid(),'sdr'::user_role));

-- notified_finalized_orders: restrict to admin only (service role bypasses RLS)
DROP POLICY IF EXISTS "Service role and admin access" ON public.notified_finalized_orders;
CREATE POLICY "Admin only access" ON public.notified_finalized_orders
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::user_role))
  WITH CHECK (has_role(auth.uid(),'admin'::user_role));

-- Storage: ticket-attachments — drop public SELECT, allow authenticated only
DROP POLICY IF EXISTS "Anyone can view ticket attachments" ON storage.objects;
CREATE POLICY "Authenticated can view ticket attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'ticket-attachments');
