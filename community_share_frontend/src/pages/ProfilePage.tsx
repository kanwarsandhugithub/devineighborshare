import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Star, Edit, Check, X, Camera } from "lucide-react";

interface Review {
  id: number; reviewer_id: number; rating: number;
  comment: string; reviewer_name: string; reviewer_avatar_url?: string; reviewer_avg_rating?: number; created_at: string;
}

export default function ProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [form, setForm] = useState({ full_name: "", phone: "", bio: "" });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({ full_name: user.full_name, phone: user.phone || "", bio: user.bio || "" });
      api.getUserReviews(user.id).then(setReviews).catch(() => {});
    }
  }, [user]);

  const handleSave = async () => {
    try {
      await api.updateProfile(form);
      await refreshUser();
      setEditing(false);
    } catch {
      // ignore
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await api.uploadImage(file);
      await api.updateProfile({ avatar_url: url });
      await refreshUser();
    } catch {
      // ignore
    } finally {
      setUploading(false);
    }
  };

  const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase();

  if (!user) return null;

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Profile</h1>
        <Button variant="outline" size="sm" onClick={logout} className="text-red-600 border-red-200 hover:bg-red-50">
          Sign Out
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative group">
              <Avatar className="w-16 h-16">
                {user.avatar_url ? (
                  <AvatarImage src={user.avatar_url} alt={user.full_name} />
                ) : null}
                <AvatarFallback className="text-xl bg-emerald-100 text-emerald-700">{getInitials(user.full_name)}</AvatarFallback>
              </Avatar>
              <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                {uploading ? (
                  <span className="text-white text-xs">...</span>
                ) : (
                  <Camera className="w-5 h-5 text-white" />
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
              </label>
            </div>
            <div>
              <h2 className="text-xl font-semibold">{user.full_name}</h2>
              <p className="text-sm text-gray-500">{user.email}</p>
              {user.avg_rating && (
                <div className="flex items-center gap-1 mt-1">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span className="text-sm font-medium">{user.avg_rating}</span>
                </div>
              )}
            </div>
            {!editing && (
              <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setEditing(true)}>
                <Edit className="w-4 h-4" />
              </Button>
            )}
          </div>

          {editing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="555-0123" />
              </div>
              <div className="space-y-2">
                <Label>Bio</Label>
                <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Tell your neighbors about yourself" rows={3} />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700"><Check className="w-4 h-4 mr-1" /> Save</Button>
                <Button variant="outline" onClick={() => setEditing(false)}><X className="w-4 h-4 mr-1" /> Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-sm text-gray-600">
              {user.phone && <p><span className="text-gray-400">Phone:</span> {user.phone}</p>}
              {user.bio && <p><span className="text-gray-400">Bio:</span> {user.bio}</p>}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator className="my-4" />

      <h2 className="font-semibold text-gray-700 mb-3">Reviews ({reviews.length})</h2>
      {reviews.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-4">No reviews yet</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Avatar className="w-6 h-6">
                    {r.reviewer_avatar_url ? (
                      <AvatarImage src={r.reviewer_avatar_url} alt={r.reviewer_name} />
                    ) : null}
                    <AvatarFallback className="text-xs bg-gray-100">{getInitials(r.reviewer_name)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{r.reviewer_name}</span>
                  <div className="flex items-center gap-0.5 ml-auto">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-3 h-3 ${i < r.rating ? "text-amber-500 fill-amber-500" : "text-gray-200"}`} />
                    ))}
                  </div>
                </div>
                {r.comment && <p className="text-sm text-gray-600">{r.comment}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
