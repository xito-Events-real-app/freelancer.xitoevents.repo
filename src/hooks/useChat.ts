import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState, useCallback, useRef } from 'react';

export interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
  other_user: {
    user_id: string;
    full_name: string;
    profile_photo_url: string | null;
    profile_id: string;
  } | null;
  last_message: { content: string; created_at: string; sender_id: string } | null;
  unread_count: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

export function useConversations() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      const { data: convos, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`user1_id.eq.${user!.id},user2_id.eq.${user!.id}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!convos || convos.length === 0) return [] as Conversation[];

      const otherIds = convos.map(c => c.user1_id === user!.id ? c.user2_id : c.user1_id);
      const { data: profiles } = await supabase
        .from('freelancer_profiles')
        .select('id, user_id, full_name, profile_photo_url, account_type, business_name')
        .in('user_id', otherIds);
      const profileMap = new Map((profiles ?? []).map(p => [p.user_id, {
        ...p,
        full_name: (p.account_type === 'agency' && p.business_name) ? p.business_name : p.full_name,
      }]));

      const convoIds = convos.map(c => c.id);
      const { data: lastMessages } = await supabase
        .from('messages')
        .select('conversation_id, content, created_at, sender_id')
        .in('conversation_id', convoIds)
        .order('created_at', { ascending: false });

      const lastMsgMap = new Map<string, { content: string; created_at: string; sender_id: string }>();
      (lastMessages ?? []).forEach(m => {
        if (!lastMsgMap.has(m.conversation_id)) lastMsgMap.set(m.conversation_id, m);
      });

      const { data: unreads } = await supabase
        .from('messages')
        .select('conversation_id')
        .in('conversation_id', convoIds)
        .neq('sender_id', user!.id)
        .eq('read', false);

      const unreadMap = new Map<string, number>();
      (unreads ?? []).forEach(u => unreadMap.set(u.conversation_id, (unreadMap.get(u.conversation_id) ?? 0) + 1));

      const result: Conversation[] = convos.map(c => {
        const otherId = c.user1_id === user!.id ? c.user2_id : c.user1_id;
        const p = profileMap.get(otherId);
        return {
          ...c,
          other_user: p ? { user_id: p.user_id, full_name: p.full_name, profile_photo_url: p.profile_photo_url, profile_id: p.id } : null,
          last_message: lastMsgMap.get(c.id) ?? null,
          unread_count: unreadMap.get(c.id) ?? 0,
        };
      });

      result.sort((a, b) => {
        const aTime = a.last_message?.created_at ?? a.created_at;
        const bTime = b.last_message?.created_at ?? b.created_at;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

      return result;
    },
    enabled: !!user,
    staleTime: 120_000,
  });
}

export function useMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Message[];
    },
    enabled: !!conversationId,
  });
}

export function useSendMessage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      const { error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user!.id,
        content,
      });
      if (error) throw error;
    },
    onSuccess: (_, { conversationId }) => {
      qc.invalidateQueries({ queryKey: ['messages', conversationId] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useMarkMessagesRead(conversationId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  useEffect(() => {
    if (!conversationId || !user) return;
    const markRead = async () => {
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .eq('read', false);
      qc.invalidateQueries({ queryKey: ['conversations'] });
      qc.invalidateQueries({ queryKey: ['unread-chat-count'] });
    };
    markRead();
  }, [conversationId, user, qc]);
}

export function useGetOrCreateConversation() {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (otherUserId: string) => {
      const id1 = user!.id < otherUserId ? user!.id : otherUserId;
      const id2 = user!.id < otherUserId ? otherUserId : user!.id;

      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('user1_id', id1)
        .eq('user2_id', id2)
        .maybeSingle();

      if (existing) return existing.id;

      const { data, error } = await supabase
        .from('conversations')
        .insert({ user1_id: user!.id, user2_id: otherUserId })
        .select('id')
        .single();
      if (error) throw error;
      return data.id;
    },
  });
}

export function useUnreadChatCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['unread-chat-count', user?.id],
    queryFn: async () => {
      const { data: convos } = await supabase
        .from('conversations')
        .select('id')
        .or(`user1_id.eq.${user!.id},user2_id.eq.${user!.id}`);
      if (!convos || convos.length === 0) return 0;

      const { count, error } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .in('conversation_id', convos.map(c => c.id))
        .neq('sender_id', user!.id)
        .eq('read', false);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user,
    staleTime: 120_000,
  });
}

export function useRealtimeUnreadCount() {
  const qc = useQueryClient();
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('global-unread-count')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, () => {
        qc.invalidateQueries({ queryKey: ['unread-chat-count'] });
        qc.invalidateQueries({ queryKey: ['conversations'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, qc]);
}

export function useRealtimeMessages(conversationId: string | undefined) {
  const qc = useQueryClient();
  const { user } = useAuth();
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ['messages', conversationId] });
        qc.invalidateQueries({ queryKey: ['conversations'] });
        qc.invalidateQueries({ queryKey: ['unread-chat-count'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, qc, user]);
}

export function useTypingPresence(conversationId: string | undefined) {
  const { user } = useAuth();
  const [othersTyping, setOthersTyping] = useState<string[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!conversationId || !user) return;
    const channel = supabase.channel(`typing-${conversationId}`, { config: { presence: { key: user.id } } });
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const typing = Object.keys(state).filter(k => k !== user.id);
        setOthersTyping(typing);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [conversationId, user]);

  const setTyping = useCallback((isTyping: boolean) => {
    if (!channelRef.current) return;
    if (isTyping) {
      channelRef.current.track({ typing: true });
    } else {
      channelRef.current.untrack();
    }
  }, []);

  return { othersTyping, setTyping };
}
