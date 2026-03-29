from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from app.schemas.schemas import ReviewCreate, ReviewOut
from app.utils.auth import get_current_user_id
from app.database import get_db

router = APIRouter(prefix="/api/reviews", tags=["reviews"])


@router.post("/", response_model=ReviewOut)
async def create_review(data: ReviewCreate, current_user_id: int = Depends(get_current_user_id)):
    if data.reviewed_user_id == current_user_id:
        raise HTTPException(status_code=400, detail="Cannot review yourself")
    if data.rating < 1 or data.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be 1-5")
    with get_db() as db:
        user = db.execute("SELECT id FROM users WHERE id = ?", (data.reviewed_user_id,)).fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        # Prevent duplicate reviews for the same rental/booking
        if data.rental_id:
            existing = db.execute(
                "SELECT id FROM reviews WHERE rental_id = ? AND reviewer_id = ?",
                (data.rental_id, current_user_id),
            ).fetchone()
            if existing:
                raise HTTPException(status_code=400, detail="You already reviewed this rental")
        if data.booking_id:
            existing = db.execute(
                "SELECT id FROM reviews WHERE booking_id = ? AND reviewer_id = ?",
                (data.booking_id, current_user_id),
            ).fetchone()
            if existing:
                raise HTTPException(status_code=400, detail="You already reviewed this booking")
        cursor = db.execute(
            "INSERT INTO reviews (reviewer_id, reviewed_user_id, rating, comment, item_id, service_id, rental_id, booking_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (current_user_id, data.reviewed_user_id, data.rating, data.comment, data.item_id, data.service_id, data.rental_id, data.booking_id),
        )
        row = db.execute(
            """SELECT r.*, u.full_name as reviewer_name, u.avatar_url as reviewer_avatar_url,
               (SELECT ROUND(AVG(rv2.rating), 1) FROM reviews rv2 WHERE rv2.reviewed_user_id = r.reviewer_id) as reviewer_avg_rating
               FROM reviews r
               JOIN users u ON u.id = r.reviewer_id WHERE r.id = ?""",
            (cursor.lastrowid,),
        ).fetchone()
    return _review_from_row(row)


@router.get("/user/{user_id}", response_model=List[ReviewOut])
async def get_user_reviews(user_id: int):
    with get_db() as db:
        rows = db.execute(
            """SELECT r.*, u.full_name as reviewer_name, u.avatar_url as reviewer_avatar_url,
               (SELECT ROUND(AVG(rv2.rating), 1) FROM reviews rv2 WHERE rv2.reviewed_user_id = r.reviewer_id) as reviewer_avg_rating
               FROM reviews r
               JOIN users u ON u.id = r.reviewer_id
               WHERE r.reviewed_user_id = ? ORDER BY r.created_at DESC""",
            (user_id,),
        ).fetchall()
    return [_review_from_row(r) for r in rows]


@router.get("/rental/{rental_id}", response_model=List[ReviewOut])
async def get_rental_reviews(rental_id: int, current_user_id: int = Depends(get_current_user_id)):
    with get_db() as db:
        rows = db.execute(
            """SELECT r.*, u.full_name as reviewer_name, u.avatar_url as reviewer_avatar_url,
               (SELECT ROUND(AVG(rv2.rating), 1) FROM reviews rv2 WHERE rv2.reviewed_user_id = r.reviewer_id) as reviewer_avg_rating
               FROM reviews r
               JOIN users u ON u.id = r.reviewer_id
               WHERE r.rental_id = ? ORDER BY r.created_at DESC""",
            (rental_id,),
        ).fetchall()
    return [_review_from_row(r) for r in rows]


@router.get("/booking/{booking_id}", response_model=List[ReviewOut])
async def get_booking_reviews(booking_id: int, current_user_id: int = Depends(get_current_user_id)):
    with get_db() as db:
        rows = db.execute(
            """SELECT r.*, u.full_name as reviewer_name, u.avatar_url as reviewer_avatar_url,
               (SELECT ROUND(AVG(rv2.rating), 1) FROM reviews rv2 WHERE rv2.reviewed_user_id = r.reviewer_id) as reviewer_avg_rating
               FROM reviews r
               JOIN users u ON u.id = r.reviewer_id
               WHERE r.booking_id = ? ORDER BY r.created_at DESC""",
            (booking_id,),
        ).fetchall()
    return [_review_from_row(r) for r in rows]


@router.get("/my", response_model=List[ReviewOut])
async def get_my_reviews(current_user_id: int = Depends(get_current_user_id)):
    with get_db() as db:
        rows = db.execute(
            """SELECT r.*, u.full_name as reviewer_name, u.avatar_url as reviewer_avatar_url,
               (SELECT ROUND(AVG(rv2.rating), 1) FROM reviews rv2 WHERE rv2.reviewed_user_id = r.reviewer_id) as reviewer_avg_rating
               FROM reviews r
               JOIN users u ON u.id = r.reviewer_id
               WHERE r.reviewer_id = ? ORDER BY r.created_at DESC""",
            (current_user_id,),
        ).fetchall()
    return [_review_from_row(r) for r in rows]


def _review_from_row(row):
    d = dict(row)
    return ReviewOut(
        id=d["id"], reviewer_id=d["reviewer_id"],
        reviewed_user_id=d["reviewed_user_id"],
        rating=d["rating"], comment=d["comment"],
        item_id=d.get("item_id"), service_id=d.get("service_id"),
        rental_id=d.get("rental_id"), booking_id=d.get("booking_id"),
        created_at=d["created_at"], reviewer_name=d["reviewer_name"],
        reviewer_avatar_url=d.get("reviewer_avatar_url"),
        reviewer_avg_rating=d.get("reviewer_avg_rating"),
    )
