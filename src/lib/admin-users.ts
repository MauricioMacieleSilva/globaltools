import { supabase } from '@/integrations/supabase/client'
import { UserRole } from '@/lib/supabase'

export interface AccessCredentials {
  email: string
  fullName: string
  tempPassword: string
}

export interface ExistingUserInfo {
  id: string
  full_name: string
  email: string
}

export type ManageUserResult =
  | { ok: true; credentials: AccessCredentials; userId: string }
  | { ok: false; error: string; code: string; existingUser?: ExistingUserInfo }

type ManageUserPayload =
  | { action: 'create'; email: string; fullName: string; role: UserRole; department?: string }
  | { action: 'reassign'; userId: string; fullName?: string }

// Chama a edge function admin-manage-user e devolve sempre um resultado
// tratável pela tela (nunca lança).
export async function manageUser(payload: ManageUserPayload): Promise<ManageUserResult> {
  try {
    const { data, error } = await supabase.functions.invoke('admin-manage-user', { body: payload })

    if (error) {
      // Respostas 4xx/5xx chegam como erro; tentamos ler a mensagem do corpo.
      let message = 'Não foi possível falar com o servidor. Tente novamente.'
      let code = 'network'
      try {
        const body = await (error as { context?: Response }).context?.json()
        if (body?.error) message = body.error
        if (body?.code) code = body.code
      } catch {
        // mantém a mensagem genérica
      }
      return { ok: false, error: message, code }
    }

    if (!data?.ok) {
      return {
        ok: false,
        error: data?.error || 'Erro desconhecido',
        code: data?.code || 'error',
        existingUser: data?.existingUser,
      }
    }

    return {
      ok: true,
      userId: data.user.id,
      credentials: {
        email: data.user.email,
        fullName: data.user.full_name,
        tempPassword: data.tempPassword,
      },
    }
  } catch (e) {
    console.error('Erro em manageUser:', e)
    return { ok: false, error: 'Erro inesperado. Tente novamente.', code: 'unexpected' }
  }
}

// Texto pronto para colar no WhatsApp da pessoa.
export function buildAccessMessage({ email, fullName, tempPassword }: AccessCredentials): string {
  // Nomes compostos (Ana Paula, João Pedro) ficam inteiros; nome completo vira só o primeiro nome.
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  const greetingName = parts.length <= 2 ? parts.join(' ') : parts[0]
  const appUrl = window.location.origin

  return [
    `Oi${greetingName ? ` ${greetingName}` : ''}, seu acesso ao Globinho está liberado.`,
    '',
    `Link: ${appUrl}`,
    `E-mail: ${email}`,
    `Senha provisória: ${tempPassword}`,
    '',
    'No primeiro acesso o sistema vai pedir para você criar a sua própria senha.',
  ].join('\n')
}
