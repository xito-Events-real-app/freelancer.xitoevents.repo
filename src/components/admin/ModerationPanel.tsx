import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

function useAuthors(ids: string[]) {
  return useQuery({
    queryKey: ["mod-authors", ids.sort().join(",")],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("freelancer_profiles")
        .select("user_id, full_name, profile_photo_url")
        .in("user_id", ids);
      const map: Record<string, any> = {};
      (data ?? []).forEach((p: any) => (map[p.user_id] = p));
      return map;
    },
  });
}

function FeedPostsList() {
  const qc = useQueryClient();
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["mod-feed-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feed_posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: authors = {} } = useAuthors(posts.map((p: any) => p.user_id));

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("feed_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Post deleted");
      qc.invalidateQueries({ queryKey: ["mod-feed-posts"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading...</p>;
  if (posts.length === 0) return <p className="text-sm text-muted-foreground">No posts.</p>;

  return (
    <div className="space-y-3 max-h-[600px] overflow-y-auto">
      {posts.map((p: any) => {
        const a = authors[p.user_id];
        return (
          <div key={p.id} className="border rounded-lg p-3 bg-card flex gap-3">
            {p.image_url && (
              <img
                src={p.image_url}
                alt=""
                className="w-20 h-20 rounded object-cover flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground">
                {a?.full_name ?? "Unknown"} • {new Date(p.created_at).toLocaleString()}
              </div>
              <p className="text-sm mt-1 line-clamp-3 whitespace-pre-wrap">
                {p.content || "(no text)"}
              </p>
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <Badge variant="outline">{p.likes_count} likes</Badge>
                <Badge variant="outline">{p.comments_count} comments</Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (confirm("Delete this feed post permanently?")) del.mutate(p.id);
              }}
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}

function MarketPostsList() {
  const qc = useQueryClient();
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["mod-market-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("market_posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: authors = {} } = useAuthors(posts.map((p: any) => p.user_id));

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("market_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Job deleted");
      qc.invalidateQueries({ queryKey: ["mod-market-posts"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading...</p>;
  if (posts.length === 0) return <p className="text-sm text-muted-foreground">No jobs.</p>;

  return (
    <div className="space-y-3 max-h-[600px] overflow-y-auto">
      {posts.map((p: any) => {
        const a = authors[p.user_id];
        return (
          <div key={p.id} className="border rounded-lg p-3 bg-card flex gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-medium">{p.event_name}</div>
              <div className="text-xs text-muted-foreground">
                {a?.full_name ?? "Unknown"} • {p.freelancer_type} • {p.default_city}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {new Date(p.created_at).toLocaleString()}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (confirm("Delete this job permanently?")) del.mutate(p.id);
              }}
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}

function CommentsList() {
  const qc = useQueryClient();
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["mod-feed-comments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feed_comments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: authors = {} } = useAuthors(comments.map((c: any) => c.user_id));

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("feed_comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Comment deleted");
      qc.invalidateQueries({ queryKey: ["mod-feed-comments"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading...</p>;
  if (comments.length === 0) return <p className="text-sm text-muted-foreground">No comments.</p>;

  return (
    <div className="space-y-2 max-h-[600px] overflow-y-auto">
      {comments.map((c: any) => {
        const a = authors[c.user_id];
        return (
          <div key={c.id} className="border rounded-lg p-3 bg-card flex gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground">
                {a?.full_name ?? "Unknown"} • {new Date(c.created_at).toLocaleString()}
              </div>
              <p className="text-sm mt-1 whitespace-pre-wrap">{c.content}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (confirm("Delete this comment?")) del.mutate(c.id);
              }}
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}

export default function ModerationPanel() {
  return (
    <Card>
      <CardContent className="pt-6">
        <Tabs defaultValue="feed">
          <TabsList className="mb-4">
            <TabsTrigger value="feed">Feed Posts</TabsTrigger>
            <TabsTrigger value="market">Market Jobs</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
          </TabsList>
          <TabsContent value="feed"><FeedPostsList /></TabsContent>
          <TabsContent value="market"><MarketPostsList /></TabsContent>
          <TabsContent value="comments"><CommentsList /></TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
