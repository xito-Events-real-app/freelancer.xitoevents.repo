import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState, useCallback, useRef } from 'react';
import { getDisplayName } from '@/lib/utils';

export interface GroupMessage {
  id: string;
  user_id: string;
  content: string | null;
  image_url: string | null;
  image_path: string | null;
  reply_to_id: string | null;
  created_at: string;
  sender?: {
    user_id: string;
    profile_id: string;
    full_name: string;
    profile_photo_url: string | null;
    main_job: string | null;
    display_name: string;
  };
  reply_to?: {
    content: string | null;
    sender_name: string;
  } | null;
}

const GROUP_MESSAGES_CACHE_KEY = 'group-messages-cache-v1';
const MAX_GROUP_MESSAGES = 200;

function readCachedGroupMessages(): GroupMessage[] {
  if (typeof window === 'undefined') return [];

  try {
    const cached = localStorage.getItem(GROUP_MESSAGES_CACHE_KEY);
    if (!cached) return [];
    const parsed = JSON.parse(cached);
    return Array.isArray(parsed) ? parsed as GroupMessage[] : [];
  } catch {
    return [];
  }
}

function writeCachedGroupMessages(messages: GroupMessage[]) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(
      GROUP_MESSAGES_CACHE_KEY,
      JSON.stringify(messages.slice(-MAX_GROUP_MESSAGES))
    );
  } catch {
    // Ignore storage quota errors
  }
}

export function useGroupMessages() {
  return useQuery({
    queryKey: ['group-messages'],
    initialData: () => {
      const cachedMessages = readCachedGroupMessages();
      return cachedMessages.length > 0 ? cachedMessages : undefined;
    },
    initialDataUpdatedAt: 0,
    queryFn: async () => {
      const { data: messages, error } = await supabase
        .from('group_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(MAX_GROUP_MESSAGES);

      if (error) throw error;

      if (!messages || messages.length === 0) {
        writeCachedGroupMessages([]);
        return [] as GroupMessage[];
      }

      const replyIds = [...new Set(messages.flatMap((message) => message.reply_to_id ? [message.reply_to_id] : []))];

      const { data: replyMessages, error: replyError } = replyIds.length > 0
        ? await supabase
            .from('group_messages')
            .select('id, content, user_id')
            .in('id', replyIds)
        : { data: [], error: null };

      if (replyError) throw replyError;

      const allUserIds = [...new Set([
        ...messages.map((message) => message.user_id),
        ...(replyMessages ?? []).map((message) => message.user_id),
      ])];

      const { data: profiles, error: profileError } = allUserIds.length > 0
        ? await supabase
            .from('freelancer_profiles')
            .select('id, user_id, full_name, profile_photo_url, main_job, account_type, business_name')
            .in('user_id', allUserIds)
        : { data: [], error: null };

      if (profileError) throw profileError;

      const profileMap = new Map(
        (profiles ?? []).map((profile) => [profile.user_id, {
          user_id: profile.user_id,
          profile_id: profile.id,
          full_name: profile.full_name,
          profile_photo_url: profile.profile_photo_url,
          main_job: profile.main_job,
          display_name: getDisplayName(profile),
        }])
      );

      const replySourceMap = new Map((replyMessages ?? []).map((message) => [message.id, message]));
      messages.forEach((message) => replySourceMap.set(message.id, message));

      const replyMap = new Map<string, { content: string | null; sender_name: string }>();
      replyIds.forEach((replyId) => {
        const repliedMessage = replySourceMap.get(replyId);
        if (!repliedMessage) return;
        const sender = profileMap.get(repliedMessage.user_id);
        replyMap.set(replyId, {
          content: repliedMessage.content,
          sender_name: sender?.display_name ?? 'Unknown',
        });
      });

      const hydratedMessages = messages.map((message) => ({
        ...message,
        sender: profileMap.get(message.user_id) ?? undefined,
        reply_to: message.reply_to_id ? replyMap.get(message.reply_to_id) ?? null : null,
      })) as GroupMessage[];

      writeCachedGroupMessages(hydratedMessages);
      return hydratedMessages;
    },
    staleTime: 300_000,
    gcTime: 1_800_000,
  });
}

export function useSendGroupMessage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ content, imageUrl, imagePath, replyToId }: {
      content?: string;
      imageUrl?: string;
      imagePath?: string;
      replyToId?: string;
    }) => {
      const { error } = await supabase.from('group_messages').insert({
        user_id: user!.id,
        content: content || null,
        image_url: imageUrl || null,
        image_path: imagePath || null,
        reply_to_id: replyToId || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group-messages'] });
    },
  });
}

export function useRealtimeGroupMessages() {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel('group-messages-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'group_messages',
      }, () => {
        qc.invalidateQueries({ queryKey: ['group-messages'] });
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'group_messages',
      }, () => {
        qc.invalidateQueries({ queryKey: ['group-messages'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);
}

export function useGroupTypingPresence() {
  const { user } = useAuth();
  const [othersTyping, setOthersTyping] = useState<string[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('group-typing', { config: { presence: { key: user.id } } });
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
  }, [user]);

  const setTyping = useCallback((isTyping: boolean) => {
    if (!channelRef.current) return;
    if (isTyping) channelRef.current.track({ typing: true });
    else channelRef.current.untrack();
  }, []);

  return { othersTyping, setTyping };
}

const GROUP_LAST_SEEN_KEY = 'group-chat-last-seen-ts';

export function useUnreadGroupMessages() {
  const [unread, setUnread] = useState(0);

  const computeUnread = useCallback(() => {
    const lastSeen = localStorage.getItem(GROUP_LAST_SEEN_KEY) || '1970-01-01T00:00:00Z';
    const cached = readCachedGroupMessages();
    const count = cached.filter(m => m.created_at > lastSeen).length;
    setUnread(count);
  }, []);

  useEffect(() => {
    computeUnread();

    // Listen to storage events (for when group chat is marked read in another tab/component)
    const onStorage = (e: StorageEvent) => {
      if (e.key === GROUP_LAST_SEEN_KEY) computeUnread();
    };
    window.addEventListener('storage', onStorage);

    // Poll cached messages periodically to pick up realtime inserts
    const interval = setInterval(computeUnread, 3000);

    return () => {
      window.removeEventListener('storage', onStorage);
      clearInterval(interval);
    };
  }, [computeUnread]);

  return unread;
}

export function useMarkGroupRead() {
  return useCallback(() => {
    localStorage.setItem(GROUP_LAST_SEEN_KEY, new Date().toISOString());
  }, []);
}

export function useMentionSearch() {
  const [query, setQuery] = useState('');
  const { data: results = [] } = useQuery({
    queryKey: ['mention-search', query],
    queryFn: async () => {
      if (!query || query.length < 1) return [];
      const { data } = await supabase
        .from('freelancer_profiles')
        .select('id, user_id, full_name, profile_photo_url, main_job, account_type, business_name')
        .or(`full_name.ilike.%${query}%,business_name.ilike.%${query}%`)
        .limit(8);
      return (data ?? []).map(p => ({
        ...p,
        display_name: getDisplayName(p),
      }));
    },
    enabled: query.length >= 1,
  });

  return { query, setQuery, results };
}
