
## Plano: Ajustes de peso, formato e emails de producao

### 1. Peso total na linha do pedido (via planilha comercial)

A planilha de producao nao tem coluna de peso em KG. A solucao e buscar o peso da planilha comercial (mesma usada no Dashboard Comercial), cruzando pelo numero do pedido.

**Alteracoes em `src/services/producaoService.ts`:**
- Apos o fetch da planilha de producao, fazer um segundo fetch da planilha comercial (mesmo `SHEET_ID`, gid `1086211541`)
- Construir um mapa `pedido + descricaomat -> peso (KG)` a partir dos dados comerciais
- Para cada material na producao, buscar o peso correspondente no mapa comercial
- Adicionar campo `peso_kg` ao `MaterialData` interface
- Agregar `peso_kg` no nivel da OP (novo campo `peso_total_kg`) e no nivel do pedido (novo campo `peso_total_kg`)
- Manter o `pesos_por_unidade` existente para exibir unidades nao-KG nos itens expandidos

### 2. Formato de peso na linha principal do pedido

**Alteracoes em `src/components/dashboard/ProducaoTable.tsx`:**
- Linha do pedido: exibir sempre em KG com separador de milhar brasileiro, sem abreviar para toneladas
- Formato: `2.950KG` (usando `toLocaleString('pt-BR')`)
- Usar o novo campo `peso_total_kg` do pedido

### 3. Peso nas linhas expandidas das OPs

**Alteracoes em `src/components/dashboard/ProducaoTable.tsx`:**
- Se a OP tem apenas KG: exibir somente o peso em KG (ex: `401KG`)
- Se a OP tem outras unidades (M, PC, etc): exibir as unidades + peso KG separados por pipe (ex: `157,5 M | 756KG`)
- Usar o `pesos_por_unidade` para unidades nao-KG e o novo `peso_total_kg` da OP para o peso

### 4. Remover `[TESTE]` dos assuntos de email

**Alteracoes em `supabase/functions/notify-production-status/index.ts`:**
- Remover a logica `isTestMode` que adiciona `[TESTE]` ao subject
- Enviar para os destinatarios reais (remover flag `isTestMode = true`)

**Alteracoes em `supabase/functions/send-production-report/index.ts`:**
- Mesma remocao do `isTestMode` e `[TESTE]` do subject

### 5. Remover "RECEM CONCLUIDO" do email de notificacao

**Alteracoes em `supabase/functions/notify-production-status/index.ts`:**
- Remover a linha que exibe o emoji e texto "RECEM CONCLUIDO" no HTML do email (linha 69)

---

### Detalhes tecnicos

**Novo fluxo de dados em `producaoService.ts`:**

```text
1. Fetch CSV producao (gid 407047369)
2. Fetch CSV comercial (gid 1086211541) 
3. Criar mapa: { "pedido_descricaomat" -> peso_kg }
4. Para cada material de producao:
   - Buscar peso_kg no mapa pelo numeropedido + descricaomat
   - Se nao encontrar, usar qtd_venda como fallback (quando UN=KG)
5. Agregar peso_total_kg por OP e por pedido
```

**Interfaces atualizadas:**

```text
MaterialData {
  ...campos existentes...
  peso_kg: number;  // NOVO - peso em KG vindo da planilha comercial
}

OperacaoData {
  ...campos existentes...
  peso_total_kg: number;  // NOVO - soma dos pesos KG dos materiais
}

ProducaoData {
  ...campos existentes...
  peso_total_kg: number;  // NOVO - soma dos pesos KG de todas as OPs
}
```

**Formato de exibicao:**
- Linha pedido: `peso_total_kg.toLocaleString('pt-BR')` + `KG` (ex: `2.950KG`)
- Linha OP (so KG): `peso_total_kg.toLocaleString('pt-BR')` + `KG`
- Linha OP (mista): `157,5 M | 756KG`

### Arquivos a modificar
- `src/services/producaoService.ts` - buscar peso da planilha comercial
- `src/components/dashboard/ProducaoTable.tsx` - formato de exibicao
- `supabase/functions/notify-production-status/index.ts` - remover [TESTE] e "RECEM CONCLUIDO"
- `supabase/functions/send-production-report/index.ts` - remover [TESTE]
