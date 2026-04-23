

## Acelerar carregamento de vendedores na Passagem de Bastão

### Problema

Hoje, ao abrir o diálogo de Passagem de Bastão, a lista de vendedores só começa a ser carregada **naquele momento**, com **2 queries sequenciais** (`user_roles` depois `user_profiles`). Resultado: o dropdown fica vazio por 1-3 segundos toda vez que é aberto.

### Solução

Pré-carregar e cachear a lista de vendedores assim que o CRM carrega, exibindo-os instantaneamente quando o diálogo abrir.

### Mudanças

**1. Criar hook `useCommercialVendors` (`src/hooks/useCommercialVendors.ts`)**
- Busca uma única vez por sessão a lista de usuários com role `comercial` ou `admin`.
- Faz as duas queries em **paralelo** (`Promise.all`) em vez de sequencial.
- Mantém cache em memória (módulo-level) para não refazer a query ao reabrir o diálogo.
- Expõe `{ vendors, loading }`.

**2. Atualizar `PassagemBastaoDialog.tsx`**
- Substituir o `useEffect` que faz fetch por uso direto do hook.
- Mostrar skeleton/placeholder "Carregando vendedores..." apenas no primeiro carregamento (raríssimo, pois o hook já está warm).
- Manter ordenação alfabética por `full_name`.

**3. Pré-aquecer o cache em `src/pages/CRM.tsx`**
- Chamar `useCommercialVendors()` no nível da página CRM para que a lista já esteja pronta antes do usuário clicar em qualquer card.

### Resultado esperado

Ao arrastar um lead para "Oportunidade", o diálogo abre com a lista de vendedores **já populada instantaneamente**, sem espera perceptível.

### Arquivos afetados

- `src/hooks/useCommercialVendors.ts` (novo)
- `src/components/crm/PassagemBastaoDialog.tsx` (refatorar fetch)
- `src/pages/CRM.tsx` (pré-aquecer hook)

Nenhuma mudança em banco de dados ou RLS.

