

## Plano: Detecção Automática de Pedidos Finalizados via Backend

### Problema Atual
A detecção de pedidos finalizados acontece apenas no navegador (frontend), ou seja, **só funciona quando um administrador está com o sistema aberto**. Para funcionar de forma confiável, precisamos mover essa lógica para o backend, rodando nos horários programados.

### Horários de Verificação
O banco de dados atualiza nos seguintes horários. A verificação será feita **6 minutos depois** de cada atualização:

| Atualização DB | Verificação automática |
|---|---|
| 08:10 | 08:16 |
| 09:30 | 09:36 |
| 10:30 | 10:36 |
| 11:30 | 11:36 |
| 13:30 | 13:36 |
| 14:30 | 14:36 |
| 15:30 | 15:36 |
| 16:30 | 16:36 |
| 17:30 | 17:36 |

### Solução

#### 1. Nova tabela: `notified_finalized_orders`
Armazena quais pedidos já tiveram o e-mail de "Pedido Finalizado" enviado, garantindo que cada pedido receba **apenas um** e-mail.

Colunas:
- `id` (uuid, PK)
- `numero_pedido` (text, unique) -- identificador do pedido
- `notified_at` (timestamptz) -- quando o e-mail foi enviado
- `created_at` (timestamptz)

#### 2. Nova Edge Function: `check-finalized-orders`
Essa funcao sera chamada pelo cron nos horarios programados e fara o seguinte:

1. Busca os dados de producao da planilha Google (mesma logica do `send-production-report`)
2. Identifica pedidos com status FINALIZADO
3. Consulta a tabela `notified_finalized_orders` para ver quais ja foram notificados
4. Para cada pedido FINALIZADO ainda nao notificado:
   - Busca dados extras da tabela `production_orders` (novo_prazo, situacao)
   - Envia e-mail usando o template do `notify-production-status`
   - Registra na tabela `notified_finalized_orders`

A funcao nao requer autenticacao JWT (chamada pelo cron com service role).

#### 3. Cron Job (pg_cron)
Um cron configurado para rodar a cada minuto. A propria Edge Function verifica se esta dentro de uma das 9 janelas de horario (tolerancia de 5 minutos), similar ao padrao ja usado no `send-scheduled-production-report`.

#### 4. Ajuste no frontend
A logica de auto-notificacao no `ProducaoContext.tsx` sera mantida como fallback, mas adicionara uma verificacao na tabela `notified_finalized_orders` antes de enviar, evitando duplicatas.

### Detalhes Tecnicos

**Tabela SQL:**
```text
CREATE TABLE public.notified_finalized_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_pedido TEXT NOT NULL UNIQUE,
  notified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notified_finalized_orders ENABLE ROW LEVEL SECURITY;

-- Somente service role (backend) pode inserir/ler
CREATE POLICY "Service role access" ON public.notified_finalized_orders
  FOR ALL USING (true);
```

**Edge Function `check-finalized-orders`:**
- Reutiliza a logica de fetch da planilha Google do `producaoService` / `send-production-report`
- Horarios permitidos (Brasilia): 08:16, 09:36, 10:36, 11:36, 13:36, 14:36, 15:36, 16:36, 17:36
- Tolerancia de 5 minutos por janela
- Envia e-mails via Resend para os mesmos destinatarios do `email_reports_config`
- Registra cada envio na tabela para garantir idempotencia

**Config TOML:**
```text
[functions.check-finalized-orders]
verify_jwt = false
```

**Cron Job:**
```text
SELECT cron.schedule(
  'check-finalized-orders',
  '* * * * *',
  $$ SELECT net.http_post(...) $$
);
```

### Arquivos que serao criados/modificados

| Arquivo | Acao |
|---|---|
| `supabase/functions/check-finalized-orders/index.ts` | Criar -- nova Edge Function |
| `supabase/config.toml` | Modificar -- adicionar config da nova funcao |
| `src/context/ProducaoContext.tsx` | Modificar -- adicionar checagem de duplicata |
| Migracao SQL | Criar -- tabela + cron job |

