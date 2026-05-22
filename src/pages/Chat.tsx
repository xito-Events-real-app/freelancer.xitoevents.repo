import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useConversations } from '@/hooks/useChat';
import { useUnreadGroupMessages } from '@/hooks/useGroupChat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Loader2, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function Chat() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: conversations = [], isLoading } = useConversations();
  const unreadGroup = useUnreadGroupMessages();

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 pb-20">
        <MessageSquare className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground">Sign in to access your messages</p>
        <button onClick={() => navigate('/auth')} className="text-primary font-semibold text-sm">Sign In</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="max-w-lg lg:max-w-3xl mx-auto flex items-center gap-3">
          <h1 className="font-bold text-foreground text-lg">Messages</h1>
        </div>
      </div>

      <div className="max-w-lg lg:max-w-3xl mx-auto">
        {/* Pinned Group Chat */}
        <button
          onClick={() => navigate('/chat/group/wedding')}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border bg-primary/5"
        >
          <div className="relative h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6 text-primary" />
            {unreadGroup > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadGroup > 9 ? '9+' : unreadGroup}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-bold">Nepali Wedding Discussion</p>
            <p className="text-xs text-muted-foreground">Public group · Tap to join the conversation</p>
          </div>
        </button>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <MessageSquare className="w-10 h-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No conversations yet</p>
            <p className="text-xs text-muted-foreground text-center px-8">Follow someone and once they follow you back, you can start chatting!</p>
          </div>
        ) : (
          conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate(`/chat/${c.id}`)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border"
            >
              <div className="relative">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={c.other_user?.profile_photo_url || ''} />
                  <AvatarFallback>{c.other_user?.full_name?.[0] ?? '?'}</AvatarFallback>
                </Avatar>
                {c.unread_count > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                    {c.unread_count > 9 ? '9+' : c.unread_count}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between">
                  <p className={`text-sm truncate ${c.unread_count > 0 ? 'font-bold' : 'font-medium'}`}>
                    {c.other_user?.full_name ?? 'Unknown'}
                  </p>
                  {c.last_message && (
                    <span className="text-[10px] text-muted-foreground ml-2 shrink-0">
                      {formatDistanceToNow(new Date(c.last_message.created_at), { addSuffix: true })}
                    </span>
                  )}
                </div>
                {c.last_message && (
                  <p className={`text-xs truncate ${c.unread_count > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                    {c.last_message.sender_id === user.id ? 'You: ' : ''}{c.last_message.content}
                  </p>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
