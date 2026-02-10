
-- Fix: Restrict visitor conversation creation to require valid organization
DROP POLICY IF EXISTS "Visitors can create conversations" ON public.chat_conversations;
CREATE POLICY "Visitors can create conversations"
ON public.chat_conversations FOR INSERT TO anon, authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_id AND o.is_active = true)
);

-- Fix: Restrict message insertion to require valid conversation
DROP POLICY IF EXISTS "Anyone can insert chat messages" ON public.chat_messages;
CREATE POLICY "Anyone can insert chat messages"
ON public.chat_messages FOR INSERT TO anon, authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.chat_conversations c WHERE c.id = conversation_id AND c.organization_id = organization_id AND c.status = 'open')
);
