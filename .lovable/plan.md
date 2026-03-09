

## Problema

O portal PNCP (pncp.gov.br) é um SPA Angular que renderiza 100% via JavaScript. Os links construídos pela API (`/app/editais/{cnpj}/{ano}/{seq}`) resultam em página em branco porque o formato da URL muda frequentemente e depende de routing client-side. Mesmo com diferentes combinações de parâmetros, os links não funcionam de forma confiável.

## Solução: Firecrawl Search para encontrar links reais

O Firecrawl já está conectado ao projeto. A melhor opção é usar o **Firecrawl Search** para buscar no Google a licitação específica e obter a URL real indexada que funciona.

### Abordagem

**Na edge function `prospect-leads`**, após coletar os resultados da API PNCP:

1. Para cada licitação PNCP que tenha `linkSistemaOrigem` vazio, fazer uma busca rápida via Firecrawl Search com query tipo `site:pncp.gov.br "{CNPJ}" "{objeto resumido}"`
2. Se o Firecrawl retornar uma URL do pncp.gov.br, usar essa como `source_url`
3. Se não encontrar, usar como fallback uma URL de busca do Google: `https://www.google.com/search?q=pncp+{CNPJ}+{objeto}`

Isso garante que o usuário sempre tenha um link clicável que funciona -- ou a página real do PNCP indexada pelo Google, ou uma busca no Google que o leva até lá.

### Otimização de custos

- Limitar a busca Firecrawl a no máximo 1 resultado por licitação (`limit: 1`)
- Não usar `scrapeOptions` (não precisa do conteúdo, só da URL)
- Agrupar no máximo 5 buscas por execução para não estourar créditos
- Se já tem `linkSistemaOrigem` do PNCP, usar direto sem gastar crédito

### Mudanças

**`supabase/functions/prospect-leads/index.ts`**:
- Nova função `findPNCPRealUrl(cnpj, objeto)` que usa Firecrawl Search
- Atualizar o loop de processamento PNCP para chamar essa função quando `linkSistemaOrigem` estiver vazio
- Fallback para URL de busca Google quando Firecrawl não encontra

### Leads existentes

- Para leads PNCP já salvos com links quebrados, atualizar o fallback no frontend: quando o link contém `pncp.gov.br/app/editais/` e o CNPJ está disponível, redirecionar para uma busca Google ao invés de abrir o link quebrado direto

