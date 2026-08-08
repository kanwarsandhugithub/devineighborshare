from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# Auth
class UserRegister(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    phone: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: str = ""
    unit: str = ""
    created_at: Optional[str] = None
    avg_rating: Optional[float] = None
    is_super_admin: bool = False


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    unit: Optional[str] = None
    avatar_url: Optional[str] = None


# Community
class CommunityCreate(BaseModel):
    name: str
    description: str = ""
    address: str = ""


class CommunityOut(BaseModel):
    id: int
    name: str
    description: str
    address: str
    join_code: str
    created_by: int
    created_at: Optional[str] = None
    member_count: Optional[int] = None


class CommunityJoin(BaseModel):
    join_code: str


class CommunityUpdate(BaseModel):
    join_code: str


# Items
class ItemCreate(BaseModel):
    title: str
    description: str = ""
    category: str = "other"
    price_per_day: float = 0
    price_unit: str = "per_day"
    image_url: Optional[str] = None
    image_urls: Optional[List[str]] = None
    community_id: int


class ItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    price_per_day: Optional[float] = None
    price_unit: Optional[str] = None
    image_url: Optional[str] = None
    image_urls: Optional[List[str]] = None
    is_available: Optional[bool] = None


class ItemOut(BaseModel):
    id: int
    title: str
    description: str
    category: str
    price_per_day: float
    price_unit: str
    image_url: Optional[str] = None
    image_urls: List[str] = []
    is_available: bool
    owner_id: int
    community_id: int
    created_at: Optional[str] = None
    owner_name: Optional[str] = None
    owner_avatar_url: Optional[str] = None
    owner_avg_rating: Optional[float] = None
    rental_count: int = 0


# Services
class ServiceCreate(BaseModel):
    title: str
    description: str = ""
    category: str = "other"
    price: float = 0
    price_unit: str = "per_service"
    community_id: int


class ServiceUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    price_unit: Optional[str] = None
    is_available: Optional[bool] = None


class ServiceOut(BaseModel):
    id: int
    title: str
    description: str
    category: str
    price: float
    price_unit: str
    is_available: bool
    provider_id: int
    community_id: int
    created_at: Optional[str] = None
    provider_name: Optional[str] = None
    provider_avatar_url: Optional[str] = None
    provider_avg_rating: Optional[float] = None
    booking_count: int = 0


# Rental Requests
class RentalRequestCreate(BaseModel):
    item_id: int
    start_date: str
    end_date: str
    message: str = ""


class RentalRequestOut(BaseModel):
    id: int
    item_id: int
    requester_id: int
    start_date: str
    end_date: str
    status: str
    message: str
    created_at: Optional[str] = None
    requester_name: Optional[str] = None
    item_title: Optional[str] = None
    owner_id: Optional[int] = None
    owner_name: Optional[str] = None
    requester_avatar_url: Optional[str] = None
    requester_avg_rating: Optional[float] = None


class RentalRequestUpdate(BaseModel):
    status: str  # approved, rejected


# Service Bookings
class ServiceBookingCreate(BaseModel):
    service_id: int
    scheduled_date: str
    message: str = ""


class ServiceBookingOut(BaseModel):
    id: int
    service_id: int
    requester_id: int
    scheduled_date: str
    status: str
    message: str
    created_at: Optional[str] = None
    requester_name: Optional[str] = None
    service_title: Optional[str] = None
    provider_id: Optional[int] = None
    provider_name: Optional[str] = None
    requester_avatar_url: Optional[str] = None
    requester_avg_rating: Optional[float] = None


class ServiceBookingUpdate(BaseModel):
    status: str  # approved, rejected


# Reviews
class ReviewCreate(BaseModel):
    reviewed_user_id: int
    rating: int
    comment: str = ""
    item_id: Optional[int] = None
    service_id: Optional[int] = None
    rental_id: Optional[int] = None
    booking_id: Optional[int] = None


class ReviewOut(BaseModel):
    id: int
    reviewer_id: int
    reviewed_user_id: int
    rating: int
    comment: str
    item_id: Optional[int] = None
    service_id: Optional[int] = None
    rental_id: Optional[int] = None
    booking_id: Optional[int] = None
    created_at: Optional[str] = None
    reviewer_name: Optional[str] = None
    reviewer_avatar_url: Optional[str] = None
    reviewer_avg_rating: Optional[float] = None


# Discussions
class DiscussionCreate(BaseModel):
    community_id: int
    title: str
    content: str
    category: str = "general"


class DiscussionOut(BaseModel):
    id: int
    community_id: int
    author_id: int
    title: str
    content: str
    category: str
    pinned: bool
    created_at: Optional[str] = None
    author_name: Optional[str] = None
    author_avatar_url: Optional[str] = None
    author_avg_rating: Optional[float] = None
    comment_count: Optional[int] = None


class CommentCreate(BaseModel):
    content: str


class CommentOut(BaseModel):
    id: int
    discussion_id: int
    author_id: int
    content: str
    created_at: Optional[str] = None
    author_name: Optional[str] = None
    author_avatar_url: Optional[str] = None
    author_avg_rating: Optional[float] = None


# Messages
class MessageCreate(BaseModel):
    receiver_id: int
    content: str


class MessageOut(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    content: str
    is_read: bool
    created_at: Optional[str] = None
    sender_name: Optional[str] = None
    receiver_name: Optional[str] = None


class ConversationOut(BaseModel):
    user_id: int
    user_name: str
    user_avatar_url: Optional[str] = None
    user_avg_rating: Optional[float] = None
    last_message: str
    last_message_at: Optional[str] = None
    unread_count: int = 0
