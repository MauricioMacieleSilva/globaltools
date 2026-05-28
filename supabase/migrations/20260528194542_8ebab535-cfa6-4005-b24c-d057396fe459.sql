
-- Fix 1: chat_conversations INSERT must require authenticated user
DROP POLICY IF EXISTS "Anyone can insert chat conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Users can insert chat conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Public insert chat conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "chat_conversations_insert" ON public.chat_conversations;

CREATE POLICY "Authenticated users can insert their chat conversations"
ON public.chat_conversations
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Fix 2: notifications INSERT must be restricted
DROP POLICY IF EXISTS "Anyone can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Public insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;

CREATE POLICY "Authenticated users can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Service role (edge functions) bypass RLS already.

-- Fix 3: ticket-attachments storage bucket - require authenticated upload
DROP POLICY IF EXISTS "Anyone can upload ticket attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload ticket attachments" ON storage.objects;

CREATE POLICY "Authenticated users can upload ticket attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ticket-attachments' AND auth.uid() IS NOT NULL);

-- Fix 4: whatsapp-media bucket - add INSERT/DELETE policies for admin/comercial
DROP POLICY IF EXISTS "Admin and comercial can upload whatsapp media" ON storage.objects;
DROP POLICY IF EXISTS "Admin and comercial can delete whatsapp media" ON storage.objects;

CREATE POLICY "Admin and comercial can upload whatsapp media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'whatsapp-media'
  AND (public.has_role(auth.uid(), 'admin'::user_role) OR public.has_role(auth.uid(), 'comercial'::user_role))
);

CREATE POLICY "Admin and comercial can delete whatsapp media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'whatsapp-media'
  AND (public.has_role(auth.uid(), 'admin'::user_role) OR public.has_role(auth.uid(), 'comercial'::user_role))
);
