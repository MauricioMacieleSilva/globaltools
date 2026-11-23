import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Gestão de usuários feita pelo administrador, sem depender de e-mail.
//
// Ações:
//  - create:   cria o usuário já confirmado, com senha provisória.
//  - reassign: reaproveita um usuário existente (e-mail genérico que mudou de
//              dono, ou senha esquecida): troca o nome, gera senha provisória
//              e derruba as sessões antigas.
//
// Nos dois casos o perfil fica com needs_password_reset = true, então o sistema
// obriga a pessoa a criar a própria senha no primeiro acesso.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const VALID_ROLES = ['admin', 'comercial', 'financeiro', 'operacional', 'sdr', 'visitante']

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

// Erros de negócio voltam com status 200 e ok:false para a tela conseguir
// mostrar a mensagem (o supabase-js esconde o corpo em respostas 4xx/5xx).
const fail = (error: string, code = 'error', extra: Record<string, unknown> = {}) =>
  json({ ok: false, error, code, ...extra })

// Senha provisória no formato Abcd-1234-efgh, sem caracteres que se confundem
// (0/O, 1/l/I) para não dar problema ao digitar.
function generateTempPassword(): string {
  const lower = 'abcdefghjkmnpqrstuvwxyz'
  const upper = 'ABCDEFGHJKMNPQRSTUVWXYZ'
  const digits = '23456789'
  const pick = (chars: string, n: number) => {
    const buf = new Uint32Array(n)
    crypto.getRandomValues(buf)
    return Array.from(buf, (v) => chars[v % chars.length]).join('')
  }
  return `${pick(upper, 1)}${pick(lower, 3)}-${pick(digits, 4)}-${pick(lower, 4)}`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    // 1) Quem está chamando precisa estar logado e ser admin.
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ ok: false, error: 'Não autenticado', code: 'unauthorized' }, 401)

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: authError } = await admin.auth.getUser(token)
    if (authError || !caller) return json({ ok: false, error: 'Sessão inválida', code: 'unauthorized' }, 401)

    const { data: callerRoles, error: rolesError } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)

    const isAdmin = !rolesError && callerRoles?.some((r: { role: string }) => r.role === 'admin')
    if (!isAdmin) return json({ ok: false, error: 'Apenas administradores podem gerenciar usuários', code: 'forbidden' }, 403)

    const body = await req.json().catch(() => ({}))
    const action = String(body.action ?? '')

    // ------------------------------------------------------------------
    // CREATE
    // ------------------------------------------------------------------
    if (action === 'create') {
      const email = String(body.email ?? '').trim().toLowerCase()
      const fullName = String(body.fullName ?? '').trim()
      const role = String(body.role ?? '')
      const department = String(body.department ?? '').trim() || null

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('E-mail inválido', 'invalid_email')
      if (!fullName || fullName.length > 255) return fail('Informe o nome de quem vai usar o acesso', 'invalid_name')
      if (!VALID_ROLES.includes(role)) return fail('Perfil de acesso inválido', 'invalid_role')

      // E-mail já cadastrado: devolve quem é, para a tela oferecer a troca de responsável.
      const { data: existing } = await admin
        .from('user_profiles')
        .select('id, full_name, email')
        .eq('email', email)
        .maybeSingle()

      if (existing) {
        return fail('Este e-mail já tem um usuário cadastrado', 'email_exists', {
          existingUser: { id: existing.id, full_name: existing.full_name, email: existing.email },
        })
      }

      const tempPassword = generateTempPassword()

      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      })

      if (createError || !created?.user) {
        const msg = createError?.message ?? ''
        if (/already (been )?registered|already exists/i.test(msg)) {
          return fail('Este e-mail já existe no login, mas está sem perfil. Me avise para corrigir o cadastro.', 'email_exists_auth')
        }
        console.error('admin-manage-user: erro ao criar usuário', createError)
        return fail(`Não foi possível criar o usuário: ${msg || 'erro desconhecido'}`, 'create_failed')
      }

      const userId = created.user.id

      // O gatilho handle_new_user já cria perfil e papel padrão; aqui garantimos
      // os dados escolhidos pelo admin (upsert cobre o caso de o gatilho falhar).
      const { error: profileError } = await admin
        .from('user_profiles')
        .upsert({
          id: userId,
          email,
          full_name: fullName,
          department,
          is_external: !email.endsWith('@globalaco.com.br'),
          invited_by: caller.id,
          needs_password_reset: true,
        }, { onConflict: 'id' })

      if (profileError) {
        console.error('admin-manage-user: erro ao gravar perfil', profileError)
        // Desfaz para não deixar um login órfão.
        await admin.auth.admin.deleteUser(userId)
        return fail(`Não foi possível gravar o perfil: ${profileError.message}`, 'profile_failed')
      }

      await admin.from('user_roles').delete().eq('user_id', userId)
      const { error: roleError } = await admin.from('user_roles').insert({ user_id: userId, role })
      if (roleError) {
        console.error('admin-manage-user: erro ao gravar papel', roleError)
        await admin.auth.admin.deleteUser(userId)
        return fail(`Não foi possível definir o perfil de acesso: ${roleError.message}`, 'role_failed')
      }

      const { error: permsError } = await admin.rpc('create_default_permissions_for_user', {
        _user_id: userId,
        _role: role,
      })
      if (permsError) console.error('admin-manage-user: erro nas permissões padrão', permsError)

      console.log(`admin-manage-user: ${caller.email} criou ${email} (${role})`)

      return json({
        ok: true,
        action: 'create',
        user: { id: userId, email, full_name: fullName, role },
        tempPassword,
        permissionsWarning: !!permsError,
      })
    }

    // ------------------------------------------------------------------
    // REASSIGN (trocar responsável / gerar nova senha)
    // ------------------------------------------------------------------
    if (action === 'reassign') {
      const userId = String(body.userId ?? '')
      const fullName = String(body.fullName ?? '').trim()

      if (!userId) return fail('Usuário não informado', 'invalid_user')
      if (fullName.length > 255) return fail('Nome muito longo', 'invalid_name')
      if (userId === caller.id) {
        return fail('Para trocar a sua própria senha, use "Esqueci minha senha" na tela de login', 'self_not_allowed')
      }

      const { data: profile, error: profileFetchError } = await admin
        .from('user_profiles')
        .select('id, email, full_name')
        .eq('id', userId)
        .maybeSingle()

      if (profileFetchError || !profile) return fail('Usuário não encontrado', 'not_found')

      const newName = fullName || profile.full_name
      const nameChanged = newName !== profile.full_name
      const tempPassword = generateTempPassword()

      // Trocar a senha pelo admin encerra as sessões abertas desse usuário.
      const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: newName },
      })

      if (updateError) {
        console.error('admin-manage-user: erro ao trocar senha', updateError)
        return fail(`Não foi possível gerar a nova senha: ${updateError.message}`, 'update_failed')
      }

      const profileUpdate: Record<string, unknown> = {
        full_name: newName,
        needs_password_reset: true,
        updated_at: new Date().toISOString(),
      }
      // Mudou a pessoa: a foto da anterior não deve continuar aparecendo.
      if (nameChanged) profileUpdate.avatar_url = null

      const { error: profileError } = await admin
        .from('user_profiles')
        .update(profileUpdate)
        .eq('id', userId)

      if (profileError) {
        console.error('admin-manage-user: erro ao atualizar perfil', profileError)
        return fail(`Senha gerada, mas houve erro ao atualizar o perfil: ${profileError.message}`, 'profile_failed', { tempPassword })
      }

      console.log(`admin-manage-user: ${caller.email} gerou novo acesso para ${profile.email}${nameChanged ? ` (agora ${newName})` : ''}`)

      return json({
        ok: true,
        action: 'reassign',
        user: { id: userId, email: profile.email, full_name: newName },
        tempPassword,
      })
    }

    return fail('Ação inválida', 'invalid_action')
  } catch (error) {
    console.error('admin-manage-user: erro inesperado', error)
    return json({ ok: false, error: 'Erro inesperado no servidor', code: 'unexpected' }, 500)
  }
})
