import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSmartBack } from '@/hooks/useSmartBack';
import { useAuth } from '@/contexts/AuthContext';
import { useMessages, useSendMessage, useRealtimeMessages, useMarkMessagesRead, useTypingPresence } from '@/hooks/useChat';
import { useFollowStatus } from '@/hooks/useFollow';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';

function formatMessageTime(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, 'h:mm a');
  if (isYesterday(d)) return `Yesterday ${format(d, 'h:mm a')}`;
  return format(d, 'MMM d, h:mm a');
}

function renderContent(content: string, navigate: ReturnType<typeof useNavigate>) {
  const parts = content.split(/(@\[[^\]]+\])/g);
  return parts.map((part, i) => {
    const match = part.match(/^@\[([^:]+):([^\]]+)\]$/);
    if (match) {
      const [, , displayName] = match;
      return (
        <button
          key={i}
          onClick={() => navigate('/discover')}
          className="text-primary font-semibold hover:underline"
        >
          @{displayName}
        </button>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function ChatRoom() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const goBack = useSmartBack('/chat');
  const { user } = useAuth();
  const { data: messages = [], isLoading } = useMessages(conversationId);
  const sendMessage = useSendMessage();
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const initialScrollDone = useRef(false);

  useRealtimeMessages(conversationId);
  useMarkMessagesRead(conversationId);
  const { othersTyping, setTyping } = useTypingPresence(conversationId);

  const { data: convo } = useQuery({
    queryKey: ['conversation-detail', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId!)
        .single();
      if (error) throw error;
      const otherId = data.user1_id === user!.id ? data.user2_id : data.user1_id;
      const { data: profile } = await supabase
        .from('freelancer_profiles')
        .select('id, user_id, full_name, profile_photo_url, account_type, business_name')
        .eq('user_id', otherId)
        .maybeSingle();
      const displayName = profile ? ((profile.account_type === 'agency' && profile.business_name) ? profile.business_name : profile.full_name) : 'Unknown';
      return { ...data, other_user: profile ? { ...profile, full_name: displayName } : null };
    },
    enabled: !!conversationId && !!user,
  });

  const otherUserId = convo?.other_user?.user_id;
  const { data: followStatus } = useFollowStatus(otherUserId);
  const isMutual = followStatus?.iFollow === 'accepted' && followStatus?.theyFollow === 'accepted';
  const followLoaded = !!followStatus;

  // Initial scroll to bottom (instant)
  useEffect(() => {
    if (!isLoading && messages.length > 0 && !initialScrollDone.current) {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'instant' as ScrollBehavior });
        initialScrollDone.current = true;
      });
    }
  }, [isLoading, messages.length]);

  // Smooth scroll on new messages
  useEffect(() => {
    if (initialScrollDone.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages.length, othersTyping]);

  const handleSend = async () => {
    if (!text.trim() || !conversationId) return;
    setTyping(false);
    await sendMessage.mutateAsync({ conversationId, content: text.trim() });
    setText('');
  };

  const handleTyping = (val: string) => {
    setText(val);
    setTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setTyping(false), 2000);
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-background" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div className="shrink-0 bg-background/80 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="max-w-lg lg:max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={goBack} className="p-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          {convo?.other_user && (
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => navigate(`/freelancer/${convo.other_user.id}`)}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={convo.other_user.profile_photo_url || ''} />
                <AvatarFallback>{convo.other_user.full_name[0]}</AvatarFallback>
              </Avatar>
              <span className="font-semibold text-sm">{convo.other_user.full_name}</span>
            </div>
          )}
        </div>
      </div>

      <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 max-w-lg lg:max-w-3xl mx-auto w-full overscroll-contain">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">No messages yet. Say hello! 👋</p>
        ) : (
          <div className="space-y-2">
            {messages.map((msg) => {
              const isMine = msg.sender_id === user.id;
              return (
                <div key={msg.id} className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[75%] px-3 py-2 rounded-2xl text-[15px]',
                      isMine
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted text-foreground rounded-bl-md'
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">{renderContent(msg.content, navigate)}</p>
                    <p className={cn('text-[10px] mt-1', isMine ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                      {formatMessageTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
            {othersTyping.length > 0 && (
              <div className="flex justify-start">
                <div className="bg-muted text-muted-foreground px-3 py-2 rounded-2xl rounded-bl-md text-[15px] italic">
                  typing...
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 border-t border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 mb-[calc(4rem+env(safe-area-inset-bottom))] lg:mb-0">
        <div className="max-w-lg lg:max-w-3xl mx-auto">
          {followLoaded && !isMutual && otherUserId ? (
            <p className="text-xs text-muted-foreground text-center py-2">
              You need to follow each other to send messages
            </p>
          ) : (
            <div className="flex gap-2">
              <Input
                placeholder="Type a message..."
                value={text}
                onFocus={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })}
                onChange={(e) => handleTyping(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                className="rounded-full"
              />
              <Button
                size="icon"
                className="rounded-full shrink-0"
                onClick={handleSend}
                disabled={!text.trim() || sendMessage.isPending}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
