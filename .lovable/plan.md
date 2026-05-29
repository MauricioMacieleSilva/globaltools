## 1. Alçada de descontos editável (admin)

- Criar nova tabela `politica_descontos_faixas` no banco com: `peso_min`, `peso_max` (nullable = sem limite), `desconto_max_percent`, `ordem`, `ativo`.
  - Seed inicial com as 4 faixas atuais (2t/5t/10t/+).
  - RLS: leitura para todos autenticados; insert/update/delete apenas admin via `has_role`.
  - GRANTs apropriados.
- Atualizar `PoliticaDescontos.tsx` para buscar as faixas do banco em vez de hardcoded.
- Atualizar `PoliticaComercialContext.calcularDesconto(peso)` para usar as faixas do banco (carregadas no provider e expostas via contexto).
- Criar dialog `EditarFaixasDescontoDialog` acessível por botão "Editar" visível apenas para admin no card "Política de Descontos por Volume":
  - Lista as faixas, permite editar peso_min, peso_max e percentual, adicionar/remover faixa.
  - Salva via update/insert no Supabase.

## 2. Repopular BOBINAS e CHAPAS

Via tool `supabase--insert`:
- `DELETE FROM politica_comercial_itens WHERE classe IN ('BOBINAS','CHAPAS');`
- INSERT em massa com os 51 itens de BOBINAS e 51 de CHAPAS da planilha:
  - `unidade = 'KG'`, `ipi = '3,25%'`, `ativo = true`.
  - Preços: BFF/CH FF/BFQ/CH FQ = 8,40; BGL/BGA/CH GL/CH GA = 12,60.
- Demais classes (ARAMES, PERFIS, TELHAS, TUBOS, LAMINADOS, VERGALHAO, BLANK) **não serão tocadas**.

## 3. Remover card Pedidos CIF

- Em `PoliticaDescontos.tsx`, remover o bloco "Pedidos CIF" (mantendo o aviso de aprovação).
- Remover também `TransportadorasDialog` da coluna de Observações se ficou órfão? **Manter** o componente, apenas removo a referência aqui.

## Detalhes técnicos

- Migration cria tabela + seed das 4 faixas atuais.
- Hook simples `useFaixasDesconto()` para reuso entre Provider e Dialog.
- `unidade` confirmado como `KG` (padrão do sistema para bobinas/chapas).
