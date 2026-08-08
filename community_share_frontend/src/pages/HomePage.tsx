import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Users, LogIn, Package, Wrench, Clock, CheckCircle, XCircle, RotateCcw, ArrowRight, Send, MessageSquare, Star, Search, X, Shield } from "lucide-react";

const ITEM_CATEGORIES = ["tools", "electronics", "outdoor", "kitchen", "sports", "other"];
const SERVICE_CATEGORIES = ["transportation", "handyman", "cleaning", "tutoring", "pet care", "other"];

interface Community {
  id: number; name: string; description: string; address: string;
  join_code: string; member_count: number;
}

interface Item {
  id: number; title: string; description: string; category: string;
  price_per_day: number; image_url: string | null; image_urls: string[]; is_available: boolean;
  owner_id: number; owner_name: string; owner_avatar_url?: string; owner_avg_rating?: number; created_at: string;
}

interface Service {
  id: number; title: string; description: string; category: string;
  price: number; is_available: boolean; provider_id: number;
  provider_name: string; provider_avatar_url?: string; provider_avg_rating?: number; created_at: string;
}

interface RentalRequest {
  id: number; item_id: number; item_title: string; requester_id: number;
  requester_name: string; owner_id?: number; owner_name?: string;
  requester_avatar_url?: string; requester_avg_rating?: number;
  start_date: string; end_date: string;
  message: string; status: string; created_at: string;
}

interface ServiceBooking {
  id: number; service_id: number; service_title: string; requester_id: number;
  requester_name: string; provider_id?: number; provider_name?: string;
  requester_avatar_url?: string; requester_avg_rating?: number;
  scheduled_date: string; message: string;
  status: string; created_at: string;
}

interface Review {
  id: number; reviewer_id: number; rental_id?: number; booking_id?: number;
}

const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  pending: { color: "bg-amber-100 text-amber-700", icon: <Clock className="w-3 h-3" />, label: "Pending" },
  approved: { color: "bg-blue-100 text-blue-700", icon: <CheckCircle className="w-3 h-3" />, label: "Approved" },
  rejected: { color: "bg-red-100 text-red-700", icon: <XCircle className="w-3 h-3" />, label: "Rejected" },
  returned: { color: "bg-emerald-100 text-emerald-700", icon: <RotateCcw className="w-3 h-3" />, label: "Returned" },
  completed: { color: "bg-emerald-100 text-emerald-700", icon: <CheckCircle className="w-3 h-3" />, label: "Completed" },
};

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.pending;
  return (
    <Badge className={`${config.color} text-xs flex items-center gap-1`}>
      {config.icon} {config.label}
    </Badge>
  );
}

function StarRating({ rating, onRate }: { rating: number; onRate?: (r: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`w-6 h-6 ${s <= rating ? "fill-amber-400 text-amber-400" : "text-gray-300"} ${onRate ? "cursor-pointer hover:text-amber-400" : ""}`}
          onClick={() => onRate?.(s)} />
      ))}
    </div>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [newCommunity, setNewCommunity] = useState({ name: "", description: "", address: "" });
  const [error, setError] = useState("");

  const [selectedCommunityId, setSelectedCommunityId] = useState<number | null>(() => {
    const saved = localStorage.getItem('selectedCommunityId');
    return saved ? parseInt(saved, 10) : null;
  });
  const [items, setItems] = useState<Item[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [rentals, setRentals] = useState<RentalRequest[]>([]);
  const [bookings, setBookings] = useState<ServiceBooking[]>([]);

  const [showRentDialog, setShowRentDialog] = useState(false);
  const [showBookDialog, setShowBookDialog] = useState(false);
  const [showWaiverDialog, setShowWaiverDialog] = useState(false);
  const [waiverType, setWaiverType] = useState<"rental" | "booking" | null>(null);
  const [selectedItem] = useState<Item | null>(null);
  const [selectedService] = useState<Service | null>(null);
  const [rentalForm, setRentalForm] = useState({ start_date: "", end_date: "", message: "" });

  // Handle URL parameters for create dialogs
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const createType = params.get('create');
    if (createType === 'item' || createType === 'service') {
      // These are handled on the CommunityPage now
      // Clear the URL parameter
      navigate(location.pathname, { replace: true });
    }
  }, [location.search, navigate]);

  const handleListItem = () => {
    if (selectedCommunityId) {
      navigate(`/community/${selectedCommunityId}?add=item`);
    } else {
      alert("Please select a community first");
    }
    setShowCreateMenu(false);
  };

  const handlePostService = () => {
    if (selectedCommunityId) {
      navigate(`/community/${selectedCommunityId}?add=service`);
    } else {
      alert("Please select a community first");
    }
    setShowCreateMenu(false);
  };

  const handleAskFavor = () => {
    setShowCreateMenu(false);
    setRequestType("item");
    setShowRequestDialog(true);
  };

  const handleCommunityPost = () => {
    setShowCreateMenu(false);
    setRequestType("community");
    setShowRequestDialog(true);
  };
  const [bookingForm, setBookingForm] = useState({ scheduled_date: "", message: "" });
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [ratingTarget, setRatingTarget] = useState<{
    reviewed_user_id: number; reviewed_user_name: string;
    rental_id?: number; booking_id?: number; item_id?: number; service_id?: number; label: string;
  } | null>(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Edit item state
  const [showEditItem, setShowEditItem] = useState(false);
  const [editItem] = useState<Item | null>(null);
  const [editItemForm, setEditItemForm] = useState({ title: "", description: "", category: "", price_per_day: 0 });

  // Edit service state
  const [showEditService, setShowEditService] = useState(false);
  const [editService] = useState<Service | null>(null);
  const [editServiceForm, setEditServiceForm] = useState({ title: "", description: "", category: "", price: 0 });
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [requestType, setRequestType] = useState<"item" | "service" | "community" | null>(null);
  const [requestForm, setRequestForm] = useState({ title: "", description: "" });

  useEffect(() => {
    loadCommunities();
  }, []);

  const loadCommunities = async () => {
    try {
      const data = await api.getMyCommunities();
      setCommunities(data);
      if (data.length > 0) {
        const savedId = localStorage.getItem('selectedCommunityId');
        const savedParsed = savedId ? parseInt(savedId, 10) : null;
        const initialId = (savedParsed && data.some((c: Community) => c.id === savedParsed))
          ? savedParsed
          : data[0].id;
        setSelectedCommunityId(initialId);
        localStorage.setItem('selectedCommunityId', String(initialId));
        loadCommunityData(initialId);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const loadCommunityData = async (communityId: number) => {
    try {
      const [itemsData, servicesData, rentalsData, bookingsData, reviewsData] = await Promise.all([
        api.getCommunityItems(communityId),
        api.getCommunityServices(communityId),
        api.getMyRentals(),
        api.getMyBookings(),
        api.getMyReviews(),
      ]);
      setItems(itemsData);
      setServices(servicesData);
      setRentals(rentalsData);
      setBookings(bookingsData);
      setMyReviews(reviewsData);
    } catch {
      // ignore
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.createCommunity(newCommunity);
      setShowCreate(false);
      setNewCommunity({ name: "", description: "", address: "" });
      loadCommunities();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.joinCommunity(joinCode);
      setShowJoin(false);
      setJoinCode("");
      loadCommunities();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join");
    }
  };

  const handleRent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    setShowRentDialog(false);
    setWaiverType("rental");
    setShowWaiverDialog(true);
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;
    setShowBookDialog(false);
    setWaiverType("booking");
    setShowWaiverDialog(true);
  };

  const handleWaiverAccept = async () => {
    try {
      if (waiverType === "rental" && selectedItem) {
        await api.createRental({ item_id: selectedItem.id, ...rentalForm });
        setRentalForm({ start_date: "", end_date: "", message: "" });
      } else if (waiverType === "booking" && selectedService) {
        await api.createBooking({ service_id: selectedService.id, ...bookingForm });
        setBookingForm({ scheduled_date: "", message: "" });
      }
      setShowWaiverDialog(false);
      setWaiverType(null);
      if (selectedCommunityId) loadCommunityData(selectedCommunityId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  };

  const handleWaiverCancel = () => {
    setShowWaiverDialog(false);
    setWaiverType(null);
    // Reopen the original dialog
    if (waiverType === "rental") {
      setShowRentDialog(true);
    } else if (waiverType === "booking") {
      setShowBookDialog(true);
    }
  };

  const handleUpdateRental = async (id: number, status: string) => {
    try {
      await api.updateRental(id, status);
      if (selectedCommunityId) loadCommunityData(selectedCommunityId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update");
    }
  };

  const handleUpdateBooking = async (id: number, status: string) => {
    try {
      await api.updateBooking(id, status);
      if (selectedCommunityId) loadCommunityData(selectedCommunityId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update");
    }
  };

  const openRatingDialog = (target: typeof ratingTarget) => {
    setRatingTarget(target);
    setRatingValue(0);
    setRatingComment("");
    setShowRatingDialog(true);
  };

  const handleSubmitRating = async () => {
    if (!ratingTarget || ratingValue === 0) return;
    try {
      await api.createReview({
        reviewed_user_id: ratingTarget.reviewed_user_id,
        rating: ratingValue, comment: ratingComment,
        item_id: ratingTarget.item_id, service_id: ratingTarget.service_id,
        rental_id: ratingTarget.rental_id, booking_id: ratingTarget.booking_id,
      });
      setShowRatingDialog(false);
      if (selectedCommunityId) loadCommunityData(selectedCommunityId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to submit review");
    }
  };

  const handleEditItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    try {
      await api.updateItem(editItem.id, editItemForm);
      setShowEditItem(false);
      if (selectedCommunityId) loadCommunityData(selectedCommunityId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update item");
    }
  };

  const handleEditService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editService) return;
    try {
      await api.updateService(editService.id, editServiceForm);
      setShowEditService(false);
      if (selectedCommunityId) loadCommunityData(selectedCommunityId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update service");
    }
  };

  const hasReviewedRental = (rentalId: number) => myReviews.some((r) => r.rental_id === rentalId);
  const hasReviewedBooking = (bookingId: number) => myReviews.some((r) => r.booking_id === bookingId);

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCommunityId || !requestType) return;
    try {
      let category, titlePrefix;
      if (requestType === "item") {
        category = "item-request";
        titlePrefix = "Looking for: ";
      } else if (requestType === "service") {
        category = "service-request";
        titlePrefix = "Requesting service: ";
      } else if (requestType === "community") {
        category = "general";
        titlePrefix = "";
      } else {
        return;
      }
      await api.createDiscussion({
        community_id: selectedCommunityId,
        title: titlePrefix + requestForm.title,
        content: requestForm.description,
        category: category,
      });
      setShowRequestDialog(false);
      setRequestForm({ title: "", description: "" });
      setRequestType(null);
      // Navigate to community discussions
      navigate(`/community/${selectedCommunityId}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create request");
    }
  };

  const myRentalRequests = rentals.filter((r) => r.requester_id === user?.id);
  const incomingRentalRequests = rentals.filter((r) => r.requester_id !== user?.id);
  const myServiceBookings = bookings.filter((b) => b.requester_id === user?.id);
  const incomingServiceBookings = bookings.filter((b) => b.requester_id !== user?.id);

  const q = searchQuery.toLowerCase().trim();
  const filteredItems = q ? items.filter((item) => 
    item.title.toLowerCase().includes(q) || 
    (item.description && item.description.toLowerCase().includes(q)) || 
    item.category.toLowerCase().includes(q) || 
    (item.owner_name && item.owner_name.toLowerCase().includes(q))
  ) : items;
  const filteredServices = q ? services.filter((svc) => 
    svc.title.toLowerCase().includes(q) || 
    (svc.description && svc.description.toLowerCase().includes(q)) || 
    svc.category.toLowerCase().includes(q) || 
    (svc.provider_name && svc.provider_name.toLowerCase().includes(q))
  ) : services;
  // Sort by popularity (owner/provider rating) descending and take top 9
  const popularItems = [...filteredItems].sort((a, b) => (b.owner_avg_rating || 0) - (a.owner_avg_rating || 0)).slice(0, 9);
  const popularServices = [...filteredServices].sort((a, b) => (b.provider_avg_rating || 0) - (a.provider_avg_rating || 0)).slice(0, 9);
  const primaryCommunity = communities.find((c) => c.id === selectedCommunityId) || (communities.length > 0 ? communities[0] : null);

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          {primaryCommunity ? (
            <div>
              <button 
                onClick={() => navigate(`/community/${primaryCommunity.id}`)}
                className="text-left"
              >
                <h1 className="text-2xl font-bold text-gray-900 hover:text-emerald-600 transition-colors">{primaryCommunity.name}</h1>
              </button>
              <p className="text-gray-500 text-sm flex items-center gap-1">
                <Users className="w-3 h-3" /> {primaryCommunity.member_count} members · Hi, {user?.full_name}!
              </p>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Home</h1>
              <p className="text-gray-500 text-sm">Hi, {user?.full_name}!</p>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {user?.is_super_admin && (
            <Button variant="outline" size="sm" onClick={() => navigate("/admin")} title="Admin">
              <Shield className="w-4 h-4" />
            </Button>
          )}
          <Dialog open={showJoin} onOpenChange={setShowJoin}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><LogIn className="w-4 h-4 mr-1" /> Join</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Join a Community</DialogTitle></DialogHeader>
              <form onSubmit={handleJoin} className="space-y-4">
                {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>}
                <div className="space-y-2">
                  <Label>Join Code</Label>
                  <Input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="Enter community code" required />
                </div>
                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">Join Community</Button>
              </form>
            </DialogContent>
          </Dialog>

          <div className="relative inline-block">
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => setShowCreateMenu(!showCreateMenu)}
            >
              <Plus className="w-4 h-4" />
            </Button>
            {showCreateMenu && (
              <div className="absolute right-0 top-10 w-56 bg-white rounded-lg shadow-lg border z-50 py-1">
                <button
                  onClick={handleListItem}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 text-sm"
                >
                  <Package className="w-4 h-4 text-emerald-600" />
                  List an Item
                </button>
                <button
                  onClick={handlePostService}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 text-sm"
                >
                  <Wrench className="w-4 h-4 text-blue-600" />
                  Post a Service
                </button>
                <button
                  onClick={handleAskFavor}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 text-sm"
                >
                  <Send className="w-4 h-4 text-purple-600" />
                  Ask a Favor
                </button>
                <button
                  onClick={handleCommunityPost}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 text-sm"
                >
                  <MessageSquare className="w-4 h-4 text-orange-600" />
                  Community Post
                </button>
              </div>
            )}
          </div>

          {user?.email === "kanwarsandhu@gmail.com" && (
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-1" /> Create</Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Community</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>}
                <div className="space-y-2">
                  <Label>Community Name</Label>
                  <Input value={newCommunity.name} onChange={(e) => setNewCommunity({ ...newCommunity, name: e.target.value })} placeholder="Sunset Hills HOA" required />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={newCommunity.description} onChange={(e) => setNewCommunity({ ...newCommunity, description: e.target.value })} placeholder="Tell neighbors about your community" />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input value={newCommunity.address} onChange={(e) => setNewCommunity({ ...newCommunity, address: e.target.value })} placeholder="123 Main St" />
                </div>
                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">Create Community</Button>
              </form>
            </DialogContent>
          </Dialog>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-12">Loading...</div>
      ) : communities.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No communities yet</p>
            <p className="text-gray-400 text-sm">Create a new community or join one with a code</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Community Switcher */}
          {communities.length > 1 && (
            <div className="flex items-center gap-2">
              <select
                value={selectedCommunityId || ""}
                onChange={(e) => {
                  const id = parseInt(e.target.value);
                  setSelectedCommunityId(id);
                  localStorage.setItem('selectedCommunityId', String(id));
                  loadCommunityData(id);
                }}
                className="text-sm border border-gray-200 rounded px-2 py-1 bg-white flex-1"
              >
                {communities.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items and services..."
              className="pl-9 pr-9 h-10 bg-white border-gray-200"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Items Panel */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-gray-700 flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-600" /> Items for Rent
              </h2>
              <div className="flex gap-1">
                {primaryCommunity && (
                  <Button size="sm" variant="ghost" className="text-xs text-emerald-600" onClick={() => navigate(`/community/${primaryCommunity.id}`)}>
                    View All <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                )}
                <Button size="sm" variant="outline" className="text-xs" onClick={() => { setRequestType("item"); setShowRequestDialog(true); }}>
                  <Plus className="w-3 h-3 mr-1" /> Request
                </Button>
              </div>
            </div>
            {popularItems.length === 0 ? (
              <Card><CardContent className="py-4 text-center text-gray-400 text-sm">{q ? "No items match your search" : "No items listed yet"}</CardContent></Card>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {popularItems.map((item) => (
                  <Card 
                    key={item.id} 
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/community/${selectedCommunityId}`)}
                  >
                    <CardContent className="p-2">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.title} className="w-full h-20 object-cover rounded-lg mb-1" />
                      ) : (
                        <div className="w-full h-20 bg-gray-100 rounded-lg mb-1 flex items-center justify-center text-gray-400">
                          <Package className="w-6 h-6" />
                        </div>
                      )}
                      <h3 className="font-semibold text-xs line-clamp-1" title={item.title}>{item.title}</h3>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-emerald-600 font-medium">${item.price_per_day}</span>
                        {item.owner_avg_rating != null && (
                          <span className="text-amber-600 text-xs inline-flex items-center gap-0.5"><Star className="w-3 h-3 fill-amber-400 text-amber-400" />{item.owner_avg_rating}</span>
                        )}
                      </div>
                      <Badge variant={item.is_available ? "default" : "secondary"} className={item.is_available ? "bg-emerald-100 text-emerald-700 text-[10px] mt-1 w-full justify-center" : "text-[10px] mt-1 w-full justify-center"}>
                        {item.is_available ? "Available" : "Rented"}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Services Panel */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-gray-700 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-blue-600" /> Services Offered
              </h2>
              <div className="flex gap-1">
                {primaryCommunity && (
                  <Button size="sm" variant="ghost" className="text-xs text-blue-600" onClick={() => navigate(`/community/${primaryCommunity.id}`)}>
                    View All <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                )}
                <Button size="sm" variant="outline" className="text-xs" onClick={() => { setRequestType("service"); setShowRequestDialog(true); }}>
                  <Plus className="w-3 h-3 mr-1" /> Request
                </Button>
              </div>
            </div>
            {popularServices.length === 0 ? (
              <Card><CardContent className="py-4 text-center text-gray-400 text-sm">{q ? "No services match your search" : "No services offered yet"}</CardContent></Card>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {popularServices.map((svc) => (
                  <Card 
                    key={svc.id} 
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/community/${selectedCommunityId}`)}
                  >
                    <CardContent className="p-2">
                      <div className="w-full h-20 bg-blue-50 rounded-lg mb-1 flex items-center justify-center text-blue-400">
                        <Wrench className="w-6 h-6" />
                      </div>
                      <h3 className="font-semibold text-xs line-clamp-1" title={svc.title}>{svc.title}</h3>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-blue-600 font-medium">${svc.price}</span>
                        {svc.provider_avg_rating != null && (
                          <span className="text-amber-600 text-xs inline-flex items-center gap-0.5"><Star className="w-3 h-3 fill-amber-400 text-amber-400" />{svc.provider_avg_rating}</span>
                        )}
                      </div>
                      <Badge variant={svc.is_available ? "default" : "secondary"} className={svc.is_available ? "bg-blue-100 text-blue-700 text-[10px] mt-1 w-full justify-center" : "text-[10px] mt-1 w-full justify-center"}>
                        {svc.is_available ? "Available" : "Booked"}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Sent Requests Panel */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-gray-700 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" /> My Sent Requests
              </h2>
              <Button size="sm" variant="ghost" className="text-xs text-gray-600" onClick={() => navigate("/requests")}>
                Manage All <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
            {myRentalRequests.length === 0 && myServiceBookings.length === 0 ? (
              <Card><CardContent className="py-4 text-center text-gray-400 text-sm">No requests sent yet</CardContent></Card>
            ) : (
              <div className="space-y-2">
                {myRentalRequests.slice(0, 3).map((r) => (
                  <Card key={`r-${r.id}`}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Package className="w-3 h-3 text-gray-400" />
                          <span className="font-medium text-sm">{r.item_title}</span>
                          <StatusBadge status={r.status} />
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{r.start_date} to {r.end_date}</p>
                      </div>
                      {r.status === "returned" && r.owner_id && !hasReviewedRental(r.id) && (
                        <Button size="sm" variant="outline" className="text-xs text-amber-600 border-amber-300 hover:bg-amber-50 ml-2 h-7"
                          onClick={() => openRatingDialog({ reviewed_user_id: r.owner_id!, reviewed_user_name: r.owner_name || "Owner", rental_id: r.id, item_id: r.item_id, label: `Rate owner for "${r.item_title}"` })}>
                          <Star className="w-3 h-3 mr-1" /> Rate
                        </Button>
                      )}
                      {r.status === "returned" && hasReviewedRental(r.id) && (
                        <Badge className="bg-amber-100 text-amber-700 text-xs ml-2"><Star className="w-3 h-3 mr-0.5 fill-amber-400" /> Rated</Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {myServiceBookings.slice(0, 3).map((b) => (
                  <Card key={`b-${b.id}`}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Wrench className="w-3 h-3 text-gray-400" />
                          <span className="font-medium text-sm">{b.service_title}</span>
                          <StatusBadge status={b.status} />
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">Scheduled: {b.scheduled_date}</p>
                      </div>
                      {b.status === "completed" && b.provider_id && !hasReviewedBooking(b.id) && (
                        <Button size="sm" variant="outline" className="text-xs text-amber-600 border-amber-300 hover:bg-amber-50 ml-2 h-7"
                          onClick={() => openRatingDialog({ reviewed_user_id: b.provider_id!, reviewed_user_name: b.provider_name || "Provider", booking_id: b.id, service_id: b.service_id, label: `Rate provider for "${b.service_title}"` })}>
                          <Star className="w-3 h-3 mr-1" /> Rate
                        </Button>
                      )}
                      {b.status === "completed" && hasReviewedBooking(b.id) && (
                        <Badge className="bg-amber-100 text-amber-700 text-xs ml-2"><Star className="w-3 h-3 mr-0.5 fill-amber-400" /> Rated</Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Incoming Requests Panel */}
          {(incomingRentalRequests.length > 0 || incomingServiceBookings.length > 0) && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold text-gray-700 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" /> Received Requests
                </h2>
                <Button size="sm" variant="ghost" className="text-xs text-gray-600" onClick={() => navigate("/requests")}>
                  Manage All <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
              <div className="space-y-2">
                {incomingRentalRequests.slice(0, 3).map((r) => (
                  <Card key={`ir-${r.id}`}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Package className="w-3 h-3 text-gray-400" />
                            <span className="font-medium text-sm">{r.item_title}</span>
                            <StatusBadge status={r.status} />
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <button 
                              onClick={() => navigate(`/profile/${r.requester_id}`)}
                              className="flex items-center gap-1.5 hover:opacity-70 transition-opacity"
                            >
                              {r.requester_avatar_url ? (
                                <img src={r.requester_avatar_url} alt={r.requester_name} className="w-5 h-5 rounded-full object-cover border border-gray-200" />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500" style={{fontSize: '0.6rem'}}>
                                  {r.requester_name?.charAt(0)?.toUpperCase()}
                                </div>
                              )}
                              <span className="text-xs text-gray-500 hover:text-emerald-600">{r.requester_name}</span>
                            </button>
                            {r.requester_avg_rating != null && (
                              <span className="text-xs text-amber-600 inline-flex items-center gap-0.5">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {r.requester_avg_rating}
                              </span>
                            )}
                            <span className="text-xs text-gray-400">· {r.start_date} to {r.end_date}</span>
                          </div>
                        </div>
                        <div className="flex gap-1 ml-2">
                          {r.status === "pending" && (
                            <>
                              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs h-7 px-2" onClick={() => handleUpdateRental(r.id, "approved")}>
                                Approve
                              </Button>
                              <Button size="sm" variant="destructive" className="text-xs h-7 px-2" onClick={() => handleUpdateRental(r.id, "rejected")}>
                                Reject
                              </Button>
                            </>
                          )}
                          {r.status === "approved" && (
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-xs h-7 px-2" onClick={() => handleUpdateRental(r.id, "returned")}>
                              <RotateCcw className="w-3 h-3 mr-1" /> Returned
                            </Button>
                          )}
                          {r.status === "returned" && !hasReviewedRental(r.id) && (
                            <Button size="sm" variant="outline" className="text-xs text-amber-600 border-amber-300 hover:bg-amber-50 h-7 px-2"
                              onClick={() => openRatingDialog({ reviewed_user_id: r.requester_id, reviewed_user_name: r.requester_name, rental_id: r.id, item_id: r.item_id, label: `Rate borrower "${r.requester_name}"` })}>
                              <Star className="w-3 h-3 mr-1" /> Rate
                            </Button>
                          )}
                          {r.status === "returned" && hasReviewedRental(r.id) && (
                            <Badge className="bg-amber-100 text-amber-700 text-xs"><Star className="w-3 h-3 mr-0.5 fill-amber-400" /> Rated</Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {incomingServiceBookings.slice(0, 3).map((b) => (
                  <Card key={`ib-${b.id}`}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Wrench className="w-3 h-3 text-gray-400" />
                            <span className="font-medium text-sm">{b.service_title}</span>
                            <StatusBadge status={b.status} />
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <button 
                              onClick={() => navigate(`/profile/${b.requester_id}`)}
                              className="flex items-center gap-1.5 hover:opacity-70 transition-opacity"
                            >
                              {b.requester_avatar_url ? (
                                <img src={b.requester_avatar_url} alt={b.requester_name} className="w-5 h-5 rounded-full object-cover border border-gray-200" />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500" style={{fontSize: '0.6rem'}}>
                                  {b.requester_name?.charAt(0)?.toUpperCase()}
                                </div>
                              )}
                              <span className="text-xs text-gray-500 hover:text-emerald-600">{b.requester_name}</span>
                            </button>
                            {b.requester_avg_rating != null && (
                              <span className="text-xs text-amber-600 inline-flex items-center gap-0.5">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {b.requester_avg_rating}
                              </span>
                            )}
                            <span className="text-xs text-gray-400">· {b.scheduled_date}</span>
                          </div>
                        </div>
                        <div className="flex gap-1 ml-2">
                          {b.status === "pending" && (
                            <>
                              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs h-7 px-2" onClick={() => handleUpdateBooking(b.id, "approved")}>
                                Approve
                              </Button>
                              <Button size="sm" variant="destructive" className="text-xs h-7 px-2" onClick={() => handleUpdateBooking(b.id, "rejected")}>
                                Reject
                              </Button>
                            </>
                          )}
                          {b.status === "approved" && (
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-xs h-7 px-2" onClick={() => handleUpdateBooking(b.id, "completed")}>
                              <CheckCircle className="w-3 h-3 mr-1" /> Complete
                            </Button>
                          )}
                          {b.status === "completed" && !hasReviewedBooking(b.id) && (
                            <Button size="sm" variant="outline" className="text-xs text-amber-600 border-amber-300 hover:bg-amber-50 h-7 px-2"
                              onClick={() => openRatingDialog({ reviewed_user_id: b.requester_id, reviewed_user_name: b.requester_name, booking_id: b.id, service_id: b.service_id, label: `Rate customer "${b.requester_name}"` })}>
                              <Star className="w-3 h-3 mr-1" /> Rate
                            </Button>
                          )}
                          {b.status === "completed" && hasReviewedBooking(b.id) && (
                            <Badge className="bg-amber-100 text-amber-700 text-xs"><Star className="w-3 h-3 mr-0.5 fill-amber-400" /> Rated</Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rent Dialog */}
      <Dialog open={showRentDialog} onOpenChange={setShowRentDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rent: {selectedItem?.title}</DialogTitle></DialogHeader>
          <form onSubmit={handleRent} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={rentalForm.start_date} onChange={(e) => setRentalForm({ ...rentalForm, start_date: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={rentalForm.end_date} onChange={(e) => setRentalForm({ ...rentalForm, end_date: e.target.value })} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Message to Owner</Label>
              <Textarea value={rentalForm.message} onChange={(e) => setRentalForm({ ...rentalForm, message: e.target.value })} placeholder="I need it for..." />
            </div>
            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">Send Request</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Book Service Dialog */}
      <Dialog open={showBookDialog} onOpenChange={setShowBookDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Book: {selectedService?.title}</DialogTitle></DialogHeader>
          <form onSubmit={handleBook} className="space-y-4">
            <div className="space-y-2">
              <Label>Preferred Date</Label>
              <Input type="date" value={bookingForm.scheduled_date} onChange={(e) => setBookingForm({ ...bookingForm, scheduled_date: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Message to Provider</Label>
              <Textarea value={bookingForm.message} onChange={(e) => setBookingForm({ ...bookingForm, message: e.target.value })} placeholder="Details about what you need..." />
            </div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">Send Booking Request</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rating Dialog */}
      <Dialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{ratingTarget?.label || "Leave a Rating"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Rating</Label>
              <StarRating rating={ratingValue} onRate={setRatingValue} />
            </div>
            <div className="space-y-2">
              <Label>Comment (optional)</Label>
              <Textarea value={ratingComment} onChange={(e) => setRatingComment(e.target.value)} placeholder="Share your experience..." />
            </div>
            <Button onClick={handleSubmitRating} disabled={ratingValue === 0} className="w-full bg-amber-600 hover:bg-amber-700">
              Submit Rating
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Liability Waiver Dialog */}
      <Dialog open={showWaiverDialog} onOpenChange={setShowWaiverDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Liability Waiver</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800 font-medium mb-2">Please read and accept before proceeding:</p>
              <p className="text-sm text-gray-700 mb-2">
                {waiverType === "rental" 
                  ? "I acknowledge that I am borrowing this item at my own risk. I understand that VicinityShare and the item owner are not responsible for any injury, damage, or loss that may occur while using this item."
                  : "I acknowledge that I am requesting this service at my own risk. I understand that VicinityShare and the service provider are not responsible for any injury, damage, or loss that may occur during the provision of this service."
                }
              </p>
              <p className="text-sm text-gray-700">
                I agree to use the item/service responsibly and indemnify VicinityShare, the owner/provider, and the community from any claims arising from my use.
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleWaiverAccept} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                I Accept
              </Button>
              <Button onClick={handleWaiverCancel} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Request Item/Service Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {requestType === "item" ? "Request an Item" : 
               requestType === "service" ? "Request a Service" : 
               "Create Community Post"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRequestSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>
                {requestType === "item" ? "What item are you looking for?" : 
                 requestType === "service" ? "What service do you need?" : 
                 "Post Title"}
              </Label>
              <Input
                value={requestForm.title}
                onChange={(e) => setRequestForm({ ...requestForm, title: e.target.value })}
                placeholder={requestType === "item" ? "e.g., Power drill" : 
                          requestType === "service" ? "e.g., Plumbing help" : 
                          "e.g., Looking for recommendations"}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={requestForm.description}
                onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
                placeholder={requestType === "item" ? "Describe what you need and when..." : 
                          requestType === "service" ? "Describe the service you need and any details..." : 
                          "Share your thoughts or questions with the community..."}
                rows={3}
                required
              />
            </div>
            <p className="text-xs text-gray-500">
              This will create a discussion post in your community so neighbors can see your request and offer to help.
            </p>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                Post Request
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowRequestDialog(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={showEditItem} onOpenChange={setShowEditItem}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Item</DialogTitle></DialogHeader>
          <form onSubmit={handleEditItem} className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={editItemForm.title} onChange={(e) => setEditItemForm({ ...editItemForm, title: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={editItemForm.description} onChange={(e) => setEditItemForm({ ...editItemForm, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <select className="w-full border rounded-md p-2 text-sm" value={editItemForm.category} onChange={(e) => setEditItemForm({ ...editItemForm, category: e.target.value })}>
                  {ITEM_CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Price per Day ($)</Label>
                <Input type="number" step="0.01" min="0" value={editItemForm.price_per_day} onChange={(e) => setEditItemForm({ ...editItemForm, price_per_day: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">Save Changes</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Service Dialog */}
      <Dialog open={showEditService} onOpenChange={setShowEditService}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Service</DialogTitle></DialogHeader>
          <form onSubmit={handleEditService} className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={editServiceForm.title} onChange={(e) => setEditServiceForm({ ...editServiceForm, title: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={editServiceForm.description} onChange={(e) => setEditServiceForm({ ...editServiceForm, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <select className="w-full border rounded-md p-2 text-sm" value={editServiceForm.category} onChange={(e) => setEditServiceForm({ ...editServiceForm, category: e.target.value })}>
                  {SERVICE_CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Price ($)</Label>
                <Input type="number" step="0.01" min="0" value={editServiceForm.price} onChange={(e) => setEditServiceForm({ ...editServiceForm, price: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">Save Changes</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
