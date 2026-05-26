
## Objetivo

Permitir que qualquer usuário instale o sistema como app no celular (iPhone e Android), independente da versão, sem depender de Service Worker (que já causou travamento de login antes).

## Diagnóstico

Hoje o projeto tem:
- `public/manifest.json` correto (standalone, ícones 192/512, theme_color).
- `index.html` com meta tags PWA básicas e registro de `sw.js`.
- `public/sw.js` ativo — risco recorrente de quebrar auth/preview.
- `PWAInstallPrompt.tsx` que tenta `beforeinstallprompt` e mostra instrução iOS.
- `UserAvatarMenu.tsx` já tem seção "Instalar no celular" com passo a passo.

Problemas que impedem instalação universal:
1. Service Worker continua presente e instável — sem ele a instalação ainda funciona (só perde "offline", que não é requisito).
2. iOS Safari NUNCA dispara `beforeinstallprompt` — só funciona via "Compartilhar → Adicionar à Tela de Início". Precisa instrução clara sempre disponível.
3. Android: alguns navegadores (Firefox, Samsung Internet, in-app browsers do Instagram/Facebook) não suportam o prompt automático — precisa instrução manual.
4. O prompt atual só aparece em mobile e some por 1 semana se dispensado — usuário que perdeu não tem como reabrir facilmente fora do menu do avatar.

## Mudanças propostas

### 1. Remover Service Worker definitivamente (kill-switch)
Seguindo a diretriz PWA da Lovable: sem SW, basta o manifest para a instalação funcionar em todos os dispositivos.

- `public/sw.js` → converter em kill-switch (skipWaiting + claim + limpar caches + unregister, sem handler de fetch).
- `index.html` → remover bloco de `navigator.serviceWorker.register('/sw.js')` e listeners. Adicionar limpeza defensiva (`getRegistrations().then(r => r.unregister())`).
- `src/hooks/useAppUpdate.ts` → no-ops para não quebrar `UpdateNotification`.
- `public/version.json` → bump para `1.0.3`.

### 2. Reforçar manifest e meta tags para instalabilidade universal
- `public/manifest.json`: garantir `id`, `display_override: ["standalone", "minimal-ui"]` para fallback em navegadores Android antigos. Manter ícones `any maskable`.
- `index.html`: adicionar `<link rel="apple-touch-icon" sizes="180x180">` específico, e `<meta name="mobile-web-app-capable" content="yes">` (Chrome Android antigo).

### 3. Página/dialog dedicado "Instalar App"
Criar uma rota/dialog acessível sempre, com instruções por navegador detectado:

- Novo componente `src/components/InstallAppDialog.tsx`:
  - Detecta plataforma (iOS Safari, iOS Chrome, Android Chrome, Android Firefox, Samsung Internet, in-app browser).
  - Se `beforeinstallprompt` disponível → botão "Instalar agora" que chama `prompt()`.
  - Se não → mostra passo a passo específico para o navegador detectado, com screenshots/ícones.
  - Caso de in-app browser (Instagram/Facebook) → orientar a abrir no Chrome/Safari nativo via menu.
- Adicionar link/botão "Instalar App" também no `AppSidebar` (não só no menu do avatar), visível em mobile.

### 4. Ajustar `PWAInstallPrompt.tsx`
- Mostrar também em Android sem `beforeinstallprompt` (Firefox/Samsung) com instrução manual.
- Encurtar o "1 semana de silêncio" para 3 dias.
- Botão "Como instalar?" sempre abre o novo `InstallAppDialog`.

### 5. Atualizar instruções no `UserAvatarMenu.tsx`
Manter o conteúdo, mas trocar pelo `InstallAppDialog` reutilizável (DRY).

## Pós-deploy

Usuários com SW antigo cacheado: ao abrir o sistema 1x e dar refresh, o kill-switch limpa tudo. A partir daí, a instalação funciona via:
- Android Chrome/Edge: prompt automático ou menu ⋮ → "Instalar app".
- iOS Safari: Compartilhar → Adicionar à Tela de Início.
- Outros navegadores: instrução manual no dialog.

## Escopo

Apenas frontend (HTML, manifest, componentes React, hook). Sem mudanças em auth, RLS, banco ou edge functions.

## Confirmação

Posso prosseguir com essa abordagem (remover SW + manifest-only + dialog de instalação universal)? Ou prefere manter o Service Worker e só melhorar o fluxo de instalação?
