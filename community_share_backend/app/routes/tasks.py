from fastapi import APIRouter, HTTPException, Depends
from typing import List
from app.schemas.schemas import (
    TaskRequestCreate,
    TaskRequestUpdate,
    TaskRequestOut,
    TaskOfferCreate,
    TaskOfferUpdate,
    TaskOfferOut,
)
from app.utils.auth import get_current_user_id
from app.database import get_db

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


def _check_membership(community_id: int, user_id: int):
    with get_db() as db:
        member = db.execute(
            "SELECT id FROM community_members WHERE community_id = ? AND user_id = ?",
            (community_id, user_id),
        ).fetchone()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this community")


def _offer_from_row(row):
    d = dict(row)
    return TaskOfferOut(
        id=d["id"],
        task_request_id=d["task_request_id"],
        helper_id=d["helper_id"],
        helper_name=d["helper_name"],
        helper_avatar_url=d.get("helper_avatar_url"),
        helper_avg_rating=d.get("helper_avg_rating"),
        status=d["status"],
        message=d["message"],
        created_at=d["created_at"],
    )


def _task_from_row(row):
    d = dict(row)
    return TaskRequestOut(
        id=d["id"],
        title=d["title"],
        description=d["description"],
        category=d["category"],
        people_needed=d["people_needed"],
        location=d["location"],
        scheduled_date=d["scheduled_date"],
        compensation=d["compensation"],
        status=d["status"],
        requester_id=d["requester_id"],
        requester_name=d["requester_name"],
        requester_avatar_url=d.get("requester_avatar_url"),
        requester_avg_rating=d.get("requester_avg_rating"),
        community_id=d["community_id"],
        created_at=d["created_at"],
        approved_count=d.get("approved_count", 0),
        pending_count=d.get("pending_count", 0),
    )


@router.post("/", response_model=TaskRequestOut)
async def create_task(data: TaskRequestCreate, current_user_id: int = Depends(get_current_user_id)):
    _check_membership(data.community_id, current_user_id)
    with get_db() as db:
        cursor = db.execute(
            """INSERT INTO task_requests (title, description, category, people_needed, location, scheduled_date, compensation, requester_id, community_id)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (data.title, data.description, data.category, data.people_needed, data.location,
             data.scheduled_date, data.compensation, current_user_id, data.community_id),
        )
        row = db.execute(
            """SELECT t.*, u.full_name as requester_name FROM task_requests t
               JOIN users u ON u.id = t.requester_id WHERE t.id = ?""",
            (cursor.lastrowid,),
        ).fetchone()
    return _task_from_row(row)


@router.get("/community/{community_id}", response_model=List[TaskRequestOut])
async def get_community_tasks(community_id: int, current_user_id: int = Depends(get_current_user_id)):
    _check_membership(community_id, current_user_id)
    with get_db() as db:
        rows = db.execute(
            """SELECT t.*, u.full_name as requester_name, u.avatar_url as requester_avatar_url,
               (SELECT ROUND(AVG(rv.rating), 1) FROM reviews rv WHERE rv.reviewed_user_id = t.requester_id) as requester_avg_rating,
               (SELECT COUNT(*) FROM task_offers to2 WHERE to2.task_request_id = t.id AND to2.status = 'approved') as approved_count,
               (SELECT COUNT(*) FROM task_offers to2 WHERE to2.task_request_id = t.id AND to2.status = 'pending') as pending_count
               FROM task_requests t
               JOIN users u ON u.id = t.requester_id
               WHERE t.community_id = ?
               ORDER BY t.created_at DESC""",
            (community_id,),
        ).fetchall()
    return [_task_from_row(r) for r in rows]


@router.get("/{task_id}", response_model=TaskRequestOut)
async def get_task(task_id: int, current_user_id: int = Depends(get_current_user_id)):
    with get_db() as db:
        row = db.execute(
            """SELECT t.*, u.full_name as requester_name, u.avatar_url as requester_avatar_url,
               (SELECT ROUND(AVG(rv.rating), 1) FROM reviews rv WHERE rv.reviewed_user_id = t.requester_id) as requester_avg_rating,
               (SELECT COUNT(*) FROM task_offers to2 WHERE to2.task_request_id = t.id AND to2.status = 'approved') as approved_count,
               (SELECT COUNT(*) FROM task_offers to2 WHERE to2.task_request_id = t.id AND to2.status = 'pending') as pending_count
               FROM task_requests t
               JOIN users u ON u.id = t.requester_id
               WHERE t.id = ?""",
            (task_id,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Task not found")
    return _task_from_row(row)


@router.put("/{task_id}", response_model=TaskRequestOut)
async def update_task(task_id: int, data: TaskRequestUpdate, current_user_id: int = Depends(get_current_user_id)):
    with get_db() as db:
        task = db.execute("SELECT * FROM task_requests WHERE id = ?", (task_id,)).fetchone()
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        if task["requester_id"] != current_user_id:
            raise HTTPException(status_code=403, detail="Not the requester")
        fields = {}
        for field in ["title", "description", "category", "people_needed", "location", "scheduled_date", "compensation", "status"]:
            val = getattr(data, field, None)
            if val is not None:
                fields[field] = val
        if fields:
            set_clause = ", ".join(f"{k} = ?" for k in fields)
            values = list(fields.values()) + [task_id]
            db.execute(f"UPDATE task_requests SET {set_clause} WHERE id = ?", values)
        row = db.execute(
            """SELECT t.*, u.full_name as requester_name FROM task_requests t
               JOIN users u ON u.id = t.requester_id WHERE t.id = ?""",
            (task_id,),
        ).fetchone()
    return _task_from_row(row)


@router.delete("/{task_id}")
async def delete_task(task_id: int, current_user_id: int = Depends(get_current_user_id)):
    with get_db() as db:
        task = db.execute("SELECT * FROM task_requests WHERE id = ?", (task_id,)).fetchone()
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        if task["requester_id"] != current_user_id:
            raise HTTPException(status_code=403, detail="Not the requester")
        db.execute("DELETE FROM task_requests WHERE id = ?", (task_id,))
    return {"message": "Task deleted"}


@router.post("/{task_id}/offers", response_model=TaskOfferOut)
async def create_offer(task_id: int, data: TaskOfferCreate, current_user_id: int = Depends(get_current_user_id)):
    with get_db() as db:
        task = db.execute("SELECT * FROM task_requests WHERE id = ?", (task_id,)).fetchone()
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        if task["requester_id"] == current_user_id:
            raise HTTPException(status_code=400, detail="Cannot offer on your own task")
        approved = db.execute(
            "SELECT COUNT(*) as c FROM task_offers WHERE task_request_id = ? AND status = 'approved'",
            (task_id,),
        ).fetchone()["c"]
        if approved >= task["people_needed"]:
            raise HTTPException(status_code=400, detail="Task already has enough helpers")
        existing = db.execute(
            "SELECT id FROM task_offers WHERE task_request_id = ? AND helper_id = ?",
            (task_id, current_user_id),
        ).fetchone()
        if existing:
            raise HTTPException(status_code=400, detail="Already offered to help")
        cursor = db.execute(
            "INSERT INTO task_offers (task_request_id, helper_id, message) VALUES (?, ?, ?)",
            (task_id, current_user_id, data.message),
        )
        row = db.execute(
            """SELECT to2.*, u.full_name as helper_name, u.avatar_url as helper_avatar_url,
               (SELECT ROUND(AVG(rv.rating), 1) FROM reviews rv WHERE rv.reviewed_user_id = to2.helper_id) as helper_avg_rating
               FROM task_offers to2
               JOIN users u ON u.id = to2.helper_id
               WHERE to2.id = ?""",
            (cursor.lastrowid,),
        ).fetchone()
    return _offer_from_row(row)


@router.get("/{task_id}/offers", response_model=List[TaskOfferOut])
async def get_task_offers(task_id: int, current_user_id: int = Depends(get_current_user_id)):
    with get_db() as db:
        task = db.execute("SELECT * FROM task_requests WHERE id = ?", (task_id,)).fetchone()
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        if task["requester_id"] != current_user_id:
            # Helpers can only see their own offer
            rows = db.execute(
                """SELECT to2.*, u.full_name as helper_name, u.avatar_url as helper_avatar_url,
                   (SELECT ROUND(AVG(rv.rating), 1) FROM reviews rv WHERE rv.reviewed_user_id = to2.helper_id) as helper_avg_rating
                   FROM task_offers to2
                   JOIN users u ON u.id = to2.helper_id
                   WHERE to2.task_request_id = ? AND to2.helper_id = ?""",
                (task_id, current_user_id),
            ).fetchall()
        else:
            rows = db.execute(
                """SELECT to2.*, u.full_name as helper_name, u.avatar_url as helper_avatar_url,
                   (SELECT ROUND(AVG(rv.rating), 1) FROM reviews rv WHERE rv.reviewed_user_id = to2.helper_id) as helper_avg_rating
                   FROM task_offers to2
                   JOIN users u ON u.id = to2.helper_id
                   WHERE to2.task_request_id = ?""",
                (task_id,),
            ).fetchall()
    return [_offer_from_row(r) for r in rows]


@router.put("/offers/{offer_id}", response_model=TaskOfferOut)
async def update_offer(offer_id: int, data: TaskOfferUpdate, current_user_id: int = Depends(get_current_user_id)):
    with get_db() as db:
        offer = db.execute(
            """SELECT to2.*, t.requester_id, t.people_needed FROM task_offers to2
               JOIN task_requests t ON t.id = to2.task_request_id
               WHERE to2.id = ?""",
            (offer_id,),
        ).fetchone()
        if not offer:
            raise HTTPException(status_code=404, detail="Offer not found")
        if offer["requester_id"] != current_user_id:
            raise HTTPException(status_code=403, detail="Not the requester")
        approved = db.execute(
            "SELECT COUNT(*) as c FROM task_offers WHERE task_request_id = ? AND status = 'approved'",
            (offer["task_request_id"],),
        ).fetchone()["c"]
        if data.status == "approved" and approved >= offer["people_needed"]:
            raise HTTPException(status_code=400, detail="Already have enough helpers")
        db.execute("UPDATE task_offers SET status = ? WHERE id = ?", (data.status, offer_id))
        if data.status == "approved":
            # Auto-decline other pending offers if full
            new_approved = db.execute(
                "SELECT COUNT(*) as c FROM task_offers WHERE task_request_id = ? AND status = 'approved'",
                (offer["task_request_id"],),
            ).fetchone()["c"]
            if new_approved >= offer["people_needed"]:
                db.execute(
                    "UPDATE task_offers SET status = 'declined' WHERE task_request_id = ? AND status = 'pending'",
                    (offer["task_request_id"],),
                )
        row = db.execute(
            """SELECT to2.*, u.full_name as helper_name, u.avatar_url as helper_avatar_url,
               (SELECT ROUND(AVG(rv.rating), 1) FROM reviews rv WHERE rv.reviewed_user_id = to2.helper_id) as helper_avg_rating
               FROM task_offers to2
               JOIN users u ON u.id = to2.helper_id
               WHERE to2.id = ?""",
            (offer_id,),
        ).fetchone()
    return _offer_from_row(row)
