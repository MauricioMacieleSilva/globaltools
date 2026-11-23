-- Aplicada em produção em 23/11/2026.
-- A policy de "atualizar o próprio perfil" comparava campos com "=".
-- Como invited_by é NULL para todos, a verificação sempre falhava: nenhum
-- usuário não-admin conseguia gravar no próprio perfil (último acesso, troca
-- obrigatória de senha, foto). Mesma regra, agora segura para NULL.
alter policy "Users can update own profile limited fields" on public.user_profiles
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role        is not distinct from (select p.role        from public.user_profiles p where p.id = auth.uid())
    and email       is not distinct from (select p.email       from public.user_profiles p where p.id = auth.uid())
    and is_external is not distinct from (select p.is_external from public.user_profiles p where p.id = auth.uid())
    and invited_by  is not distinct from (select p.invited_by  from public.user_profiles p where p.id = auth.uid())
  );
