
Objetivo: corrigir definitivamente o fluxo de Oportunidade, tornar o SDR do bastão instantâneo e persistente no card, e estabilizar o valor exibido dos pedidos vinculados.

1. Corrigir a movimentação para Oportunidade
- Remover o bloqueio legado que ainda abre `VisitScheduleDialog` sempre que o status destino é `visita_reuniao`.
- Manter o comportamento especial apenas quando o lead estiver saindo de `passagem_bastao`, porque aí o admin ainda precisa atribuir vendedor.
- Para qualquer outro movimento direto para `visita_reuniao`/Oportunidade, atualizar o lead sem abrir formulário.

2. Persistir no banco os dados do bastão no próprio lead
- Hoje o front do card consulta `lead_activities` após renderizar, por isso o selo demora, falha e às vezes mostra usuário errado.
- Vou propor persistir no registro do lead os campos derivados do bastão:
  - `first_contact_user_id`
  - `first_contact_name`
  - `handoff_sdr_user_id`
  - `handoff_sdr_name`
- Regra:
  - `first_contact_*` = sempre o primeiro usuário que fez `contato_inicial`
  - `handoff_sdr_*` = igual ao primeiro contato apenas se esse usuário tiver role `sdr`
  - se o primeiro contato foi feito por admin/comercial/operacional, não exibir selo Bastão no card
- Assim o card, a aba Bastão e demais telas passam a ler do lead diretamente, sem depender de consulta tardia.

3. Ajustar gravação automática do primeiro contato
- Revisar pontos em `CRM.tsx` que hoje inserem `contato_inicial` em movimentações genéricas.
- Evitar criar “primeiro contato” artificial em transições que não representam atendimento real.
- Garantir que, no momento em que um `contato_inicial` válido for criado, o lead seja atualizado com os campos persistidos acima.
- Também incluir rotina de backfill/migração para preencher esses campos nos leads já existentes a partir do histórico de `lead_activities` + `user_roles`.

4. Corrigir quem aparece no selo Bastão
- Em `KanbanCard.tsx`, parar de usar consulta ao primeiro `contato_inicial` em tempo de render.
- Renderizar o selo a partir dos campos persistidos no lead.
- Exibir somente quando houver SDR real.
- Isso resolve casos como Nargeli aparecendo indevidamente e casos em que o SDR some após o lead avançar para Oportunidade, Proposta ou Pedido Fechado.

5. Corrigir a aba Bastão para nunca “perder” registros
- `HandoffHistory.tsx` hoje reconstrói tudo por consulta e fallback.
- Ajustar para usar os dados persistidos no lead para o SDR oficial, mantendo o histórico do evento de passagem apenas para data e auditoria.
- Garantir que todos os leads enviados por SDR para bastão continuem aparecendo, mesmo após mudança de etapa.

6. Estabilizar o valor do pedido no card
- Hoje `KanbanCard` usa `lead.valor_estimado`, mas o valor real só é recalculado no drawer, então alguns cards ficam sem valor.
- Vou unificar a lógica:
  - ao vincular pedido em `OrderLinkDialog`/`LeadDrawer`, salvar o total correto imediatamente em `valor_estimado`
  - ao abrir drawer, se houver divergência, atualizar o banco e o estado local
  - opcionalmente, ao carregar leads, recalcular apenas os que têm `budget_number` sem valor
- Isso elimina casos como o pedido 1329 da Promosul sem valor no card.

7. Banco de dados
- Será necessária uma migration para adicionar os campos persistidos do bastão/primeiro contato na tabela `leads`.
- A migration também deve incluir um backfill seguro baseado no histórico existente.
- Não há necessidade de alterar autenticação nem políticas RLS para esse ajuste, apenas respeitar as policies atuais do CRM.

8. Arquivos que devem ser atualizados
- `src/pages/CRM.tsx`
- `src/components/crm/KanbanCard.tsx`
- `src/components/crm/HandoffHistory.tsx`
- `src/components/crm/LeadDrawer.tsx`
- possivelmente `src/components/crm/OrderLinkDialog.tsx`
- migration em `supabase/migrations/*`

Detalhes técnicos
```text
Fluxo desejado de Oportunidade:
qualquer etapa -> oportunidade = move direto
passagem_bastao -> oportunidade = somente admin + atribuição de vendedor

Fonte única do selo Bastão:
lead.handoff_sdr_name

Regra de exibição:
se first_contact_user.role === 'sdr' => mostra selo
senão => não mostra selo

Fonte única do valor do card:
lead.valor_estimado persistido no banco
```

Validação após implementação
- Admin mover lead direto para Oportunidade sem abrir agenda.
- Lead vindo de Bastão continuar exigindo atribuição de vendedor pelo admin.
- Cards de bastão mostrarem instantaneamente o SDR correto ao carregar a tela.
- Nenhum usuário que não seja SDR aparecer como “Bastão”.
- Leads antigos com histórico já aparecerem corrigidos após backfill.
- Cards com pedido vinculado exibirem valor sem depender de abrir drawer.
