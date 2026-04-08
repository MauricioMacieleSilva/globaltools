

# Plano: Histórico de Passagens de Bastão

## Objetivo
Criar uma nova aba no CRM chamada "Bastão" que exiba todos os leads que passaram pela etapa "Passagem de Bastão", mesmo depois de já terem saído dela. Funciona como um log/consulta de handoffs realizados.

## Fonte de dados
Os dados já existem na tabela `lead_activities`: registros com `activity_type = 'mudanca_status'` e `description ILIKE '%para "Passagem de Bastão"%'` contêm o SDR (`sdr_name`), data e lead_id. Para obter o destino (quem recebeu), cruzamos com o `vendedor_id` atual do lead na tabela `leads`.

## Implementação

### 1. Criar componente `HandoffHistory.tsx`
- Nova aba no CRM com ícone `ArrowRightLeft` e label "Bastão"
- Tabela mostrando:
  - Empresa/Cliente (do lead)
  - SDR que passou (da activity `sdr_name`)
  - Vendedor que recebeu (do lead `vendedor_id` -> `user_profiles`)
  - Data da passagem
  - Status atual do lead
  - Valor estimado
- Filtros por período e busca por nome
- Clicar em uma linha abre o drawer do lead

### 2. Adicionar aba ao CRM.tsx
- Nova `TabsTrigger` value="bastao" entre as abas existentes
- `TabsContent` renderizando `HandoffHistory`
- Reutiliza `openLeadDrawer` para navegação ao lead

### Arquivos
| Arquivo | Mudança |
|---------|---------|
| `src/components/crm/HandoffHistory.tsx` | Novo componente com tabela de histórico |
| `src/pages/CRM.tsx` | Adicionar aba "Bastão" |

