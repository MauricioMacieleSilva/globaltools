import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Smartphone, Share, MoreVertical, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

type Platform =
  | 'ios-safari'
  | 'ios-other'
  | 'android-chrome'
  | 'android-firefox'
  | 'android-samsung'
  | 'android-other'
  | 'in-app-browser'
  | 'desktop';

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isAndroid = /Android/i.test(ua);
  const isInApp = /(Instagram|FBAN|FBAV|FB_IAB|Line|MicroMessenger|Twitter|TikTok|Snapchat)/i.test(ua);

  if (isInApp) return 'in-app-browser';
  if (isIOS) {
    const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
    return isSafari ? 'ios-safari' : 'ios-other';
  }
  if (isAndroid) {
    if (/SamsungBrowser/i.test(ua)) return 'android-samsung';
    if (/Firefox/i.test(ua)) return 'android-firefox';
    if (/Chrome|CriOS|EdgA/i.test(ua)) return 'android-chrome';
    return 'android-other';
  }
  return 'desktop';
}

interface InstallAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const InstallAppDialog: React.FC<InstallAppDialogProps> = ({ open, onOpenChange }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<Platform>('desktop');
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const installedHandler = () => {
      setIsStandalone(true);
      toast.success('App instalado com sucesso!');
    };
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const handleNativeInstall = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        toast.success('Instalação iniciada');
        onOpenChange(false);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.error('Install prompt error:', err);
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(window.location.origin).then(
      () => toast.success('Link copiado! Cole no Safari ou Chrome.'),
      () => toast.error('Não foi possível copiar o link')
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            Instalar App no Celular
          </DialogTitle>
          <DialogDescription>
            Tenha acesso rápido ao Global Aço direto da tela inicial do seu celular.
          </DialogDescription>
        </DialogHeader>

        {isStandalone ? (
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-300 text-sm">
            ✅ O app já está instalado neste dispositivo!
          </div>
        ) : (
          <div className="space-y-4">
            {deferredPrompt && (
              <Button onClick={handleNativeInstall} className="w-full" size="lg">
                <Download className="h-4 w-4 mr-2" />
                Instalar agora
              </Button>
            )}

            {platform === 'in-app-browser' && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-sm space-y-2">
                <div className="flex items-start gap-2 text-amber-900 dark:text-amber-200">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Você está em um navegador interno</p>
                    <p className="text-xs mt-1">
                      Para instalar, abra este link no <strong>Chrome</strong> (Android) ou <strong>Safari</strong> (iPhone).
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={copyUrl} className="w-full">
                  Copiar link do app
                </Button>
              </div>
            )}

            {(platform === 'ios-safari' || platform === 'ios-other') && (
              <InstructionCard
                title="🍎 iPhone / iPad"
                steps={
                  platform === 'ios-other'
                    ? [
                        <>Abra este link no <strong>Safari</strong> (não funciona em outros navegadores no iOS)</>,
                        <>Toque no ícone <strong>Compartilhar</strong> <Share className="inline h-3 w-3" /></>,
                        <>Role e toque em <strong>"Adicionar à Tela de Início"</strong></>,
                        <>Toque em <strong>"Adicionar"</strong> no canto superior direito</>,
                      ]
                    : [
                        <>Toque no ícone <strong>Compartilhar</strong> <Share className="inline h-3 w-3" /> na barra inferior</>,
                        <>Role e toque em <strong>"Adicionar à Tela de Início"</strong></>,
                        <>Toque em <strong>"Adicionar"</strong> no canto superior direito</>,
                      ]
                }
              />
            )}

            {platform === 'android-chrome' && !deferredPrompt && (
              <InstructionCard
                title="🤖 Android (Chrome/Edge)"
                steps={[
                  <>Toque nos <strong>3 pontos</strong> <MoreVertical className="inline h-3 w-3" /> no canto superior direito</>,
                  <>Toque em <strong>"Instalar app"</strong> ou <strong>"Adicionar à tela inicial"</strong></>,
                  <>Confirme tocando em <strong>"Instalar"</strong></>,
                ]}
              />
            )}

            {platform === 'android-samsung' && (
              <InstructionCard
                title="🤖 Samsung Internet"
                steps={[
                  <>Toque no menu <strong>☰</strong> na barra inferior</>,
                  <>Toque em <strong>"Adicionar página a"</strong> → <strong>"Tela inicial"</strong></>,
                  <>Confirme tocando em <strong>"Adicionar"</strong></>,
                ]}
              />
            )}

            {platform === 'android-firefox' && (
              <InstructionCard
                title="🦊 Firefox Android"
                steps={[
                  <>Toque nos <strong>3 pontos</strong> <MoreVertical className="inline h-3 w-3" /> no canto superior direito</>,
                  <>Toque em <strong>"Instalar"</strong> ou <strong>"Adicionar à tela inicial"</strong></>,
                  <>Confirme a instalação</>,
                ]}
              />
            )}

            {(platform === 'android-other' || platform === 'desktop') && !deferredPrompt && platform !== 'in-app-browser' && (
              <>
                <InstructionCard
                  title="🍎 iPhone (Safari)"
                  steps={[
                    <>Abra o app no <strong>Safari</strong></>,
                    <>Toque em <strong>Compartilhar</strong> <Share className="inline h-3 w-3" /></>,
                    <>Toque em <strong>"Adicionar à Tela de Início"</strong></>,
                  ]}
                />
                <InstructionCard
                  title="🤖 Android (Chrome)"
                  steps={[
                    <>Abra o app no <strong>Chrome</strong></>,
                    <>Toque nos <strong>3 pontos</strong> <MoreVertical className="inline h-3 w-3" /></>,
                    <>Toque em <strong>"Instalar app"</strong> ou <strong>"Adicionar à tela inicial"</strong></>,
                  ]}
                />
                {platform === 'desktop' && (
                  <Button variant="outline" size="sm" onClick={copyUrl} className="w-full">
                    Copiar link para abrir no celular
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const InstructionCard: React.FC<{ title: string; steps: React.ReactNode[] }> = ({ title, steps }) => (
  <div className="p-3 rounded-lg bg-muted/50 border space-y-2">
    <p className="font-semibold text-sm">{title}</p>
    <ol className="list-decimal list-inside space-y-1.5 text-xs text-muted-foreground">
      {steps.map((s, i) => (
        <li key={i}>{s}</li>
      ))}
    </ol>
  </div>
);