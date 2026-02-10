
-- Chat conversations table
CREATE TABLE public.chat_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,
  visitor_name TEXT DEFAULT 'Visitor',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chat messages table
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('visitor', 'admin')),
  sender_id TEXT, -- visitor_id or user_id
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_chat_conversations_org ON public.chat_conversations(organization_id);
CREATE INDEX idx_chat_conversations_visitor ON public.chat_conversations(visitor_id);
CREATE INDEX idx_chat_conversations_status ON public.chat_conversations(organization_id, status);
CREATE INDEX idx_chat_messages_conversation ON public.chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_org ON public.chat_messages(organization_id);

-- Enable RLS
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Visitors can create conversations (anon)
CREATE POLICY "Visitors can create conversations"
ON public.chat_conversations FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- Visitors can view their own conversation by visitor_id (handled via security definer function)
-- Staff can view conversations in their org
CREATE POLICY "Staff can view org conversations"
ON public.chat_conversations FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organization_id = chat_conversations.organization_id
      AND ur.role IN ('cinema_admin', 'manager', 'supervisor', 'box_office')
  )
  OR is_platform_admin(auth.uid())
);

-- Staff can update conversations (close them)
CREATE POLICY "Staff can update org conversations"
ON public.chat_conversations FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organization_id = chat_conversations.organization_id
      AND ur.role IN ('cinema_admin', 'manager', 'supervisor', 'box_office')
  )
  OR is_platform_admin(auth.uid())
);

-- Messages: visitors can insert
CREATE POLICY "Anyone can insert chat messages"
ON public.chat_messages FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- Messages: staff can view in their org
CREATE POLICY "Staff can view org messages"
ON public.chat_messages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organization_id = chat_messages.organization_id
      AND ur.role IN ('cinema_admin', 'manager', 'supervisor', 'box_office')
  )
  OR is_platform_admin(auth.uid())
);

-- Messages: staff can update (mark as read)
CREATE POLICY "Staff can update org messages"
ON public.chat_messages FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organization_id = chat_messages.organization_id
      AND ur.role IN ('cinema_admin', 'manager', 'supervisor', 'box_office')
  )
  OR is_platform_admin(auth.uid())
);

-- Security definer functions for visitor access (bypasses RLS safely)
CREATE OR REPLACE FUNCTION public.get_visitor_conversation(_visitor_id TEXT, _org_id UUID)
RETURNS TABLE(id UUID, organization_id UUID, visitor_id TEXT, visitor_name TEXT, status TEXT, last_message_at TIMESTAMPTZ, created_at TIMESTAMPTZ)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.id, c.organization_id, c.visitor_id, c.visitor_name, c.status, c.last_message_at, c.created_at
  FROM public.chat_conversations c
  WHERE c.visitor_id = _visitor_id AND c.organization_id = _org_id AND c.status = 'open'
  ORDER BY c.created_at DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_visitor_messages(_conversation_id UUID, _visitor_id TEXT)
RETURNS TABLE(id UUID, conversation_id UUID, sender_type TEXT, content TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT m.id, m.conversation_id, m.sender_type, m.content, m.created_at
  FROM public.chat_messages m
  JOIN public.chat_conversations c ON c.id = m.conversation_id
  WHERE m.conversation_id = _conversation_id AND c.visitor_id = _visitor_id
  ORDER BY m.created_at ASC;
$$;

-- Trigger to update last_message_at
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.chat_conversations
  SET last_message_at = now(), updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_chat_conversation_last_message
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_conversation_last_message();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
