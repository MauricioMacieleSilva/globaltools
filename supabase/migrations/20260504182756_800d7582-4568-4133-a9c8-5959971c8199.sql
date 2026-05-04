INSERT INTO public.default_role_permissions (role, page_key, access_type, is_active)
SELECT r.role, 'chamados', t.access_type::access_type, true
FROM (VALUES ('comercial'::user_role), ('sdr'::user_role), ('operacional'::user_role), ('financeiro'::user_role), ('visitante'::user_role)) AS r(role)
CROSS JOIN (VALUES ('view'), ('edit')) AS t(access_type)
ON CONFLICT DO NOTHING;

INSERT INTO public.user_permissions (user_id, page_key, access_type, is_active)
SELECT DISTINCT ur.user_id, 'chamados', t.access_type::access_type, true
FROM public.user_roles ur
CROSS JOIN (VALUES ('view'), ('edit')) AS t(access_type)
WHERE ur.role <> 'admin'
ON CONFLICT DO NOTHING;