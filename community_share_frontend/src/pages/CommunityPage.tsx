import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Package, Wrench, MessageSquare, DollarSign, Send, ImagePlus, X, ChevronLeft, ChevronRight, Edit, Search, Star, Trash2 } from "lucide-react";

interface Item {
  id: number; title: string; description: string; category: string;
  price_per_day: number; image_url: string | null; image_urls: string[]; is_available: boolean; owner_id: number;
  owner_name: string; owner_avatar_url?: string; owner_avg_rating?: number; created_at: string;
}

interface Service {
  id: number; title: string; description: string; category: string;
  price: number; is_available: boolean; provider_id: number;
  provider_name: string; provider_avatar_url?: string; provider_avg_rating?: number; created_at: string;
}

interface Discussion {
  id: number; title: string; content: string; category: string;
  author_id: number; author_name: string; author_avatar_url?: string; author_avg_rating?: number; comment_count: number;
  pinned: boolean; created_at: string;
}

interface Community {
  id: number; name: string; description: string; address: string;
  join_code: string; member_count: number;
}

const ITEM_CATEGORIES = ["tools", "electronics", "outdoor", "kitchen", "sports", "other"];
const SERVICE_CATEGORIES = ["transportation", "handyman", "cleaning", "tutoring", "pet care", "other"];
const DISCUSSION_CATEGORIES = ["general", "events", "announcements", "questions", "marketplace"];

function ItemImageGallery({ images, title }: { images: string[]; title: string }) {
  const [current, setCurrent] = useState(0);
  if (images.length === 0) return null;
  if (images.length === 1) {
    return <img src={images[0]} alt={title} className="w-full h-40 object-cover rounded-lg mb-3" />;
  }
  return (
    <div className="relative mb-3">
      <img src={images[current]} alt={`${title} ${current + 1}`} className="w-full h-40 object-cover rounded-lg" />
      <button
        type="button"
        onClick={() => setCurrent((p) => (p - 1 + images.length) % images.length)}
        className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-black/70"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => setCurrent((p) => (p + 1) % images.length)}
        className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-black/70"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
        {images.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setCurrent(idx)}
            className={`w-2 h-2 rounded-full ${idx === current ? "bg-white" : "bg-white/50"}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function CommunityPage() {
  const { id } = useParams<{ id: string }>();
  const communityId = Number(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [community, setCommunity] = useState<Community | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [activeTab, setActiveTab] = useState("items");

  // Dialog states
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddService, setShowAddService] = useState(false);
  const [showAddDiscussion, setShowAddDiscussion] = useState(false);
  const [showRentDialog, setShowRentDialog] = useState(false);
  const [showBookDialog, setShowBookDialog] = useState(false);
  const [showEditItem, setShowEditItem] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [editItem, setEditItem] = useState({ title: "", description: "", category: "tools", price_per_day: 0 });
  const [editExistingImageUrls, setEditExistingImageUrls] = useState<string[]>([]);
  const [editNewImageFiles, setEditNewImageFiles] = useState<File[]>([]);
  const [editNewImagePreviews, setEditNewImagePreviews] = useState<string[]>([]);
  const [showEditService, setShowEditService] = useState(false);
  const [editServiceForm, setEditServiceForm] = useState({ title: "", description: "", category: "transportation", price: 0 });
  const [editServiceId, setEditServiceId] = useState<number | null>(null);

  // Form states
  const [newItem, setNewItem] = useState({ title: "", description: "", category: "tools", price_per_day: 0 });
  const [itemImageFiles, setItemImageFiles] = useState<File[]>([]);
  const [itemImagePreviews, setItemImagePreviews] = useState<string[]>([]);
  const [newService, setNewService] = useState({ title: "", description: "", category: "transportation", price: 0 });
  const [newDiscussion, setNewDiscussion] = useState({ title: "", content: "", category: "general" });
  const [rentalForm, setRentalForm] = useState({ start_date: "", end_date: "", message: "" });
  const [bookingForm, setBookingForm] = useState({ scheduled_date: "", message: "" });
  const [error, setError] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [itemCategoryFilter, setItemCategoryFilter] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState("");

  useEffect(() => {
    loadData();
  }, [communityId]);

  const loadData = async () => {
    try {
      const [comm, itemsData, servicesData, discussionsData] = await Promise.all([
        api.getCommunity(communityId),
        api.getCommunityItems(communityId, itemCategoryFilter || undefined, itemSearch || undefined),
        api.getCommunityServices(communityId, serviceCategoryFilter || undefined, serviceSearch || undefined),
        api.getCommunityDiscussions(communityId),
      ]);
      setCommunity(comm);
      setItems(itemsData);
      setServices(servicesData);
      setDiscussions(discussionsData);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [itemSearch, itemCategoryFilter, serviceSearch, serviceCategoryFilter]);

  const handleItemImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles = Array.from(files).slice(0, 5 - itemImageFiles.length);
    if (newFiles.length === 0) return;
    setItemImageFiles((prev) => [...prev, ...newFiles].slice(0, 5));
    setItemImagePreviews((prev) => [...prev, ...newFiles.map((f) => URL.createObjectURL(f))].slice(0, 5));
  };

  const removeItemImage = (index: number) => {
    setItemImageFiles((prev) => prev.filter((_, i) => i !== index));
    setItemImagePreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const image_urls: string[] = [];
      for (const file of itemImageFiles) {
        const url = await api.uploadImage(file);
        image_urls.push(url);
      }
      await api.createItem({ ...newItem, community_id: communityId, image_urls: image_urls.length > 0 ? image_urls : undefined });
      setShowAddItem(false);
      setNewItem({ title: "", description: "", category: "tools", price_per_day: 0 });
      setItemImageFiles([]);
      setItemImagePreviews([]);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.createService({ ...newService, community_id: communityId });
      setShowAddService(false);
      setNewService({ title: "", description: "", category: "transportation", price: 0 });
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  };

  const handleAddDiscussion = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.createDiscussion({ ...newDiscussion, community_id: communityId });
      setShowAddDiscussion(false);
      setNewDiscussion({ title: "", content: "", category: "general" });
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  };

  const handleRent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    try {
      await api.createRental({ item_id: selectedItem.id, ...rentalForm });
      setShowRentDialog(false);
      setRentalForm({ start_date: "", end_date: "", message: "" });
      alert("Rental request sent!");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;
    try {
      await api.createBooking({ service_id: selectedService.id, ...bookingForm });
      setShowBookDialog(false);
      setBookingForm({ scheduled_date: "", message: "" });
      alert("Booking request sent!");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  };

  const handleMessage = (userId: number) => {
    navigate(`/messages/${userId}`);
  };

  const openEditItem = (item: Item) => {
    setSelectedItem(item);
    setEditItem({ title: item.title, description: item.description, category: item.category, price_per_day: item.price_per_day });
    setEditExistingImageUrls(item.image_urls && item.image_urls.length > 0 ? [...item.image_urls] : (item.image_url ? [item.image_url] : []));
    setEditNewImageFiles([]);
    setEditNewImagePreviews([]);
    setError("");
    setShowEditItem(true);
  };

  const handleEditItemImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const totalCount = editExistingImageUrls.length + editNewImageFiles.length;
    const newFiles = Array.from(files).slice(0, 5 - totalCount);
    if (newFiles.length === 0) return;
    setEditNewImageFiles((prev) => [...prev, ...newFiles]);
    setEditNewImagePreviews((prev) => [...prev, ...newFiles.map((f) => URL.createObjectURL(f))]);
  };

  const removeEditExistingImage = (index: number) => {
    setEditExistingImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const removeEditNewImage = (index: number) => {
    setEditNewImageFiles((prev) => prev.filter((_, i) => i !== index));
    setEditNewImagePreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleEditItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    setError("");
    try {
      const uploadedNewUrls: string[] = [];
      for (const file of editNewImageFiles) {
        const url = await api.uploadImage(file);
        uploadedNewUrls.push(url);
      }
      const allImageUrls = [...editExistingImageUrls, ...uploadedNewUrls].slice(0, 5);
      await api.updateItem(selectedItem.id, { ...editItem, image_urls: allImageUrls });
      setShowEditItem(false);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  };

  const openEditService = (svc: Service) => {
    setEditServiceId(svc.id);
    setEditServiceForm({ title: svc.title, description: svc.description, category: svc.category, price: svc.price });
    setShowEditService(true);
  };

  const handleEditService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editServiceId) return;
    setError("");
    try {
      await api.updateService(editServiceId, editServiceForm);
      setShowEditService(false);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update service");
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!confirm("Are you sure you want to delete this item? This will also delete all related rental requests and reviews.")) return;
    try {
      await api.deleteItem(itemId);
      loadData();
    } catch {
      alert("Failed to delete item");
    }
  };

  const handleDeleteService = async (serviceId: number) => {
    if (!confirm("Are you sure you want to delete this service? This will also delete all related bookings and reviews.")) return;
    try {
      await api.deleteService(serviceId);
      loadData();
    } catch {
      alert("Failed to delete service");
    }
  };

  if (!community) return <div className="p-4 text-center text-gray-400">Loading...</div>;

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")}><ArrowLeft className="w-4 h-4" /></Button>
        <div>
          <h1 className="text-xl font-bold">{community.name}</h1>
          <p className="text-xs text-gray-400">{community.member_count} members · Code: {community.join_code}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="items" className="text-xs"><Package className="w-3 h-3 mr-1" /> Items</TabsTrigger>
          <TabsTrigger value="services" className="text-xs"><Wrench className="w-3 h-3 mr-1" /> Services</TabsTrigger>
          <TabsTrigger value="community" className="text-xs"><MessageSquare className="w-3 h-3 mr-1" /> Community</TabsTrigger>
        </TabsList>

        {/* ITEMS TAB */}
        <TabsContent value="items" className="space-y-3 mt-4">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-gray-700">Items for Rent</h2>
            <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-1" /> List Item</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>List an Item</DialogTitle></DialogHeader>
                <form onSubmit={handleAddItem} className="space-y-4">
                  {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>}
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input value={newItem.title} onChange={(e) => setNewItem({ ...newItem, title: e.target.value })} placeholder="Extension Ladder" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} placeholder="24ft aluminum ladder, great condition" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <select className="w-full border rounded-md p-2 text-sm" value={newItem.category} onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}>
                        {ITEM_CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Price / Day ($)</Label>
                      <Input type="number" min="0" step="0.01" value={newItem.price_per_day} onChange={(e) => setNewItem({ ...newItem, price_per_day: Number(e.target.value) })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Photos (up to 5)</Label>
                    {itemImagePreviews.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {itemImagePreviews.map((preview, idx) => (
                          <div key={idx} className="relative w-20 h-20">
                            <img src={preview} alt={`Preview ${idx + 1}`} className="w-20 h-20 object-cover rounded-lg" />
                            <button type="button" onClick={() => removeItemImage(idx)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {itemImageFiles.length < 5 && (
                      <label className="flex items-center gap-2 border-2 border-dashed rounded-lg p-3 cursor-pointer hover:bg-gray-50 transition-colors">
                        <ImagePlus className="w-5 h-5 text-gray-400" />
                        <span className="text-sm text-gray-500">Add photos ({itemImageFiles.length}/5)</span>
                        <input type="file" accept="image/*" multiple className="hidden" onChange={handleItemImages} />
                      </label>
                    )}
                  </div>
                  <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">List Item</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
              <Input placeholder="Search items..." value={itemSearch} onChange={(e) => setItemSearch(e.target.value)} className="pl-9" />
            </div>
            <select className="border rounded-md px-2 text-sm" value={itemCategoryFilter} onChange={(e) => setItemCategoryFilter(e.target.value)}>
              <option value="">All Categories</option>
              {ITEM_CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>

          {items.length === 0 ? (
            <Card className="text-center py-8"><CardContent><p className="text-gray-400">No items found</p></CardContent></Card>
          ) : (
            items.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  {item.image_urls && item.image_urls.length > 0 ? (
                    <ItemImageGallery images={item.image_urls} title={item.title} />
                  ) : item.image_url ? (
                    <img src={item.image_url} alt={item.title} className="w-full h-40 object-cover rounded-lg mb-3" />
                  ) : null}
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{item.title}</h3>
                        <Badge variant={item.is_available ? "default" : "secondary"} className={item.is_available ? "bg-emerald-100 text-emerald-700 text-xs" : "text-xs"}>
                          {item.is_available ? "Available" : "Unavailable"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 mb-2">{item.description}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <Badge variant="outline" className="text-xs">{item.category}</Badge>
                        <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{item.price_per_day}/day</span>
                        <span className="inline-flex items-center gap-1">
                          <button
                            onClick={() => navigate(`/profile/${item.owner_id}`)}
                            className="inline-flex items-center gap-1 hover:opacity-70 transition-opacity"
                          >
                            {item.owner_avatar_url ? (
                              <img src={item.owner_avatar_url} alt={item.owner_name} className="w-4 h-4 rounded-full object-cover" />
                            ) : (
                              <span className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-gray-500" style={{fontSize: '0.5rem'}}>{item.owner_name?.charAt(0)?.toUpperCase()}</span>
                            )}
                            <span className="hover:text-emerald-600">{item.owner_name}</span>
                          </button>
                          {item.owner_avg_rating != null && (
                            <span className="text-amber-600 inline-flex items-center gap-0.5"><Star className="w-3 h-3 fill-amber-400 text-amber-400" />{item.owner_avg_rating}</span>
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 ml-2">
                      {item.owner_id === user?.id && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => openEditItem(item)}>
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleDeleteItem(item.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                      {item.owner_id !== user?.id && item.is_available && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => handleMessage(item.owner_id)}>
                            <Send className="w-3 h-3" />
                          </Button>
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs" onClick={() => { setSelectedItem(item); setShowRentDialog(true); }}>
                            Rent
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* SERVICES TAB */}
        <TabsContent value="services" className="space-y-3 mt-4">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-gray-700">Services Offered</h2>
            <Dialog open={showAddService} onOpenChange={setShowAddService}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-1" /> Offer Service</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Offer a Service</DialogTitle></DialogHeader>
                <form onSubmit={handleAddService} className="space-y-4">
                  {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>}
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input value={newService.title} onChange={(e) => setNewService({ ...newService, title: e.target.value })} placeholder="Airport Ride" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea value={newService.description} onChange={(e) => setNewService({ ...newService, description: e.target.value })} placeholder="Comfortable SUV ride to/from the airport" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <select className="w-full border rounded-md p-2 text-sm" value={newService.category} onChange={(e) => setNewService({ ...newService, category: e.target.value })}>
                        {SERVICE_CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Price ($)</Label>
                      <Input type="number" min="0" step="0.01" value={newService.price} onChange={(e) => setNewService({ ...newService, price: Number(e.target.value) })} />
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">Offer Service</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
              <Input placeholder="Search services..." value={serviceSearch} onChange={(e) => setServiceSearch(e.target.value)} className="pl-9" />
            </div>
            <select className="border rounded-md px-2 text-sm" value={serviceCategoryFilter} onChange={(e) => setServiceCategoryFilter(e.target.value)}>
              <option value="">All Categories</option>
              {SERVICE_CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>

          {services.length === 0 ? (
            <Card className="text-center py-8"><CardContent><p className="text-gray-400">No services found</p></CardContent></Card>
          ) : (
            services.map((svc) => (
              <Card key={svc.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{svc.title}</h3>
                        <Badge variant={svc.is_available ? "default" : "secondary"} className={svc.is_available ? "bg-blue-100 text-blue-700 text-xs" : "text-xs"}>
                          {svc.is_available ? "Available" : "Unavailable"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 mb-2">{svc.description}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <Badge variant="outline" className="text-xs">{svc.category}</Badge>
                        <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{svc.price}</span>
                        <span className="inline-flex items-center gap-1">
                          <button
                            onClick={() => navigate(`/profile/${svc.provider_id}`)}
                            className="inline-flex items-center gap-1 hover:opacity-70 transition-opacity"
                          >
                            {svc.provider_avatar_url ? (
                              <img src={svc.provider_avatar_url} alt={svc.provider_name} className="w-4 h-4 rounded-full object-cover" />
                            ) : (
                              <span className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-gray-500" style={{fontSize: '0.5rem'}}>{svc.provider_name?.charAt(0)?.toUpperCase()}</span>
                            )}
                            <span className="hover:text-emerald-600">{svc.provider_name}</span>
                          </button>
                          {svc.provider_avg_rating != null && (
                            <span className="text-amber-600 inline-flex items-center gap-0.5"><Star className="w-3 h-3 fill-amber-400 text-amber-400" />{svc.provider_avg_rating}</span>
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 ml-2">
                      {svc.provider_id === user?.id && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => openEditService(svc)}>
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleDeleteService(svc.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                      {svc.provider_id !== user?.id && svc.is_available && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => handleMessage(svc.provider_id)}>
                            <Send className="w-3 h-3" />
                          </Button>
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-xs" onClick={() => { setSelectedService(svc); setShowBookDialog(true); }}>
                            Book
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* COMMUNITY DISCUSSION TAB */}
        <TabsContent value="community" className="space-y-3 mt-4">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-gray-700">Community Board</h2>
            <Dialog open={showAddDiscussion} onOpenChange={setShowAddDiscussion}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-1" /> New Post</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New Discussion</DialogTitle></DialogHeader>
                <form onSubmit={handleAddDiscussion} className="space-y-4">
                  {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>}
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input value={newDiscussion.title} onChange={(e) => setNewDiscussion({ ...newDiscussion, title: e.target.value })} placeholder="Pool Party this Saturday!" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <select className="w-full border rounded-md p-2 text-sm" value={newDiscussion.category} onChange={(e) => setNewDiscussion({ ...newDiscussion, category: e.target.value })}>
                      {DISCUSSION_CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Content</Label>
                    <Textarea value={newDiscussion.content} onChange={(e) => setNewDiscussion({ ...newDiscussion, content: e.target.value })} placeholder="Share details with your neighbors..." rows={4} required />
                  </div>
                  <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">Post</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {discussions.length === 0 ? (
            <Card className="text-center py-8"><CardContent><p className="text-gray-400">No discussions yet. Start one!</p></CardContent></Card>
          ) : (
            discussions.map((d) => (
              <Card key={d.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/discussion/${d.id}`)}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-2">
                    {d.pinned && <Badge className="bg-amber-100 text-amber-700 text-xs">Pinned</Badge>}
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">{d.title}</h3>
                      <p className="text-sm text-gray-500 line-clamp-2">{d.content}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <Badge variant="outline" className="text-xs">{d.category}</Badge>
                        <span className="inline-flex items-center gap-1">
                          <button
                            onClick={() => navigate(`/profile/${d.author_id}`)}
                            className="inline-flex items-center gap-1 hover:opacity-70 transition-opacity"
                          >
                            {d.author_avatar_url ? (
                              <img src={d.author_avatar_url} alt={d.author_name} className="w-4 h-4 rounded-full object-cover" />
                            ) : (
                              <span className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-gray-500" style={{fontSize: '0.5rem'}}>{d.author_name?.charAt(0)?.toUpperCase()}</span>
                            )}
                            <span className="hover:text-emerald-600">{d.author_name}</span>
                          </button>
                          {d.author_avg_rating != null && (
                            <span className="text-amber-600 inline-flex items-center gap-0.5"><Star className="w-3 h-3 fill-amber-400 text-amber-400" />{d.author_avg_rating}</span>
                          )}
                        </span>
                        <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {d.comment_count}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

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

      {/* Edit Item Dialog */}
      <Dialog open={showEditItem} onOpenChange={setShowEditItem}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Item</DialogTitle></DialogHeader>
          <form onSubmit={handleEditItem} className="space-y-4">
            {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>}
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={editItem.title} onChange={(e) => setEditItem({ ...editItem, title: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={editItem.description} onChange={(e) => setEditItem({ ...editItem, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <select className="w-full border rounded-md p-2 text-sm" value={editItem.category} onChange={(e) => setEditItem({ ...editItem, category: e.target.value })}>
                  {ITEM_CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Price / Day ($)</Label>
                <Input type="number" min="0" step="0.01" value={editItem.price_per_day} onChange={(e) => setEditItem({ ...editItem, price_per_day: Number(e.target.value) })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Photos (up to 5)</Label>
              {(editExistingImageUrls.length > 0 || editNewImagePreviews.length > 0) && (
                <div className="flex gap-2 flex-wrap">
                  {editExistingImageUrls.map((url, idx) => (
                    <div key={`existing-${idx}`} className="relative w-20 h-20">
                      <img src={url} alt={`Photo ${idx + 1}`} className="w-20 h-20 object-cover rounded-lg" />
                      <button type="button" onClick={() => removeEditExistingImage(idx)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {editNewImagePreviews.map((preview, idx) => (
                    <div key={`new-${idx}`} className="relative w-20 h-20">
                      <img src={preview} alt={`New ${idx + 1}`} className="w-20 h-20 object-cover rounded-lg" />
                      <button type="button" onClick={() => removeEditNewImage(idx)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {(editExistingImageUrls.length + editNewImageFiles.length) < 5 && (
                <label className="flex items-center gap-2 border-2 border-dashed rounded-lg p-3 cursor-pointer hover:bg-gray-50 transition-colors">
                  <ImagePlus className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-500">Add photos ({editExistingImageUrls.length + editNewImageFiles.length}/5)</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleEditItemImages} />
                </label>
              )}
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
            {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>}
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
                <Input type="number" min="0" step="0.01" value={editServiceForm.price} onChange={(e) => setEditServiceForm({ ...editServiceForm, price: Number(e.target.value) })} />
              </div>
            </div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">Save Changes</Button>
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
    </div>
  );
}
