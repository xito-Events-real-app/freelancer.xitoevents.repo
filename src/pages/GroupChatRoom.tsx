import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSmartBack } from '@/hooks/useSmartBack';
import { useAuth } from '@/contexts/AuthContext';
import {
  useGroupMessages,
  useSendGroupMessage,
  useRealtimeGroupMessages,
  useGroupTypingPresence,
  useMentionSearch,
  useMarkGroupRead,
  GroupMessage,
} from '@/hooks/useGroupChat';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send, ImagePlus, X, Reply, Loader2 } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { normalizeMediaUrl } from '@/lib/mediaUrl';
import { compressImage } from '@/lib/imageCompressor';
import ImageLightbox from '@/components/ImageLightbox';
import { getDisplayInitial } from '@/lib/utils';

export default function GroupChatRoom() {
  const navigate = useNavigate();
  const goBack = useSmartBack('/chat');
  const { user } = useAuth();
  const { data: messages = [], isLoading } = useGroupMessages();
  const sendMessage = useSendGroupMessage();
  const { upload, uploading } = useMediaUpload();
  useRealtimeGroupMessages();
  const { othersTyping, setTyping } = useGroupTypingPresence();
  const markGroupRead = useMarkGroupRead();

  // Mark as read on mount and when messages change
  useEffect(() => {
    if (messages.length > 0) markGroupRead();
  }, [messages.length, markGroupRead]);

  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<GroupMessage | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>();

  const { query: mentionQuery, setQuery: setMentionQuery, results: mentionResults } = useMentionSearch();
  const [showMentions, setShowMentions] = useState(false);
  const [mentionStartIdx, setMentionStartIdx] = useState(-1);

  const initialScrollDone = useRef(false);

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
  }, [messages.length, othersTyping.length]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Sign in to join the discussion</p>
        <Button onClick={() => navigate('/auth')} variant="default">Sign In</Button>
      </div>
    );
  }

  const handleTextChange = (val: string) => {
    setText(val);
    setTyping(true);
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => setTyping(false), 2000);

    const lastAt = val.lastIndexOf('@');
    if (lastAt >= 0) {
      const afterAt = val.slice(lastAt + 1);
      if (!afterAt.includes(' ') && afterAt.length <= 30) {
        setMentionStartIdx(lastAt);
        setMentionQuery(afterAt);
        setShowMentions(true);
        return;
      }
    }

    setShowMentions(false);
    setMentionQuery('');
  };

  const insertMention = (profile: { user_id: string; display_name: string }) => {
    const before = text.slice(0, mentionStartIdx);
    const mention = `@[${profile.user_id}:${profile.display_name}]`;
    setText(before + mention + ' ');
    setShowMentions(false);
    setMentionQuery('');
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed && !uploading) return;

    await sendMessage.mutateAsync({
      content: trimmed || undefined,
      replyToId: replyTo?.id,
    });

    setText('');
    setReplyTo(null);
    setTyping(false);
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';
    const compressed = await compressImage(file);
    const result = await upload(compressed, 'media');

    if (result) {
      await sendMessage.mutateAsync({
        content: text.trim() || undefined,
        imageUrl: result.url,
        imagePath: result.path,
        replyToId: replyTo?.id,
      });
      setText('');
      setReplyTo(null);
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      });
    }
  };

  const renderContent = (content: string | null) => {
    if (!content) return null;

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
  };

  const formatMsgTime = (date: string) => {
    const d = new Date(date);
    return format(d, 'h:mm a');
  };

  const groupedByDate: { label: string; messages: GroupMessage[] }[] = [];
  let lastLabel = '';
  messages.forEach((m) => {
    const d = new Date(m.created_at);
    let label: string;
    if (isToday(d)) label = 'Today';
    else if (isYesterday(d)) label = 'Yesterday';
    else label = format(d, 'MMM d, yyyy');

    if (label !== lastLabel) {
      groupedByDate.push({ label, messages: [m] });
      lastLabel = label;
    } else {
      groupedByDate[groupedByDate.length - 1].messages.push(m);
    }
  });

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div className="shrink-0 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-lg">
        <div className="max-w-lg lg:max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={goBack} className="text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-foreground text-sm">Nepali Wedding Discussion</h1>
            <p className="text-[10px] text-muted-foreground">{messages.length} messages · Public Group</p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-3">
        <div className="max-w-lg lg:max-w-3xl mx-auto space-y-1">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            groupedByDate.map((group, gi) => (
              <div key={gi}>
                <div className="flex justify-center my-3">
                  <span className="text-[10px] bg-muted text-muted-foreground px-3 py-1 rounded-full">
                    {group.label}
                  </span>
                </div>
                {group.messages.map((msg, mi) => {
                  const isOwn = msg.user_id === user.id;
                  const showSender = !isOwn && (mi === 0 || group.messages[mi - 1]?.user_id !== msg.user_id);
                  const imgUrl = normalizeMediaUrl(msg.image_url);

                  return (
                    <div key={msg.id} className={`flex gap-2 mb-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      {!isOwn && (
                        <div className="w-8 shrink-0">
                          {showSender && msg.sender ? (
                            <button onClick={() => navigate(`/freelancer/${msg.sender.profile_id}`)}>
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={normalizeMediaUrl(msg.sender.profile_photo_url) || ''} />
                                <AvatarFallback className="text-[10px]">
                                  {getDisplayInitial({ full_name: msg.sender.display_name })}
                                </AvatarFallback>
                              </Avatar>
                            </button>
                          ) : null}
                        </div>
                      )}
                      <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                        {showSender && msg.sender && (
                          <button
                            onClick={() => navigate(`/freelancer/${msg.sender.profile_id}`)}
                            className="text-[11px] font-semibold text-primary mb-0.5 hover:underline text-left"
                          >
                            {msg.sender.display_name}
                            {msg.sender.main_job && (
                              <span className="text-muted-foreground font-normal"> · {msg.sender.main_job}</span>
                            )}
                          </button>
                        )}

                        {msg.reply_to && (
                          <div className={`text-[10px] px-2 py-1 rounded-t-lg border-l-2 border-primary/50 bg-muted/60 w-full mb-0.5 ${isOwn ? 'text-right' : ''}`}>
                            <span className="font-semibold">{msg.reply_to.sender_name}</span>
                            <p className="truncate text-muted-foreground">{msg.reply_to.content || '📷 Photo'}</p>
                          </div>
                        )}

                        <div
                          className={`relative group rounded-2xl px-3 py-2 text-[15px] ${
                            isOwn
                              ? 'bg-primary text-primary-foreground rounded-br-md'
                              : 'bg-muted text-foreground rounded-bl-md'
                          }`}
                        >
                          {imgUrl && (
                            <button onClick={() => setLightboxUrl(imgUrl)} className="block mb-1">
                              <img
                                src={imgUrl}
                                alt="shared"
                                className="rounded-lg max-h-52 object-contain"
                                loading="lazy"
                              />
                            </button>
                          )}
                          {msg.content && <p className="whitespace-pre-wrap break-words">{renderContent(msg.content)}</p>}
                          <span className={`text-[9px] mt-0.5 block ${isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                            {formatMsgTime(msg.created_at)}
                          </span>

                          <button
                            onClick={() => setReplyTo(msg)}
                            className="absolute -top-2 right-1 opacity-0 group-hover:opacity-100 active:opacity-100 bg-background border border-border rounded-full p-1.5 shadow-sm transition-opacity"
                          >
                            <Reply className="w-3 h-3 text-muted-foreground" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}

          {othersTyping.length > 0 && (
            <p className="text-xs text-muted-foreground pl-10 animate-pulse">
              {othersTyping.length === 1 ? 'Someone is typing...' : `${othersTyping.length} people typing...`}
            </p>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="shrink-0 border-t border-border bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 mb-[calc(4rem+env(safe-area-inset-bottom))] lg:mb-0">
        <div className="relative max-w-lg lg:max-w-3xl mx-auto">
          {replyTo && (
            <div className="flex items-center gap-2 px-3 py-1.5 mb-1 bg-muted rounded-lg text-xs">
              <Reply className="w-3 h-3 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-semibold">{replyTo.sender?.display_name ?? 'Unknown'}</span>
                <p className="truncate text-muted-foreground">{replyTo.content || '📷 Photo'}</p>
              </div>
              <button onClick={() => setReplyTo(null)}>
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          )}

          {showMentions && mentionResults.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 z-10 bg-background border border-border rounded-lg shadow-lg mb-1 max-h-48 overflow-y-auto">
              {mentionResults.map((p) => (
                <button
                  key={p.user_id}
                  onClick={() => insertMention(p)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted text-left text-sm"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={normalizeMediaUrl(p.profile_photo_url) || ''} />
                    <AvatarFallback className="text-[9px]">{p.display_name[0]}</AvatarFallback>
                  </Avatar>
                  <span className="truncate">{p.display_name}</span>
                  {p.main_job && <span className="text-muted-foreground text-xs">· {p.main_job}</span>}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="text-muted-foreground hover:text-foreground p-2 shrink-0"
            >
              {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            <textarea
              value={text}
              onFocus={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })}
              onChange={(e) => handleTextChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type a message..."
              enterKeyHint="send"
              rows={1}
              className="flex-1 resize-none bg-muted rounded-2xl px-4 py-2.5 text-[15px] focus:outline-none focus:ring-1 focus:ring-ring max-h-32 min-h-[40px]"
            />
            <Button
              onClick={handleSend}
              disabled={(!text.trim() && !uploading) || sendMessage.isPending}
              size="icon"
              className="rounded-full h-10 w-10 shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {lightboxUrl && (
        <ImageLightbox src={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      )}
    </div>
  );
}
