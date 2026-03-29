import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Star } from "lucide-react";

interface Conversation {
  user_id: number;
  user_name: string;
  user_avatar_url?: string;
  user_avg_rating?: number;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

export default function MessagesPage() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getConversations().then(setConversations).finally(() => setLoading(false));
  }, []);

  const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase();

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Messages</h1>

      {loading ? (
        <div className="text-center text-gray-400 py-12">Loading...</div>
      ) : conversations.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No conversations yet</p>
            <p className="text-gray-400 text-sm">Message a neighbor to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {conversations.map((c) => (
            <Card key={c.user_id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/messages/${c.user_id}`)}>
              <CardContent className="p-3 flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  {c.user_avatar_url ? (
                    <img src={c.user_avatar_url} alt={c.user_name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <AvatarFallback className="bg-emerald-100 text-emerald-700">{getInitials(c.user_name)}</AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm inline-flex items-center gap-1">
                      {c.user_name}
                      {c.user_avg_rating != null && (
                        <span className="text-xs text-amber-600 inline-flex items-center gap-0.5"><Star className="w-3 h-3 fill-amber-400 text-amber-400" />{c.user_avg_rating}</span>
                      )}
                    </span>
                    <span className="text-xs text-gray-400">{c.last_message_at ? formatDate(c.last_message_at) : ""}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{c.last_message}</p>
                </div>
                {c.unread_count > 0 && (
                  <Badge className="bg-emerald-600 text-white text-xs">{c.unread_count}</Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
