

# Plano: Armazenar metadados do pedido no momento da vinculação

## Problema

Quando o usuário vincula um pedido (ex: 1072), ele vê o pedido correto na lista (ex: GAUER INCORPORAÇÕES). Porém, ao consultar os detalhes depois, o `OrderDetailDialog` busca novamente todos os dados comerciais e tenta desambiguar pelo nome do cliente do **lead**, que pode não coincidir com o nome do cliente do **pedido**. Resultado: exibe o pedido errado (ex: VAIRES ESTRUTURA em vez de GAUER INCORPORAÇÕES).

## Solução

Armazenar o nome do cliente do pedido (da base comercial) no momento da vinculação, numa nova coluna `linked_orders_meta` (JSONB) na tabela `leads`. Esse dado será usado na consulta para filtrar o pedido correto.

## Etapas

### 1. Migração de banco — adicionar coluna `linked_orders_meta`
- Adicionar coluna `linked_orders_meta jsonb default '{}'` à tabela `leads`.
- Formato: `{ "1072": "GAUER INCORPORACOES", "1085": "OUTRO CLIENTE" }`

### 2. `OrderLinkDialog` — retornar o nome do cliente junto
- Alterar `onConfirm` para incluir o `clientName` do pedido selecionado: `onConfirm(orderNumber, orderValue, clientName)`.
- Atualizar a interface `OrderLinkDialogProps`.

### 3. `CRM.tsx` — salvar metadados na vinculação
- Em `handleOrderLinked`, receber o `clientName` e salvar no campo `linked_orders_meta` fazendo merge com dados existentes.
- Em `handleAddOrderFromDrawer` (no LeadDrawer), fazer o mesmo.

### 4. `OrderDetailDialog` — usar o cliente correto
- Adicionar prop opcional `linkedClientName` (nome do cliente vindo dos metadados).
- Priorizar `linkedClientName` sobre o `clientName` do lead na filtragem.

### 5. `KanbanCard` e `LeadDrawer` — passar `linkedClientName`
- Ao abrir `OrderDetailDialog`, buscar o nome do cliente no `linked_orders_meta` do lead para o pedido específico e passá-lo como `linkedClientName`.

## Detalhes técnicos

- A coluna JSONB permite adicionar/remover pedidos sem alterar a estrutura.
- Não há impacto em leads existentes — o campo será `{}` por padrão e o fallback continua usando o nome do lead.
- Nenhuma alteração em RLS necessária (mesmas políticas da tabela `leads`).

