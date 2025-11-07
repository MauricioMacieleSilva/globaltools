import React from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Shield, ExternalLink, AlertTriangle } from 'lucide-react'

export const SecurityConfigNotice: React.FC = () => {
  return (
    <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertTitle className="text-orange-800 dark:text-orange-200">
        Configuração de Segurança Pendente
      </AlertTitle>
      <AlertDescription className="text-orange-700 dark:text-orange-300 space-y-3">
        <p>
          Para garantir máxima segurança, configure as seguintes opções no painel do Supabase:
        </p>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-orange-700 border-orange-300">
              Pendente
            </Badge>
            <span className="text-sm">
              <strong>OTP Expiry:</strong> Configurar tempo de expiração mais seguro para códigos OTP
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-orange-700 border-orange-300">
              Pendente
            </Badge>
            <span className="text-sm">
              <strong>Leaked Password Protection:</strong> Ativar proteção contra senhas vazadas
            </span>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            className="text-orange-700 border-orange-300 hover:bg-orange-100"
            onClick={() => window.open('https://supabase.com/dashboard/project/kqltnuyfwobzkdmxqrqm/auth/providers', '_blank')}
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            Configurar Auth
          </Button>
        </div>

        <p className="text-xs mt-2">
          <Shield className="w-3 h-3 inline mr-1" />
          As proteções de RLS e validação já foram implementadas no código.
        </p>
      </AlertDescription>
    </Alert>
  )
}