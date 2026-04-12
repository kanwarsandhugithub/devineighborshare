import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, ArrowLeft, Shield, Copy, Check, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Community {
  id: number;
  name: string;
  description: string;
  address: string;
  join_code: string;
  member_count: number;
  created_by: number;
  created_at: string;
}

interface Member {
  id: number;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: string;
  joined_at: string;
}

export default function AdminPage() {
  const navigate = useNavigate();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [expandedCommunity, setExpandedCommunity] = useState<number | null>(null);
  const [members, setMembers] = useState<Record<number, Member[]>>({});
  const [loadingMembers, setLoadingMembers] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newAddress, setNewAddress] = useState("");

  useEffect(() => {
    loadAllCommunities();
  }, []);

  const loadAllCommunities = async () => {
    try {
      const data = await api.getAllCommunities();
      setCommunities(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load communities");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.createCommunity({ name: newName, description: newDescription, address: newAddress });
      setShowCreate(false);
      setNewName("");
      setNewDescription("");
      setNewAddress("");
      loadAllCommunities();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create community");
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const toggleMembers = async (communityId: number) => {
    if (expandedCommunity === communityId) {
      setExpandedCommunity(null);
      return;
    }
    setExpandedCommunity(communityId);
    if (!members[communityId]) {
      setLoadingMembers(communityId);
      try {
        const data = await api.getCommunityMembers(communityId);
        setMembers((prev) => ({ ...prev, [communityId]: data }));
      } catch {
        // ignore
      } finally {
        setLoadingMembers(null);
      }
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="p-1">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-emerald-600" /> Admin — All Communities
          </h1>
          <p className="text-sm text-gray-500">{communities.length} communities total</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-1" /> Create Community
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Community</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>}
              <div className="space-y-2">
                <Label>Community Name</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Maple Ridge HOA" required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="What is this community about?" />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={newAddress} onChange={(e) => setNewAddress(e.target.value)} placeholder="Community address" />
              </div>
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">Create Community</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Card className="mb-4">
          <CardContent className="py-4 text-center text-red-500 text-sm">{error}</CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center text-gray-400 py-12">Loading...</div>
      ) : communities.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-400">
            No communities created yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {communities.map((c) => (
            <Card key={c.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{c.name}</h3>
                    {c.description && (
                      <p className="text-sm text-gray-500 mt-0.5">{c.description}</p>
                    )}
                    {c.address && (
                      <p className="text-xs text-gray-400 mt-0.5">{c.address}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <Badge variant="outline" className="text-xs flex items-center gap-1">
                        <Users className="w-3 h-3" /> {c.member_count} {c.member_count === 1 ? "member" : "members"}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-400">Join Code:</span>
                        <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">{c.join_code}</code>
                        <button
                          onClick={() => handleCopyCode(c.join_code)}
                          className="text-gray-400 hover:text-emerald-600 transition-colors"
                          title="Copy join code"
                        >
                          {copiedCode === c.join_code ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      <span className="text-xs text-gray-400">
                        Created: {new Date(c.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Members toggle */}
                <button
                  onClick={() => toggleMembers(c.id)}
                  className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 mt-3 font-medium"
                >
                  {expandedCommunity === c.id ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                  {expandedCommunity === c.id ? "Hide Members" : "Show Members"}
                </button>

                {/* Members list */}
                {expandedCommunity === c.id && (
                  <div className="mt-3 border-t pt-3">
                    {loadingMembers === c.id ? (
                      <p className="text-xs text-gray-400 text-center py-2">Loading members...</p>
                    ) : members[c.id] && members[c.id].length > 0 ? (
                      <div className="space-y-2">
                        {members[c.id].map((m) => (
                          <div key={m.id} className="flex items-center gap-3 py-1.5">
                            {m.avatar_url ? (
                              <img src={m.avatar_url} alt={m.full_name} className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">
                                {m.full_name?.charAt(0)?.toUpperCase()}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm truncate">{m.full_name}</span>
                                {m.role === "admin" && (
                                  <Badge className="bg-emerald-100 text-emerald-700 text-xs px-1.5 py-0">Admin</Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-400 truncate">{m.email}</p>
                            </div>
                            <span className="text-xs text-gray-400 whitespace-nowrap">
                              Joined {new Date(m.joined_at).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 text-center py-2">No members found</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
