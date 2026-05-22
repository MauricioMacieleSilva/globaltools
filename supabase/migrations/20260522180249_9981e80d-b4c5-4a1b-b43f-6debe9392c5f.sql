
-- ============ WHATSAPP ACCOUNTS ============
CREATE TABLE public.whatsapp_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL,
  vendor_name TEXT,
  phone_number TEXT NOT NULL,
  display_name TEXT,
  provider TEXT NOT NULL DEFAULT 'zapi',
  provider_instance_id TEXT,
  status TEXT NOT NULL DEFAULT 'qr_pending',
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, phone_number)
);

CREATE INDEX idx_wa_accounts_vendor ON public.whatsapp_accounts(vendor_id);
CREATE INDEX idx_wa_accounts_phone ON public.whatsapp_accounts(phone_number);

ALTER TABLE public.whatsapp_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and comercial can view all accounts"
ON public.whatsapp_accounts FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::user_role)
  OR has_role(auth.uid(), 'comercial'::user_role)
  OR vendor_id = auth.uid()
);

CREATE POLICY "Admin can manage accounts"
ON public.whatsapp_accounts FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE TRIGGER update_wa_accounts_updated_at
BEFORE UPDATE ON public.whatsapp_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ WHATSAPP CONVERSATIONS ============
CREATE TABLE public.whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.whatsapp_accounts(id) ON DELETE CASCADE,
  contact_phone TEXT NOT NULL,
  contact_name TEXT,
  lead_id UUID,
  cliente_nome TEXT,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  unread_count_admin INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (account_id, contact_phone)
);

CREATE INDEX idx_wa_conv_account ON public.whatsapp_conversations(account_id);
CREATE INDEX idx_wa_conv_lead ON public.whatsapp_conversations(lead_id);
CREATE INDEX idx_wa_conv_last_msg ON public.whatsapp_conversations(last_message_at DESC);
CREATE INDEX idx_wa_conv_phone ON public.whatsapp_conversations(contact_phone);

ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and comercial can view all conversations"
ON public.whatsapp_conversations FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::user_role)
  OR has_role(auth.uid(), 'comercial'::user_role)
  OR EXISTS (
    SELECT 1 FROM public.whatsapp_accounts a
    WHERE a.id = account_id AND a.vendor_id = auth.uid()
  )
);

CREATE TRIGGER update_wa_conv_updated_at
BEFORE UPDATE ON public.whatsapp_conversations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ WHATSAPP MESSAGES ============
CREATE TABLE public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  provider_message_id TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
  from_phone TEXT,
  to_phone TEXT,
  message_type TEXT NOT NULL DEFAULT 'text',
  body TEXT,
  media_url TEXT,
  media_mime_type TEXT,
  sent_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw_payload JSONB,
  UNIQUE (provider_message_id)
);

CREATE INDEX idx_wa_msg_conv ON public.whatsapp_messages(conversation_id, sent_at DESC);
CREATE INDEX idx_wa_msg_sent ON public.whatsapp_messages(sent_at DESC);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and comercial can view all messages"
ON public.whatsapp_messages FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::user_role)
  OR has_role(auth.uid(), 'comercial'::user_role)
  OR EXISTS (
    SELECT 1 FROM public.whatsapp_conversations c
    JOIN public.whatsapp_accounts a ON a.id = c.account_id
    WHERE c.id = conversation_id AND a.vendor_id = auth.uid()
  )
);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;

-- ============ STORAGE BUCKET ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('whatsapp-media', 'whatsapp-media', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admin and comercial can view whatsapp media"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'whatsapp-media'
  AND (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role))
);
