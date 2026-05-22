
# Integração WhatsApp — Monitoramento de Conversas pela Gestão

## Objetivo

Permitir que admin/comercial **leia** todas as conversas trocadas entre vendedores e clientes via WhatsApp, com dois pontos de acesso:
1. **Inbox unificado**: nova aba "WhatsApp" no CRM com lista de conversas de todos os vendedores
2. **Histórico no Lead**: nova aba dentro do `LeadDrawer` mostrando mensagens trocadas com aquele telefone

Sem envio de mensagens pela plataforma (somente leitura). Sem notificação para o cliente.

## Arquitetura geral

```text
WhatsApp do vendedor (celular/Web)
        ↓ (QR Code escaneado 1x)
Z-API / Evolution / Twilio  (provider externo)
        ↓ webhook HTTPS (mensagem nova)
Edge Function: whatsapp-webhook
        ↓ valida + normaliza + linka ao lead
Tabelas: whatsapp_accounts, whatsapp_conversations, whatsapp_messages
        ↓ Supabase Realtime
Frontend React (aba WhatsApp + tab no LeadDrawer)
```

A camada de banco e UI é **idêntica** seja qual for o provider — só muda o formato do webhook na edge function.

## Banco de dados (migration)

### `whatsapp_accounts`
Cada linha = um número de WhatsApp conectado de um vendedor.
- `id`, `vendor_id` (FK user_profiles), `phone_number` (E.164), `display_name`
- `provider` ('zapi' | 'evolution' | 'twilio'), `provider_instance_id`, `provider_token` (secret)
- `status` ('connected' | 'disconnected' | 'qr_pending'), `last_seen_at`
- `created_at`, `updated_at`

### `whatsapp_conversations`
Uma conversa = vendedor + telefone de cliente.
- `id`, `account_id` (FK), `contact_phone` (E.164), `contact_name`
- `lead_id` (FK leads, nullable — preenchido por matching de telefone)
- `cliente_nome` (snapshot)
- `last_message_at`, `last_message_preview`, `unread_count_admin`
- `created_at`, `updated_at`

### `whatsapp_messages`
- `id`, `conversation_id` (FK), `provider_message_id` (unique, idempotência)
- `direction` ('inbound' | 'outbound'), `from_phone`, `to_phone`
- `message_type` ('text' | 'image' | 'audio' | 'video' | 'document' | 'sticker')
- `body` (text), `media_url` (storage path), `media_mime_type`
- `sent_at` (timestamp do WhatsApp), `received_at` (chegou no webhook)
- `raw_payload` (jsonb — para debug)

### RLS
- **whatsapp_accounts**: admin/comercial veem tudo; vendedor vê só os próprios
- **whatsapp_conversations** e **whatsapp_messages**: admin/comercial veem tudo; vendedor vê só conversas do próprio `account_id`
- INSERT bloqueado para usuários (apenas service role via edge function)

### Storage
- Novo bucket privado `whatsapp-media` para imagens/áudios baixados do provider

## Edge Functions

### 1. `whatsapp-webhook` (público, sem JWT)
Recebe POST do provider em cada mensagem nova.
- Valida assinatura/token do provider
- Encontra `account_id` pelo `phone_number` do número receptor
- Faz **upsert da conversa** por `(account_id, contact_phone)`
- Tenta linkar ao lead: busca `leads.telefone` normalizado (E.164) → preenche `lead_id`
- Se mensagem tem mídia, baixa do provider e sobe pro Storage
- INSERT em `whatsapp_messages` (idempotente via `provider_message_id`)
- Atualiza `last_message_at`, `last_message_preview` da conversa

### 2. `whatsapp-connect-instance` (auth: admin)
- Cria/configura instância no provider para um vendedor
- Retorna QR Code (base64) para o vendedor escanear
- Polling de status até `connected`

### 3. `whatsapp-disconnect-instance` (auth: admin)
Desconecta a instância no provider e marca account como disconnected.

## Frontend

### Nova aba "WhatsApp" no CRM (`src/pages/CRM.tsx`)
- Lazy-loaded como as outras abas
- Layout 2 colunas:
  - **Esquerda**: lista de conversas (filtro por vendedor, busca por nome/telefone)
  - **Direita**: thread da conversa selecionada (estilo WhatsApp Web read-only)
- Realtime: subscribe em `whatsapp_messages` para atualizar ao vivo
- Filtros: vendedor, período, "tem lead vinculado", busca textual em mensagens

### Tab "WhatsApp" no `LeadDrawer.tsx`
- Aparece quando o lead tem telefone
- Carrega `whatsapp_messages` onde `conversation.lead_id = lead.id` OU onde `contact_phone = lead.telefone normalizado`
- Thread cronológica, mesma visual da aba principal

### Tela de gestão de contas (Administração)
- `src/components/admin/WhatsAppAccountsManager.tsx`
- Lista vendedores + status da conexão
- Botão "Conectar" → modal com QR Code
- Botão "Desconectar"

## Decisão de provider (a confirmar)

O código backend será escrito com **adapter pattern**: a edge function `whatsapp-webhook` terá um normalizador por provider. Trocar entre Z-API e Evolution depois é só implementar outro adapter — schema do banco não muda.

**Recomendação**: começar com **Z-API** (R$ 99/linha/mês × 7 = R$ 693/mês). Eles fornecem webhook pronto, painel para gerenciar instâncias, e suporte BR. Custo da conta é externo ao Lovable — você contrata direto com eles.

## Considerações importantes

- **Privacidade**: vendedores precisam ser comunicados que conversas são monitoradas (LGPD — pode bastar aviso no contrato/política interna)
- **Risco de banimento**: providers não oficiais têm risco baixo se uso for "humano-like" (sem disparo em massa). Para só ler, risco é mínimo
- **Custo do storage**: mídias do WhatsApp (áudios/imagens) vão consumir Lovable Cloud storage — pode dar 1-2 GB/mês. Opcional não baixar mídia
- **Histórico anterior**: providers só entregam mensagens **a partir do momento da conexão**. Conversas antigas não voltam

## Escopo deste plano

✅ Inclui: schema, edge functions, UI inbox + tab no lead, conexão de contas
❌ Não inclui: envio de mensagens pela plataforma, respostas automáticas, IA analisando conversas, métricas/relatórios (podemos fazer em fase 2)

## Próximos passos

1. Você confirma o provider (Z-API recomendado)
2. Você cria conta no Z-API e me passa o token da API + URL do painel
3. Implemento schema + edge function `whatsapp-webhook` + UI básica
4. Conectamos 1 número como piloto, validamos, depois os outros 6
