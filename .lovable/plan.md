

# Integrar KPIs do CRM ao Relatório Comercial por E-mail

## Contexto
O relatório comercial diário (`send-daily-report`) e manual (`send-manual-report`) atualmente exibem KPIs comerciais (faturamento, orçamentos, perdidos, meta) e orçamentos quentes. O usuário quer:
1. **Adicionar** os principais indicadores do CRM: total de leads ativos, valor do pipeline, contatos realizados no mês, visitas realizadas, funil de vendas por etapa
2. **Remover** a seção "Orçamentos Quentes" do relatório

## O que será feito

### 1. Buscar dados CRM no backend (Edge Functions)
Nas funções `send-daily-report` e `send-manual-report`, adicionar consultas ao banco para:
- **Leads ativos**: contar leads com status diferente de `perdido` na tabela `leads`
- **Valor do pipeline**: somar `valor_estimado` dos leads ativos
- **Funil por etapa**: contar leads por status (`novo`, `contato_feito`, `proposta`, `negociacao`, `pedido_fechado`)
- **Contatos do mês**: contar atividades do tipo `contato_inicial` na tabela `lead_activities` no período
- **Visitas do mês**: contar atividades do tipo `visita` no período
- **Leads perdidos**: contar leads com status `perdido` e somar valor

### 2. Nova seção HTML no e-mail: "Indicadores CRM"
Adicionar uma seção visual com:
- Grid de KPI cards: Leads Ativos, Valor Pipeline, Contatos no Mês, Visitas no Mês
- Mini funil de vendas em formato tabela com etapas e quantidades
- Indicador de perdidos (quantidade e valor)

### 3. Remover seção "Orçamentos Quentes"
- No `send-manual-report`: remover a função `buscarOrcamentosQuentes`, o tipo `OrcamentoQuente`, a seção HTML do funil quente, e as referências na análise rápida
- No `send-daily-report`: verificar se existe (não parece ter, mas confirmar)

### 4. Redeployar as Edge Functions
Após as alterações, fazer deploy das funções atualizadas.

## Arquivos modificados
- `supabase/functions/send-daily-report/index.ts` — adicionar consulta CRM + seção HTML
- `supabase/functions/send-manual-report/index.ts` — adicionar consulta CRM + seção HTML + remover orçamentos quentes

## Seção CRM no e-mail (exemplo visual)

```text
┌─────────────────────────────────────────────┐
│  📊 Indicadores CRM                        │
├──────────────┬──────────────────────────────┤
│ 👥 Leads     │ 📈 Pipeline                 │
│ 89 ativos    │ R$ 2.450.000                │
├──────────────┼──────────────────────────────┤
│ 📞 Contatos  │ 📅 Visitas                  │
│ 234 no mês   │ 45 no mês                   │
├──────────────┴──────────────────────────────┤
│ Funil: Novo(32) → Contato(25) → Proposta   │
│ (18) → Negociação(10) → Fechado(4)         │
├─────────────────────────────────────────────┤
│ ❌ Perdidos: 17 leads (R$ 890.000)         │
└─────────────────────────────────────────────┘
```

