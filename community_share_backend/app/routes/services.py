from fastapi import APIRouter, HTTPException, Depends
from typing import List
from app.schemas.schemas import ServiceCreate, ServiceUpdate, ServiceOut, ServiceBookingCreate, ServiceBookingOut, ServiceBookingUpdate
from app.utils.auth import get_current_user_id
from app.database import get_db

router = APIRouter(prefix="/api/services", tags=["services"])


def _check_membership(db, community_id: int, user_id: int):
    member = db.execute(
        "SELECT id FROM community_members WHERE community_id = ? AND user_id = ?",
        (community_id, user_id),
    ).fetchone()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this community")


@router.post("/", response_model=ServiceOut)
async def create_service(data: ServiceCreate, current_user_id: int = Depends(get_current_user_id)):
    with get_db() as db:
        _check_membership(db, data.community_id, current_user_id)
        cursor = db.execute(
            "INSERT INTO services (title, description, category, price, provider_id, community_id) VALUES (?, ?, ?, ?, ?, ?)",
            (data.title, data.description, data.category, data.price, current_user_id, data.community_id),
        )
        row = db.execute(
            """SELECT s.*, u.full_name as provider_name FROM services s
               JOIN users u ON u.id = s.provider_id WHERE s.id = ?""",
            (cursor.lastrowid,),
        ).fetchone()
    return _service_from_row(row)


@router.get("/community/{community_id}", response_model=List[ServiceOut])
async def get_community_services(community_id: int, category: str = None, search: str = None, current_user_id: int = Depends(get_current_user_id)):
    with get_db() as db:
        _check_membership(db, community_id, current_user_id)
        query = """SELECT s.*, u.full_name as provider_name, u.avatar_url as provider_avatar_url,
                   (SELECT ROUND(AVG(rv.rating), 1) FROM reviews rv WHERE rv.reviewed_user_id = s.provider_id) as provider_avg_rating
                   FROM services s
                   JOIN users u ON u.id = s.provider_id
                   WHERE s.community_id = ?"""
        params: list = [community_id]
        if category:
            query += " AND s.category = ?"
            params.append(category)
        if search:
            query += " AND (LOWER(s.title) LIKE ? OR LOWER(s.description) LIKE ?)"
            params.extend([f"%{search.lower()}%", f"%{search.lower()}%"])
        query += " ORDER BY s.created_at DESC"
        rows = db.execute(query, params).fetchall()
    return [_service_from_row(r) for r in rows]


@router.get("/{service_id}", response_model=ServiceOut)
async def get_service(service_id: int):
    with get_db() as db:
        row = db.execute(
            """SELECT s.*, u.full_name as provider_name FROM services s
               JOIN users u ON u.id = s.provider_id WHERE s.id = ?""",
            (service_id,),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Service not found")
    return _service_from_row(row)


@router.put("/{service_id}", response_model=ServiceOut)
async def update_service(service_id: int, data: ServiceUpdate, current_user_id: int = Depends(get_current_user_id)):
    with get_db() as db:
        svc = db.execute("SELECT * FROM services WHERE id = ?", (service_id,)).fetchone()
        if not svc:
            raise HTTPException(status_code=404, detail="Service not found")
        if svc["provider_id"] != current_user_id:
            raise HTTPException(status_code=403, detail="Not the provider")
        fields = {}
        for field in ["title", "description", "category", "price"]:
            val = getattr(data, field, None)
            if val is not None:
                fields[field] = val
        if data.is_available is not None:
            fields["is_available"] = 1 if data.is_available else 0
        if fields:
            set_clause = ", ".join(f"{k} = ?" for k in fields)
            values = list(fields.values()) + [service_id]
            db.execute(f"UPDATE services SET {set_clause} WHERE id = ?", values)
        row = db.execute(
            """SELECT s.*, u.full_name as provider_name FROM services s
               JOIN users u ON u.id = s.provider_id WHERE s.id = ?""",
            (service_id,),
        ).fetchone()
    return _service_from_row(row)


@router.delete("/{service_id}")
async def delete_service(service_id: int, current_user_id: int = Depends(get_current_user_id)):
    with get_db() as db:
        svc = db.execute("SELECT * FROM services WHERE id = ?", (service_id,)).fetchone()
        if not svc:
            raise HTTPException(status_code=404, detail="Service not found")
        if svc["provider_id"] != current_user_id:
            raise HTTPException(status_code=403, detail="Not the provider")
        db.execute("DELETE FROM services WHERE id = ?", (service_id,))
    return {"status": "deleted"}


# Service bookings
@router.post("/bookings", response_model=ServiceBookingOut)
async def create_booking(data: ServiceBookingCreate, current_user_id: int = Depends(get_current_user_id)):
    with get_db() as db:
        svc = db.execute("SELECT * FROM services WHERE id = ?", (data.service_id,)).fetchone()
        if not svc:
            raise HTTPException(status_code=404, detail="Service not found")
        if svc["provider_id"] == current_user_id:
            raise HTTPException(status_code=400, detail="Cannot book your own service")
        cursor = db.execute(
            "INSERT INTO service_bookings (service_id, requester_id, scheduled_date, message) VALUES (?, ?, ?, ?)",
            (data.service_id, current_user_id, data.scheduled_date, data.message),
        )
        row = db.execute(
            """SELECT sb.*, u.full_name as requester_name, s.title as service_title
               FROM service_bookings sb
               JOIN users u ON u.id = sb.requester_id
               JOIN services s ON s.id = sb.service_id
               WHERE sb.id = ?""",
            (cursor.lastrowid,),
        ).fetchone()
    return _booking_from_row(row)


@router.get("/bookings/my", response_model=List[ServiceBookingOut])
async def get_my_bookings(current_user_id: int = Depends(get_current_user_id)):
    with get_db() as db:
        rows = db.execute(
            """SELECT sb.*, u.full_name as requester_name, u.avatar_url as requester_avatar_url,
               s.title as service_title,
               s.provider_id as provider_id, pu.full_name as provider_name,
               (SELECT ROUND(AVG(rv.rating), 1) FROM reviews rv WHERE rv.reviewed_user_id = sb.requester_id) as requester_avg_rating
               FROM service_bookings sb
               JOIN users u ON u.id = sb.requester_id
               JOIN services s ON s.id = sb.service_id
               JOIN users pu ON pu.id = s.provider_id
               WHERE sb.requester_id = ? OR s.provider_id = ?
               ORDER BY sb.created_at DESC""",
            (current_user_id, current_user_id),
        ).fetchall()
    return [_booking_from_row(r) for r in rows]


@router.put("/bookings/{booking_id}", response_model=ServiceBookingOut)
async def update_booking(booking_id: int, data: ServiceBookingUpdate, current_user_id: int = Depends(get_current_user_id)):
    with get_db() as db:
        sb = db.execute(
            """SELECT sb.*, s.provider_id, sb.service_id FROM service_bookings sb
               JOIN services s ON s.id = sb.service_id WHERE sb.id = ?""",
            (booking_id,),
        ).fetchone()
        if not sb:
            raise HTTPException(status_code=404, detail="Booking not found")
        if sb["provider_id"] != current_user_id:
            raise HTTPException(status_code=403, detail="Only service provider can update status")
        db.execute("UPDATE service_bookings SET status = ? WHERE id = ?", (data.status, booking_id))
        row = db.execute(
            """SELECT sb.*, u.full_name as requester_name, s.title as service_title
               FROM service_bookings sb
               JOIN users u ON u.id = sb.requester_id
               JOIN services s ON s.id = sb.service_id
               WHERE sb.id = ?""",
            (booking_id,),
        ).fetchone()
    return _booking_from_row(row)


def _service_from_row(row):
    d = dict(row)
    return ServiceOut(
        id=d["id"], title=d["title"], description=d["description"],
        category=d["category"], price=d["price"],
        is_available=bool(d["is_available"]),
        provider_id=d["provider_id"], community_id=d["community_id"],
        created_at=d["created_at"], provider_name=d["provider_name"],
        provider_avatar_url=d.get("provider_avatar_url"),
        provider_avg_rating=d.get("provider_avg_rating"),
    )


def _booking_from_row(row):
    d = dict(row)
    return ServiceBookingOut(
        id=d["id"], service_id=d["service_id"], requester_id=d["requester_id"],
        scheduled_date=d["scheduled_date"], status=d["status"],
        message=d["message"], created_at=d["created_at"],
        requester_name=d["requester_name"], service_title=d["service_title"],
        provider_id=d.get("provider_id"), provider_name=d.get("provider_name"),
        requester_avatar_url=d.get("requester_avatar_url"),
        requester_avg_rating=d.get("requester_avg_rating"),
    )
