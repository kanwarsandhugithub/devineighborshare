import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Star, ArrowLeft, MessageSquare, Package, Wrench } from "lucide-react";

interface User {
  id: number;
  email: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  bio: string;
  unit: string;
  avg_rating: number | null;
}

interface Item {
  id: number; title: string; description: string; category: string;
  price_per_day: number; price_unit: string; image_urls: string[]; is_available: boolean; rental_count: number;
}

interface Service {
  id: number; title: string; description: string; category: string;
  price: number; price_unit: string; is_available: boolean; booking_count: number;
}

function formatPrice(price: number, unit: string) {
  const labels: Record<string, string> = {
    per_day: "/day",
    per_month: "/month",
    per_24_hours: "/24 hrs",
    flat_fee: "",
    per_service: "",
  };
  return `$${price}${labels[unit] || ""}`;
}

interface Review {
  id: number; reviewer_id: number; rating: number;
  comment: string; reviewer_name: string; reviewer_avatar_url?: string; reviewer_avg_rating?: number; created_at: string;
}

export default function PublicProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      const uid = parseInt(userId);
      Promise.all([
        api.getUser(uid),
        api.getUserReviews(uid),
        api.getUserItems(uid),
        api.getUserServices(uid)
      ])
        .then(([userData, reviewsData, itemsData, servicesData]) => {
          setUser(userData);
          setReviews(reviewsData);
          setItems(itemsData);
          setServices(servicesData);
        })
        .catch(() => {
          // Handle error
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [userId]);

  const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase();

  const handleMessage = () => {
    navigate(`/messages/${user?.id}`);
  };

  if (loading) {
    return (
      <div className="p-4 max-w-2xl mx-auto">
        <div className="text-center text-gray-400 py-12">Loading profile...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-4 max-w-2xl mx-auto">
        <div className="text-center text-gray-400 py-12">User not found</div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold">Profile</h1>
      </div>

      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="w-16 h-16">
              {user.avatar_url ? (
                <AvatarImage src={user.avatar_url} alt={user.full_name} />
              ) : null}
              <AvatarFallback className="text-xl bg-emerald-100 text-emerald-700">{getInitials(user.full_name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-semibold">{user.full_name}</h2>
              {user.avg_rating && (
                <div className="flex items-center gap-1 mt-1">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span className="text-sm font-medium">{user.avg_rating}</span>
                </div>
              )}
            </div>
            <Button size="sm" onClick={handleMessage} className="bg-emerald-600 hover:bg-emerald-700">
              <MessageSquare className="w-4 h-4 mr-1" /> Message
            </Button>
          </div>

          <div className="space-y-2 text-sm text-gray-600">
            {user.phone && <p><span className="text-gray-400">Phone:</span> {user.phone}</p>}
            {user.unit && <p><span className="text-gray-400">Unit:</span> {user.unit}</p>}
            {user.bio && <p><span className="text-gray-400">Bio:</span> {user.bio}</p>}
          </div>
        </CardContent>
      </Card>

      {items.length > 0 && (
        <>
          <h2 className="font-semibold text-gray-700 mb-3">Items ({items.length})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {items.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex">
                    <div className="w-24 h-24 flex-shrink-0 bg-gray-100">
                      {item.image_urls[0] ? (
                        <img src={item.image_urls[0]} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400"><Package className="w-8 h-8" /></div>
                      )}
                    </div>
                    <div className="p-3 flex-1 min-w-0">
                      <h3 className="font-semibold text-sm line-clamp-1">{item.title}</h3>
                      <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{item.category}</p>
                      <p className="text-xs font-medium text-emerald-600 mt-1">{formatPrice(item.price_per_day, item.price_unit)}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Rented {item.rental_count}x · {item.is_available ? "Available" : "Not available"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {services.length > 0 && (
        <>
          <h2 className="font-semibold text-gray-700 mb-3">Services ({services.length})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {services.map((svc) => (
              <Card key={svc.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex">
                    <div className="w-24 h-24 flex-shrink-0 bg-blue-50 flex items-center justify-center text-blue-400">
                      <Wrench className="w-8 h-8" />
                    </div>
                    <div className="p-3 flex-1 min-w-0">
                      <h3 className="font-semibold text-sm line-clamp-1">{svc.title}</h3>
                      <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{svc.category}</p>
                      <p className="text-xs font-medium text-blue-600 mt-1">{formatPrice(svc.price, svc.price_unit)}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Booked {svc.booking_count}x · {svc.is_available ? "Available" : "Not available"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

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
