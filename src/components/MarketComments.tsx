import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAddMarketComment } from '@/hooks/useMarket';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, MessageCircle } from 'lucide-react';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  commenter_name: string;
  commenter_profile_id: string | null;
  commenter_photo: string | null;
}

interface MarketCommentsProps {
  postId: string;
  postOwnerId: string;
  comments: Comment[];
}

export default function MarketComments({ postId, postOwnerId, comments }: MarketCommentsProps) {
  const [content, setContent] = useState('');
  const navigate = useNavigate();
  const addComment = useAddMarketComment();

  const handleSubmit = () => {
    if (!content.trim()) return;
    addComment.mutate({ postId, content: content.trim(), postOwnerId }, {
      onSuccess: () => setContent(''),
    });
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <MessageCircle className="w-4 h-4 text-primary" /> Comments ({comments.length})
      </h3>

      {comments.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">No comments yet. Be the first!</p>
      )}

      {comments.map(c => (
        <div key={c.id} className="flex gap-3 bg-card/50 rounded-xl p-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex-shrink-0 overflow-hidden flex items-center justify-center">
            {c.commenter_photo ? (
              <img src={c.commenter_photo} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-primary">{c.commenter_name.charAt(0)}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <button
              onClick={() => c.commenter_profile_id && navigate(`/freelancer/${c.commenter_profile_id}`)}
              className="text-xs font-semibold text-primary hover:underline"
            >
              {c.commenter_name}
            </button>
            <p className="text-sm text-foreground mt-0.5">{c.content}</p>
            <span className="text-[10px] text-muted-foreground">
              {new Date(c.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      ))}

      <div className="flex gap-2 pt-1">
        <Input
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Add a comment..."
          className="rounded-xl flex-1"
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        />
        <Button size="icon" onClick={handleSubmit} disabled={!content.trim() || addComment.isPending} className="rounded-xl">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
