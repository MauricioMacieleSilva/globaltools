

# Plano: Enriquecimento de Leads via CNAE e Portais Públicos

## Objetivo

Adicionar uma nova fonte de dados ao sistema de prospecção que busca empresas por **CNAE** (código de atividade econômica) e enriquece os leads com dados detalhados extraídos de portais públicos como **CNPJ.biz** (via Firecrawl scraping) e **BrasilAPI**.

Os dados extraídos incluirão: razão social, nome fantasia, CNPJ, endereço completo, telefones, email, porte, situação cadastral, situação especial, capital social, natureza jurídica, regime tributário, CNAEs principal e secundários.

---

## O que será feito

### 1. Nova fonte de busca por CNAE

- Adicionar um campo de seleção de **CNAEs relevantes** no painel de prospecção (ex: 46.85-1-00, 24.39-3-00, 25.92-6-02, etc.)
- Incluir CNAEs pré-configurados para o setor siderúrgico e construção
- Usar o Firecrawl para buscar no Google por empresas com esses CNAEs na região selecionada (ex: `site:cnpj.biz CNAE "46.85" "RS"`)

### 2. Scraping de portais públicos via Firecrawl

- Quando um CNPJ for identificado (via busca CNAE ou qualquer outra fonte), usar o Firecrawl para fazer scrape da página do **cnpj.biz** (`https://cnpj.biz/{cnpj}`)
- Extrair com IA (Gemini) todos os campos estruturados da página: razão social, situação especial, capital social, CNAEs, endereço, telefones, email
- Isso complementa o BrasilAPI, que nem sempre retorna todos os dados (ex: situação especial como "Recuperação Judicial")

### 3. Enriquecimento profundo dos leads

- Após a extração via Firecrawl + BrasilAPI, montar um perfil completo do lead com:
  - Dados cadastrais (razão social, CNPJ, porte, natureza jurídica)
  - Situação (ativa, inapta, recuperação judicial)
  - Dados fiscais (MEI, Simples, capital social)
  - Localização completa (logradouro, bairro, CEP, município, UF)
  - Contatos (telefones, email)
  - Atividades (CNAE principal + secundários com descrição)
- Gravar esses detalhes no campo `notes` do lead de forma estruturada

### 4. UI: Seletor de CNAEs no painel

- Adicionar checkboxes ou multi-select com os CNAEs mais relevantes para o setor
- Pré-popular com códigos do setor siderúrgico/metalúrgico/construção
- Checkbox "Buscar por CNAE" como fonte adicional ao lado de Google, PNCP e ObrasGov

---

## Detalhes Técnicos

### Edge Function `prospect-leads/index.ts`

- Nova função `searchByCNAE()` que usa Firecrawl search para encontrar empresas por código CNAE + UF
- Nova função `scrapeCompanyDetails()` que faz scrape de cnpj.biz via Firecrawl e extrai dados estruturados com IA
- Aumentar o enriquecimento de CNPJs de 3 para 10 (paralelo)
- Integrar os dados do scrape no prompt de extração de leads da IA

### Frontend `ProspeccaoPanel.tsx`

- Adicionar checkbox "CNAE" na lista de fontes
- Adicionar multi-select com CNAEs pré-definidos do setor
- Os CNAEs selecionados são enviados no body da Edge Function

### CNAEs pré-configurados

```text
46.85-1-00 - Comércio atacadista de produtos siderúrgicos e metalúrgicos
24.39-3-00 - Produção de outros tubos de ferro e aço
25.92-6-02 - Fabricação de produtos de trefilados de metal
46.89-3-99 - Comércio atacadista especializado em outros produtos
46.92-3-00 - Comércio atacadista de mercadorias em geral
24.49-1-99 - Metalurgia de outros metais não-ferrosos
41.20-4-00 - Construção de edifícios
42.99-5-99 - Outras obras de engenharia civil
25.11-0-00 - Fabricação de estruturas metálicas
```

---

## Resultado esperado

Ao executar a prospecção com CNAE habilitado, o sistema buscará empresas com atividades relevantes na região, fará scrape dos portais públicos e gerará leads com dados muito mais ricos -- incluindo situação especial, capital social, todos os CNAEs, endereço completo e contatos -- tudo automaticamente.

