
# Correção da Constraint de Status dos Relatórios

## Problema Identificado

O envio de emails agendados está falhando porque a tabela `email_reports_log` tem uma constraint que aceita **apenas** `success` ou `error`, mas o código tenta usar:
- `pending` → para lock otimista
- `failed` → para erros

**Logs do erro:**
```
message: 'new row for relation "email_reports_log" violates check constraint "email_reports_log_status_check"'
```

## Solução

### 1. Atualizar a Constraint do Banco de Dados

Alterar a constraint para aceitar os 3 status necessários:
- `pending` - quando o envio está em processamento
- `success` - quando enviado com sucesso  
- `failed` - quando falhou (mais descritivo que "error")

**Migração SQL:**
```text
ALTER TABLE email_reports_log DROP CONSTRAINT email_reports_log_status_check;
ALTER TABLE email_reports_log ADD CONSTRAINT email_reports_log_status_check 
  CHECK (status = ANY (ARRAY['pending', 'success', 'failed', 'error']));
```

### 2. Enviar Relatório de Hoje Manualmente

Após a correção, executar um envio manual para garantir que o relatório de hoje seja enviado.

## Resultado Esperado

- O sistema conseguirá criar o registro `pending` para lock otimista
- Emails agendados serão enviados normalmente às 08:30
- O mecanismo anti-duplicidade funcionará corretamente
