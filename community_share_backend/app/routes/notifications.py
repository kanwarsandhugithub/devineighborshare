from fastapi import APIRouter, HTTPException, Depends
from typing import List
from app.schemas.schemas import NotificationOut
from app.utils.auth import get_current_user_id
from app.database import get_db

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


def _notif_from_row(row):
    d = dict(row)
    return NotificationOut(
        id=d["id"],
        user_id=d["user_id"],
        type=d["type"],
        title=d["title"],
        message=d["message"],
        data=d.get("data", "{}"),
        is_read=d.get("is_read", 0) == 1,
        created_at=d.get("created_at"),
    )


@router.get("", response_model=List[NotificationOut])
async def get_notifications(current_user_id: int = Depends(get_current_user_id)):
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
            (current_user_id,),
        ).fetchall()
    return [_notif_from_row(r) for r in rows]


@router.get("/unread-count")
async def get_unread_count(current_user_id: int = Depends(get_current_user_id)):
    with get_db() as db:
        row = db.execute(
            "SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0",
            (current_user_id,),
        ).fetchone()
    return {"count": row["c"]}


@router.post("/{notification_id}/read")
async def mark_read(notification_id: int, current_user_id: int = Depends(get_current_user_id)):
    with get_db() as db:
        notif = db.execute(
            "SELECT * FROM notifications WHERE id = ?", (notification_id,)
        ).fetchone()
        if not notif or notif["user_id"] != current_user_id:
            raise HTTPException(status_code=404, detail="Notification not found")
        db.execute("UPDATE notifications SET is_read = 1 WHERE id = ?", (notification_id,))
    return {"message": "Marked as read"}


@router.post("/read-all")
async def mark_all_read(current_user_id: int = Depends(get_current_user_id)):
    with get_db() as db:
        db.execute(
            "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0",
            (current_user_id,),
        )
    return {"message": "All marked as read"}
