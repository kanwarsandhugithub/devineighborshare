const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function getToken(): string | null {
  return localStorage.getItem("token");
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

async function uploadFile(file: File): Promise<string> {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}/api/uploads/`, { method: "POST", headers, body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Upload failed" }));
    throw new Error(err.detail || "Upload failed");
  }
  const data = await res.json();
  return `${API_URL}${data.url}`;
}

export const api = {
  uploadImage: uploadFile,
  // Auth
  register: (data: { email: string; full_name: string; password: string; phone?: string }) =>
    request("/api/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    request("/api/auth/login", { method: "POST", body: JSON.stringify(data) }),
  getMe: () => request("/api/auth/me"),
  forgotPassword: (email: string) =>
    request("/api/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
  resetPassword: (token: string, new_password: string) =>
    request("/api/auth/reset-password", { method: "POST", body: JSON.stringify({ token, new_password }) }),

  // Users
  getUser: (id: number) => request(`/api/users/${id}`),
  updateProfile: (data: { full_name?: string; phone?: string; bio?: string; avatar_url?: string }) =>
    request("/api/users/me", { method: "PUT", body: JSON.stringify(data) }),

  // Communities
  createCommunity: (data: { name: string; description: string; address: string }) =>
    request("/api/communities/", { method: "POST", body: JSON.stringify(data) }),
  joinCommunity: (join_code: string) =>
    request("/api/communities/join", { method: "POST", body: JSON.stringify({ join_code }) }),
  getMyCommunities: () => request("/api/communities/my"),
  getAllCommunities: () => request("/api/communities/all"),
  getCommunity: (id: number) => request(`/api/communities/${id}`),
  getCommunityMembers: (id: number) => request(`/api/communities/${id}/members`),

  // Items
  createItem: (data: { title: string; description: string; category: string; price_per_day: number; community_id: number; image_url?: string; image_urls?: string[] }) =>
    request("/api/items/", { method: "POST", body: JSON.stringify(data) }),
  getCommunityItems: (communityId: number, category?: string, search?: string) => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (search) params.set("search", search);
    const qs = params.toString();
    return request(`/api/items/community/${communityId}${qs ? `?${qs}` : ""}`);
  },
  getItem: (id: number) => request(`/api/items/${id}`),
  updateItem: (id: number, data: Record<string, unknown>) =>
    request(`/api/items/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteItem: (id: number) => request(`/api/items/${id}`, { method: "DELETE" }),

  // Rental requests
  createRental: (data: { item_id: number; start_date: string; end_date: string; message: string }) =>
    request("/api/items/rentals", { method: "POST", body: JSON.stringify(data) }),
  getMyRentals: () => request("/api/items/rentals/my"),
  updateRental: (id: number, status: string) =>
    request(`/api/items/rentals/${id}`, { method: "PUT", body: JSON.stringify({ status }) }),

  // Services
  createService: (data: { title: string; description: string; category: string; price: number; community_id: number }) =>
    request("/api/services/", { method: "POST", body: JSON.stringify(data) }),
  getCommunityServices: (communityId: number, category?: string, search?: string) => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (search) params.set("search", search);
    const qs = params.toString();
    return request(`/api/services/community/${communityId}${qs ? `?${qs}` : ""}`);
  },
  getService: (id: number) => request(`/api/services/${id}`),
  deleteService: (id: number) => request(`/api/services/${id}`, { method: "DELETE" }),

  // Service bookings
  createBooking: (data: { service_id: number; scheduled_date: string; message: string }) =>
    request("/api/services/bookings", { method: "POST", body: JSON.stringify(data) }),
  getMyBookings: () => request("/api/services/bookings/my"),
  updateBooking: (id: number, status: string) =>
    request(`/api/services/bookings/${id}`, { method: "PUT", body: JSON.stringify({ status }) }),

  // Discussions
  createDiscussion: (data: { community_id: number; title: string; content: string; category: string }) =>
    request("/api/discussions/", { method: "POST", body: JSON.stringify(data) }),
  getCommunityDiscussions: (communityId: number, category?: string) =>
    request(`/api/discussions/community/${communityId}${category ? `?category=${category}` : ""}`),
  getDiscussion: (id: number) => request(`/api/discussions/${id}`),
  getComments: (discussionId: number) => request(`/api/discussions/${discussionId}/comments`),
  addComment: (discussionId: number, content: string) =>
    request(`/api/discussions/${discussionId}/comments`, { method: "POST", body: JSON.stringify({ content }) }),

  // Messages
  sendMessage: (data: { receiver_id: number; content: string }) =>
    request("/api/messages/", { method: "POST", body: JSON.stringify(data) }),
  getConversations: () => request("/api/messages/conversations"),
  getMessages: (userId: number) => request(`/api/messages/with/${userId}`),

  // Reviews
  createReview: (data: { reviewed_user_id: number; rating: number; comment: string; item_id?: number; service_id?: number; rental_id?: number; booking_id?: number }) =>
    request("/api/reviews/", { method: "POST", body: JSON.stringify(data) }),
  getUserReviews: (userId: number) => request(`/api/reviews/user/${userId}`),
  getRentalReviews: (rentalId: number) => request(`/api/reviews/rental/${rentalId}`),
  getBookingReviews: (bookingId: number) => request(`/api/reviews/booking/${bookingId}`),
  getMyReviews: () => request("/api/reviews/my"),
};
