import { useState, useEffect, useRef, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useOrganization } from '@/hooks/useUserProfile';
import { useImpersonation } from '@/hooks/useImpersonation';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send, Loader2, User, X, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface Conversation {
  id: string;
  visitor_id: string;
  visitor_name: string;
  status: string;
  last_message_at: string;
  created_at: string;
  unread_count?: number;
}

interface ChatMessage {
  id: string;
  sender_type: 'visitor' | 'admin';
  content: string;
  created_at: string;
  is_read: boolean;
}

export default function LiveChat() {
  const { data: organization } = useOrganization();
  const { isImpersonating, impersonatedOrganization } = useImpersonation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const effectiveOrg = isImpersonating ? impersonatedOrganization : organization;

  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const orgId = effectiveOrg?.id;

  // Fetch conversations
  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ['chat-conversations', orgId],
    queryFn: async (): Promise<Conversation[]> => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('organization_id', orgId)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      // Get unread counts
      const convIds = (data || []).map(c => c.id);
      if (convIds.length === 0) return data || [];

      const { data: unreadData } = await supabase
        .from('chat_messages')
        .select('conversation_id')
        .in('conversation_id', convIds)
        .eq('sender_type', 'visitor')
        .eq('is_read', false);

      const unreadMap: Record<string, number> = {};
      (unreadData || []).forEach(m => {
        unreadMap[m.conversation_id] = (unreadMap[m.conversation_id] || 0) + 1;
      });

      return (data || []).map(c => ({ ...c, unread_count: unreadMap[c.id] || 0 }));
    },
    enabled: !!orgId,
    refetchInterval: 10000,
  });

  // Load messages for selected conversation
  useEffect(() => {
    if (!selectedConversation) { setMessages([]); return; }

    const load = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', selectedConversation.id)
        .order('created_at', { ascending: true });

      setMessages((data || []) as ChatMessage[]);

      // Mark visitor messages as read
      await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('conversation_id', selectedConversation.id)
        .eq('sender_type', 'visitor')
        .eq('is_read', false);
      
      queryClient.invalidateQueries({ queryKey: ['chat-conversations', orgId] });
    };
    load();
  }, [selectedConversation?.id, orgId, queryClient]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Real-time: new messages + new conversations
  useEffect(() => {
    if (!orgId) return;

    const msgChannel = supabase
      .channel('admin-chat-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `organization_id=eq.${orgId}`,
      }, (payload) => {
        const msg = payload.new as any;
        // If it's for the selected conversation, add to messages
        if (selectedConversation && msg.conversation_id === selectedConversation.id) {
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, msg as ChatMessage];
          });
          // Auto mark as read
          if (msg.sender_type === 'visitor') {
            supabase.from('chat_messages').update({ is_read: true }).eq('id', msg.id).then();
          }
        }
        queryClient.invalidateQueries({ queryKey: ['chat-conversations', orgId] });
      })
      .subscribe();

    const convChannel = supabase
      .channel('admin-chat-conversations')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_conversations',
        filter: `organization_id=eq.${orgId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['chat-conversations', orgId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(convChannel);
    };
  }, [orgId, selectedConversation?.id, queryClient]);

  const sendReply = useCallback(async () => {
    if (!input.trim() || !selectedConversation || sending) return;
    const content = input.trim();
    setInput('');
    setSending(true);

    await supabase.from('chat_messages').insert({
      conversation_id: selectedConversation.id,
      organization_id: orgId!,
      sender_type: 'admin',
      sender_id: user?.id || null,
      content,
    });

    setSending(false);
  }, [input, selectedConversation, orgId, user?.id, sending]);

  const closeConversation = useCallback(async (convId: string) => {
    await supabase.from('chat_conversations').update({ status: 'closed' }).eq('id', convId);
    if (selectedConversation?.id === convId) setSelectedConversation(null);
    queryClient.invalidateQueries({ queryKey: ['chat-conversations', orgId] });
  }, [selectedConversation, orgId, queryClient]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendReply();
  };

  const openConversations = conversations.filter(c => c.status === 'open');
  const closedConversations = conversations.filter(c => c.status === 'closed');

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-140px)]">
        <div className="flex items-center gap-3 mb-4">
          <MessageCircle className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Live Chat</h1>
          {openConversations.length > 0 && (
            <Badge variant="default">{openConversations.length} open</Badge>
          )}
        </div>

        <div className="flex flex-1 gap-4 min-h-0">
          {/* Conversation List */}
          <Card className="w-80 flex-shrink-0 flex flex-col">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">Conversations</CardTitle>
            </CardHeader>
            <ScrollArea className="flex-1">
              {isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : conversations.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">No conversations yet</p>
              ) : (
                <div className="space-y-1 px-2 pb-2">
                  {openConversations.length > 0 && (
                    <p className="text-xs text-muted-foreground px-2 pt-2 pb-1 font-medium">Open</p>
                  )}
                  {openConversations.map(conv => (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv)}
                      className={cn(
                        'w-full text-left px-3 py-2.5 rounded-lg transition-colors',
                        selectedConversation?.id === conv.id ? 'bg-primary/10' : 'hover:bg-muted'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm truncate">{conv.visitor_name || 'Visitor'}</span>
                        {(conv.unread_count ?? 0) > 0 && (
                          <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">{conv.unread_count}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                      </p>
                    </button>
                  ))}
                  {closedConversations.length > 0 && (
                    <p className="text-xs text-muted-foreground px-2 pt-4 pb-1 font-medium">Closed</p>
                  )}
                  {closedConversations.slice(0, 10).map(conv => (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv)}
                      className={cn(
                        'w-full text-left px-3 py-2.5 rounded-lg transition-colors opacity-60',
                        selectedConversation?.id === conv.id ? 'bg-primary/10' : 'hover:bg-muted'
                      )}
                    >
                      <span className="font-medium text-sm truncate">{conv.visitor_name || 'Visitor'}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">Closed</p>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </Card>

          {/* Chat Area */}
          <Card className="flex-1 flex flex-col min-w-0">
            {selectedConversation ? (
              <>
                <CardHeader className="py-3 px-4 border-b flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm">{selectedConversation.visitor_name || 'Visitor'}</CardTitle>
                    <Badge variant={selectedConversation.status === 'open' ? 'default' : 'secondary'} className="text-xs">
                      {selectedConversation.status}
                    </Badge>
                  </div>
                  {selectedConversation.status === 'open' && (
                    <Button variant="ghost" size="sm" onClick={() => closeConversation(selectedConversation.id)}>
                      <X className="h-4 w-4 mr-1" /> Close
                    </Button>
                  )}
                </CardHeader>

                <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                  <div className="space-y-3">
                    {messages.map(msg => (
                      <div key={msg.id} className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                        <div className={cn(
                          'max-w-[75%] rounded-2xl px-4 py-2 text-sm',
                          msg.sender_type === 'admin' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                        )}>
                          {msg.content}
                          <p className={cn('text-[10px] mt-1', msg.sender_type === 'admin' ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {selectedConversation.status === 'open' && (
                  <form onSubmit={handleSubmit} className="p-3 border-t flex gap-2">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Type a reply..."
                      disabled={sending}
                      className="flex-1"
                    />
                    <Button type="submit" size="icon" disabled={sending || !input.trim()}>
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </form>
                )}
              </>
            ) : (
              <CardContent className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Select a conversation to start replying</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
