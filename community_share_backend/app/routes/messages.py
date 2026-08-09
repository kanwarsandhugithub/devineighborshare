from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import List
from app.schemas.schemas import MessageCreate, MessageOut, ConversationOut
from app.utils.auth import get_current_user_id
from app.utils.email import send_new_message_email
from app.utils.notifications import create_notification
from app.database import get_db

router = APIRouter(prefix="/api/messages", tags=["messages"])


@router.post("/", response_model=MessageOut)
async def send_message(data: MessageCreate, background_tasks: BackgroundTasks, current_user_id: int = Depends(get_current_user_id)):
    if data.receiver_id == current_user_id:
        raise HTTPException(status_code=400, detail="Cannot message yourself")
    with get_db() as db:
        receiver = db.execute("SELECT id, email, full_name FROM users WHERE id = ?", (data.receiver_id,)).fetchone()
        if not receiver:
            raise HTTPException(status_code=404, detail="Receiver not found")
        cursor = db.execute(
            "INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)",
            (current_user_id, data.receiver_id, data.content),
        )
        row = db.execute(
            """SELECT m.*, s.full_name as sender_name, r.full_name as receiver_name
               FROM messages m
               JOIN users s ON s.id = m.sender_id
               JOIN users r ON r.id = m.receiver_id
               WHERE m.id = ?""",
            (cursor.lastrowid,),
        ).fetchone()
        # Send email notification to receiver
        sender = db.execute("SELECT full_name FROM users WHERE id = ?", (current_user_id,)).fetchone()
        if receiver:
            background_tasks.add_task(
                send_new_message_email, receiver["email"], receiver["full_name"],
                sender["full_name"], data.content
            )
            create_notification(
                db,
                data.receiver_id,
                "message",
                "New message",
                f"{sender['full_name']} sent you a message",
                {"type": "message", "sender_id": current_user_id, "message_id": cursor.lastrowid},
            )
    return _message_from_row(row)


@router.get("/conversations", response_model=List[ConversationOut])
async def get_conversations(current_user_id: int = Depends(get_current_user_id)):
    with get_db() as db:
        rows = db.execute(
            """SELECT
                CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END as other_user_id,
                u.full_name as user_name,
                u.avatar_url as user_avatar_url,
                (SELECT ROUND(AVG(rv.rating), 1) FROM reviews rv WHERE rv.reviewed_user_id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END) as user_avg_rating,
                m.content as last_message,
                m.created_at as last_message_at,
                SUM(CASE WHEN m.receiver_id = ? AND m.is_read = 0 THEN 1 ELSE 0 END) as unread_count
               FROM messages m
               JOIN users u ON u.id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END
               WHERE m.sender_id = ? OR m.receiver_id = ?
               GROUP BY other_user_id
               ORDER BY MAX(m.created_at) DESC""",
            (current_user_id, current_user_id, current_user_id, current_user_id, current_user_id, current_user_id),
        ).fetchall()
    return [
        ConversationOut(
            user_id=r["other_user_id"],
            user_name=r["user_name"],
            user_avatar_url=r["user_avatar_url"],
            user_avg_rating=r["user_avg_rating"],
            last_message=r["last_message"],
            last_message_at=r["last_message_at"],
            unread_count=r["unread_count"],
        )
        for r in rows
    ]


@router.get("/with/{other_user_id}", response_model=List[MessageOut])
async def get_messages_with_user(other_user_id: int, current_user_id: int = Depends(get_current_user_id)):
    with get_db() as db:
        # Mark messages as read
        db.execute(
            "UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ?",
            (other_user_id, current_user_id),
        )
        rows = db.execute(
            """SELECT m.*, s.full_name as sender_name, r.full_name as receiver_name
               FROM messages m
               JOIN users s ON s.id = m.sender_id
               JOIN users r ON r.id = m.receiver_id
               WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
               ORDER BY m.created_at ASC""",
            (current_user_id, other_user_id, other_user_id, current_user_id),
        ).fetchall()
    return [_message_from_row(r) for r in rows]


def _message_from_row(row):
    return MessageOut(
        id=row["id"], sender_id=row["sender_id"], receiver_id=row["receiver_id"],
        content=row["content"], is_read=bool(row["is_read"]),
        created_at=row["created_at"], sender_name=row["sender_name"],
        receiver_name=row["receiver_name"],
    )
