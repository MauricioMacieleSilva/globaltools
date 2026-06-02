
# Plano: Controle de Compras baseado em Estoque vs Produção

## Visão Geral

Criar um sistema que cruza automaticamente os materiais demandados pelos pedidos em produção com o estoque disponível, sinalizando o que precisa ser comprado e para quais clientes atender. Funcionará no modelo de **reserva virtual** (não baixa estoque físico — apenas calcula `necessário - disponível = faltante`), por **espessura + categoria** como chave de matching.

## 1. Nova aba "Compras" em Fábrica

Adicionar uma 5ª aba na página `/producao` ao lado de Produção, Resumo, Materiais e Estoque.

### Estrutura visual

**KPIs no topo:**
- Materiais em falta (qtd de SKUs com saldo negativo)
- Peso total a comprar (KG)
- Clientes impactados
- Pedidos atrasados afetados

**Tabela principal "Necessidade de Compras":** uma linha por material faltante.

```
Categoria | Espessura | Necessário | Em Estoque | A Comprar | Clientes Impactados | Pedidos | Urgência
CHAPAS    | 1,95mm    | 4.250 KG   | 0 KG       | 4.250 KG  | KABLAN, PANITTS    | 1676,1757| 🔴 ATRASO
BOBINAS   | 1,95mm    | 2.800 KG   | 0 KG       | 2.800 KG  | PANITTS             | 1757    | 🟠 PRAZO
PERFIS    | 2,65mm    | 1.200 KG   | 3.500 KG   | OK        | —                   | —       | 🟢
```

- Filtros: apenas faltantes / apenas críticos / por categoria
- Clique na linha → modal com detalhamento (lista de pedidos+clientes+prazo+peso de cada um)
- Botão "Exportar PDF" e "Enviar e-mail agora"

## 2. Lógica de Matching (espessura + categoria)

Reaproveitar `extractThickness()` e `shouldSummarize()` já existentes em `ResumoMateriaisTable.tsx`, extraindo para `src/lib/material-matching.ts` para uso compartilhado.

**Para cada material do pedido (`pedido.ops[].materiais[]`):**
1. Extrair espessura via regex (CH #1,95MM → "1,95")
2. Determinar categoria de estoque alvo:
   - "PERFIL CH" → procurar em CHAPAS **e** BOBINAS (matéria-prima para perfis)
   - "BLANK CH" → CHAPAS
   - "SLITTER" → BOBINAS
   - "CHAPA" → CHAPAS
   - "BGL/BZN" (bobina) → BOBINAS
   - "TELHA TP..." → TELHAS
   - Outros (TUBOS, LAMINADOS, VERGALHÃO, ARAMES) → matching por descrição (fallback)
3. Somar peso necessário por chave `{categoria, espessura}`

**Estoque disponível:**
- Agregar `estoque_itens` por `{categoria, espessura}` somando peso de cada item (usando `calcularPesoTotal()`)
- Para CHAPAS 1,95mm: somar todas as chapas 1,95 independente de largura/comprimento

**Saldo = Estoque - Necessário.** Se negativo → entra na lista de compras.

## 3. Reserva Virtual (sem baixar estoque)

Não haverá tabela nova de reservas. O cálculo é feito **on-the-fly** combinando:
- `useProducao().filteredData` (pedidos não-finalizados)
- `useEstoque().items` (estoque atual)

Vantagens:
- Zero risco de inconsistência (estoque real continua sob controle manual)
- Ajustes manuais no estoque refletem imediatamente
- Cancelar pedido = automaticamente libera "reserva"
- Sem migrations destrutivas

O responsável pelo estoque continua usando a aba Estoque exatamente como hoje (entradas/saídas manuais).

## 4. Hook compartilhado `useNecessidadeCompras`

`src/hooks/useNecessidadeCompras.ts` — centraliza o cálculo:

```ts
{
  faltantes: Array<{
    categoria, espessura, necessarioKg, estoqueKg, faltaKg,
    clientes: string[],
    pedidos: Array<{numero, cliente, prazo, pesoKg, status}>,
    urgencia: 'atraso' | 'prazo' | 'programar'
  }>,
  totais: { skusFaltantes, pesoTotal, clientesImpactados, pedidosAtrasados }
}
```

Consumido tanto pelo componente de tela quanto pelo edge function de e-mail (via lógica equivalente em Deno).

## 5. E-mail diário de Compras (08:00)

### Edge Function: `send-compras-report`

Espelhar exatamente o padrão de `send-estoque-report` e `send-production-report`:
- Mesmo cabeçalho/rodapé HTML (logo Global Aço, cores azuis)
- Mesmo formato de tabela
- Mesmo destinatário (lê de `admin_goals` ou config existente — mesmo contato dos demais)

**Conteúdo do e-mail:**
1. Assunto: `🛒 Necessidade de Compras — DD/MM/AAAA`
2. KPIs (cards): SKUs faltantes, Peso total, Clientes impactados, Pedidos atrasados
3. Tabela "A Comprar Urgente" (urgência = atraso)
4. Tabela "A Comprar — Prazo" (urgência = prazo/programar)
5. Detalhamento por material com clientes e pedidos
6. Link para a aba Compras no sistema

### Agendamento: pg_cron diário às 11:00 UTC (08:00 BRT)

```sql
SELECT cron.schedule(
  'send-compras-report-daily',
  '0 11 * * *',
  $$ SELECT net.http_post(url:='.../send-compras-report', ...) $$
);
```

Idempotência por data (`compras-YYYY-MM-DD`) em `email_send_log` para não duplicar.

## 6. Permissões

Reaproveitar `useUserPermissions().checkPageAccess('producao')`. Quem vê Fábrica vê Compras. Admin pode disparar e-mail manual.

## 7. Memória de projeto

Salvar em `mem://features/compras-control` com regras: matching por espessura+categoria, reserva virtual (sem baixa), e-mail diário 08h, destinatário = mesmo dos demais.

---

## Detalhes técnicos

**Arquivos novos:**
- `src/lib/material-matching.ts` — extractThickness, categorizeForStock
- `src/hooks/useNecessidadeCompras.ts`
- `src/components/dashboard/ComprasTab.tsx`
- `src/components/dashboard/ComprasDetalheDialog.tsx`
- `src/components/dashboard/ComprasReportButton.tsx`
- `supabase/functions/send-compras-report/index.ts`

**Arquivos alterados:**
- `src/pages/Producao.tsx` — adicionar 5ª aba "Compras" com ícone `ShoppingCart`
- `src/components/dashboard/ResumoMateriaisTable.tsx` — extrair helpers para `material-matching.ts`
- Migração SQL: apenas agendamento do cron (sem novas tabelas)

**Sem alterações de schema** — toda a lógica é derivada das tabelas existentes (`estoque_itens`, dados de produção via Google Sheets).

## Fora de escopo (futuro)

- Histórico de "pedidos de compra" emitidos
- Workflow de aprovação de compra
- Integração com fornecedores
- Tela mobile dedicada (a aba já é responsiva via padrão das outras)
