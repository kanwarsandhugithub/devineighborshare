import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Send, Star } from "lucide-react";

interface Discussion {
  id: number; title: string; content: string; category: string;
  author_id: number; author_name: string; author_avatar_url?: string; author_avg_rating?: number; comment_count: number;
  pinned: boolean; created_at: string; community_id: number;
}

interface Comment {
  id: number; discussion_id: number; author_id: number;
  author_name: string; author_avatar_url?: string; author_avg_rating?: number; content: string; created_at: string;
}

export default function DiscussionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [disc, comms] = await Promise.all([
        api.getDiscussion(Number(id)),
        api.getComments(Number(id)),
      ]);
      setDiscussion(disc);
      setComments(comms);
    } catch {
      // ignore
    }
  };

  const handleComment = async () => {
    if (!newComment.trim()) return;
    setSending(true);
    try {
      await api.addComment(Number(id), newComment);
      setNewComment("");
      loadData();
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase();

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  };

  if (!discussion) return <div className="p-4 text-center text-gray-400">Loading...</div>;

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate(`/community/${discussion.community_id}`)} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </Button>

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-xs">{discussion.category}</Badge>
            {discussion.pinned && <Badge className="bg-amber-100 text-amber-700 text-xs">Pinned</Badge>}
          </div>
          <h1 className="text-xl font-bold mb-2">{discussion.title}</h1>
          <p className="text-gray-600 whitespace-pre-wrap">{discussion.content}</p>
          <div className="flex items-center gap-2 mt-4 text-xs text-gray-400">
            <Avatar className="w-6 h-6">
              {discussion.author_avatar_url ? (
                <img src={discussion.author_avatar_url} alt={discussion.author_name} className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <AvatarFallback className="text-xs bg-emerald-100 text-emerald-700">{getInitials(discussion.author_name)}</AvatarFallback>
              )}
            </Avatar>
            <span>{discussion.author_name}</span>
            {discussion.author_avg_rating != null && (
              <span className="text-amber-600 inline-flex items-center gap-0.5"><Star className="w-3 h-3 fill-amber-400 text-amber-400" />{discussion.author_avg_rating}</span>
            )}
            <span>·</span>
            <span>{formatDate(discussion.created_at)}</span>
          </div>
        </CardContent>
      </Card>

      <Separator className="my-4" />

      <h2 className="font-semibold text-gray-700 mb-3">Comments ({comments.length})</h2>

      <div className="space-y-3 mb-4">
        {comments.map((c) => (
          <div key={c.id} className="flex gap-3">
            <Avatar className="w-8 h-8 mt-1">
              {c.author_avatar_url ? (
                <img src={c.author_avatar_url} alt={c.author_name} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <AvatarFallback className="text-xs bg-gray-100">{getInitials(c.author_name)}</AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1 bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">{c.author_name}</span>
                {c.author_avg_rating != null && (
                  <span className="text-xs text-amber-600 inline-flex items-center gap-0.5"><Star className="w-3 h-3 fill-amber-400 text-amber-400" />{c.author_avg_rating}</span>
                )}
                <span className="text-xs text-gray-400">{formatDate(c.created_at)}</span>
              </div>
              <p className="text-sm text-gray-600">{c.content}</p>
            </div>
          </div>
        ))}
        {comments.length === 0 && <p className="text-center text-gray-400 text-sm py-4">No comments yet</p>}
      </div>

      <div className="flex gap-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          className="flex-1"
          rows={2}
        />
        <Button onClick={handleComment} disabled={sending || !newComment.trim()} className="bg-emerald-600 hover:bg-emerald-700 self-end">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
