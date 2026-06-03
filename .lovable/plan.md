# Plano — Refinamentos no Controle de Compras + Estoque

## 1. Banco de dados (Estoque)
Adicionar duas colunas em `estoque_itens`:
- `segregado` (boolean, default false) — material reservado/separado, **não conta como disponível** nas compras.
- `espessuras_equivalentes` (text[], default '{}') — lista de espessuras adicionais que este item pode suprir. Ex.: item 2,60 com `['2,65']` pode atender necessidade de 2,65.

## 2. Lógica de agrupamento (`useNecessidadeCompras` + `material-matching`)
- **Cor**: extrair cor da descrição (ex.: "PP BRANCA", "PP PRETA", "GALV", "RAL 9003") e incluir como parte da chave de agrupamento quando presente. Material vira: `0,50 mm • PP BRANCA`.
- **Outros materiais** (TUBOS, CANTONEIRAS, VERGALHÃO, VIGAS, etc.): manter agrupamento por descrição, mas exibidos em **seção/ordenação separada** abaixo dos materiais por espessura.
- **Cruzamento estoque ↔ compras** (correção do bug do 0,50 1000kg):
  - Garantir que `categorizeForStock` para "SLITTER PP" e similares retorna BOBINAS/CHAPAS correto.
  - Cruzar estoque considerando cor quando informada no item de estoque (campo já existente). Se o pedido pede "0,50 PP BRANCA" e o estoque tem "0,50 PP BRANCA", deve casar; se o estoque tem só "0,50 GALV", não casa.
  - Aplicar `espessuras_equivalentes`: ao calcular estoque disponível para espessura X, somar também itens cuja `espessuras_equivalentes` contém X.
  - Excluir itens com `segregado = true` do estoque disponível.
- **Ordenação padrão**: ascendente por espessura numérica. Outros materiais ao final, alfabéticos.

## 3. UI — Aba Compras (`ComprasTab.tsx`)
- Remover descrição abaixo do título "Necessidade de Compras".
- Remover botão "Enviar e-mail agora".
- Remover botão "Mostrar todos / Apenas faltantes" (mostrar sempre todos).
- Tornar todas as colunas **clicáveis para ordenação** (espessura, necessário, em estoque, a comprar, saldo, urgência). Default: espessura crescente.
- Unidades **sempre em KG** (sem conversão para "t"): `2.250 KG`, `5.700 KG`, `70 KG`.
- Coluna Material exibe `espessura mm • COR` quando aplicável.

## 4. UI — Estoque (`EstoqueItemDialog.tsx` + tabela)
- Adicionar switch **"Segregado"** no formulário de cadastro/edição.
- Adicionar campo **"Equivalente a espessuras"** (multi-input/tag) — usuário digita ex.: `2,65` e adiciona.
- Badge "SEGREGADO" na tabela de estoque para itens segregados.

## 5. Relatório — mover para Configuração de Relatórios
- Remover o disparo manual da UI de Compras.
- Adicionar entrada **"Relatório de Compras"** em `ReportsConfig` (mesma estrutura dos outros: horário, dias da semana, destinatários, ativo).
- Cron já existente (`send-compras-report`) passa a respeitar a config salva no banco (segue padrão dos demais relatórios agendados).

## Arquivos afetados
- **Migração**: adicionar `segregado` + `espessuras_equivalentes` em `estoque_itens`.
- `src/lib/material-matching.ts` — extrair cor, normalizar.
- `src/hooks/useNecessidadeCompras.ts` — cor na chave, equivalências, segregado, ordenação.
- `src/components/dashboard/ComprasTab.tsx` — limpeza UI, ordenação, formatação KG.
- `src/components/estoque/EstoqueItemDialog.tsx` — campos segregado/equivalências.
- `src/components/estoque/EstoqueTable.tsx` — badge segregado.
- `src/pages/ReportsConfig.tsx` + tabela/dialog — adicionar tipo "compras".
- `supabase/functions/send-compras-report/index.ts` — formato KG, ler config agendada.

## Confirmação necessária
1. **Cor**: extrair de palavras-chave conhecidas (BRANCA, PRETA, CINZA, GALV, RAL XXXX) — OK?
2. **Equivalências**: bidirecional? (se 2,60 equivale a 2,65, o estoque 2,65 também atende 2,60?) — proponho **unidirecional** (mais seguro: só o que o usuário marcou explicitamente).
3. **Segregado**: aparece na tabela de estoque mas com indicador visual e fora do cálculo de compras — OK?