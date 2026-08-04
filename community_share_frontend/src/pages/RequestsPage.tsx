import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Package, Wrench, Check, X, RotateCcw, Clock, CheckCircle, XCircle, ArrowLeftRight, Star } from "lucide-react";

interface RentalRequest {
  id: number;
  item_id: number;
  item_title: string;
  requester_id: number;
  requester_name: string;
  owner_id?: number;
  owner_name?: string;
  requester_avatar_url?: string;
  requester_avg_rating?: number;
  start_date: string;
  end_date: string;
  message: string;
  status: string;
  created_at: string;
}

interface ServiceBooking {
  id: number;
  service_id: number;
  service_title: string;
  requester_id: number;
  requester_name: string;
  provider_id?: number;
  provider_name?: string;
  requester_avatar_url?: string;
  requester_avg_rating?: number;
  scheduled_date: string;
  message: string;
  status: string;
  created_at: string;
}

interface Review {
  id: number;
  reviewer_id: number;
  reviewed_user_id: number;
  rating: number;
  comment: string;
  rental_id?: number;
  booking_id?: number;
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

function StarRating({ rating, onRate, size = "md" }: { rating: number; onRate?: (r: number) => void; size?: string }) {
  const starSize = size === "sm" ? "w-4 h-4" : "w-6 h-6";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`${starSize} ${s <= rating ? "fill-amber-400 text-amber-400" : "text-gray-300"} ${onRate ? "cursor-pointer hover:text-amber-400" : ""}`}
          onClick={() => onRate?.(s)}
        />
      ))}
    </div>
  );
}

export default function RequestsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rentals, setRentals] = useState<RentalRequest[]>([]);
  const [bookings, setBookings] = useState<ServiceBooking[]>([]);
  const [activeTab, setActiveTab] = useState("my-requests");
  const [loading, setLoading] = useState(true);
  const [myReviews, setMyReviews] = useState<Review[]>([]);

  // Rating dialog state
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [ratingTarget, setRatingTarget] = useState<{
    reviewed_user_id: number;
    reviewed_user_name: string;
    rental_id?: number;
    booking_id?: number;
    item_id?: number;
    service_id?: number;
    label: string;
  } | null>(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rentalsData, bookingsData, reviewsData] = await Promise.all([
        api.getMyRentals(),
        api.getMyBookings(),
        api.getMyReviews(),
      ]);
      setRentals(rentalsData);
      setBookings(bookingsData);
      setMyReviews(reviewsData);
    } catch {
      // ignore
    }
    setLoading(false);
  };

  const handleUpdateRental = async (id: number, status: string) => {
    try {
      await api.updateRental(id, status);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update");
    }
  };

  const handleUpdateBooking = async (id: number, status: string) => {
    try {
      await api.updateBooking(id, status);
      loadData();
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
        rating: ratingValue,
        comment: ratingComment,
        item_id: ratingTarget.item_id,
        service_id: ratingTarget.service_id,
        rental_id: ratingTarget.rental_id,
        booking_id: ratingTarget.booking_id,
      });
      setShowRatingDialog(false);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to submit review");
    }
  };

  const hasReviewedRental = (rentalId: number) =>
    myReviews.some((r) => r.rental_id === rentalId);

  const hasReviewedBooking = (bookingId: number) =>
    myReviews.some((r) => r.booking_id === bookingId);

  // Split rentals into "my requests" (I'm the borrower) and "incoming requests" (I'm the owner)
  const myRentalRequests = rentals.filter((r) => r.requester_id === user?.id);
  const incomingRentalRequests = rentals.filter((r) => r.requester_id !== user?.id);

  // Split bookings into "my bookings" (I'm the customer) and "incoming bookings" (I'm the provider)
  const myServiceBookings = bookings.filter((b) => b.requester_id === user?.id);
  const incomingServiceBookings = bookings.filter((b) => b.requester_id !== user?.id);

  if (loading) {
    return <div className="p-4 text-center text-gray-400">Loading...</div>;
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold mb-4">My Requests</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="my-requests" className="text-xs">
            <ArrowLeftRight className="w-3 h-3 mr-1" /> Sent
          </TabsTrigger>
          <TabsTrigger value="incoming" className="text-xs">
            <Package className="w-3 h-3 mr-1" /> Received
          </TabsTrigger>
        </TabsList>

        {/* SENT REQUESTS TAB */}
        <TabsContent value="my-requests" className="space-y-4 mt-4">
          {/* My Rental Requests */}
          <div>
            <h2 className="font-semibold text-gray-700 flex items-center gap-2 mb-2">
              <Package className="w-4 h-4" /> My Rental Requests
            </h2>
            {myRentalRequests.length === 0 ? (
              <Card className="text-center py-6">
                <CardContent><p className="text-gray-400 text-sm">No rental requests sent yet</p></CardContent>
              </Card>
            ) : (
              myRentalRequests.map((r) => (
                <Card key={r.id} className="mb-2 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm">{r.item_title}</h3>
                          <StatusBadge status={r.status} />
                        </div>
                        <p className="text-xs text-gray-500 mb-1">
                          {r.start_date} to {r.end_date}
                        </p>
                        {r.message && (
                          <p className="text-xs text-gray-400 italic">"{r.message}"</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          Requested {new Date(r.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {r.status === "returned" && r.owner_id && !hasReviewedRental(r.id) && (
                        <Button size="sm" variant="outline" className="text-xs text-amber-600 border-amber-300 hover:bg-amber-50 ml-2"
                          onClick={() => openRatingDialog({ reviewed_user_id: r.owner_id!, reviewed_user_name: r.owner_name || "Owner", rental_id: r.id, item_id: r.item_id, label: `Rate owner for "${r.item_title}"` })}>
                          <Star className="w-3 h-3 mr-1" /> Rate Owner
                        </Button>
                      )}
                      {r.status === "returned" && hasReviewedRental(r.id) && (
                        <Badge className="bg-amber-100 text-amber-700 text-xs ml-2"><Star className="w-3 h-3 mr-0.5 fill-amber-400" /> Rated</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* My Service Bookings */}
          <div>
            <h2 className="font-semibold text-gray-700 flex items-center gap-2 mb-2">
              <Wrench className="w-4 h-4" /> My Service Bookings
            </h2>
            {myServiceBookings.length === 0 ? (
              <Card className="text-center py-6">
                <CardContent><p className="text-gray-400 text-sm">No service bookings sent yet</p></CardContent>
              </Card>
            ) : (
              myServiceBookings.map((b) => (
                <Card key={b.id} className="mb-2 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm">{b.service_title}</h3>
                          <StatusBadge status={b.status} />
                        </div>
                        <p className="text-xs text-gray-500 mb-1">
                          Scheduled: {b.scheduled_date}
                        </p>
                        {b.message && (
                          <p className="text-xs text-gray-400 italic">"{b.message}"</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          Requested {new Date(b.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {b.status === "completed" && b.provider_id && !hasReviewedBooking(b.id) && (
                        <Button size="sm" variant="outline" className="text-xs text-amber-600 border-amber-300 hover:bg-amber-50 ml-2"
                          onClick={() => openRatingDialog({ reviewed_user_id: b.provider_id!, reviewed_user_name: b.provider_name || "Provider", booking_id: b.id, service_id: b.service_id, label: `Rate provider for "${b.service_title}"` })}>
                          <Star className="w-3 h-3 mr-1" /> Rate Provider
                        </Button>
                      )}
                      {b.status === "completed" && hasReviewedBooking(b.id) && (
                        <Badge className="bg-amber-100 text-amber-700 text-xs ml-2"><Star className="w-3 h-3 mr-0.5 fill-amber-400" /> Rated</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* RECEIVED REQUESTS TAB */}
        <TabsContent value="incoming" className="space-y-4 mt-4">
          {/* Incoming Rental Requests */}
          <div>
            <h2 className="font-semibold text-gray-700 flex items-center gap-2 mb-2">
              <Package className="w-4 h-4" /> Incoming Rental Requests
            </h2>
            {incomingRentalRequests.length === 0 ? (
              <Card className="text-center py-6">
                <CardContent><p className="text-gray-400 text-sm">No incoming rental requests</p></CardContent>
              </Card>
            ) : (
              incomingRentalRequests.map((r) => (
                <Card key={r.id} className="mb-2 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm">{r.item_title}</h3>
                          <StatusBadge status={r.status} />
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <button 
                            onClick={() => navigate(`/profile/${r.requester_id}`)}
                            className="flex items-center gap-2 hover:opacity-70 transition-opacity"
                          >
                            {r.requester_avatar_url ? (
                              <img src={r.requester_avatar_url} alt={r.requester_name} className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                                {r.requester_name?.charAt(0)?.toUpperCase()}
                              </div>
                            )}
                            <div>
                              <span className="text-xs font-medium text-gray-700 hover:text-emerald-600">{r.requester_name}</span>
                              {r.requester_avg_rating != null && (
                                <span className="ml-1 text-xs text-amber-600 inline-flex items-center gap-0.5">
                                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {r.requester_avg_rating}
                                </span>
                              )}
                            </div>
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mb-1">
                          {r.start_date} to {r.end_date}
                        </p>
                        {r.message && (
                          <p className="text-xs text-gray-400 italic">"{r.message}"</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 ml-2">
                        {r.status === "pending" && (
                          <>
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs" onClick={() => handleUpdateRental(r.id, "approved")}>
                              <Check className="w-3 h-3 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="destructive" className="text-xs" onClick={() => handleUpdateRental(r.id, "rejected")}>
                              <X className="w-3 h-3 mr-1" /> Reject
                            </Button>
                          </>
                        )}
                        {r.status === "approved" && (
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-xs" onClick={() => handleUpdateRental(r.id, "returned")}>
                            <RotateCcw className="w-3 h-3 mr-1" /> Mark Returned
                          </Button>
                        )}
                        {r.status === "returned" && !hasReviewedRental(r.id) && (
                          <Button size="sm" variant="outline" className="text-xs text-amber-600 border-amber-300 hover:bg-amber-50"
                            onClick={() => openRatingDialog({ reviewed_user_id: r.requester_id, reviewed_user_name: r.requester_name, rental_id: r.id, item_id: r.item_id, label: `Rate borrower "${r.requester_name}" for "${r.item_title}"` })}>
                            <Star className="w-3 h-3 mr-1" /> Rate Borrower
                          </Button>
                        )}
                        {r.status === "returned" && hasReviewedRental(r.id) && (
                          <Badge className="bg-amber-100 text-amber-700 text-xs"><Star className="w-3 h-3 mr-0.5 fill-amber-400" /> Rated</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Incoming Service Bookings */}
          <div>
            <h2 className="font-semibold text-gray-700 flex items-center gap-2 mb-2">
              <Wrench className="w-4 h-4" /> Incoming Service Bookings
            </h2>
            {incomingServiceBookings.length === 0 ? (
              <Card className="text-center py-6">
                <CardContent><p className="text-gray-400 text-sm">No incoming service bookings</p></CardContent>
              </Card>
              ) : (
              incomingServiceBookings.map((b) => (
                <Card key={b.id} className="mb-2 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm">{b.service_title}</h3>
                          <StatusBadge status={b.status} />
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <button 
                            onClick={() => navigate(`/profile/${b.requester_id}`)}
                            className="flex items-center gap-2 hover:opacity-70 transition-opacity"
                          >
                            {b.requester_avatar_url ? (
                              <img src={b.requester_avatar_url} alt={b.requester_name} className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                                {b.requester_name?.charAt(0)?.toUpperCase()}
                              </div>
                            )}
                            <div>
                              <span className="text-xs font-medium text-gray-700 hover:text-emerald-600">{b.requester_name}</span>
                              {b.requester_avg_rating != null && (
                                <span className="ml-1 text-xs text-amber-600 inline-flex items-center gap-0.5">
                                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {b.requester_avg_rating}
                                </span>
                              )}
                            </div>
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mb-1">
                          Scheduled: {b.scheduled_date}
                        </p>
                        {b.message && (
                          <p className="text-xs text-gray-400 italic">"{b.message}"</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 ml-2">
                        {b.status === "pending" && (
                          <>
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs" onClick={() => handleUpdateBooking(b.id, "approved")}>
                              <Check className="w-3 h-3 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="destructive" className="text-xs" onClick={() => handleUpdateBooking(b.id, "rejected")}>
                              <X className="w-3 h-3 mr-1" /> Reject
                            </Button>
                          </>
                        )}
                        {b.status === "approved" && (
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-xs" onClick={() => handleUpdateBooking(b.id, "completed")}>
                            <CheckCircle className="w-3 h-3 mr-1" /> Complete
                          </Button>
                        )}
                        {b.status === "completed" && !hasReviewedBooking(b.id) && (
                          <Button size="sm" variant="outline" className="text-xs text-amber-600 border-amber-300 hover:bg-amber-50"
                            onClick={() => openRatingDialog({ reviewed_user_id: b.requester_id, reviewed_user_name: b.requester_name, booking_id: b.id, service_id: b.service_id, label: `Rate customer "${b.requester_name}" for "${b.service_title}"` })}>
                            <Star className="w-3 h-3 mr-1" /> Rate Customer
                          </Button>
                        )}
                        {b.status === "completed" && hasReviewedBooking(b.id) && (
                          <Badge className="bg-amber-100 text-amber-700 text-xs"><Star className="w-3 h-3 mr-0.5 fill-amber-400" /> Rated</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Rating Dialog */}
      <Dialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{ratingTarget?.label || "Leave a Rating"}</DialogTitle>
          </DialogHeader>
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
    </div>
  );
}
