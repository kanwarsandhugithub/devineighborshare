import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Shield, Users, Trash2, Save, UserPlus, Check, X } from "lucide-react";

interface Member { id: number; full_name: string; email: string; avatar_url?: string; role: string; joined_at: string; }

interface Community {
  id: number; name: string; description: string; address: string;
  join_code: string; member_count: number; created_by: number;
}

export default function CommunityAdminPage() {
  const { id } = useParams<{ id: string }>();
  const communityId = Number(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [community, setCommunity] = useState<Community | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isAdmin = user?.is_super_admin || members.some((m) => m.id === user?.id && m.role === 'admin');

  useEffect(() => {
    loadData();
  }, [communityId]);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [comm, membersData, requestsData] = await Promise.all([
        api.getCommunity(communityId),
        api.getCommunityMembers(communityId),
        api.getJoinRequests(communityId),
      ]);
      setCommunity(comm);
      setJoinCode(comm.join_code);
      setMembers(membersData);
      setJoinRequests(requestsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load community");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateJoinCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.updateCommunity(communityId, { join_code: joinCode });
      setSuccess("Join code updated");
      if (community) setCommunity({ ...community, join_code: joinCode });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update join code");
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (requestId: number) => {
    try {
      await api.approveJoinRequest(requestId);
      setSuccess("Member approved");
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve");
    }
  };

  const handleDecline = async (requestId: number) => {
    try {
      await api.declineJoinRequest(requestId);
      setSuccess("Request declined");
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to decline");
    }
  };

  const handleRemoveMember = async (user_id: number, full_name: string) => {
    if (!confirm(`Remove ${full_name} from the community?`)) return;
    try {
      await api.removeMember(communityId, user_id);
      setSuccess("Member removed");
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure? This will delete the community and all its data. This cannot be undone.")) return;
    try {
      await api.deleteCommunity(communityId);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete community");
    }
  };

  if (loading) return <div className="p-4 text-center text-gray-400">Loading...</div>;
  if (!community) return <div className="p-4 text-center text-gray-400">Community not found</div>;
  if (!isAdmin) return <div className="p-4 text-center text-red-600">You are not an admin of this community</div>;

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/community/${communityId}`)}><ArrowLeft className="w-4 h-4" /></Button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            Admin: {community.name}
            <Badge className="bg-amber-100 text-amber-700 text-[10px]">
              <Shield className="w-3 h-3 mr-1" /> Admin
            </Badge>
          </h1>
          <p className="text-xs text-gray-400">{members.length} members · Code: {community.join_code}</p>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>}
      {success && <div className="bg-emerald-50 text-emerald-600 text-sm p-3 rounded-lg mb-4">{success}</div>}

      <Card className="mb-4">
        <CardContent className="p-4 space-y-4">
          <h2 className="font-semibold text-gray-700 flex items-center gap-2"><Shield className="w-4 h-4" /> Community Settings</h2>
          <form onSubmit={handleUpdateJoinCode} className="space-y-3">
            <div className="space-y-2">
              <Label>Join Code</Label>
              <div className="flex gap-2">
                <Input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="community-code" />
                <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700"><Save className="w-4 h-4 mr-1" /> Save</Button>
              </div>
              <p className="text-xs text-gray-400">Members use this code to request to join.</p>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardContent className="p-4 space-y-3">
          <h2 className="font-semibold text-gray-700 flex items-center gap-2"><UserPlus className="w-4 h-4" /> Join Requests</h2>
          {joinRequests.length === 0 ? (
            <p className="text-sm text-gray-400">No pending join requests</p>
          ) : (
            <div className="space-y-2">
              {joinRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between p-2 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {req.avatar_url ? (
                      <img src={req.avatar_url} alt={req.full_name} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <span className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs">{req.full_name?.charAt(0)?.toUpperCase()}</span>
                    )}
                    <div>
                      <p className="text-sm font-medium">{req.full_name}</p>
                      <p className="text-xs text-gray-400">{req.email}</p>
                      {req.message && <p className="text-xs text-gray-500 italic">{req.message}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleApprove(req.id)}><Check className="w-3 h-3" /></Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDecline(req.id)}><X className="w-3 h-3" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardContent className="p-4 space-y-3">
          <h2 className="font-semibold text-gray-700 flex items-center gap-2"><Users className="w-4 h-4" /> Members</h2>
          <div className="space-y-2">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-2 border rounded-lg">
                <div className="flex items-center gap-3">
                  {member.avatar_url ? (
                    <img src={member.avatar_url} alt={member.full_name} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <span className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs">{member.full_name?.charAt(0)?.toUpperCase()}</span>
                  )}
                  <div>
                    <p className="text-sm font-medium">{member.full_name} {member.id === user?.id && <span className="text-gray-400 font-normal text-xs">(you)</span>}</p>
                    <p className="text-xs text-gray-400">{member.email}</p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-2">
                  {member.role === 'admin' && <Badge className="bg-amber-100 text-amber-700 text-[10px]">Admin</Badge>}
                  {member.id !== user?.id && (
                    <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 h-7 px-2" onClick={() => handleRemoveMember(member.id, member.full_name)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-red-200">
        <CardContent className="p-4 space-y-3">
          <h2 className="font-semibold text-gray-700">Danger Zone</h2>
          <p className="text-sm text-gray-500">Delete this community and all its data. This cannot be undone.</p>
          <Button variant="destructive" onClick={handleDelete}><Trash2 className="w-4 h-4 mr-1" /> Delete Community</Button>
        </CardContent>
      </Card>
    </div>
  );
}
