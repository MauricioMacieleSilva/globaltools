

## Ajustar cálculo do R$/kg para considerar a perda

### O que muda

Hoje, no Resumo Geral do Corte Perfil, a coluna **R$/kg** exibe o preço da tabela puro (com desconto opcional aplicado). O **Valor** é calculado multiplicando esse preço pelo peso já líquido (peso útil).

A nova lógica vai **embutir o custo da perda no R$/kg exibido**, refletindo o preço real que o cliente está pagando por kg útil entregue.

### Fórmula

Para cada item da tabela:

```
peso_util         = pesoTotal × (percentualPerda / 100)   ← peso já entregue (sem perda)
peso_bruto        = peso_util + pesoPerda                  ← matéria-prima consumida
valor_total       = peso_bruto × precoTabela               ← custo real da matéria-prima
preco_kg_efetivo  = valor_total / peso_util                ← R$/kg ajustado pela perda
```

**Exemplo do usuário** (Perfil U E, 3.75mm):
- peso_util = 2.465,82 kg
- peso_perda = 198,00 kg
- preço tabela = R$ 7,57/kg
- peso_bruto = 2.465,82 + 198 = 2.663,82 kg
- valor_total = 2.663,82 × 7,57 = R$ 20.165,11
- **R$/kg efetivo = 20.165,11 / 2.465,82 = R$ 8,18/kg**

> Observação: o exemplo do usuário arredondou para 7,62, mas a divisão exata dá 8,18. Vou aplicar a fórmula matemática correta — o resultado para o item da imagem ficará em ~R$ 8,18/kg (não 7,62). Confirme se a fórmula está certa antes de implementar.

### Impacto visual

| Coluna | Antes | Depois |
|---|---|---|
| **R$/kg** | preço tabela (com desc.) | preço efetivo já incluindo a perda |
| **Valor** | peso_util × preço tabela | peso_bruto × preço tabela (mesmo resultado) |
| **Tooltip do R$/kg** | "Base: X / Desc: Y%" | "Base: X / Desc: Y% / Perda embutida: +Z%" |
| KPI **Valor Total** | soma dos valores | soma dos valores (mesmo resultado) |

O **Valor Total** geral não muda — apenas a forma de exibir o R$/kg fica mais transparente sobre o impacto real da perda no preço unitário entregue.

### Arquivo afetado

- `src/components/ResumoGeral.tsx` — alterar o cálculo de `precoKg` e `valorTotal` no bloco `calculosComPreco.map(...)` (linhas 55–63) e atualizar o tooltip da coluna R$/kg (linhas 277–292).

Nenhuma alteração em banco de dados, contexto, ou outros componentes.

