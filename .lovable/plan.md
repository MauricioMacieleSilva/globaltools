## Problema

O console do print mostra dezenas de erros `SW: Network request failed: TypeError: Failed to fetch` em `public/sw.js`, e a tela fica travada em "Verificando autenticação...". Ou seja, o Service Worker está derrubando as chamadas para o backend (Supabase Auth/DB), impedindo qualquer usuário de entrar no sistema.

## Causa

Em `public/sw.js` o handler de `fetch` intercepta TODAS as requisições cross-origin e tenta reemitir com `fetch(event.request)`. Quando a requisição original tem corpo/headers de autenticação (POST para `/auth/v1/token`, `/rest/v1/...`), esse re-fetch falha em alguns navegadores/contextos com `TypeError: Failed to fetch`, e o SW responde erro em vez de deixar o navegador fazer a chamada direta. Resultado: o `AuthContext` fica preso buscando sessão/perfil e a tela "Verificando autenticação..." nunca sai.

## Correção

Editar `public/sw.js` para NÃO interceptar requisições cross-origin nem APIs do Supabase. Deixar o navegador tratá-las nativamente.

Mudanças no handler `fetch`:
1. Se `event.request.url` não começa com `self.location.origin` → fazer `return;` (sem `event.respondWith`), assim o browser executa a chamada normalmente. Remove o bloco que reemitia com `fetch().catch()`.
2. Adicionar early return também para URLs contendo `supabase.co`, `lovable.dev` e `lovable.app` por garantia.
3. Manter network-first para navegação e cache-first apenas para assets same-origin.
4. Bump da versão em `public/version.json` (ex.: `1.0.2`) para forçar ativação do novo SW e limpar caches antigos.

Após o deploy, usuários com SW antigo cacheado serão atualizados na próxima visita (o `activate` já limpa caches de versões diferentes e chama `clients.claim()`).

## Arquivos

- `public/sw.js` — simplificar handler `fetch` para ignorar cross-origin
- `public/version.json` — incrementar versão

## Escopo

Apenas frontend/SW. Sem alterações em código de auth, RLS ou banco.
