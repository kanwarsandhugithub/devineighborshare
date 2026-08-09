import { useState, useEffect } from "react";
import { api } from "../api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Handshake, Check, X, Trash2, Star } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const TASK_CATEGORIES = ["moving", "assembly", "cleaning", "errands", "yard work", "pet care", "other"];

interface Task {
  id: number;
  title: string;
  description: string;
  category: string;
  people_needed: number;
  location: string;
  scheduled_date: string;
  compensation: string;
  status: string;
  requester_id: number;
  requester_name: string;
  requester_avatar_url?: string;
  requester_avg_rating?: number;
  community_id: number;
  created_at: string;
  approved_count: number;
  pending_count: number;
}

interface Offer {
  id: number;
  task_request_id: number;
  helper_id: number;
  helper_name: string;
  helper_avatar_url?: string;
  helper_avg_rating?: number;
  status: string;
  message: string;
  created_at: string;
}

interface TasksTabProps {
  communityId: number;
}

export default function TasksTab({ communityId }: TasksTabProps) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    category: "moving",
    people_needed: 1,
    location: "",
    scheduled_date: "",
    compensation: "",
  });
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [offerMessage, setOfferMessage] = useState("");
  const [error, setError] = useState("");

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await api.getCommunityTasks(communityId);
      setTasks(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [communityId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.createTask({ ...newTask, community_id: communityId });
      setShowAdd(false);
      setNewTask({ title: "", description: "", category: "moving", people_needed: 1, location: "", scheduled_date: "", compensation: "" });
      loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    }
  };

  const handleDelete = async (taskId: number) => {
    if (!confirm("Delete this help request?")) return;
    try {
      await api.deleteTask(taskId);
      loadTasks();
      setSelectedTask(null);
    } catch {
      alert("Failed to delete");
    }
  };

  const openTask = async (task: Task) => {
    setSelectedTask(task);
    setOfferMessage("");
    setOffers([]);
    try {
      const data = await api.getTaskOffers(task.id);
      setOffers(data);
    } catch {
      // ignore
    }
  };

  const handleOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    setError("");
    try {
      await api.createTaskOffer(selectedTask.id, { message: offerMessage });
      setOfferMessage("");
      const data = await api.getTaskOffers(selectedTask.id);
      setOffers(data);
      loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to offer help");
    }
  };

  const updateOffer = async (offerId: number, status: string) => {
    try {
      await api.updateTaskOffer(offerId, { status });
      if (!selectedTask) return;
      const data = await api.getTaskOffers(selectedTask.id);
      setOffers(data);
      loadTasks();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update offer");
    }
  };

  const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase();

  const myPendingOffer = offers.find((o) => o.helper_id === user?.id);

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold text-gray-700">Help Requests</h2>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-1" /> Ask for Help</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Ask for Help</DialogTitle></DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>}
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} placeholder="Help moving a couch" required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} placeholder="Need 2 people to move a couch down 2 flights of stairs" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <select className="w-full border rounded-md p-2 text-sm" value={newTask.category} onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}>
                    {TASK_CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>People Needed</Label>
                  <Input type="number" min="1" value={newTask.people_needed} onChange={(e) => setNewTask({ ...newTask, people_needed: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date/Time</Label>
                  <Input value={newTask.scheduled_date} onChange={(e) => setNewTask({ ...newTask, scheduled_date: e.target.value })} placeholder="Saturday 10am" />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input value={newTask.location} onChange={(e) => setNewTask({ ...newTask, location: e.target.value })} placeholder="Building A, Apt 4B" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Compensation</Label>
                <Input value={newTask.compensation} onChange={(e) => setNewTask({ ...newTask, compensation: e.target.value })} placeholder="Pizza and beer" />
              </div>
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">Post Request</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-4">Loading...</p>
      ) : tasks.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-4">No help requests yet</p>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Card key={task.id} className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={() => openTask(task)}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 flex-shrink-0">
                    <Handshake className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm line-clamp-1">{task.title}</h3>
                        <Badge className="text-[10px] bg-orange-100 text-orange-700 hover:bg-orange-100">{task.category}</Badge>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Avatar className="w-6 h-6">
                          {task.requester_avatar_url ? <AvatarImage src={task.requester_avatar_url} alt={task.requester_name} /> : null}
                          <AvatarFallback className="text-[10px] bg-emerald-100 text-emerald-700">{getInitials(task.requester_name)}</AvatarFallback>
                        </Avatar>
                        {task.requester_avg_rating != null && (
                          <span className="text-[10px] text-amber-600 inline-flex items-center gap-0.5"><Star className="w-3 h-3 fill-amber-400 text-amber-400" />{task.requester_avg_rating}</span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-1">{task.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span>{task.people_needed} needed</span>
                      {task.scheduled_date && <span>{task.scheduled_date}</span>}
                      {task.compensation && <span>{task.compensation}</span>}
                      <span>{task.approved_count} helping · {task.pending_count} pending</span>
                      {task.status !== "open" && (
                        <Badge className="text-[10px] bg-gray-100 text-gray-700 hover:bg-gray-100">{task.status}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedTask?.title}</DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Avatar className="w-8 h-8">
                  {selectedTask.requester_avatar_url ? <AvatarImage src={selectedTask.requester_avatar_url} alt={selectedTask.requester_name} /> : null}
                  <AvatarFallback className="text-xs bg-emerald-100 text-emerald-700">{getInitials(selectedTask.requester_name)}</AvatarFallback>
                </Avatar>
                <span className="font-medium">{selectedTask.requester_name}</span>
                {selectedTask.requester_avg_rating != null && (
                  <span className="text-amber-600 inline-flex items-center gap-0.5"><Star className="w-4 h-4 fill-amber-400 text-amber-400" />{selectedTask.requester_avg_rating}</span>
                )}
              </div>
              <p className="text-sm text-gray-600">{selectedTask.description}</p>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-500">
                <p><span className="text-gray-400">Category:</span> {selectedTask.category}</p>
                <p><span className="text-gray-400">Needed:</span> {selectedTask.people_needed}</p>
                {selectedTask.location && <p><span className="text-gray-400">Location:</span> {selectedTask.location}</p>}
                {selectedTask.scheduled_date && <p><span className="text-gray-400">When:</span> {selectedTask.scheduled_date}</p>}
                {selectedTask.compensation && <p className="col-span-2"><span className="text-gray-400">Compensation:</span> {selectedTask.compensation}</p>}
              </div>

              {selectedTask.requester_id === user?.id ? (
                <>
                  <h4 className="font-semibold text-sm">Offers ({offers.length})</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {offers.length === 0 ? (
                      <p className="text-sm text-gray-400">No offers yet</p>
                    ) : (
                      offers.map((offer) => (
                        <div key={offer.id} className="flex items-center justify-between p-2 border rounded-lg">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-7 h-7">
                              {offer.helper_avatar_url ? <AvatarImage src={offer.helper_avatar_url} alt={offer.helper_name} /> : null}
                              <AvatarFallback className="text-[10px] bg-gray-100">{getInitials(offer.helper_name)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{offer.helper_name}</p>
                              {offer.helper_avg_rating != null && <p className="text-xs text-amber-600 flex items-center gap-0.5"><Star className="w-3 h-3 fill-amber-400" />{offer.helper_avg_rating}</p>}
                              {offer.message && <p className="text-xs text-gray-500 line-clamp-2">{offer.message}</p>}
                            </div>
                          </div>
                          {offer.status === "pending" ? (
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" onClick={() => updateOffer(offer.id, "approved")}><Check className="w-3 h-3" /></Button>
                              <Button size="sm" variant="outline" onClick={() => updateOffer(offer.id, "declined")}><X className="w-3 h-3" /></Button>
                            </div>
                          ) : (
                            <Badge className={`text-[10px] ${offer.status === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700"}`}>{offer.status}</Badge>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleDelete(selectedTask.id)}>
                    <Trash2 className="w-4 h-4 mr-1" /> Delete Request
                  </Button>
                </>
              ) : (
                <>
                  {myPendingOffer ? (
                    <div className="bg-blue-50 text-blue-700 text-sm p-3 rounded-lg">
                      You offered to help. Status: <span className="font-semibold">{myPendingOffer.status}</span>
                    </div>
                  ) : selectedTask.status === "open" ? (
                    <form onSubmit={handleOffer} className="space-y-2">
                      {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>}
                      <Label className="text-sm">Offer to help</Label>
                      <Textarea value={offerMessage} onChange={(e) => setOfferMessage(e.target.value)} placeholder="I can help Saturday morning" />
                      <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700"><Handshake className="w-4 h-4 mr-1" /> I Can Help</Button>
                    </form>
                  ) : (
                    <p className="text-sm text-gray-400">This request is no longer accepting offers.</p>
                  )}
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
