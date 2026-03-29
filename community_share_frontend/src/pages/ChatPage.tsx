import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Star } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  is_read: boolean;
  created_at: string;
  sender_name: string;
  receiver_name: string;
}

export default function ChatPage() {
  const { userId } = useParams<{ userId: string }>();
  const otherUserId = Number(userId);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [otherName, setOtherName] = useState("");
  const [otherAvatarUrl, setOtherAvatarUrl] = useState<string | null>(null);
  const [otherAvgRating, setOtherAvgRating] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    api.getUser(otherUserId).then((u) => {
      setOtherName(u.full_name);
      setOtherAvatarUrl(u.avatar_url || null);
      setOtherAvgRating(u.avg_rating ?? null);
    }).catch(() => {});
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [otherUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadMessages = async () => {
    try {
      const data = await api.getMessages(otherUserId);
      setMessages(data);
    } catch {
      // ignore
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    setSending(true);
    try {
      await api.sendMessage({ receiver_id: otherUserId, content: newMessage });
      setNewMessage("");
      loadMessages();
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-white">
        <Button variant="ghost" size="sm" onClick={() => navigate("/messages")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Avatar className="w-8 h-8">
          {otherAvatarUrl ? (
            <img src={otherAvatarUrl} alt={otherName} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <AvatarFallback className="text-xs bg-emerald-100 text-emerald-700">{otherName?.charAt(0)?.toUpperCase()}</AvatarFallback>
          )}
        </Avatar>
        <h1 className="font-semibold">{otherName || "Chat"}</h1>
        {otherAvgRating != null && (
          <span className="text-xs text-amber-600 inline-flex items-center gap-0.5"><Star className="w-3 h-3 fill-amber-400 text-amber-400" />{otherAvgRating}</span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.map((msg) => {
          const isMine = msg.sender_id === user?.id;
          return (
            <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-xs px-4 py-2 rounded-2xl ${isMine ? "bg-emerald-600 text-white" : "bg-white border"}`}>
                <p className="text-sm">{msg.content}</p>
                <p className={`text-xs mt-1 ${isMine ? "text-emerald-200" : "text-gray-400"}`}>{formatTime(msg.created_at)}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-white flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          className="flex-1"
        />
        <Button onClick={handleSend} disabled={sending || !newMessage.trim()} className="bg-emerald-600 hover:bg-emerald-700">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
