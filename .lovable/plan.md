
Objetivo: corrigir definitivamente o envio automático do Relatório de Estoque com base no que já está no código e no que os logs mostram.

Diagnóstico já confirmado
- O agendamento existe e está ativo no banco: `estoque_report_schedule` está com `is_active = true`, horário `08:35`, dias `seg, ter, qua, qui, sex`.
- A função agendada está rodando normalmente a cada poucos minutos. Os logs de `send-scheduled-estoque-report` comprovam isso.
- O problema não está na tela de configuração nem no cron.
- O ponto mais provável de quebra é a chamada da função agendada para `send-estoque-report`.

Causa raiz mais provável
- `send-scheduled-estoque-report` chama `send-estoque-report` via HTTP e envia `Authorization: Bearer <service role key>`.
- `send-estoque-report` hoje interpreta qualquer `Authorization` como se fosse JWT de usuário e roda `auth.getUser(token)`.
- A service role key não é um JWT de usuário válido para esse fluxo, então a chamada automática tende a falhar justamente no envio agendado.
- Além disso, `send-estoque-report` grava `is_scheduled: false` sempre, então mesmo quando o automático funcionar ele não fica identificado corretamente no histórico, o que dificulta a auditoria.

Plano de correção
1. Corrigir a autenticação da `send-estoque-report`
- Ajustar a função para suportar dois caminhos de forma explícita:
  - envio manual: exigir usuário autenticado normalmente;
  - envio automático interno: aceitar a chamada vinda da função agendada de forma segura.
- Não vou liberar `scheduled: true` apenas pelo body, porque isso abriria brecha. A validação precisa confiar no chamador interno, não no cliente.

2. Padronizar a chamada interna do agendador
- Revisar `send-scheduled-estoque-report/index.ts` para usar um fluxo interno consistente e seguro.
- Se mantivermos a chamada HTTP, a `send-estoque-report` passará a reconhecer corretamente esse chamador interno.
- Se for mais limpo, vou alinhar com o padrão do relatório de produção e simplificar a invocação entre funções.

3. Corrigir a telemetria/histórico do relatório de estoque
- Em `send-estoque-report`, capturar `scheduled` corretamente e gravar `is_scheduled` real no `email_reports_log`.
- Garantir que sucesso e falha do estoque apareçam claramente no histórico.
- Ajustar a UI do histórico para identificar `report_type: 'estoque'` com rótulo legível.

4. Fortalecer logs para diagnóstico final
- Adicionar logs objetivos em cada etapa:
  - configuração carregada,
  - dia/hora elegível,
  - início da chamada interna,
  - resposta da `send-estoque-report`,
  - motivo exato da falha.
- Isso evita novo “apagão de causa” se algo externo falhar.

5. Validar a lógica de idempotência
- Manter `last_sent_date`, mas confirmar que ele só permanece preenchido quando a execução realmente completar.
- Em caso de falha real, continuar limpando o campo para permitir nova tentativa.

Arquivos envolvidos
- `supabase/functions/send-scheduled-estoque-report/index.ts`
- `supabase/functions/send-estoque-report/index.ts`
- `src/components/admin/ReportHistoryTable.tsx`

O que não precisa mudar
- Não vejo necessidade de migration no banco para resolver este problema.
- A configuração de dias da semana e horário já está correta no modelo atual.

Resultado esperado após a correção
- O estoque passará a disparar automaticamente nos dias configurados, no horário configurado.
- O histórico mostrará claramente os envios automáticos de estoque.
- Se algo falhar, teremos o motivo exato nos logs, sem depender de suposição.