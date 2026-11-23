-- Aplicada em produção em 23/11/2026.

-- 1) Perfil do usuário: fonte única é user_roles.
-- get_current_user_role() lia a coluna antiga user_profiles.role, desatualizada
-- para 15 de 16 usuários. 41 policies usam esta função.
create or replace function public.get_current_user_role()
returns text
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(
    (select r.role::text from public.user_roles r where r.user_id = auth.uid() limit 1),
    (select p.role from public.user_profiles p where p.id = auth.uid() limit 1)
  );
$$;

-- 2) Telas liberadas seguem o perfil (default_role_permissions).
-- Antes esta função gravava uma lista fixa de telas como permissões
-- individuais, ignorando "Telas por Perfil". Agora apenas limpa as individuais,
-- que ficam reservadas para exceções.
create or replace function public.create_default_permissions_for_user(
  _user_id uuid,
  _role user_role
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  delete from public.user_permissions where user_id = _user_id;
end;
$$;

-- 3) Último acesso: recupera a data real a partir do login e das sessões.
update public.user_profiles p
   set last_login = greatest(
         p.last_login,
         u.last_sign_in_at,
         (select max(greatest(s.updated_at, s.refreshed_at at time zone 'utc'))
            from auth.sessions s where s.user_id = u.id)
       )
  from auth.users u
 where u.id = p.id
   and greatest(
         u.last_sign_in_at,
         (select max(greatest(s.updated_at, s.refreshed_at at time zone 'utc'))
            from auth.sessions s where s.user_id = u.id)
       ) is not null;
