import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Check, Copy, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { AccessCredentials, buildAccessMessage } from '@/lib/admin-users'

interface UserAccessCardProps {
  credentials: AccessCredentials
}

// Mostra o acesso recém-gerado e o texto pronto para enviar à pessoa.
// A senha provisória só aparece aqui: depois de fechar não há como consultar,
// apenas gerar outra.
export const UserAccessCard: React.FC<UserAccessCardProps> = ({ credentials }) => {
  const [copied, setCopied] = useState<'message' | 'password' | null>(null)
  const message = buildAccessMessage(credentials)

  const copy = async (text: string, what: 'message' | 'password') => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(what)
      toast.success(what === 'message' ? 'Mensagem copiada' : 'Senha copiada')
      setTimeout(() => setCopied(null), 2500)
    } catch {
      toast.error('Não foi possível copiar. Selecione o texto e copie manualmente.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
        <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        <div className="text-sm">
          <p className="font-medium text-foreground">Acesso pronto para {credentials.fullName}</p>
          <p className="text-muted-foreground">
            Copie a mensagem abaixo e envie para a pessoa. No primeiro acesso ela cria a própria senha.
          </p>
        </div>
      </div>

      <pre className="whitespace-pre-wrap break-words rounded-lg border bg-muted/40 p-4 font-sans text-sm text-foreground select-all">
        {message}
      </pre>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" className="flex-1" onClick={() => copy(message, 'message')}>
          {copied === 'message' ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
          Copiar mensagem
        </Button>
        <Button type="button" variant="outline" onClick={() => copy(credentials.tempPassword, 'password')}>
          {copied === 'password' ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
          Copiar só a senha
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        A senha provisória não fica salva em lugar nenhum. Se perder, é só gerar um novo acesso.
      </p>
    </div>
  )
}
