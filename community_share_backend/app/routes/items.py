from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import List
from app.schemas.schemas import ItemCreate, ItemUpdate, ItemOut, RentalRequestCreate, RentalRequestOut, RentalRequestUpdate
from app.utils.auth import get_current_user_id
from app.utils.email import send_rental_request_email, send_rental_status_email
from app.utils.notifications import notify_community
from app.database import get_db

router = APIRouter(prefix="/api/items", tags=["items"])


def _check_membership(db, community_id: int, user_id: int):
    member = db.execute(
        "SELECT id FROM community_members WHERE community_id = ? AND user_id = ?",
        (community_id, user_id),
    ).fetchone()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this community")


@router.post("/", response_model=ItemOut)
async def create_item(data: ItemCreate, current_user_id: int = Depends(get_current_user_id)):
    with get_db() as db:
        _check_membership(db, data.community_id, current_user_id)
        # Use first image_url from image_urls list if provided, else fall back to image_url
        primary_image = data.image_url
        if data.image_urls and len(data.image_urls) > 0:
            primary_image = data.image_urls[0]
        cursor = db.execute(
            "INSERT INTO items (title, description, category, price_per_day, price_unit, image_url, owner_id, community_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (data.title, data.description, data.category, data.price_per_day, data.price_unit, primary_image, current_user_id, data.community_id),
        )
        item_id = cursor.lastrowid
        # Save all images to item_images table
        all_urls = data.image_urls or ([data.image_url] if data.image_url else [])
        for idx, url in enumerate(all_urls[:5]):
            db.execute(
                "INSERT INTO item_images (item_id, image_url, display_order) VALUES (?, ?, ?)",
                (item_id, url, idx),
            )
        notify_community(
            db,
            data.community_id,
            current_user_id,
            "item",
            "New item listed",
            f"A new item '{data.title}' was listed in your community",
            {"type": "item", "id": item_id, "community_id": data.community_id},
        )
        row = db.execute(
            """SELECT i.*, u.full_name as owner_name FROM items i
               JOIN users u ON u.id = i.owner_id WHERE i.id = ?""",
            (item_id,),
        ).fetchone()
        image_urls = _get_item_image_urls(db, item_id)
    return _item_from_row(row, image_urls)


@router.get("/community/{community_id}", response_model=List[ItemOut])
async def get_community_items(community_id: int, category: str = None, search: str = None, current_user_id: int = Depends(get_current_user_id)):
    with get_db() as db:
        _check_membership(db, community_id, current_user_id)
        query = """SELECT i.*, u.full_name as owner_name, u.avatar_url as owner_avatar_url,
                   (SELECT ROUND(AVG(rv.rating), 1) FROM reviews rv WHERE rv.reviewed_user_id = i.owner_id) as owner_avg_rating,
                   (SELECT COUNT(*) FROM rental_requests rr WHERE rr.item_id = i.id AND rr.status NOT IN ('pending', 'rejected')) as rental_count
                   FROM items i
                   JOIN users u ON u.id = i.owner_id
                   WHERE i.community_id = ?"""
        params: list = [community_id]
        if category:
            query += " AND i.category = ?"
            params.append(category)
        if search:
            query += " AND (LOWER(i.title) LIKE ? OR LOWER(i.description) LIKE ?)"
            params.extend([f"%{search.lower()}%", f"%{search.lower()}%"])
        query += " ORDER BY i.created_at DESC"
        rows = db.execute(query, params).fetchall()
        results = []
        for r in rows:
            image_urls = _get_item_image_urls(db, r["id"])
            results.append(_item_from_row(r, image_urls))
    return results


@router.get("/my", response_model=List[ItemOut])
async def get_my_items(current_user_id: int = Depends(get_current_user_id)):
    with get_db() as db:
        rows = db.execute(
            """SELECT i.*, u.full_name as owner_name,
               (SELECT COUNT(*) FROM rental_requests rr WHERE rr.item_id = i.id AND rr.status NOT IN ('pending', 'rejected')) as rental_count
               FROM items i
               JOIN users u ON u.id = i.owner_id WHERE i.owner_id = ?
               ORDER BY i.created_at DESC""",
            (current_user_id,),
        ).fetchall()
        results = []
        for r in rows:
            image_urls = _get_item_image_urls(db, r["id"])
            results.append(_item_from_row(r, image_urls))
        return results


@router.get("/user/{user_id}", response_model=List[ItemOut])
async def get_user_items(user_id: int, current_user_id: int = Depends(get_current_user_id)):
    with get_db() as db:
        rows = db.execute(
            """SELECT i.*, u.full_name as owner_name, u.avatar_url as owner_avatar_url,
               (SELECT ROUND(AVG(rv.rating), 1) FROM reviews rv WHERE rv.reviewed_user_id = i.owner_id) as owner_avg_rating,
               (SELECT COUNT(*) FROM rental_requests rr WHERE rr.item_id = i.id AND rr.status NOT IN ('pending', 'rejected')) as rental_count
               FROM items i
               JOIN users u ON u.id = i.owner_id
               WHERE i.owner_id = ?
               ORDER BY i.created_at DESC""",
            (user_id,),
        ).fetchall()
        results = []
        for r in rows:
            image_urls = _get_item_image_urls(db, r["id"])
            results.append(_item_from_row(r, image_urls))
    return results


@router.get("/{item_id}", response_model=ItemOut)
async def get_item(item_id: int):
    with get_db() as db:
        row = db.execute(
            """SELECT i.*, u.full_name as owner_name,
               (SELECT COUNT(*) FROM rental_requests rr WHERE rr.item_id = i.id AND rr.status NOT IN ('pending', 'rejected')) as rental_count
               FROM items i
               JOIN users u ON u.id = i.owner_id WHERE i.id = ?""",
            (item_id,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Item not found")
        image_urls = _get_item_image_urls(db, item_id)
    return _item_from_row(row, image_urls)


@router.put("/{item_id}", response_model=ItemOut)
async def update_item(item_id: int, data: ItemUpdate, current_user_id: int = Depends(get_current_user_id)):
    with get_db() as db:
        item = db.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        if item["owner_id"] != current_user_id:
            raise HTTPException(status_code=403, detail="Not the owner")
        fields = {}
        for field in ["title", "description", "category", "price_per_day", "price_unit", "image_url"]:
            val = getattr(data, field, None)
            if val is not None:
                fields[field] = val
        if data.is_available is not None:
            fields["is_available"] = 1 if data.is_available else 0
        # Handle image_urls update
        if data.image_urls is not None:
            if len(data.image_urls) > 0:
                fields["image_url"] = data.image_urls[0]
            else:
                fields["image_url"] = None
            # Replace all item images
            db.execute("DELETE FROM item_images WHERE item_id = ?", (item_id,))
            for idx, url in enumerate(data.image_urls[:5]):
                db.execute(
                    "INSERT INTO item_images (item_id, image_url, display_order) VALUES (?, ?, ?)",
                    (item_id, url, idx),
                )
        if fields:
            set_clause = ", ".join(f"{k} = ?" for k in fields)
            values = list(fields.values()) + [item_id]
            db.execute(f"UPDATE items SET {set_clause} WHERE id = ?", values)
        row = db.execute(
            """SELECT i.*, u.full_name as owner_name FROM items i
               JOIN users u ON u.id = i.owner_id WHERE i.id = ?""",
            (item_id,),
        ).fetchone()
        image_urls = _get_item_image_urls(db, item_id)
    return _item_from_row(row, image_urls)


@router.delete("/{item_id}")
async def delete_item(item_id: int, current_user_id: int = Depends(get_current_user_id)):
    with get_db() as db:
        item = db.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        if item["owner_id"] != current_user_id:
            raise HTTPException(status_code=403, detail="Not the owner")
        
        # Cascade delete related data
        db.execute("DELETE FROM reviews WHERE item_id = ?", (item_id,))
        db.execute("DELETE FROM rental_requests WHERE item_id = ?", (item_id,))
        db.execute("DELETE FROM item_images WHERE item_id = ?", (item_id,))
        db.execute("DELETE FROM items WHERE id = ?", (item_id,))
        
    return {"status": "deleted"}


# Rental requests
@router.post("/rentals", response_model=RentalRequestOut)
async def create_rental_request(data: RentalRequestCreate, background_tasks: BackgroundTasks, current_user_id: int = Depends(get_current_user_id)):
    with get_db() as db:
        item = db.execute("SELECT * FROM items WHERE id = ?", (data.item_id,)).fetchone()
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        if item["owner_id"] == current_user_id:
            raise HTTPException(status_code=400, detail="Cannot rent your own item")
        cursor = db.execute(
            "INSERT INTO rental_requests (item_id, requester_id, start_date, end_date, message) VALUES (?, ?, ?, ?, ?)",
            (data.item_id, current_user_id, data.start_date, data.end_date, data.message),
        )
        row = db.execute(
            """SELECT rr.*, u.full_name as requester_name, i.title as item_title
               FROM rental_requests rr
               JOIN users u ON u.id = rr.requester_id
               JOIN items i ON i.id = rr.item_id
               WHERE rr.id = ?""",
            (cursor.lastrowid,),
        ).fetchone()
        # Send email to item owner
        owner = db.execute("SELECT email, full_name FROM users WHERE id = ?", (item["owner_id"],)).fetchone()
        requester = db.execute("SELECT full_name FROM users WHERE id = ?", (current_user_id,)).fetchone()
        if owner:
            background_tasks.add_task(
                send_rental_request_email, owner["email"], owner["full_name"],
                requester["full_name"], item["title"], data.start_date, data.end_date, data.message
            )
    return _rental_from_row(row)


@router.get("/rentals/my", response_model=List[RentalRequestOut])
async def get_my_rental_requests(current_user_id: int = Depends(get_current_user_id)):
    with get_db() as db:
        rows = db.execute(
            """SELECT rr.*, u.full_name as requester_name, u.avatar_url as requester_avatar_url,
               i.title as item_title,
               i.owner_id as owner_id, ou.full_name as owner_name,
               (SELECT ROUND(AVG(rv.rating), 1) FROM reviews rv WHERE rv.reviewed_user_id = rr.requester_id) as requester_avg_rating
               FROM rental_requests rr
               JOIN users u ON u.id = rr.requester_id
               JOIN items i ON i.id = rr.item_id
               JOIN users ou ON ou.id = i.owner_id
               WHERE rr.requester_id = ? OR i.owner_id = ?
               ORDER BY rr.created_at DESC""",
            (current_user_id, current_user_id),
        ).fetchall()
    return [_rental_from_row(r) for r in rows]


@router.put("/rentals/{request_id}", response_model=RentalRequestOut)
async def update_rental_request(request_id: int, data: RentalRequestUpdate, background_tasks: BackgroundTasks, current_user_id: int = Depends(get_current_user_id)):
    with get_db() as db:
        rr = db.execute(
            """SELECT rr.*, i.owner_id, rr.item_id FROM rental_requests rr
               JOIN items i ON i.id = rr.item_id WHERE rr.id = ?""",
            (request_id,),
        ).fetchone()
        if not rr:
            raise HTTPException(status_code=404, detail="Request not found")
        if rr["owner_id"] != current_user_id:
            raise HTTPException(status_code=403, detail="Only item owner can update status")
        db.execute("UPDATE rental_requests SET status = ? WHERE id = ?", (data.status, request_id))
        # When approved, mark item as unavailable
        if data.status == "approved":
            db.execute("UPDATE items SET is_available = 0 WHERE id = ?", (rr["item_id"],))
        # When returned or rejected, mark item as available again
        if data.status in ("returned", "rejected"):
            db.execute("UPDATE items SET is_available = 1 WHERE id = ?", (rr["item_id"],))
        row = db.execute(
            """SELECT rr.*, u.full_name as requester_name, i.title as item_title
               FROM rental_requests rr
               JOIN users u ON u.id = rr.requester_id
               JOIN items i ON i.id = rr.item_id
               WHERE rr.id = ?""",
            (request_id,),
        ).fetchone()
        # Send email to requester about status change
        requester = db.execute("SELECT email, full_name FROM users WHERE id = ?", (rr["requester_id"],)).fetchone()
        owner = db.execute("SELECT full_name FROM users WHERE id = ?", (current_user_id,)).fetchone()
        item = db.execute("SELECT title FROM items WHERE id = ?", (rr["item_id"],)).fetchone()
        if requester and data.status in ("approved", "rejected", "returned"):
            background_tasks.add_task(
                send_rental_status_email, requester["email"], requester["full_name"],
                item["title"], data.status, owner["full_name"]
            )
    return _rental_from_row(row)


def _get_item_image_urls(db, item_id: int) -> list:
    rows = db.execute(
        "SELECT image_url FROM item_images WHERE item_id = ? ORDER BY display_order",
        (item_id,),
    ).fetchall()
    return [r["image_url"] for r in rows]


def _item_from_row(row, image_urls: list = None):
    d = dict(row)
    return ItemOut(
        id=d["id"], title=d["title"], description=d["description"],
        category=d["category"], price_per_day=d["price_per_day"], price_unit=d.get("price_unit", "per_day"),
        image_url=d["image_url"], image_urls=image_urls or [],
        is_available=bool(d["is_available"]),
        owner_id=d["owner_id"], community_id=d["community_id"],
        created_at=d["created_at"], owner_name=d["owner_name"],
        owner_avatar_url=d.get("owner_avatar_url"),
        owner_avg_rating=d.get("owner_avg_rating"),
        rental_count=d.get("rental_count", 0),
    )


def _rental_from_row(row):
    d = dict(row)
    return RentalRequestOut(
        id=d["id"], item_id=d["item_id"], requester_id=d["requester_id"],
        start_date=d["start_date"], end_date=d["end_date"],
        status=d["status"], message=d["message"],
        created_at=d["created_at"], requester_name=d["requester_name"],
        item_title=d["item_title"],
        owner_id=d.get("owner_id"), owner_name=d.get("owner_name"),
        requester_avatar_url=d.get("requester_avatar_url"),
        requester_avg_rating=d.get("requester_avg_rating"),
    )
