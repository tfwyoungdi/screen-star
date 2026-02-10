import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';

interface ChatMessage {
  id: string;
  sender_type: 'visitor' | 'admin';
  content: string;
  created_at: string;
}

interface VisitorLiveChatProps {
  organizationId: string;
  cinemaName: string;
  primaryColor?: string;
}

function getVisitorId(): string {
  let id = localStorage.getItem('chat_visitor_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('chat_visitor_id', id);
  }
  return id;
}

export function VisitorLiveChat({ organizationId, cinemaName, primaryColor = '#D4AF37' }: VisitorLiveChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [visitorName, setVisitorName] = useState('');
  const [nameSet, setNameSet] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const visitorId = useRef(getVisitorId());

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, nameSet]);

  // Load existing conversation
  useEffect(() => {
    if (!isOpen || !organizationId) return;
    
    const loadConversation = async () => {
      const { data } = await supabase.rpc('get_visitor_conversation', {
        _visitor_id: visitorId.current,
        _org_id: organizationId,
      });

      if (data && data.length > 0) {
        const conv = data[0];
        setConversationId(conv.id);
        setNameSet(true);
        setVisitorName(conv.visitor_name || 'Visitor');

        // Load messages
        const { data: msgs } = await supabase.rpc('get_visitor_messages', {
          _conversation_id: conv.id,
          _visitor_id: visitorId.current,
        });
        if (msgs) {
          setMessages(msgs.map((m: any) => ({
            id: m.id,
            sender_type: m.sender_type,
            content: m.content,
            created_at: m.created_at,
          })));
        }
      }
    };
    loadConversation();
  }, [isOpen, organizationId]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`visitor-chat-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const msg = payload.new as any;
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, {
            id: msg.id,
            sender_type: msg.sender_type,
            content: msg.content,
            created_at: msg.created_at,
          }];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  const startConversation = useCallback(async () => {
    if (!visitorName.trim()) return;
    
    const { data, error } = await supabase
      .from('chat_conversations')
      .insert({
        organization_id: organizationId,
        visitor_id: visitorId.current,
        visitor_name: visitorName.trim(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to start conversation:', error);
      return;
    }
    setConversationId(data.id);
    setNameSet(true);
  }, [visitorName, organizationId]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || !conversationId || sending) return;
    
    const content = input.trim();
    setInput('');
    setSending(true);

    const { error } = await supabase.from('chat_messages').insert({
      conversation_id: conversationId,
      organization_id: organizationId,
      sender_type: 'visitor',
      sender_id: visitorId.current,
      content,
    });

    if (error) console.error('Failed to send message:', error);
    setSending(false);
  }, [input, conversationId, organizationId, sending]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameSet) {
      startConversation();
    } else {
      sendMessage();
    }
  };

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 left-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg text-white font-medium transition-transform hover:scale-105"
          style={{ backgroundColor: primaryColor }}
          aria-label="Open live chat"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="hidden sm:inline">Chat with us</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 left-6 z-50 w-[360px] max-w-[calc(100vw-48px)] h-[500px] max-h-[calc(100vh-100px)] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 text-white" style={{ backgroundColor: primaryColor }}>
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <span className="font-semibold">{cinemaName} Chat</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-1 rounded-full hover:bg-white/20 transition-colors" aria-label="Close chat">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {!nameSet ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                <p className="mb-4">👋 Welcome! Enter your name to start chatting with our team.</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                <p>Your message has been sent! An admin will reply shortly.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender_type === 'visitor' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                      msg.sender_type === 'visitor'
                        ? 'text-white'
                        : 'bg-muted text-foreground'
                    }`}
                    style={msg.sender_type === 'visitor' ? { backgroundColor: primaryColor } : undefined}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-border flex gap-2">
            {!nameSet ? (
              <>
                <Input
                  ref={inputRef}
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  placeholder="Enter your name..."
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={!visitorName.trim()} style={{ backgroundColor: primaryColor }} className="text-white hover:opacity-90">
                  <Send className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message..."
                  disabled={sending}
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={sending || !input.trim()} style={{ backgroundColor: primaryColor }} className="text-white hover:opacity-90">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </>
            )}
          </form>
        </div>
      )}
    </>
  );
}
